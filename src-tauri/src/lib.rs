use std::{
    collections::HashSet,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
};

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State,
};
use tauri_plugin_opener::OpenerExt;

const CREDENTIAL_SERVICE: &str = "vn.teachflow.app";

#[derive(Default)]
struct DesktopState {
    close_to_tray: AtomicBool,
    saved_files: Mutex<HashSet<PathBuf>>,
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn allowed_secure_key(key: &str) -> bool {
    matches!(key, "access_token" | "refresh_token")
}

#[tauri::command]
fn secure_get(key: String) -> Result<Option<String>, String> {
    if !allowed_secure_key(&key) {
        return Err("Unsupported secure storage key".into());
    }
    #[cfg(windows)]
    {
        let entry = keyring::Entry::new(CREDENTIAL_SERVICE, &key)
            .map_err(|_| "Cannot access Windows Credential Manager".to_string())?;
        return match entry.get_password() {
            Ok(value) => Ok(Some(value)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err("Cannot read Windows secure storage".into()),
        };
    }
    #[cfg(not(windows))]
    Err("Secure token storage is only enabled for Windows builds".into())
}

#[tauri::command]
fn secure_set(key: String, value: Option<String>) -> Result<(), String> {
    if !allowed_secure_key(&key) {
        return Err("Unsupported secure storage key".into());
    }
    #[cfg(windows)]
    {
        let entry = keyring::Entry::new(CREDENTIAL_SERVICE, &key)
            .map_err(|_| "Cannot access Windows Credential Manager".to_string())?;
        if let Some(value) = value {
            entry
                .set_password(&value)
                .map_err(|_| "Cannot write Windows secure storage".to_string())?;
        } else {
            let _ = entry.delete_credential();
        }
        return Ok(());
    }
    #[cfg(not(windows))]
    Err("Secure token storage is only enabled for Windows builds".into())
}

#[tauri::command]
fn set_close_to_tray(enabled: bool, state: State<'_, DesktopState>) {
    state.close_to_tray.store(enabled, Ordering::Relaxed);
}

fn canonical_existing_file(path: &str) -> Result<PathBuf, String> {
    let raw = Path::new(path);
    if !raw.is_absolute() {
        return Err("File path must be absolute".into());
    }
    let canonical = raw
        .canonicalize()
        .map_err(|_| "Saved file does not exist".to_string())?;
    if !canonical.is_file() {
        return Err("Path is not a file".into());
    }
    Ok(canonical)
}

#[tauri::command]
fn register_saved_file(path: String, state: State<'_, DesktopState>) -> Result<(), String> {
    let canonical = canonical_existing_file(&path)?;
    state
        .saved_files
        .lock()
        .map_err(|_| "Saved file registry is unavailable".to_string())?
        .insert(canonical);
    Ok(())
}

fn validate_registered_file(path: &str, state: &DesktopState) -> Result<PathBuf, String> {
    let canonical = canonical_existing_file(path)?;
    let allowed = state
        .saved_files
        .lock()
        .map_err(|_| "Saved file registry is unavailable".to_string())?
        .contains(&canonical);
    if !allowed {
        return Err("Only files saved by TeachFlow in this session can be opened".into());
    }
    Ok(canonical)
}

#[tauri::command]
fn open_saved_file(app: AppHandle, path: String, state: State<'_, DesktopState>) -> Result<(), String> {
    let canonical = validate_registered_file(&path, &state)?;
    app.opener()
        .open_path(canonical.to_string_lossy(), None::<&str>)
        .map_err(|_| "Cannot open the saved file".to_string())
}

#[tauri::command]
fn reveal_saved_file(app: AppHandle, path: String, state: State<'_, DesktopState>) -> Result<(), String> {
    let canonical = validate_registered_file(&path, &state)?;
    app.opener()
        .reveal_item_in_dir(canonical)
        .map_err(|_| "Cannot reveal the saved file".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DesktopState::default())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
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

            let open_item = MenuItem::with_id(app, "open", "Mở TeachFlow", true, None::<&str>)?;
            let update_item = MenuItem::with_id(
                app,
                "check_update",
                "Kiểm tra cập nhật",
                true,
                None::<&str>,
            )?;
            let quit_item = MenuItem::with_id(app, "quit", "Thoát", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &update_item, &quit_item])?;

            let mut tray = TrayIconBuilder::with_id("teachflow-tray")
                .tooltip("TeachFlow")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main_window(app),
                    "check_update" => {
                        show_main_window(app);
                        let _ = app.emit("teachflow://check-update", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<DesktopState>();
                if state.close_to_tray.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            secure_get,
            secure_set,
            set_close_to_tray,
            register_saved_file,
            open_saved_file,
            reveal_saved_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
