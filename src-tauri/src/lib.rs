use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

#[tauri::command]
async fn check_update(app: AppHandle) -> Result<Option<serde_json::Value>, String> {
    let updater = app
        .updater()
        .map_err(|e| format!("Updater error: {}", e))?;

    match updater.check().await {
        Ok(Some(update)) => {
            let info = serde_json::json!({
                "version": update.version,
                "currentVersion": update.current_version,
                "body": update.body,
                "date": update.date.map(|d| d.to_string()),
            });
            Ok(Some(info))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(format!("Update check failed: {}", e)),
    }
}

#[tauri::command]
async fn download_and_install(app: AppHandle) -> Result<(), String> {
    let updater = app
        .updater()
        .map_err(|e| format!("Updater error: {}", e))?;

    let update = updater
        .check()
        .await
        .map_err(|e| format!("Update check failed: {}", e))?;

    if let Some(update) = update {
        update
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|e| format!("Install failed: {}", e))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![check_update, download_and_install])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
