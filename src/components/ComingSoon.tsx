interface Props {
  title: string
  body: string
  onHome: () => void
}

export function ComingSoon({ title, body, onHome }: Props) {
  return (
    <section className="coming-soon">
      <div className="coming-soon-cat" aria-hidden="true">😸</div>
      <h1>{title}</h1>
      <p>{body}</p>
      <p className="coming-soon-badge">Coming soon — Mochi is still knitting this feature.</p>
      <button className="button" onClick={onHome}>Back to the games</button>
    </section>
  )
}
