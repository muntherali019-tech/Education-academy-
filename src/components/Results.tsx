import { STAGES } from '../data/stages'
import type { StageId } from '../types'

interface Props {
  stage: StageId
  score: number
  total: number
  onRetry: () => void
  onHome: () => void
}

function verdict(score: number, total: number): { emoji: string; message: string } {
  const ratio = score / total
  if (ratio === 1) return { emoji: '👑', message: 'Top cat! A perfect round!' }
  if (ratio >= 0.8) return { emoji: '😻', message: 'Brilliant work — Mochi is purring with pride.' }
  if (ratio >= 0.5) return { emoji: '😺', message: 'Good effort! A little practice and you will ace it.' }
  return { emoji: '🐾', message: 'Every expert starts somewhere. Try the round again with Mochi!' }
}

export function Results({ stage, score, total, onRetry, onHome }: Props) {
  const stageName = STAGES.find((s) => s.id === stage)?.name ?? stage
  const { emoji, message } = verdict(score, total)

  return (
    <section className="results">
      <div className="results-emoji" aria-hidden="true">{emoji}</div>
      <h1>
        {score} / {total}
      </h1>
      <p className="results-stage">{stageName} round complete</p>
      <p>{message}</p>
      <div className="results-actions">
        <button className="button" onClick={onRetry}>Play again</button>
        <button className="button button-secondary" onClick={onHome}>Choose another stage</button>
      </div>
    </section>
  )
}
