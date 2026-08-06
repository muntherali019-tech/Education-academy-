// ---- Stages ----
export const KS_LABEL = { ks1: "Key Stage 1", ks2: "Key Stage 2", ks3: "Key Stage 3", he: "Higher Education" };

export const KS_META = [
  { id: "ks1", age: "Ages 5–7 · Years 1–2", emoji: "🐣", plan: "junior", grad: "linear-gradient(135deg,#FFE0A8,#FFC36B)" },
  { id: "ks2", age: "Ages 7–11 · Years 3–6", emoji: "🚀", plan: "junior", grad: "linear-gradient(135deg,#CFE5FF,#9BC8FF)" },
  { id: "ks3", age: "Ages 11–14 · Years 7–9", emoji: "🎒", plan: "adult", grad: "linear-gradient(135deg,#E7DBFF,#C3A9FF)" },
  { id: "he",  age: "College & university",   emoji: "🎓", plan: "adult", grad: "linear-gradient(135deg,#D6F5EE,#9EE8D9)" },
];

// ---- Subjects ----
import { Calculator, BookOpen, FlaskConical } from "lucide-react";
export const SUBJ = {
  maths:   { name: "Maths",   color: "var(--mint)",   Icon: Calculator,   shadow: "#129a83" },
  english: { name: "English", color: "var(--coral)",  Icon: BookOpen,     shadow: "#d94c6c" },
  science: { name: "Science", color: "var(--purple)", Icon: FlaskConical, shadow: "var(--purple-deep)" },
};
export const SUBJECTS_BY_KS = {
  ks1: ["maths", "english"],
  ks2: ["maths", "english"],
  ks3: ["maths", "english", "science"],
  he:  ["maths", "english", "science"],
};

// ---- Topics (used as prompts for question generation) ----
export const TOPICS = {
  ks1: {
    maths: [["Counting & numbers","🔢"],["Adding & taking away","➕"],["Shapes","🔺"],["Halves & sharing","🍰"],
            ["Counting in 2s, 5s, 10s","🐾"],["Money","🪙"],["Measuring","📏"],["Patterns","🔁"]],
    english: [["Phonics sounds","🔤"],["Rhyming words","🎵"],["Tricky words","✨"],["Naming words (nouns)","🐱"],
              ["Capital letters","🔠"],["Describing words","🌈"],["Days & months","📅"],["Reading clues","🔍"]],
  },
  ks2: {
    maths: [["Times tables","✖️"],["Fractions","½"],["Place value","🔢"],["Word problems","🧩"],["Percentages","％"],
            ["Division","➗"],["Decimals","•"],["Measurement","📏"],["Roman numerals","Ⅻ"],["Area & perimeter","⬛"]],
    english: [["Spelling","✏️"],["Word types","🏷️"],["Punctuation","❗"],["Synonyms","🔁"],["Reading clues","🔍"],
              ["Prefixes & suffixes","🔗"],["Homophones","👂"],["Apostrophes","’"],["Tenses","⏳"],["Writing sentences","📝"]],
  },
  ks3: {
    maths: [["Algebra basics","🅧"],["Ratio & proportion","％"],["Angles & shapes","📐"],["Negative numbers","➖"],
            ["Probability","🎲"],["Sequences","🔢"],["Solving equations","⚖️"],["Percentages","％"],["Graphs","📈"],["Area & volume","🧊"]],
    english: [["Sentence structure","✒️"],["Vocabulary","📖"],["Inference","🔍"],["Language techniques","🎭"],["Punctuation","❗"],
              ["Persuasive writing","📣"],["Word classes","🏷️"],["Active & passive","🔄"],["Poetry","🪶"],["Spelling rules","✏️"]],
    science: [["Forces & motion","🚗"],["Cells & organisms","🦠"],["Atoms & elements","⚛️"],["Energy","⚡"],["Human body","🫀"],
              ["Acids & alkalis","🧪"],["Electricity","🔌"],["States of matter","💧"],["Photosynthesis","🌱"],["Periodic table","🔬"]],
  },
  he: {
    maths: [["Calculus","∫"],["Linear algebra","🔢"],["Statistics","📊"],["Probability","🎲"],
            ["Differential equations","📐"],["Matrices","▦"],["Vectors","➡️"],["Hypothesis testing","🧪"]],
    english: [["Essay structure","📝"],["Referencing","📚"],["Critical analysis","🧠"],["Academic vocabulary","🎓"],
              ["Argumentation","⚖️"],["Literature review","🔎"],["Paraphrasing","🔁"],["Cohesion","🔗"]],
    science: [["Mechanics","🔧"],["Organic chemistry","🧪"],["Genetics","🧬"],["Data analysis","📈"],
              ["Thermodynamics","🔥"],["Cell biology","🔬"],["Research methods","📋"],["Electromagnetism","🧲"]],
  },
};

// ---- Plans ----
export const PLANS = {
  junior: {
    name: "Junior", price: "£3", covers: "Key Stage 1 & 2", color: "var(--ginger)",
    // Annual = 12 months for the price of 10 (2 months free, ~17% off, £2.50/mo equivalent).
    annual: "£30", annualPerMonth: "£2.50", saveText: "Save 17%",
    features: ["Unlimited 15-question rounds", "Homework photo marking", "Scan & solve any question", "Gentle, age-tuned tutor"],
  },
  adult: {
    name: "Adult", price: "£5", covers: "Key Stage 3 & Higher Education", color: "var(--purple)",
    annual: "£50", annualPerMonth: "£4.17", saveText: "Save 17%",
    features: ["Everything in Junior", "KS3 maths, English & science", "University-level study help", "Step-by-step worked solutions"],
  },
  // Family bundles Junior + Adult for one household. "best" highlights it on the plans screen.
  family: {
    name: "Family", price: "£8", covers: "All stages · up to 4 learners", color: "var(--sky)", best: true,
    features: ["Everything in Junior & Adult", "KS1–KS3 + Higher Education", "Up to 4 learner profiles", "Priority homework marking"],
  },
};
export const planForKs = (ks) => KS_META.find((k) => k.id === ks)?.plan;
// Family entitles both Junior and Adult access; expand it wherever access is checked.
export const grantPlan = (subs = {}, plan) => {
  const next = { ...subs, [plan]: true };
  if (plan === "family") { next.junior = true; next.adult = true; }
  return next;
};

// ---- Tutor "models": one brief per stage, tuned to the England / UK curriculum ----
export function tutorBrief(ks, subject) {
  const base = {
    ks1: "You are a gentle, encouraging tutor for England's Key Stage 1 (Years 1–2, ages 5–7). Use very short sentences, simple words a 6-year-old can read, and friendly emoji. Maths stays within 100 with concrete ideas (counting, number bonds, simple shapes, halves, money, measuring). English covers phonics, rhyming, common exception words, capital letters and naming words.",
    ks2: "You are an encouraging tutor for England's Key Stage 2 (Years 3–6, ages 7–11). Use clear, age-appropriate language. Maths covers the four operations, fractions, decimals, percentages, place value, measurement and word problems. English covers spelling, word classes, punctuation, prefixes/suffixes, homophones, tenses and synonyms.",
    ks3: "You are a clear, motivating tutor for England's Key Stage 3 (Years 7–9, ages 11–14). Use precise but accessible language and always show reasoning. Maths covers algebra, ratio and proportion, geometry, negative numbers, sequences, graphs and probability. English covers grammar, language analysis, inference, persuasive techniques and vocabulary. Science covers biology, chemistry and physics foundations.",
    he:  "You are a rigorous UK university-level tutor for Higher Education students. Assume an A-level foundation, use correct terminology and concise academic explanations across undergraduate maths (calculus, linear algebra, statistics), the sciences, and academic English (essay structure, referencing, critical analysis).",
  }[ks];
  return base + (subject ? ` The current subject is ${SUBJ[subject].name}.` : "");
}
