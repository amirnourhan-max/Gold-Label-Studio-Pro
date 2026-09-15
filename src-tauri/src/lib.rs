mod database;
mod hardware;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Schema creation is owned by `database::initialize` instead of sqlx
        // migrations: sqlx refuses to open a database whose recorded migration
        // checksum differs from the compiled SQL, which made every database
        // written by an earlier build unopenable.
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            database::persistence_status,
            database::record_persistence_diagnostic,
            hardware::backup_database,
            hardware::backup_list,
            hardware::backup_validate,
            hardware::restore_database,
            hardware::relaunch_app,
            hardware::serial_list,
            hardware::serial_open,
            hardware::serial_read,
            hardware::serial_write,
            hardware::serial_close,
            hardware::print_raw,
        ])
        .setup(|app| {
            // `--database-self-check` verifies the installed persistence path and
            // exits, so the installer smoke test can assert it deterministically.
            if let Some(report_path) = database::self_check::requested_report_path() {
                let exit_code = database::self_check::run(app.handle(), &report_path);
                std::process::exit(exit_code);
            }

            // Prepare the database before the interface can query it.
            let status = database::initialize(app.handle());
            match &status.error {
                None => {
                    if status.created_file {
                        eprintln!("[persistence] created {}", status.database_path);
                    }
                    for warning in &status.warnings {
                        eprintln!("[persistence] warning: {warning}");
                    }
                }
                Some(error) => eprintln!(
                    "[persistence] {}: {error}",
                    status.error_code.as_deref().unwrap_or("unknown")
                ),
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Gold Label Studio Pro");
}
