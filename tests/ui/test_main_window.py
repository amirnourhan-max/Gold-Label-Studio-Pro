from PySide6.QtCore import Qt

from gold_label_studio.app.navigation import PageId
from gold_label_studio.ui.main_window import MainWindow


def test_main_window_keeps_shell_and_switches_stacked_page(qtbot):
    window = MainWindow()
    qtbot.addWidget(window)
    assert window.layoutDirection() == Qt.LayoutDirection.RightToLeft
    assert window.current_page_id == PageId.DASHBOARD
    sidebar_identity = id(window.sidebar)
    window.navigate(PageId.PRODUCT_REGISTRATION)
    assert window.current_page_id == PageId.PRODUCT_REGISTRATION
    assert id(window.sidebar) == sidebar_identity
