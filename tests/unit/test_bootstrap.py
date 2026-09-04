from gold_label_studio.app.bootstrap import create_application


def test_application_has_identity_rtl_and_theme(qapp):
    app = create_application([])
    assert app.applicationName() == "Gold Label Studio Pro"
    assert app.applicationVersion() == "0.1.0"
    assert "#D6A94F" in app.styleSheet()
