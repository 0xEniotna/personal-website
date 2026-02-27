export type Hero3DQuality = "balanced" | "max" | "light";
export type Hero3DInteraction = "mouse";

export interface Hero3DSettings {
  dprCap: number;
  smoothing: number;
  idleSpeed: number;
  maxTilt: number;
  maxYaw: number;
  pauseOutOfView: boolean;
  pauseThreshold: number;
  resizeDebounceMs: number;
  antialias: boolean;
  pointerTracking: boolean;
}

interface Hero3DSettingsInput {
  quality?: Hero3DQuality;
  interaction?: Hero3DInteraction;
  reducedMotion?: boolean;
  isTouchDevice?: boolean;
  devicePixelRatio?: number;
}

const PRESETS: Record<Hero3DQuality, Omit<Hero3DSettings, "pointerTracking">> = {
  balanced: {
    dprCap: 1.75,
    smoothing: 0.085,
    idleSpeed: 0.5,
    maxTilt: 0.22,
    maxYaw: 0.52,
    pauseOutOfView: true,
    pauseThreshold: 0.06,
    resizeDebounceMs: 120,
    antialias: true,
  },
  max: {
    dprCap: 2.25,
    smoothing: 0.1,
    idleSpeed: 0.5,
    maxTilt: 0.3,
    maxYaw: 0.65,
    pauseOutOfView: true,
    pauseThreshold: 0.05,
    resizeDebounceMs: 100,
    antialias: true,
  },
  light: {
    dprCap: 1.25,
    smoothing: 0.075,
    idleSpeed: 0.32,
    maxTilt: 0.18,
    maxYaw: 0.4,
    pauseOutOfView: true,
    pauseThreshold: 0.08,
    resizeDebounceMs: 140,
    antialias: false,
  },
};

export function resolveHero3DSettings(input: Hero3DSettingsInput = {}): Hero3DSettings {
  const quality = input.quality ?? "balanced";
  const interaction = input.interaction ?? "mouse";
  const reducedMotion = input.reducedMotion ?? false;
  const isTouchDevice = input.isTouchDevice ?? false;
  const devicePixelRatio = input.devicePixelRatio ?? 1;

  const preset = PRESETS[quality];
  const pointerTracking = interaction === "mouse" && !reducedMotion && !isTouchDevice;
  const isLowPower = devicePixelRatio > 2.4;

  const dprCapBase = isLowPower ? Math.min(preset.dprCap, 1.5) : preset.dprCap;
  const touchDprCap = isTouchDevice ? Math.min(dprCapBase, 1.35) : dprCapBase;

  if (reducedMotion) {
    return {
      ...preset,
      dprCap: touchDprCap,
      smoothing: 0.07,
      idleSpeed: 0,
      maxTilt: 0,
      maxYaw: 0,
      pointerTracking: false,
    };
  }

  return {
    ...preset,
    dprCap: touchDprCap,
    idleSpeed: isTouchDevice ? preset.idleSpeed * 0.72 : preset.idleSpeed,
    pointerTracking,
  };
}
