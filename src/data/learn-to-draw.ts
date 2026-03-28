export type LearnToDrawLesson = {
  id: string;
  name: string;
  steps: number;
  preview: string;
  stepImage: (step: number) => string;
};

export const lessons: LearnToDrawLesson[] = [
  {
    id: "penguin",
    name: "Penguin",
    steps: 4,
    preview: "/learn-to-draw/penguin/penguin-v2-step4.png",
    stepImage: (step: number) => `/learn-to-draw/penguin/penguin-v2-step${step}.png`,
  },
  {
    id: "cat",
    name: "Cat",
    steps: 4,
    preview: "/learn-to-draw/cat/step4.png",
    stepImage: (step: number) => `/learn-to-draw/cat/step${step}.png`,
  },
  {
    id: "owl",
    name: "Owl",
    steps: 4,
    preview: "/learn-to-draw/owl/step4.png",
    stepImage: (step: number) => `/learn-to-draw/owl/step${step}.png`,
  },
  {
    id: "dragon",
    name: "Dragon",
    steps: 4,
    preview: "/learn-to-draw/dragon/step4.png",
    stepImage: (step: number) => `/learn-to-draw/dragon/step${step}.png`,
  },
  {
    id: "fish",
    name: "Fish",
    steps: 4,
    preview: "/learn-to-draw/fish/step4.png",
    stepImage: (step: number) => `/learn-to-draw/fish/step${step}.png`,
  },
  {
    id: "unicorn",
    name: "Unicorn",
    steps: 4,
    preview: "/learn-to-draw/unicorn/step4.png",
    stepImage: (step: number) => `/learn-to-draw/unicorn/step${step}.png`,
  },
  {
    id: "snail",
    name: "Snail",
    steps: 4,
    preview: "/learn-to-draw/snail/step4.png",
    stepImage: (step: number) => `/learn-to-draw/snail/step${step}.png`,
  },
  {
    id: "hedgehog",
    name: "Hedgehog",
    steps: 4,
    preview: "/learn-to-draw/hedgehog/step4.png",
    stepImage: (step: number) => `/learn-to-draw/hedgehog/step${step}.png`,
  },
  {
    id: "beaver",
    name: "Beaver",
    steps: 4,
    preview: "/learn-to-draw/beaver/step4.png",
    stepImage: (step: number) => `/learn-to-draw/beaver/step${step}.png`,
  },
  {
    id: "pegasus",
    name: "Pegasus",
    steps: 4,
    preview: "/learn-to-draw/pegasus/step4.png",
    stepImage: (step: number) => `/learn-to-draw/pegasus/step${step}.png`,
  },
  {
    id: "basilisk",
    name: "Basilisk",
    steps: 4,
    preview: "/learn-to-draw/basilisk/step4.png",
    stepImage: (step: number) => `/learn-to-draw/basilisk/step${step}.png`,
  },
  {
    id: "dolphin",
    name: "Dolphin",
    steps: 4,
    preview: "/learn-to-draw/dolphin/step4.png",
    stepImage: (step: number) => `/learn-to-draw/dolphin/step${step}.png`,
  },
];

export const HAND_PREFERENCE_KEY = "learn-to-draw:hand";
export const DRAWING_KEY_PREFIX = "learn-to-draw:drawing:";

export function getLessonById(id: string) {
  return lessons.find((lesson) => lesson.id === id);
}

export function getDrawingStorageKey(animal: string) {
  return `${DRAWING_KEY_PREFIX}${animal}`;
}
