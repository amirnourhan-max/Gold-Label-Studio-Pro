from PySide6.QtCore import Qt
from PySide6.QtWidgets import QFrame, QGridLayout, QHBoxLayout, QLabel, QVBoxLayout

from gold_label_studio.app.navigation import PageId
from gold_label_studio.ui.pages.base_page import BasePage


class _MetricCard(QFrame):
    def __init__(self, label: str, value: str, suffix: str = "", parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("metricCard")
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 14)
        title = QLabel(label)
        title.setObjectName("muted")
        value_label = QLabel(f"{value} {suffix}".strip())
        value_label.setObjectName("metricValue")
        layout.addWidget(title)
        layout.addWidget(value_label)


class DashboardPage(BasePage):
    def __init__(self, parent=None) -> None:
        super().__init__(PageId.DASHBOARD, "داشبورد", parent)
        header = QLabel("داشبورد")
        header.setObjectName("pageTitle")
        self.body.addWidget(header)

        sub = QLabel("نمای کلی فعالیت‌های برچسب‌گذاری و ردیابی")
        sub.setObjectName("muted")
        self.body.addWidget(sub)

        metrics = QHBoxLayout()
        metrics.setSpacing(12)
        for label, value, suffix in (
            ("محصولات امروز", "0", "عدد"),
            ("لیبل‌های چاپ‌شده", "0", "عدد"),
            ("خروج کالا", "0", "عدد"),
            ("وزن کل", "0.000", "g"),
            ("بسته‌ها", "0", "عدد"),
        ):
            metrics.addWidget(_MetricCard(label, value, suffix))
        self.body.addLayout(metrics)

        grid = QGridLayout()
        grid.setSpacing(12)
        for row, col, title in (
            (0, 0, "فعالیت روزانه"),
            (0, 1, "توزیع محصولات"),
            (0, 2, "آخرین فعالیت‌ها"),
            (1, 0, "دسترسی سریع"),
            (1, 1, "دسته‌بندی‌های اصلی"),
            (1, 2, "صف چاپ"),
        ):
            panel = QFrame()
            panel.setObjectName("contentPanel")
            panel.setMinimumHeight(170)
            p_layout = QVBoxLayout(panel)
            p_layout.setContentsMargins(16, 14, 16, 14)
            label = QLabel(title)
            label.setObjectName("panelTitle")
            p_layout.addWidget(label, alignment=Qt.AlignmentFlag.AlignTop)
            p_layout.addStretch(1)
            grid.addWidget(panel, row, col)
        self.body.addLayout(grid, stretch=1)
