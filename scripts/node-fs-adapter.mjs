/**
 * Node.js 文件系统适配器
 *
 * 实现 FsAdapter 接口，让 Scanner 可以在 Node.js 环境下运行。
 * 这是 CLI 验证用的——证明核心逻辑能正确扫描真实环境。
 *
 * 在 Tauri 环境下会有一个对应的 TauriFsAdapter（通过 Tauri fs API）。
 */

import { existsSync, readFileSync, statSync, readdirSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { homedir } from "node:os";
import Database from "better-sqlite3";

/**
 * @returns {import("../src/core/scanner/scanner").FsAdapter}
 */
export function createNodeFsAdapter() {
  return {
    expandHome(path) {
      if (path.startsWith("~/")) return join(homedir(), path.slice(2));
      if (path === "~") return homedir();
      return path;
    },

    async exists(path) {
      return existsSync(path);
    },

    async readTextFile(path) {
      return readFileSync(path, "utf-8");
    },

    async getMtime(path) {
      try {
        return statSync(path).mtimeMs;
      } catch {
        return 0;
      }
    },

    async listFiles(dir, glob, exclude = []) {
      const results = [];
      walkDir(dir, glob, exclude, results, 0);
      return results;
    },

    async readSqlite(dbPath, sql) {
      // 用 better-sqlite3 只读打开
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      try {
        return db.prepare(sql).all();
      } finally {
        db.close();
      }
    },
  };
}

/**
 * 递归遍历目录，收集匹配 glob 的文件。
 * 简化版 glob：支持 ** 和 * 通配符。
 */
function walkDir(dir, glob, exclude, results, depth) {
  if (depth > 8) return; // 防止无限递归

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    // 排除目录
    if (exclude.some((ex) => fullPath.includes(ex))) continue;

    if (entry.isDirectory()) {
      walkDir(fullPath, glob, exclude, results, depth + 1);
    } else if (entry.isFile()) {
      if (matchGlob(entry.name, glob)) {
        results.push(fullPath);
      }
    }
  }
}

// 简单的 glob 匹配（文件名级别）。
// 支持:
// - "*.md" 匹配所有 .md 文件
// - "SKILL.md" 精确匹配
// - 递归通配符 退化成匹配文件名
function matchGlob(filename, glob) {
  // 提取 glob 最后一段（文件名部分）
  const globBase = glob.split("/").pop() || glob;
  if (globBase === "*") return true;
  if (globBase.startsWith("*.")) {
    return filename.endsWith(globBase.slice(1));
  }
  return filename === globBase;
}
