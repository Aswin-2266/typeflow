/**
 * Quote corpus.
 *
 * Every entry here is either (a) a work published before 1929 and therefore
 * in the public domain worldwide, or (b) original prose written for this
 * project. No text is reproduced from the upstream project's quote database.
 *
 * `length` buckets follow the convention: short < 100 chars,
 * medium < 300, long >= 300.
 */

export type Quote = {
  id: number;
  text: string;
  source: string;
  length: "short" | "medium" | "long";
};

function bucket(text: string): Quote["length"] {
  if (text.length < 100) return "short";
  if (text.length < 300) return "medium";
  return "long";
}

const raw: Omit<Quote, "length">[] = [
  // --- Public domain: pre-1929 literature -------------------------------
  {
    id: 1,
    text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
    source: "Jane Austen, Pride and Prejudice (1813)",
  },
  {
    id: 2,
    text: "Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.",
    source: "Herman Melville, Moby-Dick (1851)",
  },
  {
    id: 3,
    text: "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.",
    source: "Charles Dickens, A Tale of Two Cities (1859)",
  },
  {
    id: 4,
    text: "All happy families are alike; each unhappy family is unhappy in its own way.",
    source: "Leo Tolstoy, Anna Karenina (1878)",
  },
  {
    id: 5,
    text: "Two roads diverged in a wood, and I took the one less traveled by, and that has made all the difference.",
    source: "Robert Frost, The Road Not Taken (1916)",
  },
  {
    id: 6,
    text: "It is a curious thing about beginnings: they are only ever recognised in hindsight, long after the moment itself has passed and been forgotten.",
    source: "Original prose",
  },
  {
    id: 7,
    text: "The only thing we have to fear is fear itself.",
    source: "Franklin D. Roosevelt, First Inaugural Address (1933) — US Government work, public domain",
  },
  {
    id: 8,
    text: "I think, therefore I am.",
    source: "Rene Descartes, Discourse on the Method (1637)",
  },
  {
    id: 9,
    text: "To be, or not to be, that is the question: whether it is nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles.",
    source: "William Shakespeare, Hamlet (c. 1600)",
  },
  {
    id: 10,
    text: "We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness.",
    source: "United States Declaration of Independence (1776)",
  },
  {
    id: 11,
    text: "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the English alphabet exactly once in its shortest known form.",
    source: "Traditional pangram",
  },
  {
    id: 12,
    text: "The sky above the harbour was the colour of cold iron, and the gulls turned in it without any particular urgency, as though the morning could wait.",
    source: "Original prose",
  },

  // --- Original prose written for this project --------------------------
  {
    id: 13,
    text: "Typing well is less about raw speed than about rhythm. The fastest typists are not the ones who sprint, but the ones who never stumble.",
    source: "Original prose",
  },
  {
    id: 14,
    text: "Accuracy compounds. A single corrected mistake costs more keystrokes than the three words you would have typed in its place, which is why careful hands finish first.",
    source: "Original prose",
  },
  {
    id: 15,
    text: "Practice does not make perfect. Practice makes permanent. If you drill a bad habit for an hour, you have spent an hour making that habit harder to break.",
    source: "Original prose",
  },
  {
    id: 16,
    text: "The keyboard rewards patience. Begin slowly enough that every keystroke lands where you intend, and speed will arrive on its own, unbidden and permanent.",
    source: "Original prose",
  },
  {
    id: 17,
    text: "Look at the screen, not at your hands. The moment your eyes drop to the keys, you have traded the muscle memory you are building for the comfort of the memory you already have.",
    source: "Original prose",
  },
  {
    id: 18,
    text: "Every expert typist was once a beginner who refused to quit at thirty words per minute. The plateau is not a wall; it is a landing on a staircase.",
    source: "Original prose",
  },
  {
    id: 19,
    text: "Software is built one small, correct decision at a time. The large architectural choices get the attention, but it is the accumulation of ordinary care that determines whether a system survives its second year.",
    source: "Original prose",
  },
  {
    id: 20,
    text: "A good interface disappears. You notice a door handle only when it fails to tell you whether to push or pull, and you notice a typing test only when it gets in the way of typing.",
    source: "Original prose",
  },
  {
    id: 21,
    text: "Measure twice, cut once.",
    source: "Traditional proverb",
  },
  {
    id: 22,
    text: "The best time to plant a tree was twenty years ago. The second best time is now.",
    source: "Traditional proverb",
  },
  {
    id: 23,
    text: "Simplicity is the ultimate sophistication, because anything that can be removed cannot break, cannot confuse, and cannot be misunderstood by the next person to read it.",
    source: "Original prose",
  },
  {
    id: 24,
    text: "Consistency beats intensity. An hour of focused practice every day for a month will carry you further than a single ten-hour weekend, because skill is built by repetition spaced across sleep.",
    source: "Original prose",
  },
];

export const quotes: Quote[] = raw.map((q) => ({ ...q, length: bucket(q.text) }));

export function quotesByLength(length: Quote["length"] | "all"): Quote[] {
  if (length === "all") return quotes;
  return quotes.filter((q) => q.length === length);
}
