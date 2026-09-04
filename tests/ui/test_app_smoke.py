from gold_label_studio.app.bootstrap import create_main_window


def test_main_window_constructs(qtbot):
    window = create_main_window()
    qtbot.addWidget(window)
    assert window.windowTitle() == "Gold Label Studio Pro"
    assert window.page_host.count() >= 1
