import { describe, expect, it } from "vitest";
import { playbackProgress, trajectoryPose } from "../src/lib/playback";

const start = { x: 1, y: 1, theta: 0 }, end = { x: 2, y: 3, theta: Math.PI / 2 };
describe("rehearsal frame boundaries", () => {
  it("keeps the first RAF frame before its captured start at the starting pose", () => {
    const progress = playbackProgress(1000, 1000.8, 6500);
    expect(progress).toBe(0);
    expect(trajectoryPose([start, end], progress, start)).toBe(start);
  });
  it("retains valid poses across completion, route replacement and invalid progress", () => {
    expect(trajectoryPose([start, end], playbackProgress(8000, 1000, 6500), start)).toBe(end);
    expect(trajectoryPose([], 1, start)).toBe(start);
    expect(trajectoryPose([end], 1, start)).toBe(end);
    for (const value of [-1, NaN, -Infinity, Infinity]) expect(trajectoryPose([start, end], value, start)).toBe(start);
    expect(trajectoryPose([start, end], 1.1, start)).toBe(end);
  });
});
