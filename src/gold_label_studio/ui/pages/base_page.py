from PySide6.QtCore import Qt
from PySide6.QtWidgets import QVBoxLayout, QWidget

from gold_label_studio.app.navigation import PageId


class BasePage(QWidget):
    def __init__(self, page_id: PageId, title: str, parent=None) -> None:
        super().__init__(parent)
        self.page_id = page_id
        self.title = title
        self.setObjectName(f"page_{page_id.value}")
        self.setLayoutDirection(Qt.LayoutDirection.RightToLeft)
        self.body = QVBoxLayout(self)
        self.body.setContentsMargins(20, 20, 20, 20)
        self.body.setSpacing(14)
