import { CaseStudySection } from '../../components/case-study/CaseStudySection'
import { CaseStudyShell } from '../../components/case-study/CaseStudyShell'
import { ExpandablePanelList } from '../../components/common/ExpandablePanelList'
import { RaceSimulation } from '../../features/race-sim/components/RaceSimulation'
import { paths } from '../../routes/paths'

/** How each number on the watch was arrived at.
 *
 * Collapsed rather than written out, because some of the six are obvious
 * and two are not, and a reader should not have to read past the ones they
 * already understand to find the ones they don't. The gap and the timer
 * are the two worth opening.
 */
const derivations = [
  {
    id: 'gap',
    title: 'Gap to the runner ahead',
    children: (
      <p>
        Derived from the difference between a runner's time of day at a crossing
        and that of whoever crossed the same cable before them.
      </p>
    ),
  },
  {
    id: 'timer',
    title: 'Race timer',
    children: (
      <>
        <p>
          Background clock starts at gun for the objective time. Runners
          sometimes cross the starting line late, and sometimes corrections have
          to be made mid-race. I wanted to use Unix time, but the Garmin watch's
          internal Unix time was not accurate enough. Instead, each runner's
          timer starts when they cross the start line and their delay from the
          gun is also tracked and used when updating the timer.
        </p>
      </>
    ),
  },
  {
    id: 'to-go',
    title: 'Time to go',
    children: (
      <p>
        The projected finish minus the elapsed time. The projection is
        extrapolated from pace so can be volatile early in the race.
      </p>
    ),
  },
  {
    id: 'place',
    title: 'Place',
    children: (
      <p>
        Already existed in the database, and can additionally be derived from
        the number of rows existing for each checkpoint at time of crossing.
      </p>
    ),
  },
  {
    id: 'pace-distance',
    title: 'Pace and distance',
    children: (
      <p>
        Distance between each cable is known beforehand, and is used to
        calculate distance and pace as checkpoints are crossed.
      </p>
    ),
  },
]

export function BrookseePage() {
  return (
    <CaseStudyShell
      kind="experience"
      title="Brooksee"
      dates="June 2024 – October 2024"
      tags={['Monkey C', 'Kotlin', 'Firestore', 'Connect IQ', 'Bluetooth LE']}
      indexLink={{ label: 'Experience', href: paths.experience }}
    >
      {/* The simulation first and the write-up under it. This page used to
          open with six paragraphs, which is a wall to arrive at, and it
          buried the one thing here that explains itself without being read. */}
      <CaseStudySection heading="Simulated Race" prose={false}>
        <div className="prose">
          <p>
            Brooksee times road races. Their timing points are a cable rather
            than a mat, cheap and quick enough to lay a hundred of them over the
            course of a marathon. I spent an internship taking the data captured
            at every checkpoint and putting it onto runners' wrists in real
            time.
          </p>
          <p>
            Here is a simulated race with eight runners, and twenty timing
            points, played at a hundred times real speed. Pick a runner to see
            how their watch changes throughout the race. Every value on it but
            the timer is updated at each cable they cross.
          </p>
        </div>
        <RaceSimulation />
      </CaseStudySection>

      <CaseStudySection heading="Where each number comes from" prose={false}>
        <div className="prose">
          <ExpandablePanelList panels={derivations} defaultOpenId="gap" />
        </div>
      </CaseStudySection>

      <CaseStudySection heading="The problem">
        <p>
          I built this during my first software engineering internship. A cable
          instead of a mat is most of Brooksee's product: a marathon can carry a
          hundred timing points instead of the handful a mat-based course gets,
          so the race stops being a few splits and becomes a dense stream of
          snapshots. One per runner per crossing, each landing in Firestore with
          a participant id, which point it was, and the time of day.
        </p>
        <p>
          This was used for family members or other supporters to see how their
          runner was progressing. My goal was to take that information and get
          it on people's wrists in real time so that they can make decisions
          based on that data to improve their performance. This challenge was
          broken into two main parts: getting the data from Firestore to the
          watch, and then turning that data into useful information for the
          runner.
        </p>
        <p>
          The cable, the timing points and the Firestore schema were Brooksee's.
          The watch fields, the Android app that bridges them, and the derived
          numbers above are mine.
        </p>
      </CaseStudySection>

      <CaseStudySection heading="Known limitations">
        <p>
          The gap to the runner ahead is whoever crossed your checkpoint before
          you did, ranked by crossing time. If they have been overtaken since,
          your watch is telling you about someone who is no longer ahead of you.
          Projection numbers are also finicky when strictly based on pace, and
          can become inaccurate from early uphill parts for example.
        </p>
        <p>
          A Garmin mid-race has no route to Firestore of its own, so the phone
          in the runner's pocket is a required part of the system. If it dies or
          drops Bluetooth, the watch goes on showing the last values it
          received, with nothing on screen to say they have stopped arriving.
        </p>
        <p>
          It only ever ran on a Forerunner 255. The field is drawn at fixed
          pixel coordinates, so any other watch size would need its own layout.
        </p>
      </CaseStudySection>

      <CaseStudySection heading="Tech stack">
        <p>
          Monkey C (Connect IQ data field, Forerunner 255) · Kotlin · Android
          ConnectIQ SDK · Firebase Firestore · Bluetooth LE
        </p>
      </CaseStudySection>
    </CaseStudyShell>
  )
}
