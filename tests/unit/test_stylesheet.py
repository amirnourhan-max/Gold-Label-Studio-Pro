from gold_label_studio.ui.theme.stylesheet import build_stylesheet
from gold_label_studio.ui.theme.tokens import DARK_GOLD_TOKENS


def test_stylesheet_is_rendered_from_theme_tokens():
    qss = build_stylesheet(DARK_GOLD_TOKENS)
    assert "#07111D" in qss
    assert "#0D1A28" in qss
    assert "#D6A94F" in qss
    assert "QMainWindow" in qss
    assert "#sidebar" in qss
    assert "#topBar" in qss
