import type { StageId } from "./stages";

export interface Question {
  id: string;
  stage: StageId;
  subject: string;
  prompt: string;
  choices: string[];
  /** Index into `choices`. */
  answerIndex: number;
}

/**
 * Starter question bank. Each stage needs at least ROUND_SIZE questions for a
 * full round — `questions.test.ts` guards that invariant.
 */
export const QUESTION_BANK: Question[] = [
  // --- Key Stage 1 ---------------------------------------------------------
  q("ks1-1", "ks1", "Maths", "What is 2 + 3?", ["4", "5", "6"], 1),
  q("ks1-2", "ks1", "Maths", "What is 10 - 4?", ["5", "6", "7"], 1),
  q("ks1-3", "ks1", "Maths", "Which number is the largest?", ["12", "9", "7"], 0),
  q("ks1-4", "ks1", "Maths", "How many sides does a triangle have?", ["3", "4", "5"], 0),
  q("ks1-5", "ks1", "Maths", "What is double 4?", ["6", "8", "10"], 1),
  q("ks1-6", "ks1", "English", "Which word rhymes with 'cat'?", ["hat", "dog", "sun"], 0),
  q("ks1-7", "ks1", "English", "Which is a describing word?", ["run", "fluffy", "table"], 1),
  q("ks1-8", "ks1", "English", "How many letters are in 'Mochi'?", ["4", "5", "6"], 1),
  q("ks1-9", "ks1", "English", "Which letter comes after 'd'?", ["c", "e", "f"], 1),
  q("ks1-10", "ks1", "Science", "Which animal says 'meow'?", ["cat", "cow", "duck"], 0),
  q("ks1-11", "ks1", "Science", "What do plants need to grow?", ["water", "crisps", "socks"], 0),
  q("ks1-12", "ks1", "Science", "Which of these floats?", ["a stone", "a coin", "a cork"], 2),
  q("ks1-13", "ks1", "Science", "How many legs does a cat have?", ["2", "4", "6"], 1),
  q("ks1-14", "ks1", "Maths", "What is 5 + 5?", ["9", "10", "11"], 1),
  q("ks1-15", "ks1", "English", "Which one is a colour?", ["green", "jump", "loud"], 0),
  q("ks1-16", "ks1", "Maths", "What comes next: 2, 4, 6, ...?", ["7", "8", "9"], 1),

  // --- Key Stage 2 ---------------------------------------------------------
  q("ks2-1", "ks2", "Maths", "What is 7 x 8?", ["54", "56", "64"], 1),
  q("ks2-2", "ks2", "Maths", "What is 144 divided by 12?", ["11", "12", "14"], 1),
  q("ks2-3", "ks2", "Maths", "What is 1/2 of 46?", ["21", "23", "24"], 1),
  q("ks2-4", "ks2", "Maths", "Round 4,872 to the nearest hundred.", ["4,800", "4,870", "4,900"], 2),
  q("ks2-5", "ks2", "Maths", "What is 0.25 as a fraction?", ["1/2", "1/3", "1/4"], 2),
  q("ks2-6", "ks2", "Maths", "Angles in a triangle add up to...", ["90", "180", "360"], 1),
  q("ks2-7", "ks2", "English", "What is the plural of 'mouse'?", ["mouses", "mice", "mouse"], 1),
  q("ks2-8", "ks2", "English", "Which word is a verb?", ["quickly", "sprint", "shiny"], 1),
  q("ks2-9", "ks2", "English", "Which sentence is punctuated correctly?", [
    "wheres my book",
    "Where's my book?",
    "where's my book",
  ], 1),
  q("ks2-10", "ks2", "English", "A synonym for 'happy' is...", ["cheerful", "hungry", "tired"], 0),
  q("ks2-11", "ks2", "Science", "Water boils at what temperature (C)?", ["50", "100", "150"], 1),
  q("ks2-12", "ks2", "Science", "Which planet is closest to the Sun?", ["Mercury", "Venus", "Mars"], 0),
  q("ks2-13", "ks2", "Science", "What gas do plants take in?", [
    "oxygen",
    "carbon dioxide",
    "nitrogen",
  ], 1),
  q("ks2-14", "ks2", "Science", "The human skeleton is made of...", ["bones", "muscles", "nerves"], 0),
  q("ks2-15", "ks2", "History", "Who was the first man on the Moon?", [
    "Neil Armstrong",
    "Buzz Aldrin",
    "Yuri Gagarin",
  ], 0),
  q("ks2-16", "ks2", "Geography", "What is the capital of Scotland?", [
    "Glasgow",
    "Edinburgh",
    "Aberdeen",
  ], 1),

  // --- Key Stage 3 ---------------------------------------------------------
  q("ks3-1", "ks3", "Maths", "Solve for x: 3x + 6 = 21", ["3", "5", "9"], 1),
  q("ks3-2", "ks3", "Maths", "What is the value of 5^3?", ["15", "75", "125"], 2),
  q("ks3-3", "ks3", "Maths", "Area of a circle with radius 3 (2 d.p.)?", [
    "18.85",
    "28.27",
    "9.42",
  ], 1),
  q("ks3-4", "ks3", "Maths", "What is 15% of 240?", ["24", "36", "40"], 1),
  q("ks3-5", "ks3", "Maths", "Which is a prime number?", ["51", "57", "59"], 2),
  q("ks3-6", "ks3", "Science", "What is the chemical symbol for potassium?", ["P", "K", "Po"], 1),
  q("ks3-7", "ks3", "Science", "Force = mass x ...?", ["velocity", "acceleration", "energy"], 1),
  q("ks3-8", "ks3", "Science", "Which organelle makes energy in a cell?", [
    "nucleus",
    "ribosome",
    "mitochondrion",
  ], 2),
  q("ks3-9", "ks3", "Science", "What does pH 3 indicate?", ["acidic", "neutral", "alkaline"], 0),
  q("ks3-10", "ks3", "English", "'The wind whispered' is an example of...", [
    "simile",
    "personification",
    "alliteration",
  ], 1),
  q("ks3-11", "ks3", "English", "Who wrote 'Romeo and Juliet'?", [
    "Charles Dickens",
    "William Shakespeare",
    "Jane Austen",
  ], 1),
  q("ks3-12", "ks3", "English", "A metaphor does what?", [
    "compares using 'like'",
    "states one thing is another",
    "repeats initial sounds",
  ], 1),
  q("ks3-13", "ks3", "History", "In which year did World War II end?", ["1918", "1945", "1939"], 1),
  q("ks3-14", "ks3", "History", "The Magna Carta was sealed in...", ["1066", "1215", "1415"], 1),
  q("ks3-15", "ks3", "Geography", "What causes tides?", [
    "the Moon's gravity",
    "wind",
    "ocean currents",
  ], 0),
  q("ks3-16", "ks3", "Geography", "The longest river in the UK is the...", [
    "Thames",
    "Severn",
    "Trent",
  ], 1),

  // --- Higher Education ----------------------------------------------------
  q("he-1", "he", "Maths", "What is the derivative of x^3?", ["3x^2", "x^2", "3x"], 0),
  q("he-2", "he", "Maths", "The integral of 1/x dx is...", ["x^-2", "ln|x| + C", "1"], 1),
  q("he-3", "he", "Maths", "A matrix is invertible when its determinant is...", [
    "zero",
    "non-zero",
    "negative",
  ], 1),
  q("he-4", "he", "Maths", "What is the limit of (1 + 1/n)^n as n approaches infinity?", [
    "1",
    "e",
    "infinity",
  ], 1),
  q("he-5", "he", "Statistics", "A p-value below 0.05 usually means...", [
    "reject the null hypothesis",
    "accept the null hypothesis",
    "the sample was too small",
  ], 0),
  q("he-6", "he", "Statistics", "Standard deviation measures...", ["centre", "spread", "skew"], 1),
  q("he-7", "he", "Computing", "Binary search on a sorted array runs in...", [
    "O(n)",
    "O(log n)",
    "O(n log n)",
  ], 1),
  q("he-8", "he", "Computing", "What does 'immutable' mean?", [
    "cannot be changed after creation",
    "stored on disk",
    "always private",
  ], 0),
  q("he-9", "he", "Computing", "A stack is which kind of structure?", ["LIFO", "FIFO", "sorted"], 0),
  q("he-10", "he", "Physics", "Which quantity is conserved in a closed system?", [
    "energy",
    "temperature",
    "pressure",
  ], 0),
  q("he-11", "he", "Physics", "The speed of light is roughly...", [
    "3 x 10^6 m/s",
    "3 x 10^8 m/s",
    "3 x 10^10 m/s",
  ], 1),
  q("he-12", "he", "Biology", "DNA is transcribed into...", ["RNA", "protein", "lipids"], 0),
  q("he-13", "he", "Economics", "Opportunity cost is best described as...", [
    "the money spent",
    "the value of the next best alternative",
    "total revenue minus cost",
  ], 1),
  q("he-14", "he", "Economics", "Inflation measures the rate of change of...", [
    "wages",
    "prices",
    "employment",
  ], 1),
  q("he-15", "he", "Study skills", "Which referencing style uses (Author, Year)?", [
    "Harvard",
    "Vancouver",
    "OSCOLA",
  ], 0),
  q("he-16", "he", "Study skills", "A literature review primarily aims to...", [
    "summarise existing research",
    "collect new data",
    "prove a hypothesis",
  ], 0),
];

function q(
  id: string,
  stage: StageId,
  subject: string,
  prompt: string,
  choices: string[],
  answerIndex: number,
): Question {
  return { id, stage, subject, prompt, choices, answerIndex };
}

export function questionsForStage(stage: StageId, bank: Question[] = QUESTION_BANK): Question[] {
  return bank.filter((question) => question.stage === stage);
}
