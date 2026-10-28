export type Category = 'noun' | 'verb' | 'adjective' | 'country_city' | 'food';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type GameDuration = 30 | 60 | 90 | 120;

export type ValidationStatus = 'idle' | 'valid' | 'invalid' | 'duplicate' | 'empty';

export interface CategoryInfo {
  id: Category;
  name: string;
  arabicName: string;
  description: string;
  example: string;
  placeholder: string;
}

export interface AnswerValidationResult {
  status: ValidationStatus;
  message: string;
  pointsEarned: number;
  word: string;
  normalizedWord: string;
  category: Category;
  isNewWord?: boolean;
  arabicMeaning?: string;
  definition?: string;
  exampleSentence?: string;
  difficulty?: Difficulty;
}

export type RoundAnswers = Record<Category, string>;

export type RoundResults = Record<Category, AnswerValidationResult>;

export interface RoundHistory {
  letter: string;
  answers: RoundAnswers;
  results: RoundResults;
  roundPoints: number;
  allBonusEarned: boolean;
  timeSpentSeconds: number;
}

export type VocabStatus = 'new' | 'learning' | 'mastered';

export interface VocabWord {
  word: string;
  normalized: string;
  arabicMeaning: string;
  category: Category;
  exampleSentence: string;
  definition?: string;
  dateLearned: string;
  encounterCount: number;
  status: VocabStatus;
  lastEncountered: string;
}

export interface GameHistoryItem {
  id: string;
  date: string;
  score: number;
  duration: GameDuration;
  difficulty: Difficulty;
  roundsCompleted: number;
  correctAnswers: number;
  incorrectAnswers: number;
  emptyAnswers: number;
  newVocabCount: number;
  accuracyPercent: number;
  averageResponseTime: number;
  rounds: RoundHistory[];
}

export interface UserStreak {
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string; // YYYY-MM-DD
}

export interface GameSettings {
  duration: GameDuration;
  difficulty: Difficulty;
  soundEnabled: boolean;
  speechEnabled: boolean;
  showHints: boolean;
}

export interface CategoryStats {
  category: Category;
  name: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
}
