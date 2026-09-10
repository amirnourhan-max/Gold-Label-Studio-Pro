import { describe, expect, it } from "vitest";
import { backupPreparationStages } from "./backup-preparation";

describe("WAL-safe backup contract", () => {
  it("requires a coherent checkpoint, copy validation, and reopen sequence", () => {
    expect(backupPreparationStages).toEqual([
      "checkpoint",
      "close-or-quiesce",
      "copy-coherent-database-set",
      "validate-copy",
      "reopen",
    ]);
  });
});
