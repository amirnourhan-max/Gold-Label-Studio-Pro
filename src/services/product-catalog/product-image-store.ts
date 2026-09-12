export const maxProductImageBytes = 8 * 1024 * 1024;

export type ProductImageInput = Readonly<{
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

export interface ProductImageFileAdapter {
  write(reference: string, contents: Uint8Array): Promise<void>;
  read(reference: string): Promise<Uint8Array>;
  remove(reference: string): Promise<void>;
}

export interface ProductImageStorage {
  save(productId: string, image: ProductImageInput): Promise<string>;
  load(reference: string): Promise<string>;
  remove(reference: string): Promise<void>;
}

const extensionByMime = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const mimeByExtension: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const encodeBase64 = (contents: Uint8Array): string => {
  let binary = "";
  for (let offset = 0; offset < contents.length; offset += 32_768) {
    binary += String.fromCharCode(...contents.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
};

export class ProductImageStore implements ProductImageStorage {
  constructor(private readonly adapter: ProductImageFileAdapter) {}

  async save(productId: string, image: ProductImageInput): Promise<string> {
    const extension = extensionByMime[image.type as keyof typeof extensionByMime];
    if (!extension) {
      throw new Error("فرمت تصویر باید PNG، JPEG یا WebP باشد.");
    }
    if (image.size <= 0 || image.size > maxProductImageBytes) {
      throw new Error("حجم تصویر باید کمتر از ۸ مگابایت باشد.");
    }
    if (!/^[a-zA-Z0-9-]+$/.test(productId)) {
      throw new Error("شناسه محصول برای ذخیره تصویر معتبر نیست.");
    }

    const reference = `product-images/${productId}.${extension}`;
    await this.adapter.write(reference, new Uint8Array(await image.arrayBuffer()));
    return reference;
  }

  async load(reference: string): Promise<string> {
    const extension = reference.split(".").pop()?.toLowerCase() ?? "";
    const mime = mimeByExtension[extension];
    if (!mime) throw new Error("فرمت تصویر ذخیره‌شده پشتیبانی نمی‌شود.");
    const contents = await this.adapter.read(reference);
    return `data:${mime};base64,${encodeBase64(contents)}`;
  }

  remove(reference: string): Promise<void> {
    return this.adapter.remove(reference);
  }
}
