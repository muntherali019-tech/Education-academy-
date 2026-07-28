import { useMemo, useState } from "react";
import Dashboard from "./Dashboard";
import { resultFromRound, type RoundResult } from "./game/progress";
import {
  answerQuestion,
  createRound,
  currentQuestion,
  isComplete,
  ROUND_SIZE,
  scoreRound,
  type Round,
} from "./game/round";
import { ALL_STAGES, type StageId } from "./game/stages";
import { browserStore, loadHistory, saveHistory, type HistoryStore } from "./game/storage";

interface AppProps {
  /** Injectable so tests can supply a fake store; defaults to localStorage. */
  store?: HistoryStore | null;
  /** Injectable so tests can pin the recorded timestamp. */
  now?: () => Date;
}

export default function App({ store, now = () => new Date() }: AppProps = {}) {
  const resolvedStore = useMemo(
    () => (store === undefined ? browserStore() : store),
    [store],
  );
  const [history, setHistory] = useState<RoundResult[]>(() => loadHistory(resolvedStore));
  const [round, setRound] = useState<Round | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  function handleAnswer(next: Round) {
    setRound(next);
    if (!isComplete(next)) {
      return;
    }
    // Record once, the moment the round finishes. The write stays outside the
    // state updater so StrictMode's double invocation cannot double-save.
    const updated = [...history, resultFromRound(next, now().toISOString())];
    setHistory(updated);
    saveHistory(resolvedStore, updated);
  }

  function start(stage: StageId) {
    setShowDashboard(false);
    setRound(createRound(stage));
  }

  function backToStages() {
    setRound(null);
    setShowDashboard(false);
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

      {showDashboard ? (
        <Dashboard history={history} onBack={backToStages} />
      ) : round === null ? (
        <StagePicker onPick={start} onShowDashboard={() => setShowDashboard(true)} />
      ) : (
        <RoundView round={round} onAnswer={handleAnswer} onQuit={backToStages} />
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
      <ul className="stages" aria-label="Stages">
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
      <button type="button" className="quit" onClick={onShowDashboard}>
        View progress
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
      <ul className="choices" aria-label="Answers">
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
