from gold_label_studio.ui.theme.tokens import DARK_GOLD_TOKENS


def test_dark_gold_theme_has_required_design_tokens():
    t = DARK_GOLD_TOKENS
    assert t.background == "#07111D"
    assert t.surface == "#0D1A28"
    assert t.surface_alt == "#132334"
    assert t.text_primary == "#F4F7FB"
    assert t.text_muted == "#8FA1B4"
    assert t.accent == "#D6A94F"
    assert t.accent_hover == "#E5BE69"
    assert t.border == "#26384A"
    assert t.radius_card == 14
    assert t.control_height == 42
    assert t.spacing_md == 12
