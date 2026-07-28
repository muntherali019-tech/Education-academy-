import { summariseProgress, type RoundResult } from "./game/progress";
import { STAGES } from "./game/stages";

interface DashboardProps {
  history: readonly RoundResult[];
  onBack: () => void;
}

export default function Dashboard({ history, onBack }: DashboardProps) {
  const summary = summariseProgress(history);

  return (
    <section className="dashboard">
      <h2>Progress</h2>

      {summary.totalRounds === 0 ? (
        <p className="empty">
          No rounds finished yet. Play a round and results will show up here.
        </p>
      ) : (
        <>
          <ul className="tiles" aria-label="Overall progress">
            <Tile label="Rounds played" value={String(summary.totalRounds)} />
            <Tile label="Rounds cleared" value={String(summary.totalPassed)} />
            <Tile label="Pass rate" value={`${summary.passRate}%`} />
            <Tile label="Average score" value={`${summary.averagePercentage}%`} />
          </ul>

          <h3>By stage</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Stage</th>
                  <th scope="col">Played</th>
                  <th scope="col">Cleared</th>
                  <th scope="col">Best</th>
                  <th scope="col">Average</th>
                  <th scope="col">Last played</th>
                </tr>
              </thead>
              <tbody>
                {summary.byStage.map((stage) => (
                  <tr key={stage.stage}>
                    <th scope="row">{STAGES[stage.stage].name}</th>
                    <td>{stage.roundsPlayed}</td>
                    <td>{stage.roundsPassed}</td>
                    <td>{formatPercentage(stage.bestPercentage)}</td>
                    <td>{formatPercentage(stage.averagePercentage)}</td>
                    <td>{formatDate(stage.lastPlayedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Recent rounds</h3>
          <ul className="recent" aria-label="Recent rounds">
            {summary.recent.map((result) => (
              <li key={`${result.completedAt}-${result.stage}-${result.seed}`}>
                <span className="recent-stage">{STAGES[result.stage].name}</span>
                <span className={result.passed ? "badge pass" : "badge fail"}>
                  {result.passed ? "Cleared" : "Not cleared"}
                </span>
                <span className="recent-score">
                  {result.correct} / {result.total} — {result.percentage}%
                </span>
                <span className="recent-date">{formatDate(result.completedAt)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <button type="button" className="primary" onClick={onBack}>
        Back to stages
      </button>
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <li className="tile" aria-label={label}>
      <span className="tile-value">{value}</span>
      <span className="tile-label">{label}</span>
    </li>
  );
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

/** Fixed to UTC so the same history reads the same wherever it is opened. */
function formatDate(iso: string | null): string {
  if (iso === null) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
