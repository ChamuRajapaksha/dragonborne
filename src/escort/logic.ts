import { stepMovement } from '../movement'
import type { MovementProfile } from '../movement'
import { TILE_SIZE } from '../world/tileset'
import type { EscortDefinition, EscortProgress, EscortStop } from './types'

const MAX_FOLLOW_DELTA_SECONDS = 0.05
const CATCH_UP_MULTIPLIER = 1.6
const FOLLOWER_ACCELERATION_FACTOR = 20
const FOLLOWER_DECELERATION_FACTOR = 20

function finite(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function followerProfile(speed: number): MovementProfile {
  return {
    id: 'follower',
    maxSpeed: speed,
    acceleration: speed * FOLLOWER_ACCELERATION_FACTOR,
    deceleration: speed * FOLLOWER_DECELERATION_FACTOR,
    sprintMultiplier: 1,
    cameraLerpX: 0,
    cameraLerpY: 0,
  }
}

export function canStartEscort(
  def: EscortDefinition,
  active: EscortProgress | null,
  completedQuestIds: readonly string[],
): boolean {
  if (!def?.id || !def.questId || !def.npcId) return false
  if (active !== null && active !== undefined) return false
  if (!Array.isArray(def.stops) || def.stops.length === 0) return false
  return !completedQuestIds?.includes(def.questId)
}

export function startEscort(
  def: EscortDefinition,
  at: { areaId: string; x: number; y: number },
): EscortProgress {
  return {
    escortId: def.id,
    npcId: def.npcId,
    stopIndex: 0,
    areaId: at?.areaId ?? '',
    x: finite(at?.x),
    y: finite(at?.y),
  }
}

export function isEscortComplete(progress: EscortProgress, def: EscortDefinition): boolean {
  if (!def || !Array.isArray(def.stops) || def.stops.length === 0 || !progress) return false
  const index = finite(progress.stopIndex)
  return Number.isInteger(index) && index >= def.stops.length
}

export function currentStop(progress: EscortProgress, def: EscortDefinition): EscortStop | null {
  if (!def || !Array.isArray(def.stops) || !progress) return null
  const index = finite(progress.stopIndex)
  if (!Number.isInteger(index) || index < 0 || index >= def.stops.length) return null
  return def.stops[index] ?? null
}

export function isStopReached(
  progress: EscortProgress,
  def: EscortDefinition,
  player: { x: number; y: number },
): boolean {
  const stop = currentStop(progress, def)
  if (!stop || !player || stop.areaId !== progress.areaId) return false
  if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) return false

  const point = { x: finite(stop.x) * TILE_SIZE, y: finite(stop.y) * TILE_SIZE }
  const radius = Math.max(0, finite(def.stopRadius))
  return Math.hypot(player.x - point.x, player.y - point.y) <= radius
}

export function advanceEscort(
  progress: EscortProgress,
  def: EscortDefinition,
  player: { x: number; y: number },
): { progress: EscortProgress; arrived: EscortStop | null; complete: boolean } {
  const stop = currentStop(progress, def)
  if (stop && isStopReached(progress, def, player)) {
    const next = { ...progress, stopIndex: progress.stopIndex + 1 }
    return { progress: next, arrived: stop, complete: isEscortComplete(next, def) }
  }
  return { progress, arrived: null, complete: isEscortComplete(progress, def) }
}

export function followSpeedForDistance(def: EscortDefinition, distance: number): number {
  const speed = Math.max(0, finite(def?.npcSpeed))
  const leash = Math.max(0, finite(def?.leashRadius))
  return finite(distance) > leash ? speed * CATCH_UP_MULTIPLIER : speed
}

export function stepFollower(
  progress: EscortProgress,
  def: EscortDefinition,
  player: { x: number; y: number },
  deltaSeconds: number,
): EscortProgress {
  if (!progress) return progress

  const x = finite(progress.x)
  const y = finite(progress.y)
  const dx = finite(player?.x) - x
  const dy = finite(player?.y) - y
  const distance = Math.hypot(dx, dy)
  const radius = Math.max(0, finite(def?.followRadius))
  const delta = Math.max(0, Math.min(MAX_FOLLOW_DELTA_SECONDS, finite(deltaSeconds)))

  if (distance <= radius || delta === 0) return { ...progress, x, y }

  const speed = followSpeedForDistance(def, distance)
  if (speed <= 0) return { ...progress, x, y }

  const directionX = dx / distance
  const directionY = dy / distance
  const velocity = stepMovement(
    {
      vx: directionX * speed,
      vy: directionY * speed,
      facing: { x: directionX, y: directionY },
    },
    { x: directionX, y: directionY, sprint: false },
    followerProfile(speed),
    delta,
  )
  const ratio = Math.min(speed * delta, distance - radius) / (speed * delta)

  return {
    ...progress,
    x: x + velocity.vx * delta * ratio,
    y: y + velocity.vy * delta * ratio,
  }
}

export function canCrossPortalWithEscort(
  progress: EscortProgress,
  def: EscortDefinition,
  player: { x: number; y: number },
): boolean {
  if (!progress || !def) return true
  if (!Number.isFinite(player?.x) || !Number.isFinite(player?.y)) return false

  const radius = Math.max(0, finite(def.stopRadius)) + 24
  return Math.hypot(player.x - finite(progress.x), player.y - finite(progress.y)) <= radius
}

export function relocateEscortAfterPortal(
  progress: EscortProgress,
  toAreaId: string,
  toSpawnPx: { x: number; y: number },
): EscortProgress {
  if (!progress) return progress

  return {
    ...progress,
    areaId: toAreaId ?? '',
    x: finite(toSpawnPx?.x),
    y: finite(toSpawnPx?.y),
  }
}
