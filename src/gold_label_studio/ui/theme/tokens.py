from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ThemeTokens:
    background: str
    surface: str
    surface_alt: str
    text_primary: str
    text_muted: str
    accent: str
    accent_hover: str
    border: str
    success: str
    danger: str
    warning: str
    radius_card: int
    radius_control: int
    control_height: int
    spacing_sm: int
    spacing_md: int
    spacing_lg: int


DARK_GOLD_TOKENS = ThemeTokens(
    background="#07111D",
    surface="#0D1A28",
    surface_alt="#132334",
    text_primary="#F4F7FB",
    text_muted="#8FA1B4",
    accent="#D6A94F",
    accent_hover="#E5BE69",
    border="#26384A",
    success="#31C978",
    danger="#EF5B5B",
    warning="#F0B44D",
    radius_card=14,
    radius_control=10,
    control_height=42,
    spacing_sm=8,
    spacing_md=12,
    spacing_lg=20,
)
