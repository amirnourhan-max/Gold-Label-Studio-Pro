import { useEffect, useState } from "react";
import { createLabelDocument, type LabelDocument, type LabelElement } from "../../../services/label-designer/label-document";
import type { LabelTemplateDocument } from "../../../services/label-templates/template-contract";

type PreviewState = { status: "loading" } | { status: "error" } | { status: "ready"; document: LabelDocument };

const previewElement = (element: LabelElement) => {
  const opacity = element.visible ? 1 : .25;
  switch (element.kind) {
    case "text": case "field": return <text key={element.id} opacity={opacity} x={element.xMm} y={element.yMm + Math.min(element.heightMm, element.style.fontSizeMm)} fontSize={element.style.fontSizeMm} fontWeight={element.style.fontWeight === "bold" ? 700 : 400}>{element.binding ? `{${element.binding}}` : element.text}</text>;
    case "qr": return <g key={element.id} opacity={opacity} transform={`translate(${element.xMm} ${element.yMm})`}><rect width={element.widthMm} height={element.heightMm} fill="#fff" stroke="#111" strokeWidth=".2"/><rect x="1" y="1" width={element.widthMm * .35} height={element.heightMm * .35}/><rect x={element.widthMm * .58} y="1" width={element.widthMm * .35} height={element.heightMm * .35}/><rect x="1" y={element.heightMm * .58} width={element.widthMm * .35} height={element.heightMm * .35}/></g>;
    case "barcode": return <g key={element.id} opacity={opacity}>{Array.from({ length: 13 }, (_, index) => <rect key={index} x={element.xMm + index * element.widthMm / 13} y={element.yMm} width={element.widthMm / (index % 3 === 0 ? 22 : 35)} height={element.heightMm}/>)}</g>;
    case "line": return <line key={element.id} opacity={opacity} x1={element.xMm} y1={element.yMm} x2={element.xMm + element.widthMm} y2={element.yMm + element.heightMm} stroke="#111" strokeWidth={Math.max(.2, element.style.borderWidthMm)}/>;
    case "frame": return <rect key={element.id} opacity={opacity} x={element.xMm} y={element.yMm} width={element.widthMm} height={element.heightMm} fill="none" stroke="#111" strokeWidth={Math.max(.2, element.style.borderWidthMm)}/>;
    case "image": return <rect key={element.id} opacity={opacity} x={element.xMm} y={element.yMm} width={element.widthMm} height={element.heightMm} fill="#d9dde5" stroke="#111" strokeWidth=".2"/>;
  }
};

export function TemplatePreview({ name, load }: Readonly<{ name: string; load(): Promise<LabelTemplateDocument | null> }>) {
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  useEffect(() => {
    let active = true;
    load().then(stored => {
      if (!active) return;
      if (stored === null) return setState({ status: "error" });
      setState({ status: "ready", document: createLabelDocument({ version: stored.version, widthMm: stored.widthMm, heightMm: stored.heightMm, elements: stored.elements }) });
    }).catch(() => active && setState({ status: "error" }));
    return () => { active = false; };
  }, [load]);
  if (state.status === "loading") return <span className="label-template-preview-state" role="status">…</span>;
  if (state.status === "error") return <span className="label-template-preview-state error" role="img" aria-label={`پیش‌نمایش قالب ${name} در دسترس نیست`}>!</span>;
  return <svg className="label-template-preview" data-testid={`template-preview-${name}`} role="img" aria-label={`پیش‌نمایش واقعی قالب ${name}`} viewBox={`0 0 ${state.document.widthMm} ${state.document.heightMm}`} preserveAspectRatio="xMidYMid meet"><rect width={state.document.widthMm} height={state.document.heightMm} fill="#fff" />{[...state.document.elements].sort((a, b) => a.zIndex - b.zIndex).map(previewElement)}</svg>;
}
