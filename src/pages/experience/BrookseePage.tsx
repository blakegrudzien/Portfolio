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
        Not stored anywhere. Every crossing carries a time of day, so the
        crossings at one cable are already an ordered list of who came through
        and when. Ask for the ones earlier than yours, take the most recent, and
        subtract. An empty result means nobody crossed before you, which is to
        say you are leading.
      </p>
    ),
  },
  {
    id: 'timer',
    title: 'Race timer',
    children: (
      <>
        <p>
          A watch starts counting when the runner presses start, which is not
          when their race started. The official clock runs from the gun, and
          runners cross the start line at irregular intervals after it.
        </p>
        <p>
          So the timer is derived too: find the runner's own crossing of the
          start line and offset the watch's clock by it. I first tried
          synchronising against Unix time so the Bluetooth round trip could not
          skew it, but the watch's own Unix clock did not come back accurate
          enough to use, so I sent the offset instead and re-sent a correction
          whenever the recorded start time changed.
        </p>
      </>
    ),
  },
  {
    id: 'to-go',
    title: 'Time to go',
    children: (
      <p>
        The projected finish minus the elapsed time. The projection is the pace
        so far carried out to 26.2 miles, which is why it swings about early on
        and settles as the distance behind it grows.
      </p>
    ),
  },
  {
    id: 'place',
    title: 'Place',
    children: (
      <p>
        This one was already in Brooksee's database, computed before I saw it,
        so the app read it rather than working it out. It is the same shape of
        question as the gap: your position in the ordered list of crossings at a
        cable. The simulation above has no database to read it from, so it
        derives it.
      </p>
    ),
  },
  {
    id: 'pace-distance',
    title: 'Pace and distance',
    children: (
      <p>
        Straight off the crossing. The timing system knows where each cable is
        on the course and when you crossed it, so distance is the cable's own
        and pace is that distance over the time it took you. Both are the
        runner's average to that point, not what they are running now.
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
      <CaseStudySection heading="A race, simulated" prose={false}>
        <div className="prose">
          <p>
            Brooksee times road races. Their timing points are a cable rather
            than a mat, cheap and quick enough to lay that a marathon can carry
            a hundred of them. I spent an internship turning the stream of
            crossings that produces into something a runner could read off their
            wrist mid-race.
          </p>
          <p>
            Eight runners, twenty timing points, played at a hundred times real
            speed. Pick a runner to see their watch. Every value on it but the
            timer is frozen at the last cable they crossed.
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
          A runner in the middle of that race sees none of it. Their watch knows
          its own GPS pace and distance, and nothing about the race going on
          around them. Most of what you would want to know at mile 18 already
          existed in a database with no way to reach your wrist.
        </p>
        <p>
          My goal was taking that snapshot data and finding ways to manufacture
          useful information out of it. The snapshots arrive already ordered by
          crossing time, and that ordering is where the information was.
        </p>
        <p>
          A Connect IQ data field is not an app. It takes a slot on Garmin's own
          activity screen, beside the native pace and heart rate, and the runner
          picks what goes where. I wrote eight of them one value at a time
          before deciding that was the wrong shape. A runner mid-marathon gets
          one glance, so the useful thing is a single field carrying several
          numbers at once. Which six belong there depends on the runner, and
          more variants were planned than I built: someone chasing a qualifying
          time wants place and the margin to the cutoff, someone racing a rival
          wants that rival's splits instead of their own.
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
        </p>
        <p>
          A Garmin mid-race has no route to Firestore of its own, so the phone
          in the runner's pocket is a required part of the system rather than a
          convenience. If it dies or drops Bluetooth, the watch goes on showing
          the last values it received, with nothing on screen to say they have
          stopped arriving.
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
