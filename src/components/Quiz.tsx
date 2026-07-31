import { useMemo, useState } from 'react'
import { QUESTIONS, ROUND_LENGTH } from '../data/questions'
import { STAGES } from '../data/stages'
import type { StageId } from '../types'

interface Props {
  stage: StageId
  onFinish: (score: number, total: number) => void
  onQuit: () => void
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function Quiz({ stage, onFinish, onQuit }: Props) {
  const round = useMemo(() => shuffle(QUESTIONS[stage]).slice(0, ROUND_LENGTH), [stage])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [showHint, setShowHint] = useState(false)

  const question = round[index]
  const stageName = STAGES.find((s) => s.id === stage)?.name ?? stage
  const answered = picked !== null
  const correct = answered && picked === question.answer

  const choose = (choice: number) => {
    if (answered) return
    setPicked(choice)
    if (choice === question.answer) setScore((s) => s + 1)
  }

  const next = () => {
    if (index + 1 >= round.length) {
      onFinish(score, round.length)
    } else {
      setIndex((i) => i + 1)
      setPicked(null)
      setShowHint(false)
    }
  }

  return (
    <section className="quiz">
      <div className="quiz-top">
        <button className="link" onClick={onQuit}>← Quit round</button>
        <span>{stageName}</span>
        <span>
          Question {index + 1} / {round.length} · 🐟 {score}
        </span>
      </div>

      <div className="progress">
        <div className="progress-bar" style={{ width: `${(index / round.length) * 100}%` }} />
      </div>

      <h2 className="quiz-prompt">{question.prompt}</h2>

      <div className="choices">
        {question.choices.map((choice, i) => {
          let cls = 'choice'
          if (answered) {
            if (i === question.answer) cls += ' choice-correct'
            else if (i === picked) cls += ' choice-wrong'
          }
          return (
            <button key={i} className={cls} onClick={() => choose(i)} disabled={answered}>
              {choice}
            </button>
          )
        })}
      </div>

      {!answered && (
        <button className="link" onClick={() => setShowHint(true)}>
          {showHint ? `💡 ${question.hint}` : 'Paw for a hint?'}
        </button>
      )}

      {answered && (
        <div className={`feedback ${correct ? 'feedback-good' : 'feedback-bad'}`}>
          <p>
            {correct
              ? 'Purr-fect! Mochi is delighted. 🐟'
              : `Not quite — the answer is “${question.choices[question.answer]}”. ${question.hint}`}
          </p>
          <button className="button" onClick={next}>
            {index + 1 >= round.length ? 'See results' : 'Next question →'}
          </button>
        </div>
      )}
    </section>
  )
}
