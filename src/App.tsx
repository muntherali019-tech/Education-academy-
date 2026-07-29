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
import { MarkingView } from "./marking/MarkingView";
import type { Marker } from "./marking/marking";
import { createHttpMarker } from "./marking/markingClient";
import { SolveView } from "./solving/SolveView";
import type { Solver } from "./solving/solving";
import { createHttpSolver } from "./solving/solvingClient";

type View = "stages" | "dashboard" | "plans" | "marking" | "solving";

/** Why the plans view was reached, when it was not opened deliberately. */
type Lock = "rounds" | "marking" | "solving" | null;

const httpMarker = createHttpMarker();
const httpSolver = createHttpSolver();

export interface AppProps {
  /** Injectable so tests can use the vision features without a service. */
  marker?: Marker;
  solver?: Solver;
}

export default function App({ marker = httpMarker, solver = httpSolver }: AppProps = {}) {
  const [round, setRound] = useState<Round | null>(null);
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [subscription, setSubscription] = useState<SubscriptionState>(() => loadSubscription());
  const [usage, setUsage] = useState<Usage>(() => loadUsage());
  const [view, setView] = useState<View>("stages");
  const [lockedOut, setLockedOut] = useState<Lock>(null);

  const access = checkAccess(usage, subscription);

  function start(stage: StageId) {
    if (!access.canStartRound) {
      setLockedOut("rounds");
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
    setLockedOut(null);
  }

  function cancelSubscription() {
    setSubscription(null);
    saveSubscription(null);
  }

  function show(next: View) {
    setLockedOut(null);
    setView(next);
  }

  /** The camera features cost money to run, so they are for subscribers. */
  function showCamera(feature: "marking" | "solving") {
    if (!access.subscribed) {
      setLockedOut(feature);
      setView("plans");
      return;
    }
    show(feature);
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
      ) : view === "marking" ? (
        <MarkingView marker={marker} onBack={() => show("stages")} />
      ) : view === "solving" ? (
        <SolveView solver={solver} onBack={() => show("stages")} />
      ) : (
        <StagePicker
          access={access}
          onPick={start}
          onShowDashboard={() => show("dashboard")}
          onShowPlans={() => show("plans")}
          onShowMarking={() => showCamera("marking")}
          onShowSolving={() => showCamera("solving")}
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
  onShowMarking: () => void;
  onShowSolving: () => void;
}

function StagePicker({
  access,
  onPick,
  onShowDashboard,
  onShowPlans,
  onShowMarking,
  onShowSolving,
}: StagePickerProps) {
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
      <button type="button" className="link" onClick={onShowMarking}>
        Mark my homework 📷
      </button>
      <button type="button" className="link" onClick={onShowSolving}>
        Scan &amp; solve 🔍
      </button>
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
  lockedOut: Lock;
  onChoose: (plan: PlanId) => void;
  onCancel: () => void;
  onBack: () => void;
}

const LOCK_HEADING: Record<"rounds" | "marking" | "solving", string> = {
  rounds: "That's today's free rounds",
  marking: "Photo marking is for subscribers",
  solving: "Scan & solve is for subscribers",
};

function lockBlurb(lockedOut: Lock): string {
  if (lockedOut === "rounds") {
    return `Mochi gives ${FREE_ROUNDS_PER_DAY} free rounds a day. Come back tomorrow for more, or subscribe to keep going now.`;
  }
  if (lockedOut === "marking") {
    return "Subscribe and Mochi will mark photos of your homework, as well as giving you unlimited rounds.";
  }
  if (lockedOut === "solving") {
    return "Subscribe and Mochi will walk you through a photographed question step by step, as well as giving you unlimited rounds.";
  }
  return `The free tier includes ${FREE_ROUNDS_PER_DAY} rounds a day. Subscribing lifts the limit and unlocks the camera features.`;
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
      <h2>{lockedOut === null ? "Subscribe for unlimited rounds" : LOCK_HEADING[lockedOut]}</h2>
      <p>{lockBlurb(lockedOut)}</p>
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
        {lockedOut === null ? "Back to stages" : "Maybe later"}
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
