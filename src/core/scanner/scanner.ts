/**
 * Scanner 扫描器
 *
 * 职责：
 * 1. 遍历所有启用的 Agent Profile
 * 2. 对每个 Profile，根据 items 配置找到对应的文件/目录
 * 3. 读取文件内容，交给对应的 Parser 解析
 * 4. 收集所有 MemoryItem，汇总成 ScanResult
 *
 * 文件系统操作通过注入的 FsAdapter 完成，这样：
 * - 在 Tauri 环境用 Tauri 的 fs API
 * - 在 Node.js CLI 环境用 Node 的 fs 模块
 * - 方便测试时 mock
 */

import type {
  AgentProfile,
  ProfileItem,
  MemoryItem,
  MemorySource,
  ScanResult,
  ScanError,
  AgentScanStats,
  SourceFormat,
} from "../../types";
import { parseMarkdown, type ParseContext } from "../parser/markdown-parser";

// ============================================================================
// 文件系统适配器接口（依赖注入，解耦具体环境）
// ============================================================================

export interface FsAdapter {
  /** 判断路径是否存在 */
  exists(path: string): Promise<boolean>;
  /** 读取文本文件 */
  readTextFile(path: string): Promise<string>;
  /** 获取文件最后修改时间（Unix 毫秒） */
  getMtime(path: string): Promise<number>;
  /** 列出目录下匹配 glob 的文件（返回绝对路径） */
  listFiles(dir: string, glob: string, exclude?: string[]): Promise<string[]>;
  /** 展开 ~ 为 home 目录 */
  expandHome(path: string): string;
  /** 读取 SQLite（返回 rows 数组），Node 环境用，浏览器环境抛错 */
  readSqlite?(path: string, sql: string): Promise<Record<string, unknown>[]>;
}

// ============================================================================
// 扫描结果累加器（内部辅助）
// ============================================================================

class ResultAccumulator {
  items: MemoryItem[] = [];
  errors: ScanError[] = [];
  statsMap = new Map<string, AgentScanStats>();
  rootExistsMap = new Map<string, boolean>();

  addItems(agent: AgentProfile, newItems: MemoryItem[]) {
    this.items.push(...newItems);
    this.ensureStats(agent);
    const stats = this.statsMap.get(agent.id)!;
    stats.itemCount += newItems.length;
    for (const item of newItems) {
      stats.countByType[item.source.itemType] =
        (stats.countByType[item.source.itemType] ?? 0) + 1;
    }
  }

  addError(agentId: string, filePath: string, message: string) {
    this.errors.push({ agentId, filePath, message });
  }

  setRootExists(agent: AgentProfile, exists: boolean) {
    this.rootExistsMap.set(agent.id, exists);
    this.ensureStats(agent);
  }

  private ensureStats(agent: AgentProfile) {
    if (!this.statsMap.has(agent.id)) {
      this.statsMap.set(agent.id, {
        agentId: agent.id,
        agentName: agent.name,
        agentIcon: agent.icon,
        itemCount: 0,
        countByType: {},
        rootExists: false,
      });
    }
    if (this.rootExistsMap.has(agent.id)) {
      this.statsMap.get(agent.id)!.rootExists = this.rootExistsMap.get(agent.id)!;
    }
  }

  getStats(): AgentScanStats[] {
    return Array.from(this.statsMap.values());
  }
}

// ============================================================================
// 主扫描函数
// ============================================================================

export async function scanAll(
  profiles: AgentProfile[],
  fs: FsAdapter,
): Promise<ScanResult> {
  const startedAt = Date.now();
  const acc = new ResultAccumulator();

  for (const profile of profiles) {
    if (!profile.enabled) continue;
    await scanProfile(profile, fs, acc);
  }

  const durationMs = Date.now() - startedAt;

  return {
    startedAt,
    durationMs,
    items: acc.items,
    statsByAgent: acc.getStats(),
    errors: acc.errors,
  };
}

// ============================================================================
// 扫描单个 Profile
// ============================================================================

async function scanProfile(
  profile: AgentProfile,
  fs: FsAdapter,
  acc: ResultAccumulator,
): Promise<void> {
  const root = fs.expandHome(profile.root);
  const rootExists = await fs.exists(root);
  acc.setRootExists(profile, rootExists);

  if (!rootExists) {
    // 根目录不存在不算错误（用户可能没装这个 Agent），静默跳过
    return;
  }

  for (const item of profile.items) {
    try {
      await scanProfileItem(profile, item, fs, acc);
    } catch (e) {
      acc.addError(profile.id, item.path, (e as Error).message);
    }
  }
}

// ============================================================================
// 扫描单个 Profile 条目（一个文件或一个目录）
// ============================================================================

async function scanProfileItem(
  profile: AgentProfile,
  item: ProfileItem,
  fs: FsAdapter,
  acc: ResultAccumulator,
): Promise<void> {
  const root = fs.expandHome(profile.root);
  const relativePath = item.path;

  // 构建 MemorySource 的公共部分
  const isProject = profile.id.startsWith("project:");
  const baseSource: Omit<MemorySource, "itemType"> = {
    agentId: profile.id,
    agentName: profile.name,
    agentIcon: profile.icon,
    filePath: "", // 每个文件单独填
    scope: isProject ? "project" : "global",
    project: isProject ? profile.name.replace(/^📁 /, "") : undefined,
  };

  if (item.format === "dir-md") {
    // 目录模式：扫描目录下的所有 .md 文件
    await scanDir(profile, item, root, relativePath, baseSource, fs, acc);
  } else if (item.format === "sqlite") {
    // SQLite 模式
    await scanSqlite(profile, item, root, relativePath, baseSource, fs, acc);
  } else {
    // 单文件模式（md-full / md-section / md-heading / md-task）
    await scanSingleFile(profile, item, root, relativePath, baseSource, fs, acc);
  }
}

// ============================================================================
// 扫描单个 Markdown 文件
// ============================================================================

async function scanSingleFile(
  profile: AgentProfile,
  item: ProfileItem,
  root: string,
  relativePath: string,
  baseSource: Omit<MemorySource, "itemType">,
  fs: FsAdapter,
  acc: ResultAccumulator,
): Promise<void> {
  // 处理通配符路径（如 workspaces/*/MEMORY.md）
  const filePaths = await resolvePath(root, relativePath, fs);

  for (const filePath of filePaths) {
    const exists = await fs.exists(filePath);
    if (!exists) continue;

    let content: string;
    let mtime: number;
    try {
      content = await fs.readTextFile(filePath);
      mtime = await fs.getMtime(filePath);
    } catch (e) {
      acc.addError(profile.id, filePath, `读取失败: ${(e as Error).message}`);
      continue;
    }

    const ctx: ParseContext = {
      filePath,
      content,
      format: item.format as SourceFormat,
      formatOptions: item.formatOptions,
      source: baseSource,
      itemType: item.type,
    };

    const result = parseMarkdown(ctx);

    // 填充 mtime（parser 里设为 0，这里补上）
    for (const mi of result.items) {
      mi.source.filePath = filePath;
      mi.updatedAt = mtime;
    }

    acc.addItems(profile, result.items);

    for (const err of result.errors) {
      acc.addError(profile.id, filePath, err);
    }
  }
}

// ============================================================================
// 扫描目录下的 .md 文件
// ============================================================================

async function scanDir(
  profile: AgentProfile,
  item: ProfileItem,
  root: string,
  relativePath: string,
  baseSource: Omit<MemorySource, "itemType">,
  fs: FsAdapter,
  acc: ResultAccumulator,
): Promise<void> {
  const dirPath = joinPath(root, relativePath.replace(/\/$/, ""));
  const dirExists = await fs.exists(dirPath);
  if (!dirExists) return;

  const glob = (item.formatOptions?.glob as string) ?? "**/*.md";
  const exclude = (item.formatOptions?.exclude as string[]) ?? [".git", "node_modules"];

  const files = await fs.listFiles(dirPath, glob, exclude);

  for (const filePath of files) {
    let content: string;
    let mtime: number;
    try {
      content = await fs.readTextFile(filePath);
      mtime = await fs.getMtime(filePath);
    } catch (e) {
      acc.addError(profile.id, filePath, `读取失败: ${(e as Error).message}`);
      continue;
    }

    // dir-md 下的文件统一用 md-full 解析
    const ctx: ParseContext = {
      filePath,
      content,
      format: "md-full",
      source: baseSource,
      itemType: item.type,
    };

    const result = parseMarkdown(ctx);
    for (const mi of result.items) {
      mi.source.filePath = filePath;
      mi.updatedAt = mtime;
    }
    acc.addItems(profile, result.items);
  }
}

// ============================================================================
// 扫描 SQLite 数据库
// ============================================================================

async function scanSqlite(
  profile: AgentProfile,
  item: ProfileItem,
  root: string,
  relativePath: string,
  baseSource: Omit<MemorySource, "itemType">,
  fs: FsAdapter,
  acc: ResultAccumulator,
): Promise<void> {
  if (!fs.readSqlite) {
    acc.addError(profile.id, relativePath, "当前环境不支持 SQLite 读取");
    return;
  }

  const dbPath = joinPath(root, relativePath);
  const exists = await fs.exists(dbPath);
  if (!exists) return;

  const options = item.formatOptions as {
    table: string;
    keyColumn: string;
    valueColumn: string;
    layerColumn?: string;
    tagsColumn?: string;
    updatedColumn?: string;
    statusFilter?: string;
  };

  // 动态导入，避免在不支持的环境报错
  const { buildQuerySql, parseSqliteRows } = await import("../parser/index");
  const sql = buildQuerySql(options);

  let rows: Record<string, unknown>[];
  try {
    rows = await fs.readSqlite(dbPath, sql);
  } catch (e) {
    acc.addError(profile.id, dbPath, `SQLite 查询失败: ${(e as Error).message}`);
    return;
  }

  const items = parseSqliteRows(rows, options, baseSource, item.type, dbPath);
  for (const mi of items) {
    mi.source.filePath = dbPath;
  }
  acc.addItems(profile, items);
}

// ============================================================================
// 路径辅助函数
// ============================================================================

/**
 * 解析可能含通配符的路径。
 * 例如 root=/root, relativePath 含 workspaces 通配符
 * 用 glob 找到所有匹配的文件
 */
async function resolvePath(
  root: string,
  relativePath: string,
  fs: FsAdapter,
): Promise<string[]> {
  if (!relativePath.includes("*")) {
    return [joinPath(root, relativePath)];
  }

  // 有通配符，用 listFiles 的 glob 能力
  // 把 root + relativePath 的目录部分和 glob 部分分开
  const parts = relativePath.split("/");
  let dirPart = root;
  let globPart: string[] = [];

  for (const part of parts) {
    if (part.includes("*")) {
      globPart.push(part);
    } else {
      dirPart = joinPath(dirPart, part);
    }
  }

  const globPattern = globPart.join("/") || "*.md";
  const dirExists = await fs.exists(dirPart);
  if (!dirExists) return [];

  return fs.listFiles(dirPart, globPattern, [".git"]);
}

/** 拼接路径 */
function joinPath(base: string, rel: string): string {
  if (rel.startsWith("/")) return rel;
  return `${base.replace(/\/$/, "")}/${rel.replace(/^\.\//, "")}`;
}
