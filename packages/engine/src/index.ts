// Engine public API — populated as each Step is implemented
export const ENGINE_VERSION = '0.0.0'

export { SeededRng, RngStream } from './domain/rng/SeededRng.js'
export {
  encode as encodeShareCode,
  decode as decodeShareCode,
  type DecodeResult as ShareCodeDecodeResult,
  type DecodeSuccess as ShareCodeDecodeSuccess,
  type DecodeError as ShareCodeDecodeError,
} from './domain/rng/shareCode.js'
export { computeFingerprint, type PackIdentity } from './content/loader/fingerprint.js'

export {
  Calendar,
  stageForAge,
  type Granularity,
  type LifeStage,
  type CalendarConfig,
  type CalendarPoint,
} from './domain/Calendar.js'
export {
  cloneGameState,
  type GameState,
  type EventsState,
  type QueuedEvent,
  type PlayerState,
  type CapitalState,
  type CareerState,
  type EraState,
  type PositionsState,
  type TraitsState,
  type CountersState,
  type FlagsState,
  type FamilyStatus,
} from './domain/state/GameState.js'
export {
  createInitialGameState,
  DEFAULT_STARTING_CAPITAL,
  type CreateGameStateOptions,
} from './domain/state/createGameState.js'
export { cloneOffer, type Offer, type OfferSource } from './domain/state/Offer.js'
export {
  addStat,
  setStat,
  readStat,
  isStatKey,
  STAT_KEYS,
  type StatKey,
} from './domain/state/stats.js'
export {
  readFacade,
  FACADE_VERSION,
  type FacadePath,
  type FacadeValue,
} from './domain/facade/ModStateView.js'
export {
  listFacadeFields,
  type FacadeField,
  type FacadeFieldType,
  type FacadeFieldRange,
} from './domain/facade/FacadeField.js'

export {
  evaluate,
  isSatisfied,
  DEFAULT_EXPR_STEP_LIMIT,
  type Expr,
  type ComparableValue,
  type EvalContext,
  type EvaluateResult,
  type EvaluateStepLimitError,
} from './domain/expr/evaluate.js'
export {
  applyStateEffect,
  isStateEffect,
  isSceneHint,
  EffectRegistry,
  type Effect,
  type StateEffect,
  type SceneHint,
  type SceneRef,
  type Sizing,
  type NamedEffectFn,
  type NamedEffectContext,
} from './domain/expr/effects.js'

export {
  facadePathSchema,
  exprSchema,
  sizingSchema,
  stateEffectSchema,
  sceneHintSchema,
  sceneRefSchema,
  manifestSchema,
  opportunitySchema,
  signalSchema,
  eventSchema,
  careerGraphSchema,
  traitSchema,
  type Manifest,
} from './content/schema/index.js'
export { exportContentJSONSchemas } from './content/schema/toJSONSchema.js'

export type { ContentSource, RawContentPack } from './content/loader/ContentSource.js'
export { MemorySource } from './content/loader/MemorySource.js'
export {
  PasteSource,
  FileSource,
  normalizePackFile,
  serializePackFile,
  DEFAULT_MAX_PACK_BYTES,
  type ContentPackFile,
  type PasteSourceOptions,
  type ReadableFile,
} from './content/loader/PasteSource.js'
export {
  checkTrust,
  DEFAULT_TRUST_POLICY,
  type ContentTrustPolicy,
  type TrustIssue,
} from './content/loader/trust.js'
export {
  ENGINE_API_VERSION,
  checkCompatibility,
  type CompatibilityIssue,
} from './content/loader/compatibility.js'
export {
  loadContentPack,
  type LoadedContentPack,
  type LoadResult,
  type LoadOptions,
  type ContentValidationIssue,
  type ContentValidationSection,
} from './content/loader/loadContentPack.js'
export {
  mergeContentPacks,
  validateMergedContent,
  type MergedContent,
  type MergeResult,
} from './content/loader/merge.js'
export {
  NARRATOR_ACTOR,
  OPENING_BG,
  BUILTIN_SCENE_IDS,
} from './domain/expr/sceneIds.js'
export {
  collectRequiredAssets,
  missingAssets,
  assetManifestSkeleton,
  hasAssetFile,
  ASSET_KINDS,
  type AssetKind,
  type AssetUsage,
  type AssetRequirements,
  type CollectAssetsOptions,
} from './content/assets/requiredAssets.js'
export { createCoreTwSource } from './content/packs/core-tw/index.js'

export type { GameSystem, SystemCtx, Phase } from './domain/systems/GameSystem.js'
export { SystemRegistry } from './domain/systems/SystemRegistry.js'

export {
  ERA_PHASES,
  eraAt,
  type EraPhase,
  type PhaseSegment,
  type ThemeWave,
  type Timeline,
  type EraSnapshot,
} from './domain/systems/world/Timeline.js'
export {
  WorldGeneratorRegistry,
  WORLD_RNG_STREAM,
  type WorldGenerator,
  type WorldOptions,
} from './domain/systems/world/WorldGenerator.js'
export {
  randomWorldGenerator,
  CRASH_INTERVAL,
  THEME_WAVE_INTERVAL,
  THEME_WAVE_DURATION,
  DEFAULT_THEME_POOL,
} from './domain/systems/world/RandomWorldGenerator.js'
export { createDefaultWorldGeneratorRegistry } from './domain/systems/world/defaultRegistry.js'
export {
  twHistoryWorldGenerator,
  twHistoryPhaseAt,
  twHistoryNoteAt,
  TW_HISTORY_ID,
  TW_HISTORY_LAST_YEAR,
} from './domain/systems/world/TwHistoryWorldGenerator.js'
export {
  createEraSystem,
  eraStateFor,
  ERA_SYSTEM_ID,
  ERA_SYSTEM_ORDER,
  type EraSystemOptions,
} from './domain/systems/world/EraSystem.js'

export {
  createDiceSystem,
  isDiceChannel,
  DICE_CHANNELS,
  DICE_SYSTEM_ID,
  DICE_SYSTEM_ORDER,
  DICE_FACES,
  DICE_RANK_BONUS,
  COUNTER_DICE_POOL,
  COUNTER_DICE_SPENT,
  counterForChannel,
  type DiceChannel,
} from './domain/systems/economy/DiceSystem.js'
export {
  createCapitalSystem,
  CAPITAL_SYSTEM_ID,
  CAPITAL_SYSTEM_ORDER,
  DEBT_INTEREST_RATE,
  DEBT_REPAYMENT_RATE,
} from './domain/systems/economy/CapitalSystem.js'
export {
  createCognitionSystem,
  COGNITION_SYSTEM_ID,
  COGNITION_SYSTEM_ORDER,
} from './domain/systems/economy/CognitionSystem.js'
export {
  createNetworkSystem,
  NETWORK_SYSTEM_ID,
  NETWORK_SYSTEM_ORDER,
} from './domain/systems/economy/NetworkSystem.js'
export {
  findNode,
  edgesFrom,
  type CareerGraph,
  type CareerNode,
  type CareerEdge,
} from './domain/systems/career/CareerGraph.js'
export {
  toPlayerView,
  type PlayerView,
  type OpenPositionView,
} from './domain/state/playerView.js'
export {
  signalTierFor,
  signalTierForState,
  resolveSignal,
  indexOpportunities,
  LIFE_TIER,
  SIGNAL_MID_COGNITION,
  SIGNAL_HIGH_COGNITION,
  SIGNAL_NETWORK_BUMP,
  type SignalTier,
  type SignalLevel,
  type SignalReveal,
  type OpportunitySignal,
  type OpportunityTruth,
  type OpportunityIndex,
} from './domain/systems/opportunity/Opportunity.js'
export {
  createOpportunitySystem,
  offerIdFor as opportunityOfferIdFor,
  sourceChance,
  flagDeclined,
  flagTaken,
  OPPORTUNITY_SYSTEM_ID,
  OPPORTUNITY_SYSTEM_ORDER,
  MAX_OFFERS_PER_TURN,
  COUNTER_OPPORTUNITIES_SEEN,
  COUNTER_OPPORTUNITIES_TAKEN,
  COUNTER_OPPORTUNITIES_DECLINED,
  type OpportunitySystemOptions,
} from './domain/systems/opportunity/OpportunitySystem.js'
export {
  resolveTruth,
  SIZING_FRACTION,
  SIZING_LEVERAGE,
  RUIN_RECOVERY,
  type Position,
  type ClosedPosition,
  type PositionSecret,
} from './domain/systems/position/Position.js'
export {
  createPositionSystem,
  openPosition,
  positionOpener,
  POSITION_SYSTEM_ID,
  POSITION_SYSTEM_ORDER,
  TRIAL_CHANCE,
  TRIAL_CHOICES,
  FLAG_LEVERAGED_WIPEOUT,
  COUNTER_HELD_THROUGH_DRAWDOWN,
  COUNTER_PANIC_SOLD,
  COUNTER_TRIALS_FACED,
  COUNTER_POSITIONS_CLOSED,
  COUNTER_RUINED,
  COUNTER_WIPEOUTS,
  type TrialChoice,
  type PositionDeps,
} from './domain/systems/position/PositionSystem.js'
export {
  successChance,
  findChoice,
  BASE_SUCCESS_CHANCE,
  type EventDef,
  type EventChoice,
  type EventChoiceId,
  type EventLink,
  type EventOutcome,
} from './domain/systems/event/EventDef.js'
export type { PendingEvent, PendingChoiceView } from './domain/systems/event/PendingEvent.js'
export {
  createEventSystem,
  enqueueEvent,
  type EnqueueOptions,
  EVENT_SYSTEM_ID,
  EVENT_SYSTEM_ORDER,
  DEFAULT_CHOICE,
  COUNTER_EVENTS_RESOLVED,
  COUNTER_EVENTS_GOOD,
  COUNTER_EVENTS_BAD,
  counterForEventChoice,
  type EventSystemOptions,
} from './domain/systems/event/EventSystem.js'
export {
  TRAIT_MOMENTS,
  type TraitDef,
  type TraitMoment,
} from './domain/systems/trait/TraitDef.js'
export {
  pushMoment,
  drainMoments,
  MOMENT_TURN_END,
  MOMENT_POSITION_CLOSE,
  MOMENT_EVENT_RESOLVE,
} from './domain/systems/trait/moments.js'
export {
  createTraitSystem,
  TRAIT_SYSTEM_ID,
  TRAIT_SYSTEM_ORDER,
  COUNTER_TRAITS_UNLOCKED,
  type TraitSystemOptions,
} from './domain/systems/trait/TraitSystem.js'
export {
  createCounterSystem,
  collectContentCounters,
  bumpCounter,
  COUNTER_SYSTEM_ID,
  COUNTER_SYSTEM_ORDER,
  type CounterDeclaration,
  type CounterSystemOptions,
} from './domain/systems/counter/CounterSystem.js'
export {
  applyContentEffects,
  type ContentEffectDeps,
} from './domain/systems/content/applyContentEffects.js'
export {
  createCareerSystem,
  CAREER_SYSTEM_ID,
  CAREER_SYSTEM_ORDER,
  COUNTER_CAREER_MOVES,
  COUNTER_CAREER_DECLINED,
  type CareerSystemOptions,
} from './domain/systems/career/CareerSystem.js'
export type { Command } from './domain/turn/Command.js'
export {
  createAdvance,
  type Advance,
  type AdvanceDeps,
  type AdvanceResult,
} from './domain/turn/advance.js'
export { Sim, type SimOptions, type SimSnapshot } from './sim/Sim.js'
export {
  createLife,
  DEFAULT_START_AGE,
  DEFAULT_END_AGE,
  DEFAULT_START_YEAR,
  type Life,
  type LifeOptions,
  type ResolvedLifeOptions,
  type CreateLifeResult,
} from './sim/createLife.js'
export {
  createSaveFile,
  parseSaveFile,
  serializeSave,
  deserializeSave,
  migrateSave,
  restoreLife,
  describePacks,
  commandSchema,
  saveFileSchema,
  SAVE_SCHEMA_VERSION,
  SAVE_MIGRATIONS,
  type SaveFile,
  type SaveMeta,
  type SaveLifeOptions,
  type SaveError,
  type SaveErrorKind,
  type SaveMigration,
  type MigrateOptions,
  type MigrateResult,
  type ParseSaveResult,
  type RestoreOptions,
  type RestoreResult,
} from './sim/save.js'
export {
  defaultPolicy,
  splitDice,
  type Policy,
  type PolicyContext,
  type DefaultPolicyOptions,
} from './sim/policy.js'
export { nextDecision, type Decision } from './sim/decisions.js'
export {
  runLife,
  replayLife,
  summariseLife,
  outcomeFor,
  OUTCOME_THRESHOLDS,
  type Outcome,
  type LifeSummary,
  type RunLifeOptions,
  type RunLifeResult,
  type RunLifeOutcome,
} from './sim/headless.js'
export {
  runBalance,
  summariseRuns,
  formatBalanceReport,
  type BalanceOptions,
  type BalanceReport,
} from './sim/balance.js'
export {
  probeEvents,
  type EventProbe,
  type ProbeReport,
  type ProbeOptions,
  type ProbeResult,
} from './sim/probe.js'
