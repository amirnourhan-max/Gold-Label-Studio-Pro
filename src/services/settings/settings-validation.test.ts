import { describe, expect, it } from "vitest";
import { isSettingsValid, validateSettings } from "./settings-validation";
import { approvedSettingsSnapshot } from "./settings-contract";

describe("settings validation", () => {
  it("accepts the approved snapshot", () => {
    expect(validateSettings(approvedSettingsSnapshot)).toEqual([]);
    expect(isSettingsValid(approvedSettingsSnapshot)).toBe(true);
  });

  it("requires scale identification and a positive baud rate", () => {
    const issues = validateSettings({
      ...approvedSettingsSnapshot,
      scale: { ...approvedSettingsSnapshot.scale, scaleModel: "  ", baudRate: "0" },
    });

    expect(issues.map(issue => issue.field)).toEqual(["scale.scaleModel", "scale.baudRate"]);
    expect(issues[0]?.message).toContain("مدل ترازو");
  });

  it("rejects label sizes outside the printer column limits", () => {
    const issues = validateSettings({
      ...approvedSettingsSnapshot,
      printer: { ...approvedSettingsSnapshot.printer, labelSize: "900 × 30 mm" },
    });

    expect(issues.map(issue => issue.field)).toEqual(["printer.labelSize"]);
  });

  it("requires a backup path only while automatic backup is enabled", () => {
    const disabled = validateSettings({
      ...approvedSettingsSnapshot,
      backup: { ...approvedSettingsSnapshot.backup, enabled: false, destinationPath: " " },
    });
    expect(disabled).toEqual([]);

    const enabled = validateSettings({
      ...approvedSettingsSnapshot,
      backup: { ...approvedSettingsSnapshot.backup, destinationPath: "" },
    });
    expect(enabled.map(issue => issue.field)).toEqual(["backup.destinationPath"]);
  });
});
