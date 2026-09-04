from dataclasses import FrozenInstanceError

import pytest

from gold_label_studio.app.settings import default_settings


def test_default_settings_are_centralized_and_immutable():
    settings = default_settings()
    assert settings.app_name == "Gold Label Studio Pro"
    assert settings.version == "0.1.0"
    assert settings.organization == "AmirNourhan"
    with pytest.raises(FrozenInstanceError):
        settings.app_name = "Changed"
