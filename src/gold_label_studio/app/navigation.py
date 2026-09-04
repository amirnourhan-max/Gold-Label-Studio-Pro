from dataclasses import dataclass
from enum import StrEnum


class PageId(StrEnum):
    DASHBOARD = "dashboard"
    PRODUCT_REGISTRATION = "product_registration"
    LABEL_PRINT = "label_print"
    LABEL_DESIGNER = "label_designer"
    PACKAGING = "packaging"
    OUTBOUND = "outbound"
    PRODUCTS = "products"
    REPORTS = "reports"
    SETTINGS = "settings"


@dataclass(frozen=True, slots=True)
class NavigationItem:
    page_id: PageId
    title_fa: str
    icon_key: str


def default_navigation() -> tuple[NavigationItem, ...]:
    return (
        NavigationItem(PageId.DASHBOARD, "داشبورد", "home"),
        NavigationItem(PageId.PRODUCT_REGISTRATION, "ثبت محصول", "plus-square"),
        NavigationItem(PageId.LABEL_PRINT, "چاپ لیبل", "printer"),
        NavigationItem(PageId.LABEL_DESIGNER, "طراح لیبل", "palette"),
        NavigationItem(PageId.PACKAGING, "بسته‌بندی", "package"),
        NavigationItem(PageId.OUTBOUND, "خروج کالا", "log-out"),
        NavigationItem(PageId.PRODUCTS, "محصولات", "boxes"),
        NavigationItem(PageId.REPORTS, "گزارش‌ها", "bar-chart"),
        NavigationItem(PageId.SETTINGS, "تنظیمات", "settings"),
    )
