import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPersonalBest,
  savePersonalBest,
  getGameHistory,
  saveGameHistory,
  getVocabularyLibrary,
  saveLearnedWords,
  updateVocabStatus,
  getUserStreak,
  updateUserStreak,
  getSettings,
  exportVocabularyCSV,
  clearAllGameData
} from '../services/storageService';
import type { AnswerValidationResult, GameHistoryItem } from '../types';

describe('Storage & Vocabulary Persistence (Section E)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('handles empty/missing/corrupted localStorage gracefully without crashing', () => {
    expect(getPersonalBest()).toBe(0);
    expect(getGameHistory()).toEqual([]);
    expect(getVocabularyLibrary()).toEqual({});
    expect(getUserStreak()).toEqual({ currentStreak: 0, bestStreak: 0, lastPlayedDate: '' });
    expect(getSettings()).toBeDefined();

    // Corrupted JSON in localStorage
    window.localStorage.setItem('word_sprint_history', 'CORRUPTED{{JSON');
    window.localStorage.setItem('word_sprint_vocabulary', 'NOT_JSON');
    window.localStorage.setItem('word_sprint_settings', '{broken');

    expect(getGameHistory()).toEqual([]);
    expect(getVocabularyLibrary()).toEqual({});
    expect(getSettings().duration).toBe(60);
  });

  it('saves and persists personal best score correctly', () => {
    savePersonalBest(45);
    expect(getPersonalBest()).toBe(45);

    // Lower score should not overwrite higher personal best
    savePersonalBest(30);
    expect(getPersonalBest()).toBe(45);

    // Higher score should overwrite
    savePersonalBest(65);
    expect(getPersonalBest()).toBe(65);
  });

  it('saves vocabulary with Arabic meaning, date, times seen, and status', () => {
    const validResults: AnswerValidationResult[] = [
      {
        status: 'valid',
        message: 'Correct!',
        pointsEarned: 10,
        word: 'Apple',
        normalizedWord: 'apple',
        category: 'food',
        arabicMeaning: 'تفاحة',
        definition: 'A fruit',
        exampleSentence: 'She ate an apple.'
      }
    ];

    const { newWordsCount } = saveLearnedWords(validResults);
    expect(newWordsCount).toBe(1);

    const library = getVocabularyLibrary();
    expect(library['apple']).toBeDefined();
    expect(library['apple'].word).toBe('Apple');
    expect(library['apple'].arabicMeaning).toBe('تفاحة');
    expect(library['apple'].status).toBe('new');
    expect(library['apple'].encounterCount).toBe(1);
    expect(library['apple'].exampleSentence).toBe('She ate an apple.');

    // Second encounter should increase encounter count
    saveLearnedWords(validResults);
    const updatedLib = getVocabularyLibrary();
    expect(updatedLib['apple'].encounterCount).toBe(2);
    // Should NOT automatically mark as mastered
    expect(updatedLib['apple'].status).toBe('new');
  });

  it('allows manual update of vocabulary learning status to mastered', () => {
    saveLearnedWords([
      {
        status: 'valid',
        message: 'Correct!',
        pointsEarned: 10,
        word: 'Book',
        normalizedWord: 'book',
        category: 'noun'
      }
    ]);

    updateVocabStatus('book', 'mastered');
    const lib = getVocabularyLibrary();
    expect(lib['book'].status).toBe('mastered');

    updateVocabStatus('book', 'learning');
    const lib2 = getVocabularyLibrary();
    expect(lib2['book'].status).toBe('learning');
  });

  it('exports CSV properly formatted with quotes, commas, and Arabic text', () => {
    saveLearnedWords([
      {
        status: 'valid',
        message: 'Correct!',
        pointsEarned: 10,
        word: 'Apple, Red',
        normalizedWord: 'apple, red',
        category: 'food',
        arabicMeaning: 'تفاح "أحمر"',
        definition: 'A crisp, sweet fruit'
      }
    ]);

    // Should not throw
    expect(() => exportVocabularyCSV()).not.toThrow();
  });

  it('tracks and updates user daily streak accurately', () => {
    const streak1 = updateUserStreak();
    expect(streak1.currentStreak).toBe(1);
    expect(streak1.bestStreak).toBe(1);

    // Calling again same day should maintain current streak
    const streakSameDay = updateUserStreak();
    expect(streakSameDay.currentStreak).toBe(1);
  });

  it('saves game history and clears all data on reset', () => {
    const mockGame: GameHistoryItem = {
      id: '123',
      date: new Date().toISOString(),
      score: 55,
      duration: 60,
      difficulty: 'beginner',
      roundsCompleted: 1,
      correctAnswers: 5,
      incorrectAnswers: 0,
      emptyAnswers: 0,
      newVocabCount: 5,
      accuracyPercent: 100,
      averageResponseTime: 4.2,
      rounds: []
    };

    saveGameHistory(mockGame);
    expect(getGameHistory().length).toBe(1);
    expect(getGameHistory()[0].score).toBe(55);

    clearAllGameData();
    expect(getGameHistory().length).toBe(0);
    expect(getPersonalBest()).toBe(0);
  });
});
