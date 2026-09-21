import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignHorizontalJustifyCenter, ChevronLeft, Copy, Eye, FilePlus2, FolderOpen,
  Grid3X3, LayoutGrid, List, Pencil, Printer, Redo2, Save, Trash2, Undo2,
} from "lucide-react";
import { designerTemplates } from "../../assets/reference";
import {
  createDefaultTemplateGateway,
  approvedSavedTemplateViews,
} from "../../services/label-templates/template-gateway";
import { validateLabelTemplate } from "../../services/label-templates/template-validation";
import type {
  LabelTemplateDocument,
  LabelTemplateGateway,
  SavedLabelTemplateView,
} from "../../services/label-templates/template-contract";
import {
  LABEL_DOCUMENT_VERSION,
  createLabelDocument,
  parseLabelDocument,
  roundMm,
  type LabelDocument,
  type LabelElementKind,
} from "../../services/label-designer/label-document";
import { SAMPLE_LABEL_DATA_CONTEXT } from "../../services/label-designer/label-bindings";
import { DEFAULT_ZOOM, nextZoom } from "../../services/label-designer/label-geometry";
import {
  addElementAt,
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
  type EditorCommand,
  type LabelEditorState,
  type ZOrderMove,
} from "../../services/label-designer/label-editor";
import { labelPrintWorkflow, type LabelPrintWorkflow } from "../../services/printer/print-runtime";
import type { LabelElement } from "../../services/label-designer/label-document";
import { LabelCanvas } from "./label-designer/LabelCanvas";
import { LabelPropertiesPanel } from "./label-designer/LabelPropertiesPanel";
import { LabelToolbox, type DesignerTool } from "./label-designer/LabelToolbox";
import "./label-designer.css";

type TemplatesStatus = "loading" | "ready" | "error";

const DEFAULT_LABEL_WIDTH_MM = 50;
const DEFAULT_LABEL_HEIGHT_MM = 30;

const emptyDocument = (): LabelDocument =>
  createLabelDocument({
    widthMm: DEFAULT_LABEL_WIDTH_MM,
    heightMm: DEFAULT_LABEL_HEIGHT_MM,
    version: LABEL_DOCUMENT_VERSION,
    elements: [],
  });

export function LabelDesignerPage({
  print = labelPrintWorkflow,
  templateGateway,
}: {
  print?: LabelPrintWorkflow;
  templateGateway?: LabelTemplateGateway | Promise<LabelTemplateGateway>;
} = {}) {
  const [editor, setEditor] = useState<LabelEditorState>(() => createEditorState(emptyDocument()));
  const [templates, setTemplates] = useState<readonly SavedLabelTemplateView[]>(approvedSavedTemplateViews);
  const [status, setStatus] = useState<TemplatesStatus>("loading");
  const [manageMode, setManageMode] = useState(false);
  const [listMode, setListMode] = useState<"grid" | "list">("grid");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("قالب جدید");
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [lockGuides, setLockGuides] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<DesignerTool>("select");

  const rootRef = useRef<HTMLElement | null>(null);
  const gatewayRef = useRef<LabelTemplateGateway | null>(null);
  const clipboardRef = useRef<LabelElement | null>(null);
  const editorRef = useRef(editor);
  editorRef.current = editor;

  const current = useMemo(() => selectedElement(editor), [editor]);

  const gateway = useCallback(async (): Promise<LabelTemplateGateway> => {
    if (gatewayRef.current === null) {
      gatewayRef.current = await (templateGateway ?? createDefaultTemplateGateway());
    }
    return gatewayRef.current;
  }, [templateGateway]);

  const refreshTemplates = useCallback(async (instance: LabelTemplateGateway) => {
    setTemplates(await instance.listTemplates());
  }, []);

  /** Loads a saved template's complete designer document into the canvas. */
  const openTemplate = useCallback(async (view: SavedLabelTemplateView, instance?: LabelTemplateGateway) => {
    const active = instance ?? (await gateway());
    setActiveTemplateId(String(view.id));
    setTemplateName(view.name);

    let document: LabelTemplateDocument | null = null;
    try {
      document = await active.loadTemplate(view.id);
    } catch {
      setNotice("خواندن قالب ذخیره‌شده ناموفق بود");
      return;
    }
    if (document === null) {
      setEditor(replaceDocument(
        editorRef.current,
        createLabelDocument({
          widthMm: view.widthMm,
          heightMm: view.heightMm,
          elements: [],
        }),
        null,
      ));
      return;
    }

    const parsed = parseLabelDocument(
      JSON.stringify({
        version: document.version ?? LABEL_DOCUMENT_VERSION,
        widthMm: document.widthMm,
        heightMm: document.heightMm,
        elements: [...document.elements],
      }),
      { widthMm: view.widthMm, heightMm: view.heightMm },
    );

    if (parsed.document === null) {
      // Corrupt documents are reported and left exactly as they are stored.
      setNotice(parsed.issues[0]?.message ?? "قالب ذخیره‌شده خوانده نشد");
      return;
    }
    setEditor(replaceDocument(editorRef.current, parsed.document));
  }, [gateway]);

  useEffect(() => {
    let cancelled = false;

    gateway()
      .then(async instance => {
        gatewayRef.current = instance;
        const saved = await instance.listTemplates();
        if (cancelled) return;
        setTemplates(saved);
        setStatus("ready");
        const first = saved.find(candidate => candidate.isDefault) ?? saved[0];
        if (first !== undefined) await openTemplate(first, instance);
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [gateway, openTemplate]);

  const runCommand = useCallback((command: EditorCommand) => {
    const state = editorRef.current;
    const id = state.selectedId;

    switch (command.type) {
      case "undo": setEditor(undo(state)); return;
      case "redo": setEditor(redo(state)); return;
      case "delete": if (id !== null) setEditor(removeElement(state, id)); return;
      case "duplicate": if (id !== null) setEditor(duplicateElement(state, id)); return;
      case "copy": {
        const element = selectedElement(state);
        if (element !== null) {
          clipboardRef.current = element;
          setNotice(`«${element.binding ?? element.text}» کپی شد`);
        }
        return;
      }
      case "paste": {
        const source = clipboardRef.current;
        if (source === null) {
          setNotice("چیزی برای چسباندن وجود ندارد");
          return;
        }
        setEditor(addElementInstance(state, source));
        return;
      }
      case "nudge": if (id !== null) setEditor(moveElementBy(state, id, command.deltaXMm, command.deltaYMm)); return;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      const inside = rootRef.current !== null && target instanceof Node && rootRef.current.contains(target);
      if (!inside && target !== document.body) return;
      if (isTextEntryTarget(target)) return;

      const command = editorCommandForKey({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      });
      if (command === null) return;
      event.preventDefault();
      runCommand(command);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [runCommand]);

  const documentFromEditor = (state: LabelEditorState): LabelTemplateDocument => ({
    name: templateName.trim().length > 0 ? templateName.trim() : "قالب جدید",
    templateKind: "product",
    widthMm: state.document.widthMm,
    heightMm: state.document.heightMm,
    version: state.document.version,
    elements: state.document.elements.map(element => ({ ...element })),
  });

  const persist = async (name: string, targetId: string | null): Promise<void> => {
    const candidate = documentFromEditor(editorRef.current);
    const document: LabelTemplateDocument = { ...candidate, name };
    const issues = validateLabelTemplate(document);
    if (issues.length > 0) {
      window.alert(issues[0]!.message);
      return;
    }

    const instance = await gateway();
    if (targetId === null) {
      const saved = await instance.saveTemplate(document);
      setActiveTemplateId(String(saved.id));
      setTemplateName(name);
      setNotice(`قالب «${name}» ذخیره شد`);
    } else {
      const updated = await instance.updateTemplate(targetId, document);
      if (updated === null) {
        window.alert("قالب یافت نشد؛ فهرست تازه‌سازی شد");
      } else {
        setTemplateName(name);
        setNotice(`قالب «${name}» به‌روزرسانی شد`);
      }
    }
    await refreshTemplates(instance);
  };

  const handleSaveTemplate = async (): Promise<void> => {
    if (activeTemplateId !== null) {
      await persist(templateName, activeTemplateId);
      return;
    }

    const name = window.prompt("نام قالب جدید:", "قالب جدید");
    if (name === null) return;
    await persist(name.trim(), null);
  };

  const handleSaveCopy = async (): Promise<void> => {
    const name = window.prompt("نام نسخه جدید:", `${templateName} - نسخه`);
    if (name === null) return;
    await persist(name.trim(), null);
  };

  const handleRenameTemplate = async (template: SavedLabelTemplateView): Promise<void> => {
    const name = window.prompt("نام جدید قالب:", template.name);
    if (name === null || name.trim() === "" || name.trim() === template.name) return;

    const instance = await gateway();
    const loaded = await instance.loadTemplate(template.id);
    const document: LabelTemplateDocument = {
      name: name.trim(),
      templateKind: template.templateKind,
      widthMm: loaded?.widthMm ?? template.widthMm,
      heightMm: loaded?.heightMm ?? template.heightMm,
      version: loaded?.version,
      elements: loaded?.elements ?? [],
    };
    const issues = validateLabelTemplate(document);
    if (issues.length > 0) {
      window.alert(issues[0]!.message);
      return;
    }

    const updated = await instance.updateTemplate(template.id, document);
    if (updated === null) {
      window.alert("قالب یافت نشد؛ فهرست تازه‌سازی شد");
    } else if (String(template.id) === activeTemplateId) {
      setTemplateName(document.name);
    }
    await refreshTemplates(instance);
  };

  const handleDeleteTemplate = async (template: SavedLabelTemplateView): Promise<void> => {
    if (!window.confirm(`قالب «${template.name}» حذف شود؟`)) return;

    const instance = await gateway();
    await instance.deleteTemplate(template.id);
    if (String(template.id) === activeTemplateId) {
      setActiveTemplateId(null);
      setEditor(replaceDocument(editorRef.current, emptyDocument(), null));
    }
    await refreshTemplates(instance);
  };

  const beginGesture = useCallback(() => {
    setEditor(state => withDocument(state, state.document, { history: true }));
  }, []);

  const changeElement = useCallback((id: string, patch: Partial<Omit<LabelElement, "id">>) => {
    setEditor(state => updateElement(state, id, patch, { history: false }));
  }, []);

  const updateSelected = useCallback((patch: Partial<Omit<LabelElement, "id">>) => {
    setEditor(state => (state.selectedId === null ? state : updateElement(state, state.selectedId, patch)));
  }, []);

  const handleInsertElement = (kind: LabelElementKind, xMm: number, yMm: number): void => {
    setEditor(state => addElementAt(state, kind, { xMm, yMm }));
    setActiveTool("select");
    setNotice(null);
  };

  const handleNewTemplate = (): void => {
    setActiveTemplateId(null);
    setTemplateName("قالب جدید");
    setEditor(replaceDocument(editorRef.current, emptyDocument(), null));
    setNotice("بوم طراحی خالی شد");
  };

  const handleAlignSelected = (): void => {
    const element = selectedElement(editorRef.current);
    if (element === null) {
      setNotice("ابتدا یک عنصر را انتخاب کنید");
      return;
    }
    const label = editorRef.current.document;
    const target = element.style.align === "right"
      ? label.widthMm - element.widthMm
      : element.style.align === "center"
        ? (label.widthMm - element.widthMm) / 2
        : 0;
    setEditor(state => updateElement(state, element.id, { xMm: roundMm(Math.max(0, target)) }));
    setNotice("عنصر با توجه به تراز متن در لیبل قرار گرفت");
  };

  const handleTestPrint = async (): Promise<void> => {
    const outcome = await print.printCurrentDocument({
      document: editorRef.current.document,
      name: templateName,
      copies: 1,
      context: SAMPLE_LABEL_DATA_CONTEXT,
    });
    setNotice(outcome.message);
  };

  const selectedIndex = editor.document.elements.findIndex(element => element.id === editor.selectedId);

  return (
    <main className="label-designer-page" data-testid="label-designer-page" ref={rootRef}>
      <div className="label-designer-toolbar" role="toolbar" aria-label="عملیات طراحی لیبل">
        <button type="button" onClick={handleNewTemplate} title="قالب جدید"><FilePlus2 size={19} />جدید</button>
        <button type="button" onClick={() => { const active = templates.find(item => String(item.id) === activeTemplateId); if (active) void openTemplate(active); }} title="بارگذاری قالب فعال"><FolderOpen size={19} />باز کردن</button>
        <button type="button" className="accent" onClick={() => void handleSaveTemplate()} title="ذخیره قالب"><Save size={19} />ذخیره</button>
        <button type="button" onClick={() => void handleSaveCopy()} title="ذخیره به عنوان نسخه جدید"><Copy size={19} />ذخیره نسخه</button>
        <button type="button" disabled={!canUndo(editor)} onClick={() => setEditor(undo)} title="بازگشت (Ctrl+Z)"><Undo2 size={19} />بازگشت</button>
        <button type="button" disabled={!canRedo(editor)} onClick={() => setEditor(redo)} title="جلو برو (Ctrl+Y)"><Redo2 size={19} />جلو برو</button>
        <button type="button" disabled={selectedIndex === -1} onClick={handleAlignSelected} title="قرار دادن عنصر در تراز انتخاب‌شده"><AlignHorizontalJustifyCenter size={19} />تراز کردن</button>
        <button type="button" disabled title="گروه‌بندی عناصر در این نسخه پشتیبانی نمی‌شود"><LayoutGrid size={19} />گروه‌بندی</button>
        <button type="button" aria-pressed={previewMode} onClick={() => setPreviewMode(current => !current)} title="پیش‌نمایش با داده نمونه"><Eye size={19} />پیش نمایش</button>
        <button type="button" onClick={() => void handleTestPrint()} title="ارسال چاپ آزمایشی به چاپگر تنظیمات"><Printer size={19} />چاپ آزمایشی</button>
      </div>

      <div className="label-designer-grid">
        <LabelToolbox
          activeTool={activeTool}
          zoom={zoom}
          showGrid={showGrid}
          snapToGrid={snapToGrid}
          showGuides={showGuides}
          lockGuides={lockGuides}
          onZoomIn={() => setZoom(current => nextZoom(current, 1))}
          onZoomOut={() => setZoom(current => nextZoom(current, -1))}
          onSelectTool={setActiveTool}
          onToggleGrid={() => setShowGrid(current => !current)}
          onToggleSnap={() => setSnapToGrid(current => !current)}
          onToggleGuides={() => setShowGuides(current => !current)}
          onToggleLockGuides={() => setLockGuides(current => !current)}
        />

        <LabelCanvas
          document={editor.document}
          selectedId={editor.selectedId}
          zoom={zoom}
          showGrid={showGrid}
          snapToGrid={snapToGrid}
          showGuides={showGuides}
          lockGuides={lockGuides}
          previewMode={previewMode}
          context={SAMPLE_LABEL_DATA_CONTEXT}
          activeTool={activeTool}
          onInsertElement={handleInsertElement}
          onSelect={id => setEditor(state => selectElement(state, id))}
          onGestureStart={beginGesture}
          onChangeElement={changeElement}
        />

        <LabelPropertiesPanel
          label={editor.document}
          element={current}
          onUpdate={updateSelected}
          onUpdateLabelSize={(widthMm, heightMm) => setEditor(state => setLabelSize(state, widthMm, heightMm))}
          onDelete={() => setEditor(state => (state.selectedId === null ? state : removeElement(state, state.selectedId)))}
          onDuplicate={() => setEditor(state => (state.selectedId === null ? state : duplicateElement(state, state.selectedId)))}
          onReorder={(move: ZOrderMove) => setEditor(state => (state.selectedId === null ? state : reorderElement(state, state.selectedId, move)))}
          onDeselect={() => setEditor(state => selectElement(state, null))}
        />

        <section className="label-templates" aria-label="قالب‌های ذخیره‌شده">
          <header>
            <h2>قالب‌های ذخیره‌شده</h2>
            <span>
              <button type="button" aria-pressed={manageMode} onClick={() => setManageMode(current => !current)}>مدیریت قالب‌ها</button>
              <button type="button" aria-label="نمایش شبکه‌ای" aria-pressed={listMode === "grid"} onClick={() => setListMode("grid")}><Grid3X3 size={17} /></button>
              <button type="button" aria-label="نمایش فهرستی" aria-pressed={listMode === "list"} onClick={() => setListMode("list")}><List size={17} /></button>
              <ChevronLeft size={20} />
            </span>
          </header>
          <div role="list" aria-label="قالب‌های ذخیره‌شده" className={`label-template-list ${listMode}`}>
            {status === "loading" && <p className="label-templates-empty" role="status">در حال بارگذاری قالب‌ها…</p>}
            {status === "error" && <p className="label-templates-empty" role="alert">بارگذاری قالب‌ها ناموفق بود؛ داده نمایشی در حال استفاده است</p>}
            {status === "ready" && templates.length === 0 && <p className="label-templates-empty" role="status">قالب ذخیره‌شده‌ای وجود نیست</p>}
            {templates.map((template, index) => (
              <article
                role="listitem"
                key={String(template.id)}
                className={String(template.id) === activeTemplateId ? "active" : ""}
                aria-current={String(template.id) === activeTemplateId}
              >
                <button
                  type="button"
                  className="label-template-open"
                  aria-label={`باز کردن قالب ${template.name}`}
                  onClick={() => void openTemplate(template)}
                >
                  <span className="label-template-image">
                    <img src={designerTemplates[index % designerTemplates.length]} alt={`قالب ${template.name}`} />
                  </span>
                  <span>{template.name}</span>
                </button>
                {manageMode && (
                  <span className="label-template-manage">
                    <button type="button" aria-label={`تغییر نام قالب ${template.name}`} onClick={() => void handleRenameTemplate(template)}><Pencil size={12} /></button>
                    <button type="button" aria-label={`حذف قالب ${template.name}`} onClick={() => void handleDeleteTemplate(template)}><Trash2 size={12} /></button>
                  </span>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      {notice !== null && <p className="label-designer-notice" role="status">{notice}</p>}
    </main>
  );
}
