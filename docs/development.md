# Development Guide

## Requirements
- Windows 10/11
- Python 3.13 x64

## Setup
```powershell
py -3.13 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
```

## Verification
```powershell
python -m pytest -v
python -m ruff check src tests
python -m compileall -q src
python -m gold_label_studio --smoke-test
```

Phase 1 intentionally contains no scale protocol, persistence, QR generation, printer communication, packaging rules, or outbound transaction logic.
