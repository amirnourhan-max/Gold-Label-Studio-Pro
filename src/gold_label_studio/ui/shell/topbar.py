from PySide6.QtCore import Qt
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLabel, QLineEdit


class TopBar(QFrame):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("topBar")
        self.setFixedHeight(64)
        self.setLayoutDirection(Qt.LayoutDirection.RightToLeft)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(18, 10, 18, 10)
        layout.setSpacing(12)

        user = QLabel("مدیر سیستم")
        user.setObjectName("accent")
        layout.addWidget(user)
        layout.addStretch(1)

        search = QLineEdit()
        search.setObjectName("globalSearch")
        search.setPlaceholderText("جستجو در محصولات، کد، مشتری...")
        search.setClearButtonEnabled(True)
        search.setMaximumWidth(480)
        search.setMinimumWidth(320)
        layout.addWidget(search)
