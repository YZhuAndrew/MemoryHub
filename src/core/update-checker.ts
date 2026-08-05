/**
 * 更新检查 —— 通过 GitHub Releases API 比对版本
 *
 * 方案:轻量级「检查 + 通知 + 跳转」,不做自动下载替换。
 * 适合未签名应用(无需 Tauri updater 密钥/CI)。
 * 匹配现有的「下载 dmg 拖入 Applications」安装流程。
 */

/** GitHub 仓库坐标(发布源) */
const GITHUB_OWNER = "YZhuAndrew";
const GITHUB_REPO = "MemoryHub";
const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const RELEASES_PAGE_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

/** 检查结果 */
export interface UpdateCheckResult {
  /** 是否有新版本 */
  hasUpdate: boolean;
  /** 远端最新版本号(已规整,如 "0.2.0") */
  latestVersion: string;
  /** 当前版本号(如 "0.1.0") */
  currentVersion: string;
  /** Release 页面 URL(用于「查看/下载」跳转) */
  releaseUrl: string;
  /** Release notes (markdown 原文) */
  notes: string;
  /** 发布时间 (ISO 字符串) */
  publishedAt: string;
}

/**
 * 规整版本号字符串:去掉前缀 "v"、去空格。
 * "v0.2.0" → "0.2.0","0.2.0" → "0.2.0"
 */
function normalizeVersion(raw: string): string {
  return raw.trim().replace(/^v/i, "");
}

/**
 * 比较两个版本号(均为 x.y.z 格式)。
 * @returns 正数表示 a 更新,负数表示 b 更新,0 表示相等。
 */
export function compareVersions(a: string, b: string): number {
  const partsA = normalizeVersion(a).split(".").map((n) => parseInt(n, 10) || 0);
  const partsB = normalizeVersion(b).split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const va = partsA[i] ?? 0;
    const vb = partsB[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

/**
 * 调用 GitHub API 检查是否有新版本。
 *
 * @param currentVersion 当前应用版本(如 "0.1.0")
 * @throws 网络错误或 API 异常时抛出(调用方可捕获后静默处理)
 */
export async function checkForUpdate(currentVersion: string): Promise<UpdateCheckResult> {
  // 带超时的 fetch(避免离线/网络慢时长时间挂起,尤其是启动自动检查)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let resp: Response;
  try {
    resp = await fetch(LATEST_RELEASE_API, {
      headers: {
        // GitHub API 要求 User-Agent,否则 403
        Accept: "application/vnd.github+json",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!resp.ok) {
    throw new Error(`GitHub API 返回 ${resp.status}`);
  }

  const data = (await resp.json()) as {
    tag_name: string;
    html_url: string;
    body: string;
    published_at: string;
  };

  const latestVersion = normalizeVersion(data.tag_name);
  const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

  return {
    hasUpdate,
    latestVersion,
    currentVersion,
    releaseUrl: data.html_url || RELEASES_PAGE_URL,
    notes: data.body || "",
    publishedAt: data.published_at || "",
  };
}

/** Release 列表页 URL(检查失败时作为兜底跳转) */
export function getReleasesPageUrl(): string {
  return RELEASES_PAGE_URL;
}
