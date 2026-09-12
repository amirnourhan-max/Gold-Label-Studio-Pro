import { describe, expect, it } from "vitest";
import { ProductImageStore, type ProductImageFileAdapter, type ProductImageInput } from "./product-image-store";

class MemoryImageAdapter implements ProductImageFileAdapter {
  readonly files = new Map<string, Uint8Array>();

  async write(reference: string, contents: Uint8Array): Promise<void> {
    this.files.set(reference, contents);
  }

  async read(reference: string): Promise<Uint8Array> {
    const contents = this.files.get(reference);
    if (!contents) throw new Error("missing image");
    return contents;
  }

  async remove(reference: string): Promise<void> {
    this.files.delete(reference);
  }
}

const image = (type: string, name = "ring.webp", bytes = [1, 2, 3]): ProductImageInput => ({
  name,
  type,
  size: bytes.length,
  arrayBuffer: async () => Uint8Array.from(bytes).buffer,
});

describe("ProductImageStore", () => {
  it("stores supported product images below the deterministic product directory", async () => {
    const adapter = new MemoryImageAdapter();
    const store = new ProductImageStore(adapter);

    const reference = await store.save("product-1", image("image/webp"));

    expect(reference).toBe("product-images/product-1.webp");
    expect([...adapter.files.get(reference)!]).toEqual([1, 2, 3]);
  });

  it.each([
    ["image/jpeg", "product-images/product-1.jpg"],
    ["image/png", "product-images/product-1.png"],
  ])("maps %s to a stable file extension", async (type, expected) => {
    const store = new ProductImageStore(new MemoryImageAdapter());
    await expect(store.save("product-1", image(type))).resolves.toBe(expected);
  });

  it("rejects unsupported and oversized files before writing", async () => {
    const adapter = new MemoryImageAdapter();
    const store = new ProductImageStore(adapter);

    await expect(store.save("product-1", image("image/svg+xml"))).rejects.toThrow("PNG، JPEG یا WebP");
    await expect(store.save("product-1", {
      ...image("image/webp"),
      size: 8 * 1024 * 1024 + 1,
    })).rejects.toThrow("۸ مگابایت");
    expect(adapter.files.size).toBe(0);
  });

  it("loads a persisted image for UI display and can remove it during rollback", async () => {
    const adapter = new MemoryImageAdapter();
    const store = new ProductImageStore(adapter);
    const reference = await store.save("product-1", image("image/png", "ring.png", [137, 80, 78, 71]));

    await expect(store.load(reference)).resolves.toBe("data:image/png;base64,iVBORw==");
    await store.remove(reference);

    expect(adapter.files.has(reference)).toBe(false);
  });
});
