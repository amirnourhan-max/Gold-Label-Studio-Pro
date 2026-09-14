/** Pull-based serial port handle. Reads return new bytes or an empty string. */
export interface SerialPortHandle {
  readonly sessionId: number;
  read(): Promise<string>;
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export interface SerialPortProvider {
  list(): Promise<readonly string[]>;
  open(port: string, baud: number): Promise<SerialPortHandle>;
}