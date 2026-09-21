use serde::Serialize;
use serde_json::{json, Value};
use std::ffi::OsString;
use std::path::{Path, PathBuf};

const ACCEPTANCE_MARKER: &str = "GLSP_ACCEPTANCE_HARNESS_V1";
const REPORT_ARGUMENT_PREFIX: &str = "--acceptance-report=";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptanceConfig {
    enabled: bool,
    display_name: &'static str,
    username: &'static str,
    password: &'static str,
    confirmation: &'static str,
}

fn acceptance_config() -> AcceptanceConfig {
    AcceptanceConfig {
        enabled: report_path_from(std::env::args_os()).is_some(),
        display_name: "CI Administrator",
        username: "glsp_ci_admin",
        password: "GLSP-CI-Only-1405!",
        confirmation: "GLSP-CI-Only-1405!",
    }
}

fn report_path_from(args: impl IntoIterator<Item = OsString>) -> Option<PathBuf> {
    args.into_iter().find_map(|argument| {
        let argument = argument.to_string_lossy();
        argument
            .strip_prefix(REPORT_ARGUMENT_PREFIX)
            .filter(|path| !path.is_empty())
            .map(PathBuf::from)
    })
}

fn report_path() -> Result<PathBuf, String> {
    report_path_from(std::env::args_os())
        .ok_or_else(|| "acceptance report path was not provided".to_owned())
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

fn initialize_process_report_at(path: &Path) -> Result<(), String> {
    write_report(path, &json!({
        "marker": ACCEPTANCE_MARKER,
        "phase": "process-started",
    }))
}

pub fn initialize_process_report() -> Result<(), String> {
    if let Some(path) = report_path_from(std::env::args_os()) {
        initialize_process_report_at(&path)?;
    }
    Ok(())
}

#[tauri::command]
pub fn acceptance_get_config() -> AcceptanceConfig {
    acceptance_config()
}

#[tauri::command]
pub fn acceptance_read_report() -> Result<Option<Value>, String> {
    read_report(&report_path()?)
}

#[tauri::command]
pub fn acceptance_write_report(report: Value) -> Result<(), String> {
    write_report(&report_path()?, &report)
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

    #[test]
    fn report_path_comes_from_the_explicit_process_argument() {
        let expected = PathBuf::from(r"D:\a\_temp\glsp acceptance.json");
        let args = [
            OsString::from("gold-label-studio-pro.exe"),
            OsString::from(format!(
                "{REPORT_ARGUMENT_PREFIX}{}",
                expected.display()
            )),
        ];

        assert_eq!(report_path_from(args), Some(expected));
        assert_eq!(report_path_from([OsString::from("gold-label-studio-pro.exe")]), None);
    }

    #[test]
    fn acceptance_config_contains_the_ci_identity() {
        let config = acceptance_config();

        assert_eq!(config.display_name, "CI Administrator");
        assert_eq!(config.username, "glsp_ci_admin");
        assert_eq!(config.password, config.confirmation);
    }

    #[test]
    fn process_start_writes_the_first_diagnostic_phase() {
        let path = std::env::temp_dir().join(format!(
            "glsp-acceptance-process-test-{}.json",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&path);

        initialize_process_report_at(&path).expect("process report should be written");

        let report = read_report(&path)
            .expect("process report should be readable")
            .expect("process report should exist");
        assert_eq!(report["marker"], ACCEPTANCE_MARKER);
        assert_eq!(report["phase"], "process-started");

        let _ = std::fs::remove_file(path);
    }
}
