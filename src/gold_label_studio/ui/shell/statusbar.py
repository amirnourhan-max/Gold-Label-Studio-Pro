from PySide6.QtCore import Qt
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLabel


class AppStatusBar(QFrame):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("statusBar")
        self.setFixedHeight(34)
        self.setLayoutDirection(Qt.LayoutDirection.RightToLeft)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 3, 12, 3)
        layout.setSpacing(14)

        version = QLabel("نسخه 0.1.0")
        version.setObjectName("statusMeta")
        layout.addWidget(version)

        layout.addStretch(1)

        printer = QLabel("چاپگر: —")
        printer.setObjectName("statusMeta")
        layout.addWidget(printer)

        scale = QLabel("ترازو: —")
        scale.setObjectName("statusMeta")
        layout.addWidget(scale)

        ready = QLabel("● سیستم آماده")
        ready.setObjectName("statusReady")
        layout.addWidget(ready)
