from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QVBoxLayout,
)

from gold_label_studio.app.navigation import PageId
from gold_label_studio.ui.pages.base_page import BasePage


class _MetricCard(QFrame):
    def __init__(
        self,
        icon: str,
        label: str,
        value: str,
        suffix: str,
        hint: str,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.setObjectName("metricCard")
        self.setMinimumHeight(112)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 13)
        layout.setSpacing(7)

        top = QHBoxLayout()
        top.setSpacing(8)
        icon_label = QLabel(icon)
        icon_label.setObjectName("metricIcon")
        top.addWidget(icon_label)

        title = QLabel(label)
        title.setObjectName("metricTitle")
        top.addWidget(title)
        top.addStretch(1)
        layout.addLayout(top)

        value_row = QHBoxLayout()
        value_row.setSpacing(5)
        value_label = QLabel(value)
        value_label.setObjectName("metricValue")
        value_row.addWidget(value_label)

        suffix_label = QLabel(suffix)
        suffix_label.setObjectName("metricSuffix")
        value_row.addWidget(suffix_label)
        value_row.addStretch(1)
        layout.addLayout(value_row)

        hint_label = QLabel(hint)
        hint_label.setObjectName("metricHint")
        layout.addWidget(hint_label)


class _DashboardPanel(QFrame):
    def __init__(self, title: str, subtitle: str, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("dashboardPanel")
        self.setMinimumHeight(198)

        self.layout_root = QVBoxLayout(self)
        self.layout_root.setContentsMargins(16, 14, 16, 14)
        self.layout_root.setSpacing(10)

        header = QHBoxLayout()
        title_label = QLabel(title)
        title_label.setObjectName("sectionTitle")
        header.addWidget(title_label)
        header.addStretch(1)

        more = QLabel("•••")
        more.setObjectName("panelMenu")
        header.addWidget(more)
        self.layout_root.addLayout(header)

        subtitle_label = QLabel(subtitle)
        subtitle_label.setObjectName("sectionSubtitle")
        self.layout_root.addWidget(subtitle_label)


class DashboardPage(BasePage):
    def __init__(self, parent=None) -> None:
        super().__init__(PageId.DASHBOARD, "داشبورد", parent)
        self.body.setContentsMargins(18, 4, 18, 12)
        self.body.setSpacing(12)

        hero = QFrame()
        hero.setObjectName("dashboardHero")
        hero_layout = QHBoxLayout(hero)
        hero_layout.setContentsMargins(18, 14, 18, 14)

        hero_text = QVBoxLayout()
        hero_text.setSpacing(2)
        title = QLabel("داشبورد")
        title.setObjectName("pageTitle")
        hero_text.addWidget(title)

        subtitle = QLabel("نمای کلی عملیات امروز، وضعیت چاپ و گردش محصولات")
        subtitle.setObjectName("pageSubtitle")
        hero_text.addWidget(subtitle)
        hero_layout.addLayout(hero_text)

        hero_layout.addStretch(1)

        date_chip = QLabel("امروز  •  محیط کارگاه")
        date_chip.setObjectName("heroChip")
        hero_layout.addWidget(date_chip)
        self.body.addWidget(hero)

        metrics = QGridLayout()
        metrics.setHorizontalSpacing(12)
        metrics.setVerticalSpacing(12)
        metric_data = (
            ("◇", "محصولات امروز", "0", "عدد", "ثبت‌شده در شیفت جاری"),
            ("▣", "لیبل‌های چاپ‌شده", "0", "عدد", "چاپ موفق امروز"),
            ("↗", "خروج کالا", "0", "عدد", "خروج ثبت‌شده امروز"),
            ("◉", "وزن کل", "0.000", "g", "مجموع وزن ثبت‌شده"),
        )
        for column, data in enumerate(metric_data):
            metrics.addWidget(_MetricCard(*data), 0, column)
        self.body.addLayout(metrics)

        panels = QGridLayout()
        panels.setHorizontalSpacing(12)
        panels.setVerticalSpacing(12)

        activity = _DashboardPanel("آخرین فعالیت‌ها", "رویدادهای اخیر سیستم")
        empty_activity = QLabel("هنوز فعالیتی ثبت نشده است")
        empty_activity.setObjectName("emptyState")
        empty_activity.setAlignment(Qt.AlignmentFlag.AlignCenter)
        activity.layout_root.addStretch(1)
        activity.layout_root.addWidget(empty_activity)
        activity.layout_root.addStretch(1)
        panels.addWidget(activity, 0, 0, 1, 2)

        quick = _DashboardPanel("دسترسی سریع", "عملیات پرتکرار کارگاه")
        quick_grid = QGridLayout()
        quick_grid.setSpacing(8)
        for index, (icon, text) in enumerate(
            (
                ("＋", "ثبت محصول"),
                ("▣", "چاپ لیبل"),
                ("□", "بسته‌بندی"),
                ("↗", "خروج کالا"),
            )
        ):
            button = QPushButton(f"{icon}   {text}")
            button.setObjectName("quickActionButton")
            button.setMinimumHeight(46)
            quick_grid.addWidget(button, index // 2, index % 2)
        quick.layout_root.addLayout(quick_grid)
        quick.layout_root.addStretch(1)
        panels.addWidget(quick, 0, 2)

        categories = _DashboardPanel("دسته‌بندی محصولات", "نمای سریع گروه‌های اصلی")
        category_grid = QGridLayout()
        category_grid.setSpacing(8)
        for index, name in enumerate(("انگشتر", "دستبند", "سرویس", "گردنبند", "زنجیر", "گوشواره")):
            chip = QLabel(name)
            chip.setObjectName("categoryChip")
            chip.setAlignment(Qt.AlignmentFlag.AlignCenter)
            category_grid.addWidget(chip, index // 3, index % 3)
        categories.layout_root.addLayout(category_grid)
        categories.layout_root.addStretch(1)
        panels.addWidget(categories, 1, 0)

        queue = _DashboardPanel("صف چاپ", "وضعیت لیبل‌های آماده چاپ")
        queue_value = QLabel("0")
        queue_value.setObjectName("queueValue")
        queue_value.setAlignment(Qt.AlignmentFlag.AlignCenter)
        queue.layout_root.addStretch(1)
        queue.layout_root.addWidget(queue_value)
        queue_hint = QLabel("مورد در انتظار چاپ")
        queue_hint.setObjectName("emptyState")
        queue_hint.setAlignment(Qt.AlignmentFlag.AlignCenter)
        queue.layout_root.addWidget(queue_hint)
        queue.layout_root.addStretch(1)
        panels.addWidget(queue, 1, 1)

        operations = QFrame()
        operations.setObjectName("operationsSummary")
        operations_layout = QVBoxLayout(operations)
        operations_layout.setContentsMargins(14, 10, 14, 10)
        operations_layout.setSpacing(5)
        operations_title = QLabel("وضعیت عملیات")
        operations_title.setObjectName("operationsTitle")
        operations_layout.addWidget(operations_title)
        operations_meta = QLabel("ترازو و چاپگر از نوار وضعیت کنترل می‌شوند")
        operations_meta.setObjectName("operationsMeta")
        operations_layout.addWidget(operations_meta)
        quick.layout_root.addWidget(operations)

        panels.setColumnStretch(0, 1)
        panels.setColumnStretch(1, 1)
        panels.setColumnStretch(2, 1)
        panels.setRowStretch(0, 1)
        panels.setRowStretch(1, 1)
        self.body.addLayout(panels, stretch=1)
