# Product Registration and Category UI Design

## Goal

Deliver a Windows preview executable for visual approval of the Gold Label Studio Pro product-registration phase.

## Included in this preview

- A dedicated Persian RTL `ثبت محصول` page.
- Image-based product categories using fixed local assets.
- Product information form.
- Weight and karat/fineness inputs as UI only.
- Product image picker with local preview/removal only.
- Responsive layout at 1600×900 and 1366×768.
- Existing Dashboard, dark navy/charcoal surfaces, gold accents, branding, and Windows shell remain intact.

The form mirrors the approved reference: `گروه محصول`, `زیرگروه`, `نام محصول`, `وزن (گرم)`, `عیار`, `سایز`, `تعداد چاپ`, `قالب چاپ`, `توضیحات`, `ثبت در موجودی`, and `افزودن به صف چاپ`. The visible actions are `پاک کردن`, `ثبت`, and `چاپ و ثبت`.

## Explicitly excluded

- Real scale integration.
- Database or durable product persistence.
- QR generation or scanning.
- Label-printing integration.
- Inventory, print-queue, or other business logic.

Controls may update local component state to demonstrate the layout, category selection, responsive behavior, and image preview, but they must not claim that a product, inventory item, queue entry, or print job was persisted.

## Pixel-accurate visual source

`docs/reference/product-registration-approved.png` is the binding source of truth for this screen. The implementation must reproduce its proportions, hierarchy, alignment, borders, colors, spacing, typography scale, and visual density as closely as browser rendering allows.

## Visual structure

The page keeps the existing left navigation and top bar. Its central content reproduces the reference breadcrumb/title and one bordered `اطلاعات محصول` surface:

- left internal column: stacked category/group accordions with gold jewelry artwork;
- center: subgroup, product name, internal code, weight, manual weight, karat, size, quantity, workshop, label-template, notes, and inventory-state controls;
- right internal column: large product image, image actions, and a static label/QR visual preview;
- far-right status rail: visual-only scale, label printer, and database status cards;
- bottom action row: `چاپ`, `ثبت`, `چاپ و ثبت`, and `پاک کردن فرم` in the same visual order and color hierarchy as the reference.

The status cards, weight-from-scale control, QR preview, print buttons, and database labels are strictly presentational in this phase. At narrower desktop widths the layout may compress and scroll vertically, but must not horizontally clip.

## Verification

Component tests verify the exact visible fields, category images, image preview behavior, explicit preview-only messaging, and navigation. The full existing Dashboard suite must remain green. GitHub Actions must build and smoke-launch the Windows executable before the artifact is delivered.
