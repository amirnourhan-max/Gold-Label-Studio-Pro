from PySide6.QtCore import Qt
from PySide6.QtWidgets import QHBoxLayout, QMainWindow, QStackedWidget, QVBoxLayout, QWidget

from gold_label_studio.app.navigation import PageId, default_navigation
from gold_label_studio.ui.pages import BasePage, DashboardPage
from gold_label_studio.ui.shell import AppStatusBar, Sidebar, TopBar


class MainWindow(QMainWindow):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("mainWindow")
        self.setWindowTitle("Gold Label Studio Pro")
        self.setMinimumSize(1360, 780)
        self.resize(1600, 920)
        self.setLayoutDirection(Qt.LayoutDirection.RightToLeft)

        root = QWidget()
        root.setObjectName("appRoot")
        self.setCentralWidget(root)

        outer = QVBoxLayout(root)
        outer.setContentsMargins(16, 14, 16, 12)
        outer.setSpacing(12)

        self.top_bar = TopBar()
        outer.addWidget(self.top_bar)

        body = QHBoxLayout()
        body.setSpacing(14)

        self.sidebar = Sidebar(default_navigation())
        self.page_host = QStackedWidget()
        self.page_host.setObjectName("pageHost")

        body.addWidget(self.page_host, stretch=1)
        body.addWidget(self.sidebar)
        outer.addLayout(body, stretch=1)

        self.status_bar = AppStatusBar()
        outer.addWidget(self.status_bar)

        self._pages: dict[PageId, BasePage] = {}
        self._add_page(DashboardPage())
        self.sidebar.page_requested.connect(self.navigate)
        self.navigate(PageId.DASHBOARD)

    def _add_page(self, page: BasePage) -> None:
        self._pages[page.page_id] = page
        self.page_host.addWidget(page)

    @property
    def current_page_id(self) -> PageId:
        widget = self.page_host.currentWidget()
        if isinstance(widget, BasePage):
            return widget.page_id
        return PageId.DASHBOARD

    def navigate(self, page_id: PageId) -> None:
        page = self._pages.get(page_id)
        if page is None:
            title = next(i.title_fa for i in default_navigation() if i.page_id == page_id)
            page = BasePage(page_id, title)
            self._add_page(page)
        self.page_host.setCurrentWidget(page)
        self.sidebar.select(page_id)
