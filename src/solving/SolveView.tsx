import { useState, type ChangeEvent } from "react";
import { learnerMessage } from "../errors";
import { ALL_STAGES, type StageId } from "../game/stages";
import { readPhoto, type HomeworkPhoto } from "../photo/photo";
import { isEmptySolution, type Solution, type Solver } from "./solving";

function messageFor(error: unknown): string {
  return learnerMessage(error, "Mochi could not solve that problem. Please try again.");
}

export interface SolveViewProps {
  solver: Solver;
  onBack: () => void;
}

export function SolveView({ solver, onBack }: SolveViewProps) {
  const [stage, setStage] = useState<StageId>("ks2");
  const [photo, setPhoto] = useState<HomeworkPhoto | null>(null);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [solving, setSolving] = useState(false);

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setSolution(null);
    setError(null);
    if (!file) {
      setPhoto(null);
      return;
    }
    try {
      setPhoto(await readPhoto(file));
    } catch (problem) {
      setPhoto(null);
      setError(messageFor(problem));
    }
  }

  async function solve() {
    if (photo === null) {
      return;
    }
    setSolving(true);
    setError(null);
    try {
      setSolution(await solver({ stage, mediaType: photo.mediaType, base64: photo.base64 }));
    } catch (problem) {
      setSolution(null);
      setError(messageFor(problem));
    } finally {
      setSolving(false);
    }
  }

  return (
    <section className="solving">
      <h2>Scan &amp; solve</h2>
      <p className="marking-intro">
        Stuck on a question? Photograph it and Mochi will walk you through it one step at a time.
      </p>

      <label className="field" htmlFor="solve-stage">
        Which stage are you working at?
      </label>
      <select
        id="solve-stage"
        className="stage-select"
        value={stage}
        onChange={(event) => setStage(event.target.value as StageId)}
      >
        {ALL_STAGES.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>

      <label className="field" htmlFor="solve-photo">
        Photo of the question
      </label>
      <input
        id="solve-photo"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={choosePhoto}
      />

      {photo !== null && (
        <img className="preview" src={photo.dataUrl} alt="The question you chose" />
      )}

      <button
        type="button"
        className="primary"
        onClick={solve}
        disabled={photo === null || solving}
      >
        {solving ? "Mochi is working it out…" : "Show me how"}
      </button>

      {error !== null && (
        <p className="marking-error" role="alert">
          {error}
        </p>
      )}

      {solution !== null &&
        (isEmptySolution(solution) ? (
          <p className="marking-error" role="status">
            Mochi could not find a question in that photo. Try again with the question filling more
            of the frame.
          </p>
        ) : (
          <Walkthrough key={solution.problem} solution={solution} />
        ))}

      <button type="button" className="quit" onClick={onBack}>
        Back to stages
      </button>
    </section>
  );
}

/**
 * Steps are revealed one at a time, and the answer only after the last one —
 * a learner who is stuck half way gets unstuck without being handed the answer.
 */
function Walkthrough({ solution }: { solution: Solution }) {
  const [revealed, setRevealed] = useState(1);
  const remaining = solution.steps.length - revealed;

  return (
    <section className="walkthrough">
      <h3>{solution.problem}</h3>
      <ol className="steps">
        {solution.steps.slice(0, revealed).map((step, index) => (
          <li key={index} className="step">
            <p className="step-explanation">{step.explanation}</p>
            {step.working !== "" && <p className="step-working">{step.working}</p>}
          </li>
        ))}
      </ol>

      {remaining > 0 ? (
        <button type="button" className="primary" onClick={() => setRevealed(revealed + 1)}>
          Next step ({remaining} to go)
        </button>
      ) : (
        <>
          {solution.answer !== "" && (
            <p className="answer">
              Answer: <strong>{solution.answer}</strong>
            </p>
          )}
          {solution.practice !== "" && (
            <p className="practice">Now try this one yourself: {solution.practice}</p>
          )}
        </>
      )}
    </section>
  );
}
