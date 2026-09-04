from PySide6.QtCore import Qt
from PySide6.QtWidgets import QPushButton

from gold_label_studio.app.navigation import NavigationItem


class NavButton(QPushButton):
    def __init__(self, item: NavigationItem, parent=None) -> None:
        super().__init__(item.title_fa, parent)
        self.item = item
        self.setObjectName("navButton")
        self.setCheckable(True)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setMinimumHeight(44)
