type VisualTestEnvironment = Readonly<Record<string, unknown>>;

/** Build-time gate for deterministic screenshots; normal production is false. */
export const visualTestModeEnabled = (environment: VisualTestEnvironment = import.meta.env): boolean =>
  environment.VITE_VISUAL_TEST_MODE === "1";

