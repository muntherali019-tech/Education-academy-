// Short encouragement lines for Mochi, tuned to the audience.
const SETS = {
  kid: ["You're doing amazing! 🌟", "Keep going, superstar! 🚀", "Brilliant effort! 🎉", "Your brain is growing! 🧠", "Wow, look at you go!"],
  adult: ["Great progress — keep it up.", "You're really mastering this.", "Strong work. Onwards!", "Every bit of practice builds expertise.", "That's the way — steady and sharp."],
  teacher: ["Lovely to see the progress.", "Your learners are lucky to have you.", "Great work supporting them."],
  streak: ["On fire! 🔥", "Unstoppable!", "What a streak!", "You're flying! ✨"],
};
export function cheer(kind = "adult") { const s = SETS[kind] || SETS.adult; return s[Math.floor(Math.random() * s.length)]; }
