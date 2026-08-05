/**
 * Markdown 解析器
 *
 * 处理 4 种 Markdown 格式范式：
 * 1. md-full    —— 整个文件作为一条记忆
 * 2. md-section —— 用分隔符（如 §）切分，每段一条
 * 3. md-heading —— 用 ## 标题切分，每个标题下的内容一条
 * 4. md-task    —— Codex 风格：## Task N 分组 + 元信息
 */

import type { MemoryItem, MemorySource, SourceFormat } from "../../types";

// ============================================================================
// 解析接口
// ============================================================================

export interface ParseContext {
  filePath: string;
  content: string;
  format: SourceFormat;
  formatOptions?: Record<string, unknown>;
  source: Omit<MemorySource, "itemType">;
  itemType: MemorySource["itemType"];
}

export interface ParseResult {
  items: MemoryItem[];
  errors: string[];
}

// ============================================================================
// 主入口：根据 format 分发到具体解析器
// ============================================================================

export function parseMarkdown(ctx: ParseContext): ParseResult {
  const errors: string[] = [];

  if (!ctx.content.trim()) {
    return { items: [], errors };
  }

  try {
    switch (ctx.format) {
      case "md-full":
        return { items: parseMdFull(ctx), errors };
      case "md-section":
        return { items: parseMdSection(ctx), errors };
      case "md-heading":
        return { items: parseMdHeading(ctx), errors };
      case "md-task":
        return { items: parseMdTask(ctx), errors };
      default:
        // 未知格式，降级为 md-full
        return {
          items: parseMdFull(ctx),
          errors: [`未知格式 ${ctx.format}，降级为 md-full`],
        };
    }
  } catch (e) {
    errors.push(`解析失败: ${(e as Error).message}`);
    return { items: [], errors };
  }
}

// ============================================================================
// md-full：整个文件作为一条记忆
// ============================================================================

function parseMdFull(ctx: ParseContext): MemoryItem[] {
  const lines = ctx.content.split("\n");

  // 从内容中提取第一个标题作为 title
  const title = extractFirstTitle(ctx.content) ?? getFileName(ctx.filePath);

  return [
    {
      id: makeId(ctx.source.agentId, ctx.filePath, "full"),
      source: { ...ctx.source, itemType: ctx.itemType },
      title,
      content: ctx.content,
      format: "md-full",
      location: {
        lineRange: [0, lines.length - 1],
      },
      tags: extractTags(ctx.content),
      updatedAt: 0, // 由 Scanner 填充文件 mtime
      contentLength: ctx.content.length,
    },
  ];
}

// ============================================================================
// md-section：用分隔符（如 §）切分
// Hermes 的 MEMORY.md 就是这种格式
// ============================================================================

function parseMdSection(ctx: ParseContext): MemoryItem[] {
  const delimiter = String(ctx.formatOptions?.delimiter ?? "§");
  const lines = ctx.content.split("\n");
  const items: MemoryItem[] = [];

  // 找到所有分隔符所在的行号
  const delimiterLines: number[] = [];
  lines.forEach((line, i) => {
    if (line.trim() === delimiter) {
      delimiterLines.push(i);
    }
  });

  // 如果没有分隔符，降级为 md-full
  if (delimiterLines.length === 0) {
    return parseMdFull(ctx);
  }

  // 分隔符之间的内容就是一条记忆
  // 第一条是文件开头到第一个分隔符之前（通常是文件标题等）
  const boundaries = [-1, ...delimiterLines, lines.length];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const startLine = boundaries[i] + 1; // 跳过分隔符行本身
    const endLine = boundaries[i + 1] - 1;

    const sectionLines = lines.slice(startLine, endLine + 1);
    const sectionContent = sectionLines.join("\n").trim();

    if (!sectionContent) continue;

    // 第一条（文件开头部分）如果只是标题/元信息，可以跳过
    // 但为了不丢数据，我们保留它，只是标记为不同的索引
    const isFirstSection = i === 0;

    const title = extractFirstTitle(sectionContent) ?? sectionContent.split("\n")[0].slice(0, 60);

    items.push({
      id: makeId(ctx.source.agentId, ctx.filePath, `sec-${i}`),
      source: { ...ctx.source, itemType: ctx.itemType },
      title: title || `记忆片段 ${i + 1}`,
      content: sectionContent,
      format: "md-section",
      location: {
        lineRange: [startLine, endLine],
        delimiter,
      },
      tags: extractTags(sectionContent),
      updatedAt: 0,
      contentLength: sectionContent.length,
      // 标记首段（通常是文件头/元信息，不是真正的记忆条目）
      ...(isFirstSection && { title: title ? `[文件头] ${title}` : "[文件头]" }),
    });
  }

  return items;
}

// ============================================================================
// md-heading：用 ## / ### 标题切分
// WorkBuddy 的 USER.md / MEMORY.md 常用这种格式
// ============================================================================

function parseMdHeading(ctx: ParseContext): MemoryItem[] {
  const lines = ctx.content.split("\n");
  const items: MemoryItem[] = [];

  // 正则匹配 ## 或 ### 开头的标题行（至少两个 #）
  const headingRegex = /^(#{2,6})\s+(.+)$/;

  let currentHeading: string | null = null;
  let currentStartLine = 0;
  let currentLines: string[] = [];
  let sectionIndex = 0;

  // 文件开头到第一个标题之前的内容（如果有）
  const preambleLines: string[] = [];
  let foundFirstHeading = false;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(headingRegex);

    if (match) {
      // 遇到新标题，先把上一个 section 收尾
      if (currentHeading !== null) {
        flushSection();
      } else if (!foundFirstHeading && preambleLines.length > 0) {
        // preamble 作为第一条
        const preambleContent = preambleLines.join("\n").trim();
        if (preambleContent) {
          items.push({
            id: makeId(ctx.source.agentId, ctx.filePath, `head-pre`),
            source: { ...ctx.source, itemType: ctx.itemType },
            title: extractFirstTitle(preambleContent) ?? "[文件头]",
            content: preambleContent,
            format: "md-heading",
            location: { lineRange: [0, i - 1] },
            tags: extractTags(preambleContent),
            updatedAt: 0,
            contentLength: preambleContent.length,
          });
        }
      }

      foundFirstHeading = true;
      currentHeading = match[2].trim();
      currentStartLine = i;
      currentLines = [];
    } else if (foundFirstHeading) {
      currentLines.push(lines[i]);
    } else {
      preambleLines.push(lines[i]);
    }
  }

  // 收尾最后一个 section
  if (currentHeading !== null) {
    flushSection();
  }

  // 如果一个标题都没找到，降级为 md-full
  if (items.length === 0) {
    return parseMdFull(ctx);
  }

  function flushSection() {
    const content = currentLines.join("\n").trim();
    if (!content && !currentHeading) return;

    items.push({
      id: makeId(ctx.source.agentId, ctx.filePath, `head-${sectionIndex}`),
      source: { ...ctx.source, itemType: ctx.itemType },
      title: currentHeading ?? `章节 ${sectionIndex + 1}`,
      content,
      format: "md-heading",
      location: { lineRange: [currentStartLine, lines.length - 1] },
      tags: extractTags(content),
      updatedAt: 0,
      contentLength: content.length,
    });
    sectionIndex++;
  }

  return items;
}

// ============================================================================
// md-task：Codex 风格的 Task 分组
// 结构: ## Task N: 标题，下面有 scope/applies_to/keywords 等元信息
// ============================================================================

function parseMdTask(ctx: ParseContext): MemoryItem[] {
  const lines = ctx.content.split("\n");
  const items: MemoryItem[] = [];

  // Codex 的 MEMORY.md 结构：
  // # Task Group: xxx
  // scope: ...
  // applies_to: ...
  // ## Task 1: xxx
  //   ### rollout_summary_files ...
  //   ### keywords ...
  //   ## User preferences ...

  // 先提取顶层的 Task Group 信息（scope/applies_to）
  const groupMatch = ctx.content.match(/^#\s+Task Group:\s*(.+)$/m);
  const groupName = groupMatch ? groupMatch[1].trim() : null;

  // 按 ## Task N 分割
  const taskRegex = /^##\s+(Task\s+\d+.*?)$/;
  const taskBoundaries: { line: number; title: string }[] = [];

  lines.forEach((line, i) => {
    const m = line.match(taskRegex);
    if (m) {
      taskBoundaries.push({ line: i, title: m[1].trim() });
    }
  });

  // 也匹配 ## User preferences 这类非 Task 的二级标题
  const prefRegex = /^##\s+((?!Task\s).+)$/;
  lines.forEach((line, i) => {
    const m = line.match(prefRegex);
    if (m && !taskBoundaries.some((b) => b.line === i)) {
      taskBoundaries.push({ line: i, title: m[1].trim() });
    }
  });

  taskBoundaries.sort((a, b) => a.line - b.line);

  if (taskBoundaries.length === 0) {
    // 没有找到 Task 结构，降级为 md-heading
    return parseMdHeading(ctx);
  }

  // 提取 Task Group 的 preamble（scope 等元信息）作为第一条
  const firstTaskLine = taskBoundaries[0].line;
  if (firstTaskLine > 0) {
    const preamble = lines.slice(0, firstTaskLine).join("\n").trim();
    if (preamble) {
      items.push({
        id: makeId(ctx.source.agentId, ctx.filePath, `task-pre`),
        source: { ...ctx.source, itemType: ctx.itemType },
        title: groupName ? `[Task Group] ${groupName}` : "[Task Group 元信息]",
        content: preamble,
        format: "md-task",
        location: { lineRange: [0, firstTaskLine - 1] },
        tags: extractTags(preamble),
        updatedAt: 0,
        contentLength: preamble.length,
      });
    }
  }

  // 每个 Task 作为一个 item
  for (let i = 0; i < taskBoundaries.length; i++) {
    const startLine = taskBoundaries[i].line;
    const endLine = i < taskBoundaries.length - 1 ? taskBoundaries[i + 1].line - 1 : lines.length - 1;
    const content = lines.slice(startLine, endLine + 1).join("\n").trim();

    if (!content) continue;

    // 尝试从内容中提取 scope 关键字作为标签
    const scopeMatch = content.match(/scope:\s*(.+)/);
    const tags = extractTags(content);
    if (scopeMatch) {
      tags.push("scope:" + scopeMatch[1].trim().slice(0, 30));
    }

    items.push({
      id: makeId(ctx.source.agentId, ctx.filePath, `task-${i}`),
      source: { ...ctx.source, itemType: ctx.itemType },
      title: taskBoundaries[i].title,
      content,
      format: "md-task",
      location: { lineRange: [startLine, endLine] },
      tags,
      updatedAt: 0,
      contentLength: content.length,
    });
  }

  return items;
}

// ============================================================================
// 辅助函数
// ============================================================================

/** 从 Markdown 内容中提取第一个标题（# 或 ## 开头） */
function extractFirstTitle(content: string): string | null {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/** 从文件路径提取文件名（不含扩展名） */
function getFileName(filePath: string): string {
  const base = filePath.split("/").pop() ?? filePath;
  return base.replace(/\.\w+$/, "");
}

/** 生成条目唯一 ID */
function makeId(agentId: string, filePath: string, suffix: string): string {
  // 用相对路径的简短哈希避免 ID 过长
  const pathHash = simpleHash(filePath);
  return `${agentId}:${pathHash}:${suffix}`;
}

/** 简单字符串哈希（非加密用途，仅用于生成短 ID） */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * 从内容中提取标签。
 * 启发式规则：
 * - `#标签` 形式的 hashtag
 * - code block 里的关键词（如 skill_manage, Computer Use）
 * - 中英文混合的技术名词
 */
function extractTags(content: string): string[] {
  const tags = new Set<string>();

  // 匹配 #标签（但不匹配 Markdown 标题 #）
  const hashtagRegex = /(?:^|\s)#([^\s#]{2,20})/g;
  let match;
  while ((match = hashtagRegex.exec(content)) !== null) {
    tags.add(match[1]);
  }

  // 匹配 "关键词1, 关键词2" 这类逗号分隔的列表（常见于 keywords 段落）
  const keywordSection = content.match(/(?:keywords|标签|tags)[:：]\s*\n([\s\S]*?)(?:\n\n|\n##|\n#|$)/i);
  if (keywordSection) {
    const kwLines = keywordSection[1].split("\n");
    for (const line of kwLines) {
      const items = line.split(/[,\，、]/);
      for (const item of items) {
        const clean = item.replace(/^[-\s*]+/, "").trim();
        if (clean && clean.length >= 2 && clean.length <= 30) {
          tags.add(clean);
        }
      }
    }
  }

  return Array.from(tags).slice(0, 10); // 最多 10 个标签
}
