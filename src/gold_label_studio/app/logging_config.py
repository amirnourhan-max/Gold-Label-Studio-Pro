import logging
from pathlib import Path


def configure_logging(log_dir: Path | None = None) -> None:
    target_dir = log_dir or (Path.home() / ".gold-label-studio" / "logs")
    target_dir.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        handlers=[
            logging.FileHandler(target_dir / "app.log", encoding="utf-8"),
            logging.StreamHandler(),
        ],
        force=True,
    )
