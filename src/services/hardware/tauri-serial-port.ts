import { invoke } from "@tauri-apps/api/core";
import type { SerialPortHandle, SerialPortProvider } from "./serial-port";

/**
 * Real serial transport backed by the Rust `serial_*` commands
 * (src-tauri/src/hardware.rs). The frontend only ever sees strings; the
 * driver owns the COM handle and the read/write semantics.
 */
export class TauriSerialPortProvider implements SerialPortProvider {
  async list(): Promise<readonly string[]> {
    const ports = await invoke<string[]>("serial_list");
    return ports ?? [];
  }

  async open(port: string, baud: number): Promise<SerialPortHandle> {
    const sessionId = await invoke<number>("serial_open", { port, baud });
    return new TauriSerialPortHandle(sessionId);
  }
}

class TauriSerialPortHandle implements SerialPortHandle {
  constructor(readonly sessionId: number) {}

  read(): Promise<string> {
    return invoke<string>("serial_read", { sessionId: this.sessionId });
  }

  write(data: string): Promise<void> {
    return invoke<void>("serial_write", { sessionId: this.sessionId, data });
  }

  close(): Promise<void> {
    return invoke<void>("serial_close", { sessionId: this.sessionId });
  }
}