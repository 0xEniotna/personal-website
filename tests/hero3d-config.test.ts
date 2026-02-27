import { describe, expect, it } from "vitest";
import { resolveHero3DSettings } from "../src/lib/hero3d";

describe("hero3d settings", () => {
  it("returns balanced defaults with pointer tracking on desktop", () => {
    const settings = resolveHero3DSettings({
      quality: "balanced",
      interaction: "mouse",
      reducedMotion: false,
      isTouchDevice: false,
      devicePixelRatio: 2,
    });

    expect(settings.pointerTracking).toBe(true);
    expect(settings.idleSpeed).toBeGreaterThan(0);
    expect(settings.maxYaw).toBeGreaterThan(0.4);
    expect(settings.dprCap).toBeLessThanOrEqual(1.75);
  });

  it("disables pointer tracking on touch devices", () => {
    const settings = resolveHero3DSettings({
      quality: "balanced",
      interaction: "mouse",
      reducedMotion: false,
      isTouchDevice: true,
      devicePixelRatio: 3,
    });

    expect(settings.pointerTracking).toBe(false);
    expect(settings.dprCap).toBeLessThanOrEqual(1.35);
    expect(settings.idleSpeed).toBeLessThan(0.32);
  });

  it("disables motion when reduced motion is requested", () => {
    const settings = resolveHero3DSettings({
      quality: "max",
      interaction: "mouse",
      reducedMotion: true,
      isTouchDevice: false,
      devicePixelRatio: 1.5,
    });

    expect(settings.pointerTracking).toBe(false);
    expect(settings.idleSpeed).toBe(0);
    expect(settings.maxTilt).toBe(0);
    expect(settings.maxYaw).toBe(0);
  });
});
