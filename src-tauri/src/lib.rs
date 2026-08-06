// MemoryHub Tauri 后端入口
//
// 所有文件系统操作都在 Rust 端实现，通过 invoke 暴露给前端。
// 这样彻底绕过 Tauri fs 插件的 scope 权限限制，且性能更好。

use rusqlite::{Connection, OpenFlags};
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;

// ============================================================================
// 文件系统操作 (对应 FsAdapter 接口)
// ============================================================================

/// 检查路径是否存在
#[tauri::command]
fn fs_exists(path: String) -> bool {
    let expanded = expand_home(&path);
    Path::new(&expanded).exists()
}

/// 读取文本文件
#[tauri::command]
fn fs_read_text_file(path: String) -> Result<String, String> {
    let expanded = expand_home(&path);
    std::fs::read_to_string(&expanded)
        .map_err(|e| format!("读取失败 {}: {}", expanded, e))
}

/// 获取文件修改时间 (Unix 毫秒)
#[tauri::command]
fn fs_get_mtime(path: String) -> Result<f64, String> {
    let expanded = expand_home(&path);
    let metadata = std::fs::metadata(&expanded)
        .map_err(|e| format!("stat 失败 {}: {}", expanded, e))?;

    let mtime = metadata
        .modified()
        .map_err(|e| format!("获取mtime失败: {}", e))?;

    let duration = mtime
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("时间转换失败: {}", e))?;

    Ok(duration.as_millis() as f64)
}

/// 递归列出目录下匹配的文件
/// glob 简化处理: 只匹配文件名部分 (如 "*.md" 或 "SKILL.md")
#[tauri::command]
fn fs_list_files(
    dir: String,
    glob: String,
    exclude: Vec<String>,
) -> Result<Vec<String>, String> {
    let expanded = expand_home(&dir);
    let mut results: Vec<String> = Vec::new();
    walk_dir(&expanded, &glob, &exclude, &mut results, 0)?;
    Ok(results)
}

/// 读取 SQLite 数据库
#[tauri::command]
fn read_sqlite(db_path: String, sql: String) -> Result<Vec<Value>, String> {
    let expanded = expand_home(&db_path);
    let conn = Connection::open_with_flags(&expanded, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("无法打开数据库 {}: {}", expanded, e))?;

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("SQL 准备失败: {}", e))?;

    let column_count = stmt.column_count();
    let column_names: Vec<String> = stmt
        .column_names()
        .iter()
        .map(|s| s.to_string())
        .collect();

    let mut results: Vec<Value> = Vec::new();
    let rows = stmt
        .query_map([], |row| {
            let mut map: HashMap<String, Value> = HashMap::new();
            for i in 0..column_count {
                let col_name = &column_names[i];
                let value: Value = match row.get_ref(i) {
                    Ok(rusqlite::types::ValueRef::Null) => Value::Null,
                    Ok(rusqlite::types::ValueRef::Integer(n)) => Value::from(n),
                    Ok(rusqlite::types::ValueRef::Real(f)) => Value::from(f),
                    Ok(rusqlite::types::ValueRef::Text(t)) => {
                        Value::from(String::from_utf8_lossy(t).to_string())
                    }
                    Ok(rusqlite::types::ValueRef::Blob(_b)) => {
                        Value::Null
                    }
                    Err(_) => Value::Null,
                };
                map.insert(col_name.clone(), value);
            }
            serde_json::to_value(map)
                .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))
        })
        .map_err(|e| format!("查询执行失败: {}", e))?;

    for row_result in rows {
        let value = row_result.map_err(|e| format!("行读取失败: {}", e))?;
        results.push(value);
    }

    Ok(results)
}

/// 写入文本文件 (编辑记忆后保存)
#[tauri::command]
fn fs_write_text_file(path: String, content: String) -> Result<(), String> {
    let expanded = expand_home(&path);
    std::fs::write(&expanded, content)
        .map_err(|e| format!("写入失败 {}: {}", expanded, e))
}

/// 用指定应用程序打开文件
/// app_name 为空时用默认应用打开
#[tauri::command]
fn open_with_app(path: String, app_name: Option<String>) -> Result<(), String> {
    let expanded = expand_home(&path);
    let result = if let Some(app) = app_name {
        std::process::Command::new("open")
            .args(["-a", &app, &expanded])
            .status()
    } else {
        std::process::Command::new("open")
            .arg(&expanded)
            .status()
    };
    result
        .map_err(|e| format!("打开失败: {}", e))
        .map(|_| ())
}

/// 在访达中显示文件 (选中该文件)
#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    let expanded = expand_home(&path);
    std::process::Command::new("open")
        .args(["-R", &expanded])
        .status()
        .map_err(|e| format!("在访达中显示失败: {}", e))
        .map(|_| ())
}

/// 复制文本到剪贴板 (macOS 用 pbcopy)
#[tauri::command]
fn copy_to_clipboard(text: String) -> Result<(), String> {
    use std::io::Write;
    let mut child = std::process::Command::new("pbcopy")
        .stdin(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动 pbcopy 失败: {}", e))?;
    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(text.as_bytes())
            .map_err(|e| format!("写入剪贴板失败: {}", e))?;
    }
    child
        .wait()
        .map_err(|e| format!("pbcopy 等待失败: {}", e))
        .map(|_| ())
}

/// 读取用户设置 JSON
#[tauri::command]
fn read_settings() -> Result<Value, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME".to_string())?;
    let settings_path = format!("{}/.memoryhub/settings.json", home);

    if !std::path::Path::new(&settings_path).exists() {
        return Ok(serde_json::json!({}));
    }

    let content = std::fs::read_to_string(&settings_path)
        .map_err(|e| format!("读取设置失败: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("解析设置失败: {}", e))
}

/// 写入用户设置 JSON
#[tauri::command]
fn write_settings(settings: Value) -> Result<(), String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME".to_string())?;
    let settings_dir = format!("{}/.memoryhub", home);
    let settings_path = format!("{}/settings.json", settings_dir);

    // 确保目录存在
    std::fs::create_dir_all(&settings_dir)
        .map_err(|e| format!("创建设置目录失败: {}", e))?;

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("序列化设置失败: {}", e))?;

    std::fs::write(&settings_path, content)
        .map_err(|e| format!("写入设置失败: {}", e))
}

/// 选择文件夹对话框
#[tauri::command]
async fn pick_folder() -> Result<Option<String>, String> {
    // 用 macOS 原生 osascript 选择文件夹
    let output = std::process::Command::new("osascript")
        .args([
            "-e",
            r#"set chosenFolder to choose folder with prompt "选择项目文件夹"
            return POSIX path of chosenFolder"#,
        ])
        .output()
        .map_err(|e| format!("启动文件夹选择器失败: {}", e))?;

    if !output.status.success() {
        // 用户取消
        return Ok(None);
    }

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() {
        Ok(None)
    } else {
        Ok(Some(path))
    }
}

// ============================================================================
// 备份和恢复
// ============================================================================

use std::io::{Read as IoRead, Write as IoWrite};

/// 要备份的 Agent 目录列表 (root 路径相对 HOME)
const BACKUP_AGENT_DIRS: &[&str] = &[
    ".hermes/memories",
    ".codex/memories",
    ".codex/rules",
    ".codex/AGENTS.md",
    ".claude/CLAUDE.md",
    ".claude/agents",
    ".claude/projects",
    ".claude-mem/claude-mem.db",
    ".workbuddy/MEMORY.md",
    ".workbuddy/SOUL.md",
    ".workbuddy/USER.md",
    ".workbuddy/IDENTITY.md",
    ".workbuddy/BOOTSTRAP.md",
    ".openclaw/workspace",
    ".copaw/workspaces",
    ".memmy/memory-service/memory.sqlite",
    // 千问办公 / QoderWork —— awareness 记忆套件
    ".qwenworkcn/awareness",
    ".qoderworkcn/awareness",
    // Trae —— 用户画像 + 规则 + 会话记忆
    ".trae-cn/memory",
    ".trae-cn/user_rules",
];

/// 要排除的路径片段
const BACKUP_EXCLUDES: &[&str] = &[".git", "node_modules", "cache", "__pycache__"];

/// 备份文件信息
#[derive(serde::Serialize)]
struct BackupInfo {
    name: String,
    path: String,
    size: u64,
    created: f64,
}

/// 创建备份 (打包成 zip)
/// target_dir = None 时存到 ~/.memoryhub/backups/
#[tauri::command]
fn create_backup(target_dir: Option<String>) -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME".to_string())?;
    let timestamp = chrono_timestamp();
    let zip_name = format!("memoryhub-backup-{}.zip", timestamp);

    // 确定输出目录
    let out_dir = match &target_dir {
        Some(dir) => expand_home(dir),
        None => format!("{}/.memoryhub/backups", home),
    };
    std::fs::create_dir_all(&out_dir)
        .map_err(|e| format!("创建备份目录失败: {}", e))?;
    let zip_path = format!("{}/{}", out_dir, zip_name);

    // 创建 zip 文件
    let file = std::fs::File::create(&zip_path)
        .map_err(|e| format!("创建 zip 失败: {}", e))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // 1. 备份 settings.json
    let settings_path = format!("{}/.memoryhub/settings.json", home);
    if std::path::Path::new(&settings_path).exists() {
        let content = std::fs::read(&settings_path)
            .map_err(|e| format!("读取设置失败: {}", e))?;
        zip.start_file("settings.json", options)
            .map_err(|e| format!("写入 zip 失败: {}", e))?;
        zip.write_all(&content).map_err(|e| format!("写入 zip 失败: {}", e))?;
    }

    // 2. 备份各 Agent 的记忆文件
    for agent_path in BACKUP_AGENT_DIRS {
        let full_path = format!("{}/{}", home, agent_path);
        let p = std::path::Path::new(&full_path);
        if !p.exists() {
            continue;
        }
        if p.is_file() {
            // 单文件
            if let Ok(content) = std::fs::read(&full_path) {
                let zip_entry = format!("agents/{}", agent_path);
                zip.start_file(&zip_entry, options)
                    .map_err(|e| format!("写入 zip 失败: {}", e))?;
                zip.write_all(&content).map_err(|e| format!("写入 zip 失败: {}", e))?;
            }
        } else if p.is_dir() {
            // 目录: 递归收集文件
            let mut files: Vec<(String, String)> = Vec::new();
            collect_files(&full_path, agent_path, &mut files);
            for (abs_path, rel_path) in files {
                if let Ok(content) = std::fs::read(&abs_path) {
                    let zip_entry = format!("agents/{}", rel_path);
                    zip.start_file(&zip_entry, options)
                        .map_err(|e| format!("写入 zip 失败: {}", e))?;
                    zip.write_all(&content).map_err(|e| format!("写入 zip 失败: {}", e))?;
                }
            }
        }
    }

    zip.finish().map_err(|e| format!("完成 zip 失败: {}", e))?;

    // 如果是默认位置，清理旧备份 (保留最近 10 个)
    if target_dir.is_none() {
        cleanup_old_backups(&out_dir);
    }

    Ok(zip_path)
}

/// 列出已有备份
#[tauri::command]
fn list_backups() -> Result<Vec<BackupInfo>, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME".to_string())?;
    let backup_dir = format!("{}/.memoryhub/backups", home);

    if !std::path::Path::new(&backup_dir).exists() {
        return Ok(Vec::new());
    }

    let mut backups: Vec<BackupInfo> = Vec::new();
    let entries = std::fs::read_dir(&backup_dir)
        .map_err(|e| format!("读取备份目录失败: {}", e))?;

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".zip") {
            continue;
        }
        let path = entry.path().to_string_lossy().to_string();
        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let created = metadata
            .created()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as f64)
            .unwrap_or(0.0);

        backups.push(BackupInfo {
            name,
            path,
            size: metadata.len(),
            created,
        });
    }

    // 按创建时间倒序
    backups.sort_by(|a, b| b.created.partial_cmp(&a.created).unwrap_or(std::cmp::Ordering::Equal));
    Ok(backups)
}

/// 从备份恢复
#[tauri::command]
fn restore_backup(zip_path: String) -> Result<(), String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME".to_string())?;
    let expanded = expand_home(&zip_path);

    let file = std::fs::File::open(&expanded)
        .map_err(|e| format!("打开备份失败: {}", e))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("读取 zip 失败: {}", e))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)
            .map_err(|e| format!("读取 zip 条目失败: {}", e))?;
        let name = entry.name().to_string();

        if name == "settings.json" {
            // 恢复设置
            let mut content = Vec::new();
            entry.read_to_end(&mut content).map_err(|e| format!("解压失败: {}", e))?;
            let settings_dir = format!("{}/.memoryhub", home);
            std::fs::create_dir_all(&settings_dir).map_err(|e| format!("创建目录失败: {}", e))?;
            std::fs::write(format!("{}/.memoryhub/settings.json", home), content)
                .map_err(|e| format!("写入设置失败: {}", e))?;
        } else if name.starts_with("agents/") {
            // 恢复 Agent 文件
            let rel_path = &name["agents/".len()..];
            let target = format!("{}/{}", home, rel_path);

            // 确保父目录存在
            if let Some(parent) = std::path::Path::new(&target).parent() {
                std::fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
            }

            let mut content = Vec::new();
            entry.read_to_end(&mut content).map_err(|e| format!("解压失败: {}", e))?;
            std::fs::write(&target, content).map_err(|e| format!("写入文件失败 {}: {}", target, e))?;
        }
    }

    Ok(())
}

/// 删除备份
#[tauri::command]
fn delete_backup(zip_path: String) -> Result<(), String> {
    let expanded = expand_home(&zip_path);
    std::fs::remove_file(&expanded)
        .map_err(|e| format!("删除备份失败: {}", e))
}

/// 递归收集目录下的文件
fn collect_files(base_abs: &str, base_rel: &str, files: &mut Vec<(String, String)>) {
    let entries = match std::fs::read_dir(base_abs) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let full_path = entry.path().to_string_lossy().to_string();
        // 排除
        if BACKUP_EXCLUDES.iter().any(|ex| full_path.contains(ex)) {
            continue;
        }
        let file_type = match entry.file_type() {
            Ok(t) => t,
            Err(_) => continue,
        };
        let name = entry.file_name().to_string_lossy().to_string();
        let rel_path = format!("{}/{}", base_rel, name);
        if file_type.is_dir() {
            collect_files(&full_path, &rel_path, files);
        } else if file_type.is_file() {
            // 只备份文本/数据库文件
            if name.ends_with(".md") || name.ends_with(".json") || name.ends_with(".sqlite") || name.ends_with(".txt") {
                files.push((full_path, rel_path));
            }
        }
    }
}

/// 清理旧备份，保留最近 10 个
fn cleanup_old_backups(backup_dir: &str) {
    let entries = match std::fs::read_dir(backup_dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    let mut backups: Vec<_> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name().to_string_lossy().ends_with(".zip"))
        .filter_map(|e| {
            let mtime = e.metadata().ok()?.modified().ok()?;
            let ts = mtime.duration_since(std::time::UNIX_EPOCH).ok()?;
            Some((e.path(), ts.as_secs()))
        })
        .collect();
    // 按时间倒序
    backups.sort_by(|a, b| b.1.cmp(&a.1));
    // 删除超过 10 个的旧备份
    for (path, _) in backups.iter().skip(10) {
        let _ = std::fs::remove_file(path);
    }
}

/// 生成时间戳 YYYYMMDD-HHMMSS
fn chrono_timestamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // 简单的 UTC 时间转换
    let secs = now % 60;
    let mins = (now / 60) % 60;
    let hours = (now / 3600) % 24;
    let days = now / 86400;
    // 从 1970-01-01 计算年月日
    let (year, month, day) = days_to_date(days);
    format!("{:04}{:02}{:02}-{:02}{:02}{:02}", year, month, day, hours, mins, secs)
}

/// Unix 天数转年月日 (简化算法)
fn days_to_date(days: u64) -> (u64, u64, u64) {
    let mut remaining = days;
    let mut year = 1970u64;
    loop {
        let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        let year_days = if is_leap { 366 } else { 365 };
        if remaining < year_days {
            break;
        }
        remaining -= year_days;
        year += 1;
    }
    let month_days = [31u64, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let mut month = 1u64;
    for &md in &month_days {
        let actual_md = if month == 2 && is_leap { 29 } else { md };
        if remaining < actual_md {
            break;
        }
        remaining -= actual_md;
        month += 1;
    }
    (year, month, remaining + 1)
}

// ============================================================================
// 辅助函数
// ============================================================================

/// 展开 ~ 为 home 目录
fn expand_home(path: &str) -> String {
    if path == "~" {
        return std::env::var("HOME").unwrap_or_default();
    }
    if let Some(rest) = path.strip_prefix("~/") {
        let home = std::env::var("HOME").unwrap_or_default();
        return format!("{}/{}", home, rest);
    }
    path.to_string()
}

/// 递归遍历目录
fn walk_dir(
    dir: &str,
    glob: &str,
    exclude: &[String],
    results: &mut Vec<String>,
    depth: usize,
) -> Result<(), String> {
    if depth > 8 {
        return Ok(());
    }

    let path = Path::new(dir);
    if !path.is_dir() {
        return Ok(());
    }

    let glob_base = glob.split('/').last().unwrap_or(glob);

    let entries = std::fs::read_dir(path)
        .map_err(|e| format!("读取目录失败 {}: {}", dir, e))?;

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let full_path = entry.path();
        let full_path_str = full_path.to_string_lossy().to_string();

        // 检查排除
        if exclude.iter().any(|ex| full_path_str.contains(ex)) {
            continue;
        }

        let file_type = match entry.file_type() {
            Ok(t) => t,
            Err(_) => continue,
        };

        if file_type.is_dir() {
            walk_dir(&full_path_str, glob, exclude, results, depth + 1)?;
        } else if file_type.is_file() {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if matches_glob(&file_name, glob_base) {
                results.push(full_path_str);
            }
        }
    }

    Ok(())
}

/// 简单的 glob 文件名匹配
fn matches_glob(filename: &str, glob_base: &str) -> bool {
    if glob_base == "*" {
        return true;
    }
    if let Some(suffix) = glob_base.strip_prefix("*.") {
        return filename.ends_with(&format!(".{}", suffix));
    }
    filename == glob_base
}

// ============================================================================
// Tauri 应用入口
// ============================================================================

use tauri::{Emitter, Manager, WindowEvent};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use notify::{Watcher, RecursiveMode, RecommendedWatcher, EventKind};

/// 内置 Agent 的根目录 (相对 HOME),文件监听覆盖这些目录。
/// 自定义 Agent / 项目目录暂不纳入 watcher,用户可手动重新扫描。
const WATCH_AGENT_DIRS: &[&str] = &[
    ".hermes",
    ".codex",
    ".claude",
    ".claude-mem",
    ".workbuddy",
    ".openclaw",
    ".copaw",
    ".memmy",
    ".qwenworkcn",
    ".qoderworkcn",
    ".trae-cn",
    ".zcode",
];

/// 读取「关闭驻留」开关 (默认 true)。失败/缺失时默认 true,保证常驻体验不退化。
fn read_stay_in_tray() -> bool {
    let home = match std::env::var("HOME") {
        Ok(h) => h,
        Err(_) => return true,
    };
    let settings_path = format!("{}/.memoryhub/settings.json", home);
    let content = match std::fs::read_to_string(&settings_path) {
        Ok(c) => c,
        Err(_) => return true,
    };
    let value: Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => return true,
    };
    value.get("stayInTray").and_then(|v| v.as_bool()).unwrap_or(true)
}

/// 切换主窗口显隐 (托盘菜单 + 托盘图标点击共用)
fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

/// 启动文件监听,检测到记忆文件变化时 emit "mem-changed" 给前端。
/// 监听始终运行(开销极小),是否响应由前端按 autoRefresh 设置决定。
fn start_memory_watcher(app: tauri::AppHandle) -> Option<RecommendedWatcher> {
    let home = std::env::var("HOME").ok()?;

    // 记忆文件的路径片段白名单(取自 builtin profiles 的真实记忆路径)。
    // 只有命中其一才视为「记忆变化」,避免 Agent 目录里的配置/日志/状态文件触发刷新。
    // 注:用片段匹配,这样 memories/USER.md、workspaces/x/MEMORY.md、awareness/main/MEMORY.md 都能命中。
    const MEM_PATH_FRAGMENTS: &[&str] = &[
        "memories/",
        "MEMORY.md",
        "memory_summary.md",
        "raw_memories.md",
        "user_profile.md",
        "/memory/",
        "memory-service/",
        "CLAUDE.md",
        "AGENTS.md",
        "SOUL.md",
        "USER.md",
        "IDENTITY.md",
        "BOOTSTRAP.md",
        "TOOLS.md",
        "HEARTBEAT.md",
        "PROFILE.md",
        "claude-mem.db",
        "memory.sqlite",
        "awareness/",
        "user_rules/",
        // 以下目录类记忆(用前缀式片段,命中目录内任意文件)
        "agents/",
        "projects/",
        "skills/",
        "plans/",
        "rules/",
        "prompts/",
    ];

    // 明确排除的噪音文件名(Agent 运行时配置/日志,虽然后缀命中但与记忆无关)。
    const NOISE_FILENAMES: &[&str] = &[
        "config.json",
        "setting.json",
        "settings.json",
        "channel_directory.json",
        "state.json",
    ];

    let mut watcher = match RecommendedWatcher::new(
        move |res: notify::Result<notify::Event>| {
            if let Ok(event) = res {
                // 仅关心文件内容/创建/删除变化,忽略单纯访问
                let relevant = matches!(
                    event.kind,
                    EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
                );
                if !relevant {
                    return;
                }
                // 路径片段白名单:至少一个变化文件命中记忆路径特征,才触发刷新
                let has_mem_file = event.paths.iter().any(|p| {
                    let s = p.to_string_lossy();
                    // 先排除已知噪音文件(按文件名精确匹配)
                    let fname = p
                        .file_name()
                        .and_then(|f| f.to_str())
                        .unwrap_or("");
                    if NOISE_FILENAMES.iter().any(|n| *n == fname) {
                        return false;
                    }
                    // 排除运行时文件:日志、轮询租约、锁文件、临时文件、心跳状态
                    // (这些虽落在 memory/ 等目录下,但不是记忆内容,反复写入会触发刷新循环)
                    if s.contains("/logs")
                        || s.contains("logs_")
                        || s.contains("polling-lease")
                        || s.contains("polling_lease")
                        || fname.starts_with(".")
                        || fname.ends_with(".lock")
                        || fname.ends_with(".tmp")
                        || fname.ends_with(".swp")
                    {
                        return false;
                    }
                    MEM_PATH_FRAGMENTS.iter().any(|frag| s.contains(frag))
                });
                if !has_mem_file {
                    return;
                }
                let _ = app.emit("mem-changed", ());
            }
        },
        notify::Config::default(),
    ) {
        Ok(w) => w,
        Err(e) => {
            eprintln!("启动文件监听失败: {}", e);
            return None;
        }
    };

    for dir in WATCH_AGENT_DIRS {
        let full = format!("{}/{}", home, dir);
        if Path::new(&full).is_dir() {
            if let Err(e) = watcher.watch(Path::new(&full), RecursiveMode::Recursive) {
                eprintln!("监听 {} 失败: {}", full, e);
            }
        }
    }

    Some(watcher)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            fs_exists,
            fs_read_text_file,
            fs_get_mtime,
            fs_list_files,
            fs_write_text_file,
            read_sqlite,
            open_with_app,
            reveal_in_finder,
            copy_to_clipboard,
            read_settings,
            write_settings,
            pick_folder,
            create_backup,
            list_backups,
            restore_backup,
            delete_backup,
        ])
        .setup(|app| {
            // ---- 菜单栏托盘 ----
            let toggle_i = MenuItem::with_id(app, "toggle", "显示/隐藏主窗口", true, None::<&str>)?;
            let rescan_i = MenuItem::with_id(app, "rescan", "重新扫描", true, None::<&str>)?;
            let sep1 = PredefinedMenuItem::separator(app)?;
            let quit_i = MenuItem::with_id(app, "quit", "退出 MemoryHub", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_i, &rescan_i, &sep1, &quit_i])?;

            let mut tray = TrayIconBuilder::with_id("main-tray")
                .tooltip("MemoryHub")
                .menu(&menu)
                .icon_as_template(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => toggle_main_window(app),
                    "rescan" => {
                        let _ = app.emit("tray-rescan", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // 单击托盘图标 (非拖拽) 切换窗口显隐
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                });

            // 菜单栏托盘图标:专用单色线条 icon (透明背景 + 黑色线条)。
            // icon_as_template(true) 让 macOS 按菜单栏亮/暗自动反色。
            // 必须用专用 icon,不能复用彩色 app icon —— 彩色图 template 化会变成黑方块。
            let tray_icon = tauri::image::Image::from_bytes(include_bytes!(
                "../icons/tray-icon.png"
            ))
            .expect("嵌入托盘图标失败");
            tray = tray.icon(tray_icon);
            tray.build(app)?;

            // ---- 文件监听 (记忆变化自动刷新) ----
            if let Some(watcher) = start_memory_watcher(app.handle().clone()) {
                app.manage(watcher);
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| match event {
            // 拦截窗口关闭按钮:驻留模式下隐藏窗口而非退出
            tauri::RunEvent::WindowEvent {
                label,
                event: WindowEvent::CloseRequested { api, .. },
                ..
            } if label == "main" => {
                if read_stay_in_tray() {
                    api.prevent_close();
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }
            }
            // Dock 图标点击 / 应用已运行时再次唤起:重新显示窗口
            tauri::RunEvent::Reopen { .. } => {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            _ => {}
        });
}
