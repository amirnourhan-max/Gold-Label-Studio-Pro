import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const required = name => {
  const value = args.get(name);
  if (!value) throw new Error(`Missing required argument ${name}`);
  return value;
};

const [width, height] = required("--size").split(",").map(Number);
if (!Number.isInteger(width) || !Number.isInteger(height)) throw new Error("--size must be WIDTH,HEIGHT");

const output = resolve(required("--output"));
const executablePath = required("--browser");
const url = required("--url");
await mkdir(dirname(output), { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });

  const designer = page.locator('[data-testid="label-designer-page"]');
  await designer.waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("region", { name: "ابزارهای طراحی" }).waitFor({ state: "visible" });
  await page.locator('[data-testid="label-canvas-surface"]').waitFor({ state: "visible" });
  await page.getByRole("region", { name: "خواص عنصر" }).waitFor({ state: "visible" });
  await page.getByRole("region", { name: "قالب‌های ذخیره‌شده" }).waitFor({ state: "visible" });

  for (const forbidden of [
    "در حال آماده‌سازی پایگاه داده...",
    "ورود به حساب کاربری",
    "راه‌اندازی اولیه",
    "بارگذاری قالب‌ها ناموفق بود",
  ]) {
    if (await page.getByText(forbidden, { exact: false }).count()) {
      throw new Error(`Label Designer visual check reached forbidden screen/state: ${forbidden}`);
    }
  }

  const toolbox = page.getByRole("toolbar", { name: "فهرست ابزارهای طراحی" });
  const surface = page.locator('[data-testid="label-canvas-surface"]');
  for (const [tool, kind, point] of [
    ["متن", "text", { x: 180, y: 95 }],
    ["کد QR", "qr", { x: 420, y: 100 }],
    ["بارکد", "barcode", { x: 260, y: 245 }],
  ]) {
    const elements = page.locator(`[data-element-kind="${kind}"]`);
    const before = await elements.count();
    await toolbox.getByRole("button", { name: tool, exact: true }).click();
    if (await elements.count() === before) await surface.click({ position: point });
    await elements.nth(before).waitFor({ state: "visible", timeout: 5_000 });
  }

  await designer.screenshot({ path: output, animations: "disabled" });
} finally {
  await browser.close();
}

