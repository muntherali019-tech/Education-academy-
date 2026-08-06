// A tiny dependency-free confetti burst for happy moments. Honours reduced-motion.
export function burstConfetti(count = 90) {
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "confetti";
    const colors = ["#F5A24B", "#6b4fb0", "#129a83", "#FFC83D", "#e57a8a", "#4aa3ff"];
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.style.left = Math.random() * 100 + "vw";
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = (Math.random() * 0.35).toFixed(2) + "s";
      s.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
      layer.appendChild(s);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 1800);
  } catch {}
}
