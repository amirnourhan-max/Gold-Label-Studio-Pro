from pathlib import Path

from PySide6.QtCore import QTimer

from gold_label_studio.app.bootstrap import create_application, create_main_window


def main() -> int:
    app = create_application(["capture-ui"])
    window = create_main_window()
    window.resize(1440, 900)
    window.show()
    app.processEvents()

    output_dir = Path("artifacts")
    output_dir.mkdir(parents=True, exist_ok=True)
    target = output_dir / "phase1-dashboard.png"

    def capture() -> None:
        pixmap = window.grab()
        if not pixmap.save(str(target), "PNG"):
            raise RuntimeError(f"Could not save UI screenshot to {target}")
        window.close()
        app.quit()

    QTimer.singleShot(300, capture)
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
