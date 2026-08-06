import React from "react";

// Catches render-time errors anywhere in the tree and shows a friendly,
// recoverable screen instead of a white page — a basic production safeguard.
export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(error, info) { try { console.error("Education Academy error:", error, info); } catch {} }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", background: "#FFF4E6", color: "#43342a", fontFamily: "'Nunito', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 54 }}>🐱</div>
          <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 24, margin: "8px 0 4px" }}>Oops — Mochi tripped!</h1>
          <p style={{ color: "#7a6a5d", margin: 0 }}>Something went wrong. Let's try that again.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, border: "none", borderRadius: 14, padding: "12px 22px", background: "#6b4fb0", color: "#fff", fontFamily: "'Fredoka', sans-serif", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Reload</button>
        </div>
      </div>
    );
  }
}
