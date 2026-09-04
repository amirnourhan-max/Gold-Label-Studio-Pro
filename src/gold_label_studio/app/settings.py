from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AppSettings:
    app_name: str
    version: str
    organization: str


def default_settings() -> AppSettings:
    return AppSettings(
        app_name="Gold Label Studio Pro",
        version="0.1.0",
        organization="AmirNourhan",
    )
