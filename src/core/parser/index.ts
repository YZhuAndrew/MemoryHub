/**
 * SQLite 解析器（用于 Memmy 等使用数据库存储记忆的 Agent）
 *
 * 注意：在浏览器/Tauri 前端环境无法直接读 SQLite 文件。
 * 这里定义解析接口和纯逻辑，实际的文件读取由 Tauri 的 Rust 后端完成
 * （通过 tauri-plugin-sql 或自定义 command）。
 *
 * 在 CLI 验证阶段（Node.js 环境），我们用 better-sqlite3 直接读取。
 */

import type { MemoryItem, MemorySource } from "../../types";
// filePath 参数保留用于日志/调试，实际通过 source 传递

export interface SqliteParseOptions {
  table: string;
  keyColumn: string;
  valueColumn: string;
  layerColumn?: string;
  tagsColumn?: string;
  updatedColumn?: string;
  statusFilter?: string;
}

export interface SqliteRow {
  [key: string]: unknown;
}

/**
 * 把 SQLite 查询结果转换成 MemoryItem[]。
 * 这是一个纯函数，不关心数据库连接怎么来的——由调用方传入 rows。
 */
export function parseSqliteRows(
  rows: SqliteRow[],
  options: SqliteParseOptions,
  source: Omit<MemorySource, "itemType">,
  itemType: MemorySource["itemType"],
  filePath: string,
): MemoryItem[] {
  const items: MemoryItem[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const key = String(row[options.keyColumn] ?? `row-${i}`);
    const value = String(row[options.valueColumn] ?? "");
    const layer = options.layerColumn ? String(row[options.layerColumn] ?? "") : "";
    const tagsRaw = options.tagsColumn ? String(row[options.tagsColumn] ?? "[]") : "[]";
    const updatedAt = options.updatedColumn ? parseDbTimestamp(row[options.updatedColumn]) : 0;

    // 解析 tags JSON
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(tagsRaw);
      if (Array.isArray(parsed)) {
        tags = parsed.map(String);
      }
    } catch {
      // tags 不是合法 JSON，忽略
    }

    items.push({
      id: `${source.agentId}:sqlite:${key}`,
      source: { ...source, itemType, filePath },
      title: key,
      content: value,
      format: "sqlite",
      location: {
        sqliteRowId: String(row.id ?? key),
        sqliteTable: options.table,
      },
      tags: layer ? [...tags, `layer:${layer}`] : tags,
      updatedAt,
      contentLength: value.length,
    });
  }

  return items;
}

/**
 * 解析数据库时间戳（可能是 ISO 字符串或 Unix 时间戳）。
 */
function parseDbTimestamp(value: unknown): number {
  if (typeof value === "number") {
    // Unix 秒 → 毫秒
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const ms = Date.parse(value);
    if (!isNaN(ms)) return ms;
  }
  return 0;
}

/**
 * 生成查询 SQL。
 * 根据 options 构造 SELECT 语句，用于从 Agent 的 SQLite 中读取记忆。
 */
export function buildQuerySql(options: SqliteParseOptions): string {
  const columns = [
    "id",
    options.keyColumn,
    options.valueColumn,
    ...(options.layerColumn ? [options.layerColumn] : []),
    ...(options.tagsColumn ? [options.tagsColumn] : []),
    ...(options.updatedColumn ? [options.updatedColumn] : []),
  ];

  // 去重
  const uniqueColumns = [...new Set(columns)];

  let sql = `SELECT ${uniqueColumns.join(", ")} FROM ${options.table}`;

  if (options.statusFilter) {
    sql += ` WHERE status = '${options.statusFilter}'`;
  }

  sql += ` ORDER BY ${options.updatedColumn ?? "id"} DESC LIMIT 200`;

  return sql;
}
