from .tokens import ThemeTokens


def build_stylesheet(t: ThemeTokens) -> str:
    return f"""
QMainWindow, QWidget#appRoot {{
    background: {t.background};
    color: {t.text_primary};
}}
QWidget {{
    font-family: "Segoe UI", "Vazirmatn", "Tahoma";
    font-size: 13px;
    color: {t.text_primary};
}}
#sidebar, #topBar, #statusBar {{
    background: {t.surface};
    border: 1px solid {t.border};
}}
#sidebar {{ border-radius: {t.radius_card}px; }}
#pageCard, #metricCard, #contentPanel {{
    background: {t.surface};
    border: 1px solid {t.border};
    border-radius: {t.radius_card}px;
}}
QPushButton {{
    min-height: {t.control_height}px;
    border: 1px solid {t.border};
    border-radius: {t.radius_control}px;
    background: {t.surface_alt};
    padding: 0 14px;
}}
QPushButton:hover {{ border-color: {t.accent}; }}
QPushButton#navButton:checked, QPushButton#primaryButton {{
    background: {t.accent};
    color: #101318;
    border-color: {t.accent};
    font-weight: 700;
}}
QPushButton#navButton:checked:hover, QPushButton#primaryButton:hover {{
    background: {t.accent_hover};
}}
QLabel#muted {{ color: {t.text_muted}; }}
QLabel#accent {{ color: {t.accent}; font-weight: 700; }}
QFrame[status="success"] {{ border-color: {t.success}; }}
QFrame[status="danger"] {{ border-color: {t.danger}; }}
""".strip()
