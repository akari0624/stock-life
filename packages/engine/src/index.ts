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
  type CreateGameStateOptions,
} from './domain/state/createGameState.js'
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
  type Opportunity,
  type Event,
  type CareerGraph,
  type Trait,
} from './content/schema/index.js'
export { exportContentJSONSchemas } from './content/schema/toJSONSchema.js'

export type { ContentSource, RawContentPack } from './content/loader/ContentSource.js'
export { MemorySource } from './content/loader/MemorySource.js'
export {
  ENGINE_API_VERSION,
  checkCompatibility,
  type CompatibilityIssue,
} from './content/loader/compatibility.js'
export {
  loadContentPack,
  type LoadedContentPack,
  type LoadResult,
  type ContentValidationIssue,
  type ContentValidationSection,
} from './content/loader/loadContentPack.js'
export { mergeContentPacks, type MergedContent, type MergeResult } from './content/loader/merge.js'
export { createCoreTwSource } from './content/packs/core-tw/index.js'

export type { GameSystem, SystemCtx, Phase } from './domain/systems/GameSystem.js'
export { SystemRegistry } from './domain/systems/SystemRegistry.js'
export type { Command } from './domain/turn/Command.js'
export {
  createAdvance,
  type Advance,
  type AdvanceDeps,
  type AdvanceResult,
} from './domain/turn/advance.js'
export { Sim, type SimOptions, type SimSnapshot } from './sim/Sim.js'
