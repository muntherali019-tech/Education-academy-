import { useState, type ChangeEvent } from "react";
import { ALL_STAGES, type StageId } from "../game/stages";
import {
  MarkingError,
  summariseMarking,
  type Marker,
  type MarkedQuestion,
  type MarkingResult,
} from "./marking";
import { readPhoto, type HomeworkPhoto } from "./photo";

const VERDICT_ICON: Record<MarkedQuestion["verdict"], string> = {
  correct: "✅",
  incorrect: "✏️",
  unclear: "❓",
};

const VERDICT_LABEL: Record<MarkedQuestion["verdict"], string> = {
  correct: "Correct",
  incorrect: "Not quite",
  unclear: "Could not read",
};

function messageFor(error: unknown): string {
  return error instanceof MarkingError
    ? error.message
    : "Mochi could not mark that photo. Please try again.";
}

export interface MarkingViewProps {
  marker: Marker;
  onBack: () => void;
}

export function MarkingView({ marker, onBack }: MarkingViewProps) {
  const [stage, setStage] = useState<StageId>("ks2");
  const [photo, setPhoto] = useState<HomeworkPhoto | null>(null);
  const [result, setResult] = useState<MarkingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setResult(null);
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

  async function markPhoto() {
    if (photo === null) {
      return;
    }
    setMarking(true);
    setError(null);
    try {
      setResult(await marker({ stage, mediaType: photo.mediaType, base64: photo.base64 }));
    } catch (problem) {
      setResult(null);
      setError(messageFor(problem));
    } finally {
      setMarking(false);
    }
  }

  return (
    <section className="marking">
      <h2>Mark my homework</h2>
      <p className="marking-intro">
        Take a photo of a homework page and Mochi will mark it question by question.
      </p>

      <label className="field" htmlFor="marking-stage">
        Which stage is this homework for?
      </label>
      <select
        id="marking-stage"
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

      <label className="field" htmlFor="marking-photo">
        Homework photo
      </label>
      <input
        id="marking-photo"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={choosePhoto}
      />

      {photo !== null && (
        <img className="preview" src={photo.dataUrl} alt="The homework you chose" />
      )}

      <button
        type="button"
        className="primary"
        onClick={markPhoto}
        disabled={photo === null || marking}
      >
        {marking ? "Mochi is marking…" : "Mark it"}
      </button>

      {error !== null && (
        <p className="marking-error" role="alert">
          {error}
        </p>
      )}

      {result !== null && <Marking result={result} />}

      <button type="button" className="quit" onClick={onBack}>
        Back to stages
      </button>
    </section>
  );
}

function Marking({ result }: { result: MarkingResult }) {
  const summary = summariseMarking(result);

  return (
    <section className="marking-result">
      <h3>Mochi says</h3>
      <p className="overall">{result.overall}</p>
      {summary.total > 0 && (
        <p className="progress">
          {summary.correct} of {summary.total} correct — {summary.percentage}%
          {summary.unclear > 0 && ` · ${summary.unclear} Mochi could not read`}
        </p>
      )}
      <ul className="marked">
        {result.items.map((item, index) => (
          <li key={`${item.question}-${index}`} className="marked-item">
            <p className="marked-question">
              <span role="img" aria-label={VERDICT_LABEL[item.verdict]}>
                {VERDICT_ICON[item.verdict]}
              </span>{" "}
              {item.question}
            </p>
            {item.studentAnswer !== "" && (
              <p className="marked-answer">You wrote: {item.studentAnswer}</p>
            )}
            <p className="marked-comment">{item.comment}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
