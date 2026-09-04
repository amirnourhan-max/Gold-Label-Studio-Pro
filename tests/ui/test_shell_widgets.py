from PySide6.QtCore import Qt

from gold_label_studio.app.navigation import PageId, default_navigation
from gold_label_studio.ui.shell import Sidebar


def test_sidebar_is_rtl_and_emits_stable_page_id(qtbot):
    sidebar = Sidebar(default_navigation())
    qtbot.addWidget(sidebar)
    assert sidebar.layoutDirection() == Qt.LayoutDirection.RightToLeft
    assert len(sidebar.buttons) == 9
    with qtbot.waitSignal(sidebar.page_requested, timeout=500) as blocker:
        sidebar.buttons[PageId.PRODUCT_REGISTRATION].click()
    assert blocker.args == [PageId.PRODUCT_REGISTRATION]
