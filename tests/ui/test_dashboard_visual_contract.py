from PySide6.QtWidgets import QFrame, QLabel, QPushButton

from gold_label_studio.ui.main_window import MainWindow


def test_dashboard_matches_approved_visual_structure(qtbot):
    window = MainWindow()
    qtbot.addWidget(window)
    window.resize(1600, 920)
    window.show()

    assert window.sidebar.width() == 236
    assert window.top_bar.height() == 76
    assert window.status_bar.height() == 34

    dashboard = window.page_host.currentWidget()
    assert dashboard.objectName() == "page_dashboard"

    hero = dashboard.findChild(QFrame, "dashboardHero")
    assert hero is not None

    metrics = dashboard.findChildren(QFrame, "metricCard")
    assert len(metrics) == 4
    assert all(card.minimumHeight() >= 112 for card in metrics)

    panels = dashboard.findChildren(QFrame, "dashboardPanel")
    assert len(panels) == 4

    quick_actions = dashboard.findChildren(QPushButton, "quickActionButton")
    assert len(quick_actions) == 4

    section_titles = dashboard.findChildren(QLabel, "sectionTitle")
    assert len(section_titles) >= 4


def test_topbar_has_professional_dashboard_controls(qtbot):
    window = MainWindow()
    qtbot.addWidget(window)

    assert window.top_bar.findChild(QFrame, "userChip") is not None
    assert window.top_bar.findChild(QFrame, "deviceChip") is not None
    search = window.top_bar.findChild(QFrame, "searchContainer")
    assert search is not None


def test_sidebar_has_brand_block_and_grouped_navigation(qtbot):
    window = MainWindow()
    qtbot.addWidget(window)

    assert window.sidebar.findChild(QFrame, "brandBlock") is not None
    assert window.sidebar.findChild(QLabel, "sidebarSectionLabel") is not None
