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
        self.setFixedWidth(236)

        self._buttons: dict[PageId, NavButton] = {}
        self._group = QButtonGroup(self)
        self._group.setExclusive(True)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(7)

        brand_block = QFrame()
        brand_block.setObjectName("brandBlock")
        brand_layout = QVBoxLayout(brand_block)
        brand_layout.setContentsMargins(14, 14, 14, 14)
        brand_layout.setSpacing(5)

        brand = QLabel("◆  GOLD LABEL")
        brand.setObjectName("brandTitle")
        brand.setAlignment(Qt.AlignmentFlag.AlignCenter)
        brand_layout.addWidget(brand)

        pro = QLabel("STUDIO PRO")
        pro.setObjectName("brandPro")
        pro.setAlignment(Qt.AlignmentFlag.AlignCenter)
        brand_layout.addWidget(pro)

        subtitle = QLabel("مدیریت حرفه‌ای لیبل و ردیابی طلا")
        subtitle.setObjectName("brandSubtitle")
        subtitle.setWordWrap(True)
        subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)
        brand_layout.addWidget(subtitle)

        layout.addWidget(brand_block)
        layout.addSpacing(5)

        section = QLabel("منوی اصلی")
        section.setObjectName("sidebarSectionLabel")
        section.setAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
        layout.addWidget(section)

        for item in items:
            button = NavButton(item)
            button.clicked.connect(
                lambda checked=False, p=item.page_id: self.page_requested.emit(p)
            )
            self._group.addButton(button)
            self._buttons[item.page_id] = button
            layout.addWidget(button)

        layout.addStretch(1)

        footer = QFrame()
        footer.setObjectName("sidebarFooter")
        footer_layout = QVBoxLayout(footer)
        footer_layout.setContentsMargins(10, 10, 10, 10)
        footer_layout.setSpacing(2)

        footer_title = QLabel("Gold Label Studio Pro")
        footer_title.setObjectName("sidebarFooterTitle")
        footer_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        footer_layout.addWidget(footer_title)

        version = QLabel("Version 0.1.0 • Phase 1")
        version.setObjectName("sidebarFooterMeta")
        version.setAlignment(Qt.AlignmentFlag.AlignCenter)
        footer_layout.addWidget(version)

        layout.addWidget(footer)

    @property
    def buttons(self) -> dict[PageId, NavButton]:
        return dict(self._buttons)

    def select(self, page_id: PageId) -> None:
        button = self._buttons.get(page_id)
        if button is not None:
            button.setChecked(True)
