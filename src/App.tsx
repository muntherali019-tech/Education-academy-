import { useState } from "react";
import {
  accuracy,
  allStageSummaries,
  createProgress,
  recordRound,
  subjectTotals,
  type Progress,
  type StageSummary,
} from "./game/progress";
import { loadProgress, saveProgress } from "./game/progressStorage";
import {
  answerQuestion,
  createRound,
  currentQuestion,
  isComplete,
  ROUND_SIZE,
  scoreRound,
  type Round,
} from "./game/round";
import { ALL_STAGES, STAGES, type StageId } from "./game/stages";
import {
  ALL_PLANS,
  checkAccess,
  FREE_ROUNDS_PER_DAY,
  PLANS,
  recordRoundStarted,
  subscribe,
  type Access,
  type PlanId,
  type SubscriptionState,
  type Usage,
} from "./game/subscription";
import {
  loadSubscription,
  loadUsage,
  saveSubscription,
  saveUsage,
} from "./game/subscriptionStorage";

type View = "stages" | "dashboard" | "plans";

export default function App() {
  const [round, setRound] = useState<Round | null>(null);
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [subscription, setSubscription] = useState<SubscriptionState>(() => loadSubscription());
  const [usage, setUsage] = useState<Usage>(() => loadUsage());
  const [view, setView] = useState<View>("stages");
  /** True when the plans view was reached by running out of free rounds. */
  const [lockedOut, setLockedOut] = useState(false);

  const access = checkAccess(usage, subscription);

  function start(stage: StageId) {
    if (!access.canStartRound) {
      setLockedOut(true);
      setView("plans");
      return;
    }
    const spent = recordRoundStarted(usage);
    setUsage(spent);
    saveUsage(spent);
    setView("stages");
    setRound(createRound(stage));
  }

  /** Finished rounds go straight into the dashboard's history. */
  function handleAnswer(next: Round) {
    setRound(next);
    if (isComplete(next)) {
      const updated = recordRound(progress, next);
      setProgress(updated);
      saveProgress(updated);
    }
  }

  function clearProgress() {
    const empty = createProgress();
    setProgress(empty);
    saveProgress(empty);
  }

  function choosePlan(plan: PlanId) {
    const started = subscribe(plan);
    setSubscription(started);
    saveSubscription(started);
    setLockedOut(false);
  }

  function cancelSubscription() {
    setSubscription(null);
    saveSubscription(null);
  }

  function show(next: View) {
    setLockedOut(false);
    setView(next);
  }

  return (
    <main className="app">
      <header className="header">
        <span className="mochi" role="img" aria-label="Mochi the ginger cat">
          🐱
        </span>
        <div>
          <h1>Education Academy</h1>
          <p className="tagline">Learn with Mochi — {ROUND_SIZE} questions a round.</p>
        </div>
      </header>

      {round !== null ? (
        <RoundView round={round} onAnswer={handleAnswer} onQuit={() => setRound(null)} />
      ) : view === "dashboard" ? (
        <Dashboard
          progress={progress}
          onBack={() => show("stages")}
          onClear={clearProgress}
        />
      ) : view === "plans" ? (
        <PlansView
          access={access}
          subscription={subscription}
          lockedOut={lockedOut}
          onChoose={choosePlan}
          onCancel={cancelSubscription}
          onBack={() => show("stages")}
        />
      ) : (
        <StagePicker
          access={access}
          onPick={start}
          onShowDashboard={() => show("dashboard")}
          onShowPlans={() => show("plans")}
        />
      )}
    </main>
  );
}

interface StagePickerProps {
  access: Access;
  onPick: (stage: StageId) => void;
  onShowDashboard: () => void;
  onShowPlans: () => void;
}

function StagePicker({ access, onPick, onShowDashboard, onShowPlans }: StagePickerProps) {
  return (
    <section>
      <h2>Pick a stage</h2>
      <ul className="stages">
        {ALL_STAGES.map((stage) => (
          <li key={stage.id}>
            <button type="button" className="stage" onClick={() => onPick(stage.id)}>
              <strong>{stage.name}</strong>
              <span className="ages">
                ages {stage.minAge}
                {stage.maxAge === null ? "+" : `–${stage.maxAge}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="allowance">
        {access.subscribed ? "Subscribed — unlimited rounds. 🐾" : freeRoundsMessage(access)}{" "}
        <button type="button" className="link" onClick={onShowPlans}>
          {access.subscribed ? "Manage subscription" : "See plans"}
        </button>
      </p>
      <button type="button" className="link" onClick={onShowDashboard}>
        Parent &amp; teacher dashboard
      </button>
    </section>
  );
}

function freeRoundsMessage({ freeRoundsLeft }: Access): string {
  if (freeRoundsLeft === 0) {
    return "Today's free rounds are all used up.";
  }
  return `${freeRoundsLeft} of ${FREE_ROUNDS_PER_DAY} free rounds left today.`;
}

interface RoundViewProps {
  round: Round;
  onAnswer: (round: Round) => void;
  onQuit: () => void;
}

function RoundView({ round, onAnswer, onQuit }: RoundViewProps) {
  const question = currentQuestion(round);

  if (isComplete(round) || !question) {
    const score = scoreRound(round);
    return (
      <section className="result">
        <h2>{score.passed ? "Round cleared! 🐾" : "Good try!"}</h2>
        <p className="score">
          {score.correct} / {score.total} — {score.percentage}%
        </p>
        <button type="button" className="primary" onClick={onQuit}>
          Back to stages
        </button>
      </section>
    );
  }

  return (
    <section className="round">
      <p className="progress">
        Question {round.answers.length + 1} of {round.questions.length} · {question.subject}
      </p>
      <h2 className="prompt">{question.prompt}</h2>
      <ul className="choices">
        {question.choices.map((choice, index) => (
          <li key={choice}>
            <button
              type="button"
              className="choice"
              onClick={() => onAnswer(answerQuestion(round, index))}
            >
              {choice}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="quit" onClick={onQuit}>
        Quit round
      </button>
    </section>
  );
}

interface PlansViewProps {
  access: Access;
  subscription: SubscriptionState;
  lockedOut: boolean;
  onChoose: (plan: PlanId) => void;
  onCancel: () => void;
  onBack: () => void;
}

function PlansView({
  access,
  subscription,
  lockedOut,
  onChoose,
  onCancel,
  onBack,
}: PlansViewProps) {
  if (access.subscribed && subscription) {
    return (
      <section className="plans">
        <h2>Your subscription</h2>
        <p>
          {PLANS[subscription.plan].name} — unlimited rounds until{" "}
          {formatDate(subscription.renewsAt)}.
        </p>
        <button type="button" className="primary" onClick={onBack}>
          Back to stages
        </button>
        <button type="button" className="quit" onClick={onCancel}>
          Cancel subscription
        </button>
      </section>
    );
  }

  return (
    <section className="plans">
      <h2>{lockedOut ? "That's today's free rounds" : "Subscribe for unlimited rounds"}</h2>
      <p>
        {lockedOut
          ? `Mochi gives ${FREE_ROUNDS_PER_DAY} free rounds a day. Come back tomorrow for more, or subscribe to keep going now.`
          : `The free tier includes ${FREE_ROUNDS_PER_DAY} rounds a day. Subscribing lifts the limit.`}
      </p>
      <ul className="plan-list">
        {ALL_PLANS.map((plan) => (
          <li key={plan.id}>
            <button type="button" className="plan" onClick={() => onChoose(plan.id)}>
              <strong>{plan.name}</strong>
              <span className="price">{plan.price}</span>
              <span className="blurb">{plan.blurb}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="note">Demo checkout — no payment is taken and nothing leaves this device.</p>
      <button type="button" className="quit" onClick={onBack}>
        {lockedOut ? "Maybe later" : "Back to stages"}
      </button>
    </section>
  );
}

interface DashboardProps {
  progress: Progress;
  onBack: () => void;
  onClear: () => void;
}

function Dashboard({ progress, onBack, onClear }: DashboardProps) {
  const summaries = allStageSummaries(progress);
  const subjects = subjectTotals(progress);
  const roundsPlayed = summaries.reduce((total, summary) => total + summary.roundsPlayed, 0);

  return (
    <section className="dashboard">
      <h2>Parent &amp; teacher dashboard</h2>

      {roundsPlayed === 0 ? (
        <p className="empty">
          No rounds finished yet. Play a round and Mochi will start tracking progress here.
        </p>
      ) : (
        <>
          <p className="progress">
            {roundsPlayed} {roundsPlayed === 1 ? "round" : "rounds"} finished on this device.
          </p>

          <h3>By stage</h3>
          <table className="report">
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">Rounds</th>
                <th scope="col">Passed</th>
                <th scope="col">Best</th>
                <th scope="col">Average</th>
                <th scope="col">Last played</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <StageRow key={summary.stage} summary={summary} />
              ))}
            </tbody>
          </table>

          <h3>By subject</h3>
          <ul className="subjects">
            {subjects.map((tally) => (
              <li key={tally.subject} className="subject">
                <span className="subject-name">{tally.subject}</span>
                <span className="bar" role="img" aria-label={`${accuracy(tally)}% correct`}>
                  <span className="bar-fill" style={{ width: `${accuracy(tally)}%` }} />
                </span>
                <span className="subject-score">
                  {tally.correct}/{tally.total}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <button type="button" className="primary" onClick={onBack}>
        Back to stages
      </button>
      {roundsPlayed > 0 && (
        <button type="button" className="quit" onClick={onClear}>
          Clear saved progress
        </button>
      )}
    </section>
  );
}

function StageRow({ summary }: { summary: StageSummary }) {
  const played = summary.roundsPlayed > 0;
  return (
    <tr>
      <th scope="row">{STAGES[summary.stage].name}</th>
      <td>{summary.roundsPlayed}</td>
      <td>{summary.roundsPassed}</td>
      <td>{played ? `${summary.bestPercentage}%` : "—"}</td>
      <td>{played ? `${summary.averagePercentage}%` : "—"}</td>
      <td>{formatDate(summary.lastPlayedAt)}</td>
    </tr>
  );
}

function formatDate(at: number | null): string {
  return at === null ? "—" : new Date(at).toLocaleDateString("en-GB");
}
