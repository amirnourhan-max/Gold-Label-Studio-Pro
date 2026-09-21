import {
  constrainDocument,
  constrainElement,
  createLabelElement,
  duplicateLabelElement,
  roundMm,
  type LabelDocument,
  type LabelElement,
  type LabelElementKind,
} from "./label-document";
import { ARROW_STEP_MM, SHIFT_ARROW_STEP_MM } from "./label-geometry";

/**
 * The whole editor state is a plain value: the document, the selection and the
 * in-memory history. Every transition below is pure, which is what keeps the
 * canvas, the properties panel and the printer on exactly one model.
 */
export type LabelEditorState = Readonly<{
  document: LabelDocument;
  selectedId: string | null;
  past: readonly LabelDocument[];
  future: readonly LabelDocument[];
}>;

export const HISTORY_LIMIT = 60;

export const createEditorState = (document: LabelDocument): LabelEditorState => ({
  document,
  selectedId: document.elements[0]?.id ?? null,
  past: [],
  future: [],
});

export const selectedElement = (state: LabelEditorState): LabelElement | null =>
  state.document.elements.find(element => element.id === state.selectedId) ?? null;

const pushHistory = (state: LabelEditorState): readonly LabelDocument[] =>
  [...state.past, state.document].slice(-HISTORY_LIMIT);

/** Applies a new document, optionally recording it for undo. */
export const withDocument = (
  state: LabelEditorState,
  document: LabelDocument,
  options: { history?: boolean; select?: string | null } = {},
): LabelEditorState => {
  const next = constrainDocument(document);
  const history = options.history === false ? state.past : pushHistory(state);
  const future = options.history === false ? state.future : [];
  const selection = options.select === undefined ? state.selectedId : options.select;
  const stillExists = selection === null || next.elements.some(element => element.id === selection);

  return {
    document: next,
    selectedId: stillExists ? selection : next.elements[next.elements.length - 1]?.id ?? null,
    past: history,
    future,
  };
};

export const selectElement = (state: LabelEditorState, id: string | null): LabelEditorState => ({
  ...state,
  selectedId: id !== null && state.document.elements.some(element => element.id === id) ? id : null,
});

export const addElement = (
  state: LabelEditorState,
  kind: LabelElementKind,
  overrides: Partial<Omit<LabelElement, "id">> = {},
): LabelEditorState => {
  const element = constrainElement(createLabelElement(kind, state.document.elements, overrides), state.document);
  return withDocument(
    state,
    { ...state.document, elements: [...state.document.elements, element] },
    { select: element.id },
  );
};

export const addElementInstance = (state: LabelEditorState, source: LabelElement): LabelEditorState => {
  const element = constrainElement(duplicateLabelElement(source, state.document.elements), state.document);
  return withDocument(
    state,
    { ...state.document, elements: [...state.document.elements, element] },
    { select: element.id },
  );
};

export const updateElement = (
  state: LabelEditorState,
  id: string,
  patch: Partial<Omit<LabelElement, "id">>,
  options: { history?: boolean } = {},
): LabelEditorState => {
  const existing = state.document.elements.find(element => element.id === id);
  if (!existing) return state;

  const updated = constrainElement({ ...existing, ...patch, id: existing.id }, state.document);
  return withDocument(
    state,
    {
      ...state.document,
      elements: state.document.elements.map(element => (element.id === id ? updated : element)),
    },
    { history: options.history },
  );
};

export const removeElement = (state: LabelEditorState, id: string): LabelEditorState => {
  if (!state.document.elements.some(element => element.id === id)) return state;

  const remaining = state.document.elements.filter(element => element.id !== id);
  return withDocument(
    state,
    { ...state.document, elements: remaining },
    { select: remaining[remaining.length - 1]?.id ?? null },
  );
};

export const duplicateElement = (state: LabelEditorState, id: string): LabelEditorState => {
  const source = state.document.elements.find(element => element.id === id);
  if (!source) return state;
  return addElementInstance(state, source);
};

export const moveElementBy = (
  state: LabelEditorState,
  id: string,
  deltaXMm: number,
  deltaYMm: number,
  options: { history?: boolean } = {},
): LabelEditorState => {
  const existing = state.document.elements.find(element => element.id === id);
  if (!existing || !Number.isFinite(deltaXMm) || !Number.isFinite(deltaYMm)) return state;

  const moved = constrainElement(
    { ...existing, xMm: roundMm(existing.xMm + deltaXMm), yMm: roundMm(existing.yMm + deltaYMm) },
    state.document,
  );
  return withDocument(
    state,
    { ...state.document, elements: state.document.elements.map(element => (element.id === id ? moved : element)) },
    { history: options.history },
  );
};

export type ZOrderMove = "front" | "back" | "forward" | "backward";

/** Re-orders by rewriting the contiguous z-index sequence, so it never drifts. */
export const reorderElement = (state: LabelEditorState, id: string, move: ZOrderMove): LabelEditorState => {
  const ordered = [...state.document.elements].sort((a, b) => a.zIndex - b.zIndex);
  const index = ordered.findIndex(element => element.id === id);
  if (index === -1) return state;

  const target =
    move === "front" ? ordered.length - 1
      : move === "back" ? 0
        : move === "forward" ? Math.min(ordered.length - 1, index + 1)
          : Math.max(0, index - 1);
  if (target === index) return state;

  const reordered = [...ordered];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(target, 0, moved!);

  const renumbered = reordered.map((element, order) => (element.zIndex === order ? element : { ...element, zIndex: order }));
  const byId = new Map(renumbered.map(element => [element.id, element]));

  return withDocument(state, {
    ...state.document,
    elements: state.document.elements.map(element => byId.get(element.id) ?? element),
  });
};

export const setLabelSize = (
  state: LabelEditorState,
  widthMm: number,
  heightMm: number,
): LabelEditorState => {
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm < 1 || heightMm < 1) return state;
  return withDocument(state, { ...state.document, widthMm: roundMm(widthMm), heightMm: roundMm(heightMm) });
};

export const replaceDocument = (
  state: LabelEditorState,
  document: LabelDocument,
  select: string | null = document.elements[0]?.id ?? null,
): LabelEditorState => ({
  document: constrainDocument(document),
  selectedId: select,
  past: [],
  future: [],
});

export const undo = (state: LabelEditorState): LabelEditorState => {
  const previous = state.past[state.past.length - 1];
  if (previous === undefined) return state;
  return {
    ...state,
    document: previous,
    selectedId: previous.elements.some(element => element.id === state.selectedId)
      ? state.selectedId
      : previous.elements[previous.elements.length - 1]?.id ?? null,
    past: state.past.slice(0, -1),
    future: [state.document, ...state.future].slice(0, HISTORY_LIMIT),
  };
};

export const redo = (state: LabelEditorState): LabelEditorState => {
  const next = state.future[0];
  if (next === undefined) return state;
  return {
    ...state,
    document: next,
    selectedId: next.elements.some(element => element.id === state.selectedId)
      ? state.selectedId
      : next.elements[next.elements.length - 1]?.id ?? null,
    past: [...state.past, state.document].slice(-HISTORY_LIMIT),
    future: state.future.slice(1),
  };
};

export const canUndo = (state: LabelEditorState): boolean => state.past.length > 0;
export const canRedo = (state: LabelEditorState): boolean => state.future.length > 0;

export type EditorCommand =
  | Readonly<{ type: "delete" }>
  | Readonly<{ type: "copy" }>
  | Readonly<{ type: "paste" }>
  | Readonly<{ type: "duplicate" }>
  | Readonly<{ type: "undo" }>
  | Readonly<{ type: "redo" }>
  | Readonly<{ type: "nudge"; deltaXMm: number; deltaYMm: number }>;

export type EditorKeyEvent = Readonly<{
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}>;

/**
 * Shortcuts must never fire while the user is typing in a form control, which
 * would otherwise turn a space or an arrow key into a canvas operation.
 */
export const isTextEntryTarget = (target: EventTarget | null): boolean => {
  if (target === null || typeof target !== "object") return false;
  const element = target as { tagName?: unknown; isContentEditable?: unknown };
  const tagName = typeof element.tagName === "string" ? element.tagName.toUpperCase() : "";
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return true;
  return element.isContentEditable === true;
};

export const editorCommandForKey = (event: EditorKeyEvent): EditorCommand | null => {
  const modifier = event.ctrlKey || event.metaKey;
  const key = event.key;

  if (modifier && !event.shiftKey) {
    switch (key.toLowerCase()) {
      case "z": return { type: "undo" };
      case "y": return { type: "redo" };
      case "c": return { type: "copy" };
      case "v": return { type: "paste" };
      case "d": return { type: "duplicate" };
      default: return null;
    }
  }

  if (modifier && event.shiftKey && key.toLowerCase() === "z") return { type: "redo" };

  if (!modifier) {
    if (key === "Delete" || key === "Backspace") return { type: "delete" };
    const step = event.shiftKey ? SHIFT_ARROW_STEP_MM : ARROW_STEP_MM;
    if (key === "ArrowLeft") return { type: "nudge", deltaXMm: -step, deltaYMm: 0 };
    if (key === "ArrowRight") return { type: "nudge", deltaXMm: step, deltaYMm: 0 };
    if (key === "ArrowUp") return { type: "nudge", deltaXMm: 0, deltaYMm: -step };
    if (key === "ArrowDown") return { type: "nudge", deltaXMm: 0, deltaYMm: step };
  }

  return null;
};
