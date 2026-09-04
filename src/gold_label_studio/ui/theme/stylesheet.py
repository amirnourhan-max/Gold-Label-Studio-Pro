from .tokens import ThemeTokens


def build_stylesheet(t: ThemeTokens) -> str:
    return f"""
QMainWindow, QWidget#appRoot {{
    background: {t.background};
    color: {t.text_primary};
}}
QWidget {{
    font-family: "Tahoma", "Segoe UI";
    font-size: 13px;
    color: {t.text_primary};
}}
QToolTip {{
    background: {t.surface_alt};
    color: {t.text_primary};
    border: 1px solid {t.border};
    padding: 6px;
}}
#pageCard {{
    background: {t.surface};
}}
#sidebar {{
    background: #0A1623;
    border: 1px solid {t.border};
    border-radius: 18px;
}}
#brandBlock {{
    background: #0F1E2E;
    border: 1px solid #294056;
    border-radius: 14px;
}}
#brandTitle {{
    color: {t.accent};
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 1px;
}}
#brandPro {{
    color: #F7E2A6;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
}}
#brandSubtitle, #sidebarFooterMeta {{
    color: {t.text_muted};
    font-size: 11px;
}}
#sidebarSectionLabel {{
    color: #71869B;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 6px;
}}
#sidebarFooter {{
    background: #0B1927;
    border: 1px solid #1F3448;
    border-radius: 12px;
}}
#sidebarFooterTitle {{
    color: #CAD5DF;
    font-size: 11px;
    font-weight: 700;
}}
#topBar {{
    background: #0A1623;
    border: 1px solid {t.border};
    border-radius: 15px;
}}
#statusBar {{
    background: #08131F;
    border: 1px solid #203448;
    border-radius: 10px;
}}
#userChip, #deviceChip {{
    background: #0E1C2B;
    border: 1px solid #263B50;
    border-radius: 11px;
    min-width: 112px;
}}
#chipTitle {{
    color: #71869B;
    font-size: 10px;
}}
#chipValue {{
    color: #E9EEF3;
    font-size: 12px;
    font-weight: 700;
}}
#deviceChip #chipValue {{
    color: #8DDBAF;
}}
#searchContainer {{
    background: #111F2E;
    border: 1px solid #2B4055;
    border-radius: 12px;
    min-height: 48px;
}}
#searchContainer:hover {{
    border-color: #415C73;
}}
QLineEdit#globalSearch {{
    background: transparent;
    border: 0;
    color: {t.text_primary};
    selection-background-color: {t.accent};
    selection-color: #101318;
    padding: 0 4px;
}}
QLineEdit#globalSearch::placeholder {{
    color: #74899D;
}}
#searchIcon {{
    color: {t.accent};
    font-size: 20px;
}}
#searchHint {{
    background: #182A3B;
    color: #8FA2B5;
    border: 1px solid #2B4055;
    border-radius: 6px;
    padding: 3px 6px;
    font-size: 10px;
}}
QPushButton {{
    min-height: {t.control_height}px;
    border: 1px solid {t.border};
    border-radius: 10px;
    background: #122234;
    color: #DDE6EE;
    padding: 0 14px;
}}
QPushButton:hover {{
    background: #172B3E;
    border-color: #3D566F;
}}
QPushButton#navButton {{
    min-height: 44px;
    text-align: right;
    padding-right: 15px;
    font-weight: 600;
    border: 1px solid transparent;
    background: transparent;
    color: #AFC0D0;
}}
QPushButton#navButton:hover {{
    background: #112337;
    border-color: #213A51;
    color: #F0F4F8;
}}
QPushButton#navButton:checked {{
    background: #D9AA4C;
    color: #111820;
    border-color: #E3BA63;
    font-weight: 800;
}}
QPushButton#quickActionButton {{
    background: #112337;
    border: 1px solid #29435B;
    min-height: 46px;
    font-weight: 700;
}}
QPushButton#quickActionButton:hover {{
    background: #182E43;
    border-color: {t.accent};
    color: #FFF3CE;
}}
#dashboardHero {{
    background: #0B1927;
    border: 1px solid #243B50;
    border-radius: 15px;
}}
#pageTitle {{
    color: #F5F8FB;
    font-size: 27px;
    font-weight: 800;
}}
#pageSubtitle {{
    color: #8297AA;
    font-size: 12px;
}}
#heroChip {{
    background: #12263A;
    color: #C7D4DF;
    border: 1px solid #2A4359;
    border-radius: 9px;
    padding: 7px 12px;
    font-size: 11px;
}}
#metricCard {{
    background: #0D1C2B;
    border: 1px solid #274057;
    border-radius: 15px;
}}
#metricCard:hover {{
    background: #102132;
    border-color: #3B5770;
}}
#metricIcon {{
    color: {t.accent};
    font-size: 18px;
    font-weight: 800;
}}
#metricTitle {{
    color: #93A7B9;
    font-size: 12px;
    font-weight: 600;
}}
#metricValue {{
    color: #F6F8FA;
    font-size: 27px;
    font-weight: 800;
}}
#metricSuffix {{
    color: {t.accent};
    font-size: 12px;
    font-weight: 700;
    padding-top: 8px;
}}
#metricHint {{
    color: #647B8F;
    font-size: 10px;
}}
#dashboardPanel {{
    background: #0C1A28;
    border: 1px solid #263E54;
    border-radius: 15px;
}}
#sectionTitle {{
    color: #EAF0F5;
    font-size: 14px;
    font-weight: 800;
}}
#sectionSubtitle {{
    color: #6F8497;
    font-size: 10px;
}}
#panelMenu {{
    color: #688095;
    font-size: 15px;
}}
#emptyState {{
    color: #657B8F;
    font-size: 11px;
}}
#categoryChip {{
    background: #112438;
    border: 1px solid #28445D;
    border-radius: 9px;
    color: #C9D5DF;
    padding: 9px 6px;
    font-weight: 600;
}}
#queueValue {{
    color: {t.accent};
    font-size: 34px;
    font-weight: 800;
}}
#systemStatusRow {{
    background: #0F2031;
    border: 1px solid #203B52;
    border-radius: 8px;
}}
#systemStatusValue {{
    color: #8FA5B8;
    font-size: 11px;
}}
#statusMeta {{
    color: #71879B;
    font-size: 10px;
}}
#statusReady {{
    color: #73D49B;
    font-size: 10px;
    font-weight: 700;
}}
""".strip()
