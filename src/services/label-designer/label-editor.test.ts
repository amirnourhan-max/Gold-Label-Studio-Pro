import { describe, expect, it } from "vitest";
import { createLabelDocument } from "./label-document";
import {
  addElement,
  addElementInstance,
  canRedo,
  canUndo,
  createEditorState,
  duplicateElement,
  editorCommandForKey,
  isTextEntryTarget,
  moveElementBy,
  redo,
  removeElement,
  reorderElement,
  replaceDocument,
  selectElement,
  selectedElement,
  setLabelSize,
  undo,
  updateElement,
  withDocument,
  type LabelEditorState,
} from "./label-editor";

const emptyState = (): LabelEditorState =>
  createEditorState(createLabelDocument({ widthMm: 50, heightMm: 30, elements: [] }));

describe("label editor commands", () => {
  it("adds an element, selects it and stacks it on top", () => {
    const state = addElement(emptyState(), "text");
    const element = selectedElement(state);

    expect(state.document.elements).toHaveLength(1);
    expect(element?.id).toBe("text-1");
    expect(element?.zIndex).toBe(0);
    expect(state.document.elements[0]).toMatchObject({ xMm: 4, yMm: 4 });

    const second = addElement(state, "qr");
    expect(selectedElement(second)?.id).toBe("qr-1");
    expect(selectedElement(second)?.zIndex).toBe(1);
  });

  it("pastes an element instance with a fresh id and selection", () => {
    const state = addElement(emptyState(), "field");
    const source = selectedElement(state)!;
    const pasted = addElementInstance(state, source);

    expect(pasted.document.elements).toHaveLength(2);
    expect(selectedElement(pasted)?.id).not.toBe(source.id);
    expect(selectedElement(pasted)?.binding).toBe(source.binding);
  });

  it("updates the selected element and both directions stay in sync", () => {
    const state = addElement(emptyState(), "text");
    const id = selectedElement(state)!.id;

    const moved = updateElement(state, id, { xMm: 12, yMm: 9 });
    expect(selectedElement(moved)).toMatchObject({ xMm: 12, yMm: 9 });

    const resized = updateElement(moved, id, { widthMm: 30, heightMm: 12 });
    expect(selectedElement(resized)).toMatchObject({ xMm: 12, yMm: 9, widthMm: 30, heightMm: 12 });
  });

  it("constrains an element that is dragged outside the label", () => {
    const state = addElement(emptyState(), "text");
    const id = selectedElement(state)!.id;

    const outside = updateElement(state, id, { xMm: 400, yMm: 400 });
    const element = selectedElement(outside)!;

    expect(element.xMm + element.widthMm).toBeLessThanOrEqual(50);
    expect(element.yMm + element.heightMm).toBeLessThanOrEqual(30);
  });

  it("ignores an update for an unknown element", () => {
    const state = addElement(emptyState(), "text");
    expect(updateElement(state, "missing", { xMm: 1 })).toBe(state);
  });

  it("removes an element and falls back to the last remaining selection", () => {
    const first = addElement(emptyState(), "text");
    const second = addElement(first, "qr");
    const removed = removeElement(second, second.selectedId!);

    expect(removed.document.elements).toHaveLength(1);
    expect(removed.selectedId).toBe(removed.document.elements[0]!.id);

    const cleared = removeElement(removed, removed.selectedId!);
    expect(cleared.document.elements).toHaveLength(0);
    expect(cleared.selectedId).toBeNull();
  });

  it("duplicates the selected element with a new identity", () => {
    const state = addElement(emptyState(), "barcode");
    const id = selectedElement(state)!.id;
    const duplicated = duplicateElement(state, id);

    expect(duplicated.document.elements).toHaveLength(2);
    expect(duplicated.selectedId).not.toBe(id);
    expect(new Set(duplicated.document.elements.map(element => element.id)).size).toBe(2);
  });

  it("nudges by an explicit delta and clamps at the label edge", () => {
    const state = addElement(emptyState(), "text");
    const id = selectedElement(state)!.id;

    const nudged = moveElementBy(state, id, 0.5, 2);
    expect(selectedElement(nudged)).toMatchObject({ xMm: 4.5, yMm: 6 });

    const far = moveElementBy(nudged, id, -999, -999);
    expect(selectedElement(far)).toMatchObject({ xMm: 0, yMm: 0 });
  });

  it("re-orders layers by rewriting one contiguous z-index sequence", () => {
    let state = addElement(emptyState(), "text");
    state = addElement(state, "qr");
    state = addElement(state, "barcode");

    const first = state.document.elements[0]!.id;
    const layers = (current: LabelEditorState): readonly string[] =>
      [...current.document.elements].sort((left, right) => left.zIndex - right.zIndex).map(element => element.id);

    expect(layers(state)).toEqual(["text-1", "qr-1", "barcode-1"]);
    expect(layers(reorderElement(state, first, "front"))).toEqual(["qr-1", "barcode-1", "text-1"]);
    expect(layers(reorderElement(state, first, "back"))).toEqual(["text-1", "qr-1", "barcode-1"]);
    expect(layers(reorderElement(state, state.document.elements[1]!.id, "back"))).toEqual(["qr-1", "text-1", "barcode-1"]);

    const moved = reorderElement(state, first, "forward");
    expect(layers(moved)).toEqual(["qr-1", "text-1", "barcode-1"]);
    expect(moved.document.elements.map(element => element.zIndex).sort()).toEqual([0, 1, 2]);
  });

  it("resizes the label without invalidating its elements", () => {
    const state = addElement(emptyState(), "text");
    const smaller = setLabelSize(state, 30, 20);

    expect(smaller.document.widthMm).toBe(30);
    const element = smaller.document.elements[0]!;
    expect(element.xMm + element.widthMm).toBeLessThanOrEqual(30);

    expect(setLabelSize(state, 0, 0)).toBe(state);
    expect(setLabelSize(state, Number.NaN, 20)).toBe(state);
  });

  it("records history for committed edits and supports undo and redo", () => {
    let state = addElement(emptyState(), "text");
    const id = selectedElement(state)!.id;
    state = updateElement(state, id, { xMm: 20 });

    expect(canUndo(state)).toBe(true);
    const undone = undo(state);
    expect(selectedElement(undone)?.xMm).toBe(4);

    const redone = redo(undone);
    expect(selectedElement(redone)?.xMm).toBe(20);
    expect(canRedo(undone)).toBe(true);
    expect(redo(redone)).toBe(redone);
  });

  it("does not record a history entry for an in-gesture update", () => {
    const state = addElement(emptyState(), "text");
    const id = selectedElement(state)!.id;
    const historyLength = state.past.length;

    const duringDrag = updateElement(state, id, { xMm: 9 }, { history: false });
    expect(duringDrag.past).toHaveLength(historyLength);
    expect(selectedElement(duringDrag)?.xMm).toBe(9);
  });

  it("snapshots once when a gesture starts", () => {
    const state = addElement(emptyState(), "text");
    const snapshot = withDocument(state, state.document, { history: true });

    expect(snapshot.past).toHaveLength(state.past.length + 1);
    expect(snapshot.document).toEqual(state.document);
  });

  it("replaces the document when a stored template is opened and clears history", () => {
    const state = addElement(emptyState(), "text");
    const stored = createLabelDocument({
      widthMm: 40,
      heightMm: 25,
      elements: [{ kind: "field", id: "field-7", binding: "product.code", xMm: 5, yMm: 5, widthMm: 20, heightMm: 6 }],
    });
    const opened = replaceDocument(state, stored);

    expect(opened.past).toEqual([]);
    expect(opened.future).toEqual([]);
    expect(opened.selectedId).toBe("field-7");
    expect(opened.document.widthMm).toBe(40);
  });

  it("clears the selection when the element no longer exists", () => {
    const state = addElement(emptyState(), "text");
    const deselected = selectElement(state, null);
    expect(deselected.selectedId).toBeNull();
    expect(selectElement(state, "missing").selectedId).toBeNull();
  });

  it("maps keyboard shortcuts and never fires while typing in a field", () => {
    expect(editorCommandForKey({ key: "Delete", ctrlKey: false, metaKey: false, shiftKey: false })).toEqual({ type: "delete" });
    expect(editorCommandForKey({ key: "ArrowLeft", ctrlKey: false, metaKey: false, shiftKey: false })).toEqual({ type: "nudge", deltaXMm: -0.5, deltaYMm: 0 });
    expect(editorCommandForKey({ key: "ArrowUp", ctrlKey: false, metaKey: false, shiftKey: true })).toEqual({ type: "nudge", deltaXMm: 0, deltaYMm: -2 });
    expect(editorCommandForKey({ key: "z", ctrlKey: true, metaKey: false, shiftKey: false })).toEqual({ type: "undo" });
    expect(editorCommandForKey({ key: "y", ctrlKey: true, metaKey: false, shiftKey: false })).toEqual({ type: "redo" });
    expect(editorCommandForKey({ key: "z", ctrlKey: true, metaKey: false, shiftKey: true })).toEqual({ type: "redo" });
    expect(editorCommandForKey({ key: "c", ctrlKey: true, metaKey: false, shiftKey: false })).toEqual({ type: "copy" });
    expect(editorCommandForKey({ key: "v", ctrlKey: true, metaKey: false, shiftKey: false })).toEqual({ type: "paste" });
    expect(editorCommandForKey({ key: "d", ctrlKey: true, metaKey: false, shiftKey: false })).toEqual({ type: "duplicate" });
    expect(editorCommandForKey({ key: "a", ctrlKey: true, metaKey: false, shiftKey: false })).toBeNull();
    expect(editorCommandForKey({ key: "ArrowLeft", ctrlKey: true, metaKey: false, shiftKey: false })).toBeNull();
    expect(editorCommandForKey({ key: "F5", ctrlKey: false, metaKey: false, shiftKey: false })).toBeNull();
  });

  it("recognizes text-entry targets so canvas shortcuts stay out of forms", () => {
    expect(isTextEntryTarget(null)).toBe(false);
    expect(isTextEntryTarget({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true);
    expect(isTextEntryTarget({ tagName: "textarea" } as unknown as EventTarget)).toBe(true);
    expect(isTextEntryTarget({ tagName: "SELECT" } as unknown as EventTarget)).toBe(true);
    expect(isTextEntryTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget)).toBe(true);
    expect(isTextEntryTarget({ tagName: "DIV" } as unknown as EventTarget)).toBe(false);
  });
});
