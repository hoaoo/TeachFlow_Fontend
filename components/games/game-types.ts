export type GameType = 'QUIZ' | 'TRUE_FALSE' | 'MATCHING' | 'FLASHCARD' | 'NAME_WHEEL';

export interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: string; // The correct option text or index
  explanation?: string;
}

export interface TrueFalseQuestion {
  id?: string;
  statement: string;
  correctAnswer: boolean;
  explanation?: string;
}

export interface MatchingPair {
  id?: string;
  left: string;
  right: string;
}

export interface FlashcardItem {
  id?: string;
  front: string;
  back: string;
  hint?: string;
}

export interface NameWheelConfig {
  classroomId?: string;
  classroomName?: string;
  names: string[];
  excludePicked?: boolean;
}

export interface GamePayload {
  gameType: GameType;
  title: string;
  instructions?: string;
  quizItems?: QuizQuestion[];
  trueFalseItems?: TrueFalseQuestion[];
  matchingPairs?: MatchingPair[];
  flashcards?: FlashcardItem[];
  wheelConfig?: NameWheelConfig;
}
