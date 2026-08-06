// Inspirational messaging shown per key-stage to encourage progress.
// Tone rises with the age group: playful for KS1, growth-mindset for KS3/HE.
export const MOTIVATION = {
  home: { accent: "var(--ginger)", messages: [
    "Every day is a new adventure in learning! 🌟",
    "Curious minds grow the fastest 🚀",
    "Small steps today, big wins tomorrow ✨",
  ]},
  ks1: { accent: "#F2A33A", messages: [
    "You're a superstar learner! ⭐",
    "Every try makes you smarter 🌈",
    "Mistakes help our brains grow 🧠",
    "Look how much you can do! 🎉",
  ]},
  ks2: { accent: "#2b80d6", messages: [
    "Practice makes progress 💪",
    "Believe in yourself — you've got this! 🚀",
    "Every question you try makes you stronger ⭐",
    "Keep going — you get a little better every day 🌟",
  ]},
  ks3: { accent: "#6b4fb0", messages: [
    "Challenge your brain — that's how it grows 🧠",
    "Effort beats talent when talent doesn't try 💡",
    "Progress, not perfection 📈",
    "Your future self will thank you for today's work ✨",
  ]},
  he: { accent: "#129a83", messages: [
    "Discipline today, freedom tomorrow 🎓",
    "Deep work compounds — keep building 📚",
    "Master the fundamentals and the rest follows 🔑",
    "Your goals are closer than they appear 🚀",
  ]},
};

export function pickMessage(ks) {
  const set = (MOTIVATION[ks] || MOTIVATION.home).messages;
  return set[Math.floor(Math.random() * set.length)];
}
