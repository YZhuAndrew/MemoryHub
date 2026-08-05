/**
 * 更新检查 hook —— 管理「检查中 / 结果 / 错误」状态
 *
 * 提供:
 * - status: idle | checking | done | error
 * - result: 检查结果(有新版本时携带版本信息)
 * - error: 错误信息
 * - checkNow(): 手动触发检查(可静默)
 * - dismiss(): 关闭/忽略当前结果
 */

import { useCallback, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { checkForUpdate, type UpdateCheckResult } from "../core/update-checker";

export type UpdateStatus = "idle" | "checking" | "done" | "error";

interface UpdateState {
  status: UpdateStatus;
  result: UpdateCheckResult | null;
  error: string | null;
}

export function useUpdateCheck() {
  const [state, setState] = useState<UpdateState>({
    status: "idle",
    result: null,
    error: null,
  });

  // 避免启动时重复检查
  const autoCheckedRef = useRef(false);

  const checkNow = useCallback(async (silent = false): Promise<void> => {
    setState((s) => ({ ...s, status: "checking", error: null }));
    try {
      const currentVersion = await getVersion();
      const result = await checkForUpdate(currentVersion);
      setState({ status: "done", result, error: null });
    } catch (e) {
      // 静默模式(如启动自动检查)下不暴露错误,避免打扰用户
      if (!silent) {
        setState({ status: "error", result: null, error: String(e ?? "检查失败") });
      } else {
        setState({ status: "idle", result: null, error: null });
      }
    }
  }, []);

  /** 启动时自动检查(仅一次,静默) */
  const checkOnceOnStartup = useCallback(async (): Promise<void> => {
    if (autoCheckedRef.current) return;
    autoCheckedRef.current = true;
    await checkNow(true);
  }, [checkNow]);

  const dismiss = useCallback((): void => {
    setState({ status: "idle", result: null, error: null });
  }, []);

  return {
    status: state.status,
    result: state.result,
    error: state.error,
    hasUpdate: state.status === "done" && state.result?.hasUpdate === true,
    checkNow,
    checkOnceOnStartup,
    dismiss,
  };
}
