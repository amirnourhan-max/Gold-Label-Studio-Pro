from pathlib import Path

from PySide6.QtWidgets import QFrame, QLabel

from gold_label_studio.ui.main_window import MainWindow
from gold_label_studio.ui.resources import dashboard_asset


REFERENCE_ASSETS = (
    "brand_diamond.png",
    "hero_jewelry.png",
    "category_ring.png",
    "category_bracelet.png",
    "category_necklace.png",
    "category_earrings.png",
    "category_tag.png",
    "category_service.png",
    "category_chain.png",
    "device_scale.png",
    "device_printer.png",
    "device_database.png",
    "trust_badge.png",
    "nav_dashboard.png",
    "nav_products.png",
    "nav_print.png",
    "nav_designer.png",
    "nav_packaging.png",
    "nav_outbound.png",
    "nav_reports.png",
    "nav_settings.png",
)


def test_approved_reference_assets_are_packaged():
    for name in REFERENCE_ASSETS:
        path = dashboard_asset(name)
        assert isinstance(path, Path)
        assert path.is_file(), name


def test_dashboard_matches_approved_reference_hierarchy(qtbot):
    window = MainWindow()
    qtbot.addWidget(window)
    window.resize(1600, 980)
    window.show()

    dashboard = window.page_host.currentWidget()

    assert dashboard.findChild(QFrame, "heroProductCard") is not None
    assert len(dashboard.findChildren(QFrame, "metricCard")) == 5
    assert dashboard.findChild(QFrame, "dailyActivityChart") is not None
    assert dashboard.findChild(QFrame, "categoryDonutChart") is not None
    assert dashboard.findChild(QFrame, "recentActivityPanel") is not None
    assert dashboard.findChild(QFrame, "quickActionsPanel") is not None
    assert dashboard.findChild(QFrame, "categoryGalleryPanel") is not None
    assert dashboard.findChild(QFrame, "printQueuePanel") is not None

    device_strip = dashboard.findChild(QFrame, "deviceStrip")
    assert device_strip is not None
    assert len(device_strip.findChildren(QFrame, "deviceCard")) == 3

    category_images = dashboard.findChildren(QLabel, "categoryImage")
    assert len(category_images) == 7


def test_sidebar_uses_fixed_reference_icons(qtbot):
    window = MainWindow()
    qtbot.addWidget(window)

    icon_labels = window.sidebar.findChildren(QLabel, "navIcon")
    assert len(icon_labels) >= 8
    assert window.sidebar.findChild(QLabel, "brandAsset") is not None
