import logging
import sys
from collections.abc import Sequence

from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import QApplication

from gold_label_studio.app.logging_config import configure_logging
from gold_label_studio.app.settings import default_settings
from gold_label_studio.ui.main_window import MainWindow
from gold_label_studio.ui.theme import DARK_GOLD_TOKENS, build_stylesheet

LOGGER = logging.getLogger(__name__)


def _configure_application(app: QApplication) -> QApplication:
    settings = default_settings()
    app.setApplicationName(settings.app_name)
    app.setApplicationVersion(settings.version)
    app.setOrganizationName(settings.organization)
    app.setLayoutDirection(Qt.LayoutDirection.RightToLeft)
    app.setStyleSheet(build_stylesheet(DARK_GOLD_TOKENS))
    return app


def create_application(argv: Sequence[str] | None = None) -> QApplication:
    existing = QApplication.instance()
    if existing is not None:
        return _configure_application(existing)
    app = QApplication(list(argv) if argv is not None else sys.argv)
    return _configure_application(app)


def create_main_window() -> MainWindow:
    return MainWindow()


def run(argv: Sequence[str] | None = None) -> int:
    args = list(argv) if argv is not None else sys.argv
    configure_logging()
    try:
        app = create_application(args)
        window = create_main_window()
        window.show()
        if "--smoke-test" in args:
            QTimer.singleShot(120, app.quit)
        return app.exec()
    except Exception:
        LOGGER.exception("Application startup failed")
        return 1
