/** How the watch prints the numbers it is sent.
 *
 * Separated from the component because these are the formats the real data
 * field used and they are worth pinning down: a pace is minutes and
 * seconds, a race time is hours, and anything missing says "pending"
 * rather than nothing or zero.
 */

/** What the field showed for a value that had not arrived. The real one
 * printed this literal string, so it is not a placeholder standing in for
 * a better idea. */
export const PENDING = 'pending'

function pad(value: number): string {
  return String(Math.floor(value)).padStart(2, '0')
}

/** Minutes and seconds, for a pace or a gap. Truncated rather than
 * rounded, so a 5:59.8 pace never prints as 6:00. */
export function minuteSeconds(seconds: number | null): string {
  if (seconds === null) return PENDING
  const whole = Math.floor(Math.max(seconds, 0))
  return `${Math.floor(whole / 60)}:${pad(whole % 60)}`
}

/** Hours, minutes and seconds, for a race clock. */
export function raceClock(seconds: number | null): string {
  if (seconds === null) return PENDING
  const whole = Math.floor(Math.max(seconds, 0))
  const hours = Math.floor(whole / 3600)
  return `${hours}:${pad((whole % 3600) / 60)}:${pad(whole % 60)}`
}

/** Miles, to one decimal, which is what a marathon split is quoted to. */
export function miles(value: number | null): string {
  return value === null ? PENDING : value.toFixed(1)
}

/** A finishing position. */
export function place(value: number | null): string {
  return value === null ? PENDING : String(value)
}

/** The gap to the runner ahead.
 *
 * Needs the place as well, because the gap is null in two different
 * situations and they do not print the same: leading the race means there
 * is genuinely nobody in front, which is not the same as not knowing yet.
 */
export function gap(seconds: number | null, place: number | null): string {
  if (place === 1) return 'leading'
  return minuteSeconds(seconds)
}
