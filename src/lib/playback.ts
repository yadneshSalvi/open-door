import type { Pose } from "@/engine/types";

export function clampProgress(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

/** RAF timestamps may precede work performed later in the same animation frame. */
export function playbackProgress(timestamp: number, startedAt: number, duration: number): number {
  return duration > 0 ? clampProgress((timestamp - startedAt) / duration) : 0;
}

export function trajectoryPose(path: readonly Pose[], progress: number, fallback: Pose): Pose {
  const index = Math.floor(clampProgress(progress) * Math.max(0, path.length - 1));
  return path[index] ?? fallback;
}
