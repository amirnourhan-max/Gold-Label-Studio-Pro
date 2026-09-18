use serde_json::Value;
use std::path::{Path, PathBuf};

const ACCEPTANCE_MARKER: &str = "GLSP_ACCEPTANCE_HARNESS_V1";
const REPORT_FILE: &str = "glsp-acceptance-v0.2.2.json";

fn report_path() -> PathBuf {
    std::env::temp_dir().join(REPORT_FILE)
}

fn read_report(path: &Path) -> Result<Option<Value>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let contents = std::fs::read_to_string(path)
        .map_err(|error| format!("could not read acceptance report: {error}"))?;
    serde_json::from_str(&contents)
        .map(Some)
        .map_err(|error| format!("could not parse acceptance report: {error}"))
}

fn write_report(path: &Path, report: &Value) -> Result<(), String> {
    if report.get("marker").and_then(Value::as_str) != Some(ACCEPTANCE_MARKER) {
        return Err("invalid acceptance report marker".to_owned());
    }
    let contents = serde_json::to_vec_pretty(report)
        .map_err(|error| format!("could not serialize acceptance report: {error}"))?;
    std::fs::write(path, contents)
        .map_err(|error| format!("could not write acceptance report: {error}"))
}

#[tauri::command]
pub fn acceptance_read_report() -> Result<Option<Value>, String> {
    read_report(&report_path())
}

#[tauri::command]
pub fn acceptance_write_report(report: Value) -> Result<(), String> {
    write_report(&report_path(), &report)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn report_round_trip_requires_the_acceptance_marker() {
        let path = std::env::temp_dir().join(format!(
            "glsp-acceptance-test-{}.json",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&path);
        let report = json!({ "marker": ACCEPTANCE_MARKER, "phase": "first-run-complete" });

        write_report(&path, &report).expect("the valid report should be written");
        assert_eq!(read_report(&path).expect("the report should be readable"), Some(report));
        assert!(write_report(&path, &json!({ "phase": "failed" })).is_err());

        let _ = std::fs::remove_file(path);
    }
}
