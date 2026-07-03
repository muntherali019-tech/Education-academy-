import { useState } from 'react'
import { StageSelect } from './components/StageSelect'
import { Quiz } from './components/Quiz'
import { Results } from './components/Results'
import { ComingSoon } from './components/ComingSoon'
import { STAGES } from './data/stages'
import type { StageId } from './types'

type View =
  | { name: 'home' }
  | { name: 'quiz'; stage: StageId }
  | { name: 'results'; stage: StageId; score: number; total: number }
  | { name: 'homework' }
  | { name: 'scan' }
  | { name: 'dashboard' }
  | { name: 'subscribe' }

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' })

  const goHome = () => setView({ name: 'home' })

  return (
    <div className="app">
      <header className="header">
        <button className="brand" onClick={goHome}>
          <span className="brand-cat" aria-hidden="true">🐈</span>
          <span>
            Education Academy
            <small>Learn with Mochi the ginger cat</small>
          </span>
        </button>
        <nav className="nav">
          <button onClick={() => setView({ name: 'homework' })}>Homework marking</button>
          <button onClick={() => setView({ name: 'scan' })}>Scan &amp; solve</button>
          <button onClick={() => setView({ name: 'dashboard' })}>Dashboard</button>
          <button className="nav-cta" onClick={() => setView({ name: 'subscribe' })}>
            Subscribe
          </button>
        </nav>
      </header>

      <main className="main">
        {view.name === 'home' && (
          <StageSelect stages={STAGES} onPick={(stage) => setView({ name: 'quiz', stage })} />
        )}
        {view.name === 'quiz' && (
          <Quiz
            stage={view.stage}
            onFinish={(score, total) =>
              setView({ name: 'results', stage: view.stage, score, total })
            }
            onQuit={goHome}
          />
        )}
        {view.name === 'results' && (
          <Results
            stage={view.stage}
            score={view.score}
            total={view.total}
            onRetry={() => setView({ name: 'quiz', stage: view.stage })}
            onHome={goHome}
          />
        )}
        {view.name === 'homework' && (
          <ComingSoon
            title="AI homework photo-marking"
            body="Snap a photo of finished homework and Mochi will mark it, explain any slips, and suggest what to practise next."
            onHome={goHome}
          />
        )}
        {view.name === 'scan' && (
          <ComingSoon
            title="Scan &amp; solve helper"
            body="Point your camera at a tricky question and Mochi will walk through the solution step by step — teaching, not just telling."
            onHome={goHome}
          />
        )}
        {view.name === 'dashboard' && (
          <ComingSoon
            title="Parent &amp; teacher dashboard"
            body="Track progress across every stage: rounds played, accuracy by topic, streaks, and areas that need a helping paw."
            onHome={goHome}
          />
        )}
        {view.name === 'subscribe' && (
          <ComingSoon
            title="Mochi Premium"
            body="Unlimited puzzle rounds, homework marking and the full dashboard. Subscription plans are on their way."
            onHome={goHome}
          />
        )}
      </main>

      <footer className="footer">Made with 🧶 by Mochi · Education Academy</footer>
    </div>
  )
}
