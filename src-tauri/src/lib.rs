mod database;
mod hardware;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(database::DATABASE_URL, database::migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
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
        .run(tauri::generate_context!())
        .expect("error while running Gold Label Studio Pro");
}
