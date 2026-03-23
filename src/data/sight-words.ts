// Sight words with confusable pairs and categories
// Words are grouped by similarity (visual/phonetic) to make differentiation practice meaningful

export type WordEntry = {
  word: string;
  image?: string; // path to pre-generated image
  category: string;
  confusables?: string[]; // similar words to use as distractors
};

export type WordGroup = {
  name: string;
  description: string;
  words: WordEntry[];
};

// Word groups organized by category and similarity
export const wordGroups: WordGroup[] = [
  {
    name: "Animals (Similar Sounds)",
    description: "Animals with similar-sounding names",
    words: [
      { word: "pig", category: "animals", confusables: ["pug", "big", "dig"] },
      { word: "pug", category: "animals", confusables: ["pig", "bug", "mug"] },
      { word: "cat", category: "animals", confusables: ["car", "bat", "hat"] },
      { word: "bat", category: "animals", confusables: ["cat", "hat", "rat"] },
      { word: "rat", category: "animals", confusables: ["bat", "cat", "hat"] },
      { word: "dog", category: "animals", confusables: ["log", "fog", "hog"] },
      { word: "hog", category: "animals", confusables: ["dog", "log", "fog"] },
      { word: "bug", category: "animals", confusables: ["pug", "mug", "rug"] },
      { word: "hen", category: "animals", confusables: ["pen", "ten", "men"] },
      { word: "fox", category: "animals", confusables: ["box", "sox"] },
    ],
  },
  {
    name: "Things (CVC Words)",
    description: "Common objects with similar letter patterns",
    words: [
      { word: "cup", category: "things", confusables: ["pup", "cut", "cap"] },
      { word: "cap", category: "things", confusables: ["cup", "map", "tap"] },
      { word: "map", category: "things", confusables: ["cap", "tap", "nap"] },
      { word: "sun", category: "things", confusables: ["run", "fun", "bun"] },
      { word: "bun", category: "things", confusables: ["sun", "run", "fun"] },
      { word: "pan", category: "things", confusables: ["can", "fan", "man"] },
      { word: "fan", category: "things", confusables: ["pan", "can", "van"] },
      { word: "van", category: "things", confusables: ["fan", "can", "pan"] },
      { word: "box", category: "things", confusables: ["fox", "sox"] },
      { word: "bed", category: "things", confusables: ["red", "led"] },
      { word: "pot", category: "things", confusables: ["hot", "dot", "cot"] },
      { word: "net", category: "things", confusables: ["pet", "wet", "jet"] },
      { word: "jet", category: "things", confusables: ["net", "pet", "wet"] },
    ],
  },
  {
    name: "Actions",
    description: "Simple action words",
    words: [
      { word: "run", category: "actions", confusables: ["sun", "fun", "bun"] },
      { word: "hop", category: "actions", confusables: ["top", "mop", "pop"] },
      { word: "sit", category: "actions", confusables: ["hit", "bit", "fit"] },
      { word: "hit", category: "actions", confusables: ["sit", "bit", "fit"] },
      { word: "dig", category: "actions", confusables: ["big", "pig", "wig"] },
      { word: "cut", category: "actions", confusables: ["cup", "but", "hut"] },
      { word: "tap", category: "actions", confusables: ["cap", "map", "nap"] },
    ],
  },
  {
    name: "Descriptors",
    description: "Simple describing words",
    words: [
      { word: "big", category: "descriptors", confusables: ["pig", "dig", "wig"] },
      { word: "hot", category: "descriptors", confusables: ["pot", "dot", "cot"] },
      { word: "wet", category: "descriptors", confusables: ["net", "pet", "jet"] },
      { word: "red", category: "descriptors", confusables: ["bed", "led"] },
      { word: "fun", category: "descriptors", confusables: ["run", "sun", "bun"] },
    ],
  },
];

// Flatten all words for easy access
export const allWords: WordEntry[] = wordGroups.flatMap((g) => g.words);

// Get confusables for a word (returns the word's confusables or random words from same category)
export function getConfusables(word: WordEntry, count: number = 3): string[] {
  if (word.confusables && word.confusables.length >= count) {
    // Shuffle and take requested count
    return shuffleArray([...word.confusables]).slice(0, count);
  }
  
  // Fallback: get random words from same category
  const sameCategory = allWords.filter(
    (w) => w.category === word.category && w.word !== word.word
  );
  return shuffleArray(sameCategory.map((w) => w.word)).slice(0, count);
}

// Fisher-Yates shuffle
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Get a random word from a specific category or all words
export function getRandomWord(category?: string): WordEntry {
  const pool = category
    ? allWords.filter((w) => w.category === category)
    : allWords;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Generate a round with options
export type GameRound = {
  targetWord: WordEntry;
  options: string[];
  correctIndex: number;
  mode: "word-to-image" | "image-to-word";
};

export function generateRound(
  optionCount: number = 4,
  category?: string,
  mode: "word-to-image" | "image-to-word" = "image-to-word"
): GameRound {
  const targetWord = getRandomWord(category);
  const confusables = getConfusables(targetWord, optionCount - 1);
  const options = shuffleArray([targetWord.word, ...confusables]);
  const correctIndex = options.indexOf(targetWord.word);

  return {
    targetWord,
    options,
    correctIndex,
    mode,
  };
}
