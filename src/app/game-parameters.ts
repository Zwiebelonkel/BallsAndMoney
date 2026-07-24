export const DEFAULT_GAME_PARAMETERS = {
  upgrades: {
    size: { baseCost: 55, growth: 2.15 },
    mult: { baseCost: 80, growth: 1.62 },
    cap: { baseCost: 120, growth: 2.35, tierGrowthStart: 4, tierGrowth: 1.35 },
    combo: { baseCost: 280, growth: 1.58 },
    launch: { baseCost: 70, growth: 2.1 },
    border: { baseCost: 85000, growth: 9, maxLevel: 4 }
  },
  balls: {
    baseCapacity: 4,
    softcapStart: 8,
    softcapFactor: 0.5,
    baseRadius: 14,
    radiusPerSizeUpgrade: 1.5,
    randomRadiusMin: 0.85,
    randomRadiusMax: 1.15,
    massFactor: 0.01,
    arenaScaleBallsPerTier: 8,
    arenaScalePerTier: 0.18,
    baseLaunchMultiplier: 0.55,
    launchGrowth: 1.18,
    randomShotMinSpeed: 2,
    randomShotSpeedRange: 3,
    aimedShotMaxSpeed: 14,
    maxDrag: 160,
    tapShotThreshold: 4,
    trailLength: 18
  },
  rewards: {
    multiplierPerUpgrade: 0.6,
    starterCollisionCount: 40,
    starterCollisionBonus: 1.5,
    borderCollisionValue: 0.35,
    comboWindowMs: 750,
    comboBaseMax: 12,
    comboBonusScale: 0.16,
    comboLevelExponent: 0.72,
    comboMinimumCount: 3
  },
  prestige: {
    baseCost: 2500000,
    costGrowth: 3.2,
    baseMultiplierBonus: 0.35,
    overflowStep: 1000000,
    overflowBonus: 0.03,
    overflowMaxBonus: 0.45
  },
  physics: {
    frameMs: 16.67,
    maxSimulationDelta: 3,
    maxCatchUpMs: 30000,
    maxDevicePixelRatio: 2
  },
  ui: {
    floatMergeDistance: 80,
    floatMergeWindowMs: 180,
    graphLength: 120,
    dashboardSampleMs: 800,
    autosaveMs: 5000,
    saveDebounceMs: 250,
    floatLifetimeMs: 1200,
    comboPillLifetimeMs: 1200
  },
  admin: {
    moneyGrant: 1000000
  }
} as const;

export type GameParameters = typeof DEFAULT_GAME_PARAMETERS;

export function cloneGameParameters(): GameParameters {
  return JSON.parse(JSON.stringify(DEFAULT_GAME_PARAMETERS));
}
