import {
  BaseDirectory,
  mkdir,
  readFile,
  remove,
  writeFile,
} from "@tauri-apps/plugin-fs";
import type { ProductImageFileAdapter } from "./product-image-store";

export class TauriProductImageFileAdapter implements ProductImageFileAdapter {
  async write(reference: string, contents: Uint8Array): Promise<void> {
    await mkdir("product-images", { baseDir: BaseDirectory.AppLocalData, recursive: true });
    await writeFile(reference, contents, { baseDir: BaseDirectory.AppLocalData });
  }

  read(reference: string): Promise<Uint8Array> {
    return readFile(reference, { baseDir: BaseDirectory.AppLocalData });
  }

  async remove(reference: string): Promise<void> {
    await remove(reference, { baseDir: BaseDirectory.AppLocalData });
  }
}
