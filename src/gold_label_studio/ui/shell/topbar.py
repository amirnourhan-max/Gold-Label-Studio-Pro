from PySide6.QtCore import Qt
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLabel, QLineEdit, QVBoxLayout


class _InfoChip(QFrame):
    def __init__(self, title: str, value: str, object_name: str, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName(object_name)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 7, 12, 7)
        layout.setSpacing(0)

        title_label = QLabel(title)
        title_label.setObjectName("chipTitle")
        value_label = QLabel(value)
        value_label.setObjectName("chipValue")
        layout.addWidget(title_label)
        layout.addWidget(value_label)


class TopBar(QFrame):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("topBar")
        self.setFixedHeight(76)
        self.setLayoutDirection(Qt.LayoutDirection.RightToLeft)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 10, 16, 10)
        layout.setSpacing(10)

        user = _InfoChip("کاربر فعال", "مدیر سیستم", "userChip")
        layout.addWidget(user)

        device = _InfoChip("وضعیت سیستم", "● آماده", "deviceChip")
        layout.addWidget(device)

        layout.addStretch(1)

        search_container = QFrame()
        search_container.setObjectName("searchContainer")
        search_layout = QHBoxLayout(search_container)
        search_layout.setContentsMargins(12, 0, 12, 0)
        search_layout.setSpacing(8)

        search_icon = QLabel("⌕")
        search_icon.setObjectName("searchIcon")
        search_layout.addWidget(search_icon)

        search = QLineEdit()
        search.setObjectName("globalSearch")
        search.setPlaceholderText("جستجو در محصولات، کد، مشتری یا بسته...")
        search.setClearButtonEnabled(True)
        search.setMinimumWidth(440)
        search.setMaximumWidth(620)
        search_layout.addWidget(search, stretch=1)

        hint = QLabel("Ctrl+K")
        hint.setObjectName("searchHint")
        search_layout.addWidget(hint)

        layout.addWidget(search_container)
