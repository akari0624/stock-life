import type { CSSProperties } from 'react'
import type { ActorSlot, BadgeSlot, FxSlot, SayLine, StageState } from '../director/StageState.ts'
import { actorVars, badgeVars, fxVars, sayVars, stageVars, type StageVars } from '../director/stageVars.ts'
import type { ActorAsset, AssetResolver, BgAsset, FxAsset } from '../assets/AssetResolver.ts'
import './stage.css'

/**
 * 舞台 —— director 當前狀態的投影，沒有自己的狀態，也不認識 sim。
 *
 * 所有動態值都以 `--c-*` CSS 變數注入（§10.4）；長相由 stage.css 決定。
 * 素材一律只用 id 問 AssetResolver，缺素材就拿到 fallback，**不會崩**（TODO.md #5a）。
 */

const style = (vars: StageVars): CSSProperties => vars as CSSProperties

export interface StageProps {
  stage: StageState
  resolver: AssetResolver
  className?: string
}

export function Stage({ stage, resolver, className }: StageProps) {
  const bg = resolver.bg(stage.bg)

  return (
    <div className={className ? `stage ${className}` : 'stage'} style={style(stageVars(stage))}>
      {bg && <Backdrop asset={bg} progress={stage.bgProgress} />}

      <div className="stage-actors">
        {stage.actors.map((actor) => {
          const asset = resolver.actor(actor.id)
          return asset ? <Actor key={actor.at} actor={actor} asset={asset} /> : null
        })}
      </div>

      <div className="stage-fx">
        {stage.fx.map((fx, index) => {
          const asset = resolver.fx(fx.id)
          return asset ? <Fx key={`${fx.id}-${index}`} fx={fx} asset={asset} /> : null
        })}
      </div>

      {stage.badges.length > 0 && (
        <div className="stage-badges">
          {stage.badges.map((badge, index) => (
            <Badge key={`${badge.id}-${index}`} badge={badge} />
          ))}
        </div>
      )}

      {stage.say && <Say say={stage.say} />}
    </div>
  )
}

function Backdrop({ asset, progress }: { asset: BgAsset; progress: number }) {
  const vars: StageVars = { '--c-bg-progress': progress, '--c-bg-hue': asset.hue }

  return (
    <div
      className={asset.source === 'manifest' ? 'stage-bg' : 'stage-bg stage-bg--fallback'}
      data-bg={asset.id}
      data-source={asset.source}
      style={style(asset.url ? { ...vars, '--c-bg-image': `url("${asset.url}")` } : vars)}
    />
  )
}

function Actor({ actor, asset }: { actor: ActorSlot; asset: ActorAsset }) {
  const vars: StageVars = { ...actorVars(actor), '--c-actor-hue': asset.hue }

  return (
    <div
      className={actor.at === 'right' ? 'stage-actor stage-actor--right' : 'stage-actor'}
      data-actor={asset.id}
      data-source={asset.source}
      data-emote={actor.emote}
      style={style(vars)}
    >
      {asset.url ? (
        <img className="stage-actor-image" src={asset.url} alt="" />
      ) : (
        // fallback：名字色塊（TODO.md #5a）
        <span className="stage-actor-chip" title={asset.id}>
          {asset.label}
        </span>
      )}
    </div>
  )
}

function Fx({ fx, asset }: { fx: FxSlot; asset: FxAsset }) {
  return (
    <div
      className={`stage-fx-layer stage-fx--${asset.animation}`}
      data-fx={asset.id}
      style={style(fxVars(fx))}
    />
  )
}

function Badge({ badge }: { badge: BadgeSlot }) {
  return (
    <span className="stage-badge" data-badge={badge.badge} style={style(badgeVars(badge))}>
      {badge.id}
    </span>
  )
}

function Say({ say }: { say: SayLine }) {
  return (
    <div className="stage-say" style={style(sayVars(say))}>
      <span className="stage-say-actor">{say.actor}</span>
      <span className="stage-say-text">{say.text}</span>
    </div>
  )
}
