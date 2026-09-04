from PySide6.QtCore import Qt
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLabel


class AppStatusBar(QFrame):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("statusBar")
        self.setFixedHeight(38)
        self.setLayoutDirection(Qt.LayoutDirection.RightToLeft)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(14, 4, 14, 4)
        layout.addWidget(QLabel("نسخه 0.1.0"))
        layout.addStretch(1)
        ready = QLabel("● آماده")
        ready.setObjectName("accent")
        layout.addWidget(ready)
