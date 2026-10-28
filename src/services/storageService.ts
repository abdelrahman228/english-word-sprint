import type { GameHistoryItem, GameSettings, UserStreak, VocabStatus, VocabWord, AnswerValidationResult } from '../types';

const STORAGE_KEYS = {
  PERSONAL_BEST: 'word_sprint_personal_best',
  GAME_HISTORY: 'word_sprint_history',
  VOCABULARY: 'word_sprint_vocabulary',
  STREAK: 'word_sprint_streak',
  SETTINGS: 'word_sprint_settings'
};

export const DEFAULT_SETTINGS: GameSettings = {
  duration: 60,
  difficulty: 'beginner',
  soundEnabled: true,
  speechEnabled: true,
  showHints: true
};

export function getPersonalBest(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.PERSONAL_BEST);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export function savePersonalBest(score: number): void {
  try {
    const current = getPersonalBest();
    if (score > current) {
      localStorage.setItem(STORAGE_KEYS.PERSONAL_BEST, score.toString());
    }
  } catch (e) {
    console.error('Failed to save personal best', e);
  }
}

export function getGameHistory(): GameHistoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GAME_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveGameHistory(item: GameHistoryItem): void {
  try {
    const list = getGameHistory();
    list.unshift(item); // latest first
    // keep maximum 50 games
    const trimmed = list.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.GAME_HISTORY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save game history', e);
  }
}

export function getVocabularyLibrary(): Record<string, VocabWord> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.VOCABULARY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveLearnedWords(validResults: AnswerValidationResult[]): { newWordsCount: number } {
  try {
    const library = getVocabularyLibrary();
    let newWordsCount = 0;
    const now = new Date().toISOString();

    for (const res of validResults) {
      if (res.status !== 'valid' || !res.normalizedWord) continue;

      const key = res.normalizedWord;
      const existing = library[key];

      if (!existing) {
        newWordsCount++;
        library[key] = {
          word: res.word,
          normalized: res.normalizedWord,
          arabicMeaning: res.arabicMeaning || '—',
          category: res.category,
          exampleSentence: res.exampleSentence || '',
          definition: res.definition,
          dateLearned: now,
          encounterCount: 1,
          status: 'new',
          lastEncountered: now
        };
      } else {
        existing.encounterCount += 1;
        existing.lastEncountered = now;
        if (res.arabicMeaning && existing.arabicMeaning === '—') {
          existing.arabicMeaning = res.arabicMeaning;
        }
        if (res.definition && !existing.definition) {
          existing.definition = res.definition;
        }
      }
    }

    localStorage.setItem(STORAGE_KEYS.VOCABULARY, JSON.stringify(library));
    return { newWordsCount };
  } catch (e) {
    console.error('Failed to save vocabulary', e);
    return { newWordsCount: 0 };
  }
}

export function updateVocabStatus(normalizedWord: string, status: VocabStatus): void {
  try {
    const library = getVocabularyLibrary();
    if (library[normalizedWord]) {
      library[normalizedWord].status = status;
      localStorage.setItem(STORAGE_KEYS.VOCABULARY, JSON.stringify(library));
    }
  } catch (e) {
    console.error('Failed to update vocab status', e);
  }
}

export function getUserStreak(): UserStreak {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STREAK);
    if (!data) return { currentStreak: 0, bestStreak: 0, lastPlayedDate: '' };
    return JSON.parse(data);
  } catch {
    return { currentStreak: 0, bestStreak: 0, lastPlayedDate: '' };
  }
}

export function updateUserStreak(): UserStreak {
  try {
    const today = new Date().toISOString().split('T')[0];
    const streak = getUserStreak();

    if (streak.lastPlayedDate === today) {
      return streak; // already counted for today
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (streak.lastPlayedDate === yesterday) {
      streak.currentStreak += 1;
    } else {
      streak.currentStreak = 1;
    }

    streak.bestStreak = Math.max(streak.bestStreak, streak.currentStreak);
    streak.lastPlayedDate = today;

    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
    return streak;
  } catch (e) {
    console.error('Failed to update streak', e);
    return { currentStreak: 1, bestStreak: 1, lastPlayedDate: '' };
  }
}

export function getSettings(): GameSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function exportVocabularyCSV(): void {
  const library = getVocabularyLibrary();
  const words = Object.values(library);

  if (words.length === 0) {
    alert('No saved vocabulary to export yet! Play a round to start collecting words.');
    return;
  }

  const headers = ['Word', 'Category', 'Arabic Meaning', 'Definition', 'Example Sentence', 'Status', 'Encounters', 'Date Learned'];
  const rows = words.map(w => [
    `"${w.word.replace(/"/g, '""')}"`,
    `"${w.category}"`,
    `"${(w.arabicMeaning || '').replace(/"/g, '""')}"`,
    `"${(w.definition || '').replace(/"/g, '""')}"`,
    `"${(w.exampleSentence || '').replace(/"/g, '""')}"`,
    `"${w.status}"`,
    w.encounterCount,
    `"${w.dateLearned}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `word_sprint_vocabulary_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function clearAllGameData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PERSONAL_BEST);
    localStorage.removeItem(STORAGE_KEYS.GAME_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.VOCABULARY);
    localStorage.removeItem(STORAGE_KEYS.STREAK);
  } catch (e) {
    console.error('Failed to clear data', e);
  }
}
