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

export default function App() {
  const [round, setRound] = useState<Round | null>(null);
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [showDashboard, setShowDashboard] = useState(false);

  function start(stage: StageId) {
    setShowDashboard(false);
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
      ) : showDashboard ? (
        <Dashboard
          progress={progress}
          onBack={() => setShowDashboard(false)}
          onClear={clearProgress}
        />
      ) : (
        <StagePicker onPick={start} onShowDashboard={() => setShowDashboard(true)} />
      )}
    </main>
  );
}

interface StagePickerProps {
  onPick: (stage: StageId) => void;
  onShowDashboard: () => void;
}

function StagePicker({ onPick, onShowDashboard }: StagePickerProps) {
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
      <button type="button" className="link" onClick={onShowDashboard}>
        Parent &amp; teacher dashboard
      </button>
    </section>
  );
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
