# Gold Label Studio Pro

Windows desktop application for professional jewelry labeling, product tracking, packaging and outbound scanning.

## Phase 1
The current phase establishes the Python 3.13 / PySide6 application foundation, centralized Dark + Gold RTL theme, shell, navigation, logging and test harness. Business workflows are intentionally deferred until each UI page is approved.

## Development
```powershell
py -3.13 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
python -m pytest -v
python -m ruff check src tests
python -m gold_label_studio --smoke-test
```
