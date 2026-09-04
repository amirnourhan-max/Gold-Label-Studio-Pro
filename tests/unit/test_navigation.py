from gold_label_studio.app.navigation import PageId, default_navigation


def test_default_navigation_has_exact_order_and_persian_labels():
    items = default_navigation()
    assert [item.page_id for item in items] == [
        PageId.DASHBOARD,
        PageId.PRODUCT_REGISTRATION,
        PageId.LABEL_PRINT,
        PageId.LABEL_DESIGNER,
        PageId.PACKAGING,
        PageId.OUTBOUND,
        PageId.PRODUCTS,
        PageId.REPORTS,
        PageId.SETTINGS,
    ]
    assert [item.title_fa for item in items] == [
        "داشبورد",
        "ثبت محصول",
        "چاپ لیبل",
        "طراح لیبل",
        "بسته‌بندی",
        "خروج کالا",
        "محصولات",
        "گزارش‌ها",
        "تنظیمات",
    ]
    assert all(item.icon_key for item in items)
