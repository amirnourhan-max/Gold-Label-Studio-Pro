from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import QButtonGroup, QFrame, QLabel, QVBoxLayout

from gold_label_studio.app.navigation import NavigationItem, PageId
from gold_label_studio.ui.widgets import NavButton


class Sidebar(QFrame):
    page_requested = Signal(object)

    def __init__(self, items: tuple[NavigationItem, ...], parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("sidebar")
        self.setLayoutDirection(Qt.LayoutDirection.RightToLeft)
        self.setFixedWidth(210)
        self._buttons: dict[PageId, NavButton] = {}
        self._group = QButtonGroup(self)
        self._group.setExclusive(True)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 18, 14, 18)
        layout.setSpacing(8)

        brand = QLabel("◆  Gold Label Studio Pro")
        brand.setObjectName("accent")
        brand.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(brand)

        subtitle = QLabel("سیستم جامع برچسب‌گذاری و ردیابی طلا")
        subtitle.setObjectName("muted")
        subtitle.setWordWrap(True)
        subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(subtitle)
        layout.addSpacing(12)

        for item in items:
            button = NavButton(item)
            button.clicked.connect(
                lambda checked=False, p=item.page_id: self.page_requested.emit(p)
            )
            self._group.addButton(button)
            self._buttons[item.page_id] = button
            layout.addWidget(button)

        layout.addStretch(1)
        version = QLabel("v0.1.0")
        version.setObjectName("muted")
        version.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(version)

    @property
    def buttons(self) -> dict[PageId, NavButton]:
        return dict(self._buttons)

    def select(self, page_id: PageId) -> None:
        button = self._buttons.get(page_id)
        if button is not None:
            button.setChecked(True)
