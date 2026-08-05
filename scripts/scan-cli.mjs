/**
 * MemoryHub CLI 验证脚本
 *
 * 运行方式: node scripts/scan-cli.mjs
 *
 * 这个脚本用 Node.js 直接运行 Scanner，扫描真实环境中的所有 Agent，
 * 打印出发现的 MemoryItem，验证核心架构是否正确。
 *
 * 这是在搭 UI 之前的"冒烟测试"——如果这里能正确扫描出数据，
 * 说明 Profile + Parser + Scanner 的设计是对的。
 */

// 使用 tsx 直接运行 TS（通过 node --import tsx 或 npx tsx）
import { getEnabledProfiles } from "../src/core/profiles/builtin-profiles";
import { scanAll } from "../src/core/scanner/scanner";
import { createNodeFsAdapter } from "./node-fs-adapter.mjs";

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║          MemoryHub 扫描验证 (CLI)                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log();

  const profiles = getEnabledProfiles();
  console.log(`📋 已加载 ${profiles.length} 个 Agent Profile:`);
  for (const p of profiles) {
    console.log(`   ${p.icon} ${p.name.padEnd(14)} → ${p.root} (${p.items.length} 条规则)`);
  }
  console.log();

  console.log("🔍 开始扫描...\n");
  const fs = createNodeFsAdapter();
  const result = await scanAll(profiles, fs);

  // 打印统计
  console.log("═════════════════════════════════════════════════════════════");
  console.log(`  扫描完成！耗时 ${(result.durationMs / 1000).toFixed(2)}s`);
  console.log(`  发现 ${result.items.length} 条记忆/规则条目`);
  if (result.errors.length > 0) {
    console.log(`  ⚠️  ${result.errors.length} 个错误`);
  }
  console.log("═════════════════════════════════════════════════════════════\n");

  // 按 Agent 分组统计
  console.log("📊 按 Agent 分组统计:");
  console.log("─".repeat(60));
  for (const stat of result.statsByAgent) {
    const status = stat.rootExists ? "✅" : "⚪ (目录不存在)";
    console.log(`  ${stat.agentIcon} ${stat.agentName.padEnd(14)} ${String(stat.itemCount).padStart(4)} 条  ${status}`);
    if (stat.itemCount > 0) {
      const typeBreakdown = Object.entries(stat.countByType)
        .map(([type, count]) => `${type}:${count}`)
        .join(", ");
      console.log(`     └─ ${typeBreakdown}`);
    }
  }
  console.log();

  // 打印每个 Agent 的前几条记忆（截断显示）
  const itemsByAgent = groupBy(result.items, (i) => i.source.agentId);
  for (const [agentId, items] of itemsByAgent) {
    const profile = profiles.find((p) => p.id === agentId);
    if (!profile) continue;

    console.log(`\n${"═".repeat(60)}`);
    console.log(`${profile.icon} ${profile.name} (${items.length} 条)`);
    console.log(`${"═".repeat(60)}`);

    // 最多显示前 5 条
    const showItems = items.slice(0, 5);
    for (const item of showItems) {
      const preview = item.content
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
      console.log(`\n  📌 [${item.source.itemType}] ${item.title}`);
      console.log(`     ${preview}${item.content.length > 80 ? "..." : ""}`);
      if (item.tags.length > 0) {
        console.log(`     🏷️  ${item.tags.slice(0, 5).join(", ")}`);
      }
      console.log(`     📄 ${item.source.filePath.replace(profile.root, "~")}`);
    }
    if (items.length > 5) {
      console.log(`\n  ... 还有 ${items.length - 5} 条未显示`);
    }
  }

  // 错误信息
  if (result.errors.length > 0) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`⚠️  错误 (${result.errors.length})`);
    console.log(`${"═".repeat(60)}`);
    for (const err of result.errors.slice(0, 10)) {
      console.log(`  [${err.agentId}] ${err.filePath}: ${err.message}`);
    }
  }

  console.log("\n✅ 验证完成。\n");
}

/** 分组辅助 */
function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

main().catch((err) => {
  console.error("❌ 扫描失败:", err);
  process.exit(1);
});
