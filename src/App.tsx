import { useState } from "react";
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

export default function App() {
  const [round, setRound] = useState<Round | null>(null);

  function start(stage: StageId) {
    setRound(createRound(stage));
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

      {round === null ? (
        <StagePicker onPick={start} />
      ) : (
        <RoundView round={round} onAnswer={setRound} onQuit={() => setRound(null)} />
      )}
    </main>
  );
}

function StagePicker({ onPick }: { onPick: (stage: StageId) => void }) {
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
