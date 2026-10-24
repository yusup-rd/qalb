import {
  degreesToCompassLabel,
  getAngularDifference,
  getQiblaBearing,
  shortestRotationPath,
} from "./qibla-calculations";
import { describe, expect, it } from "@jest/globals";

describe("Qibla calculations", () => {
  it("returns the Kaaba bearing for known locations", () => {
    expect(getQiblaBearing(21.4225, 39.8262)).toBeCloseTo(0, 5);
    expect(getQiblaBearing(40.7128, -74.006)).toBeGreaterThan(50);
    expect(getQiblaBearing(40.7128, -74.006)).toBeLessThan(60);
  });

  it("measures and rotates across north by the shorter arc", () => {
    expect(getAngularDifference(359, 1)).toBe(2);
    expect(shortestRotationPath(359, 1)).toBe(361);
    expect(shortestRotationPath(1, 359)).toBe(-1);
  });

  it("normalizes bearings before choosing a compass label", () => {
    expect(degreesToCompassLabel(360)).toBe("N");
    expect(degreesToCompassLabel(-90)).toBe("W");
    expect(degreesToCompassLabel(45)).toBe("NE");
  });
});
