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
];

export const HAND_PREFERENCE_KEY = "learn-to-draw:hand";
export const DRAWING_KEY_PREFIX = "learn-to-draw:drawing:";

export function getLessonById(id: string) {
  return lessons.find((lesson) => lesson.id === id);
}

export function getDrawingStorageKey(animal: string) {
  return `${DRAWING_KEY_PREFIX}${animal}`;
}
