/** The course the simulated race is run on.
 *
 * A closed loop that wanders the way a road course does, stretched wide
 * rather than drawn square. Marathons are laid out around whatever streets
 * can be closed, so a course bends, doubles back and returns to where it
 * started; a tidy shape would read as a diagram of a race rather than a
 * race. Wide because the diagram has to hold its width to stay legible,
 * and a wide one scrolls sideways on a phone the way the Level Home
 * diagram does instead of needing both directions at once.
 *
 * Everything here is geometry and distances. Nothing in this file knows
 * about runners, time, or the DOM.
 */

/** The window onto the course, as an SVG viewBox.
 *
 * Trimmed to the road rather than starting at the origin. The path was
 * drawn inside a 1200 by 420 box and only occupies x 150 to 1066 of it, so
 * a box starting at 0 carried 150 units of empty space down the left and
 * 134 down the right. The SVG lined up with the column it sat in and the
 * course did not, which read as the diagram being indented from everything
 * under it. The margin that remains is the 16 a timing point needs, since
 * cables reach either side of the centreline. */
export const COURSE_VIEWBOX = {
  x: 134,
  y: 79,
  width: 949,
  height: 329,
} as const

/** One path, so a runner's position along it is `offset-distance` as a
 * percentage and the browser does every piece of curve arithmetic. Nothing
 * in this project measures a path or computes a tangent.
 *
 * What makes a drawn course look like a real one is not how much it bends
 * but how unevenly. A road race is laid on streets, so it has a few blocks
 * of tight turns where downtown is, long avenues that drift rather than run
 * true, one stretch following something that was never on a grid, and a
 * turnaround where it runs out of road and comes back on the other side of
 * the same street. Corners vary from a sharp junction to a wide sweep for
 * the same reason: the ones in a grid are tight and the ones on a park
 * drive are not.
 *
 * Closed, so the path ends where it began and start and finish are the same
 * stretch of road, which is both usual and why the two cables share a mark.
 */
export const COURSE_PATH = [
  // Downtown: short blocks, tight junctions, turns stacked close together.
  'M 150 240',
  'L 212 238',
  'Q 232 237, 236 220',
  'L 243 186',
  'Q 246 170, 262 166',
  'L 318 160',
  'Q 336 157, 344 142',
  'L 356 116',
  'Q 364 100, 384 98',
  // A long avenue that drifts instead of running true.
  'C 470 92, 560 96, 640 110',
  'Q 660 114, 668 132',
  'L 684 170',
  'Q 692 188, 712 192',
  'L 790 192',
  // The one stretch not laid out on a grid: a park drive, wide and open.
  'C 862 196, 906 178, 930 142',
  'C 952 110, 1000 98, 1038 118',
  // Out of road. Turn and come back down the other side of it.
  'Q 1068 132, 1066 156',
  'Q 1064 182, 1030 190',
  'C 992 206, 958 202, 916 218',
  // Back west, a street over from the way out.
  'L 848 246',
  'Q 828 252, 824 272',
  'L 820 298',
  'Q 817 316, 794 322',
  'L 704 338',
  'C 652 349, 600 336, 548 348',
  'Q 526 353, 520 370',
  'L 512 380',
  'Q 505 392, 486 391',
  'L 388 384',
  'Q 364 382, 357 360',
  'L 344 322',
  'Q 336 302, 314 300',
  'L 246 304',
  'Q 222 306, 212 288',
  // The last climb to the line.
  'L 168 262',
  'Q 152 252, 150 240',
].join(' ')

export const RACE_DISTANCE_MILES = 26.2

/** What a timing point is, in the shape the real records had: a point on
 * the course with a position, and a kind matching the `location` field
 * Brooksee's crossings carried (0 start, 1 split, 2 finish). */
export interface Checkpoint {
  /** Sequential in course order, from 1. */
  id: number
  distanceMiles: number
  kind: 'start' | 'split' | 'finish'
}

/** Twenty timing points.
 *
 * Unevenly spaced on purpose. A cable goes where the terrain lets you put
 * one, not every round number of miles, so even spacing would be the one
 * detail that gave away that this is a drawing rather than a course. The
 * half marathon lands on 13.1 because that is a real timing point in
 * practically every marathon.
 *
 * Twenty is a drawable stand-in rather than a claim. The product's whole
 * point is that a cable is cheap enough to lay a hundred of them.
 */
export const CHECKPOINTS: Checkpoint[] = [
  { id: 1, distanceMiles: 0, kind: 'start' },
  { id: 2, distanceMiles: 1.2, kind: 'split' },
  { id: 3, distanceMiles: 2.6, kind: 'split' },
  { id: 4, distanceMiles: 3.5, kind: 'split' },
  { id: 5, distanceMiles: 5.1, kind: 'split' },
  { id: 6, distanceMiles: 6.4, kind: 'split' },
  { id: 7, distanceMiles: 7.0, kind: 'split' },
  { id: 8, distanceMiles: 8.8, kind: 'split' },
  { id: 9, distanceMiles: 10.2, kind: 'split' },
  { id: 10, distanceMiles: 11.5, kind: 'split' },
  { id: 11, distanceMiles: 13.1, kind: 'split' },
  { id: 12, distanceMiles: 14.6, kind: 'split' },
  { id: 13, distanceMiles: 16.0, kind: 'split' },
  { id: 14, distanceMiles: 17.3, kind: 'split' },
  { id: 15, distanceMiles: 18.9, kind: 'split' },
  { id: 16, distanceMiles: 20.5, kind: 'split' },
  { id: 17, distanceMiles: 21.8, kind: 'split' },
  { id: 18, distanceMiles: 23.4, kind: 'split' },
  { id: 19, distanceMiles: 24.9, kind: 'split' },
  { id: 20, distanceMiles: RACE_DISTANCE_MILES, kind: 'finish' },
]

/** Where a distance sits along the drawn path, as a fraction from 0 to 1.
 *
 * The path is drawn to a uniform scale, so fraction of the course run is
 * fraction of the path's length, which is exactly what `offset-distance`
 * takes. That equivalence is the reason no part of this project has to do
 * its own curve geometry. */
export function courseFraction(distanceMiles: number): number {
  const clamped = Math.min(Math.max(distanceMiles, 0), RACE_DISTANCE_MILES)
  return clamped / RACE_DISTANCE_MILES
}
