import type { Stage, StageId } from '../types'

interface Props {
  stages: Stage[]
  onPick: (stage: StageId) => void
}

export function StageSelect({ stages, onPick }: Props) {
  return (
    <section>
      <div className="hero">
        <div className="hero-cat" aria-hidden="true">🐈</div>
        <h1>Miaow! Ready to play?</h1>
        <p>
          Pick your stage and Mochi will fetch a 15-question puzzle round. Answer well to earn
          fish — and don&apos;t worry, every wrong answer comes with a friendly hint.
        </p>
      </div>
      <div className="stage-grid">
        {stages.map((stage) => (
          <button key={stage.id} className="stage-card" onClick={() => onPick(stage.id)}>
            <span className="stage-emoji" aria-hidden="true">{stage.emoji}</span>
            <h2>{stage.name}</h2>
            <p className="stage-ages">{stage.ages}</p>
            <p>{stage.blurb}</p>
            <span className="stage-go">Start round →</span>
          </button>
        ))}
      </div>
    </section>
  )
}
