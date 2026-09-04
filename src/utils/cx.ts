/** Joins conditional class names, dropping falsy values — the one place
 * this logic lives instead of being re-hand-rolled per component (some as
 * template-literal ternaries, some as `array.filter(Boolean).join(' ')`). */
export function cx(
  ...classNames: (string | false | null | undefined)[]
): string {
  return classNames.filter(Boolean).join(' ')
}
