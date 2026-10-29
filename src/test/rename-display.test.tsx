import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { Navbar } from '../components/Navbar';
import { HomeScreen } from '../components/HomeScreen';
import {
  getPersonalBest,
  savePersonalBest,
  getGameHistory,
  saveGameHistory,
  getVocabularyLibrary,
  saveLearnedWords,
  getUserStreak,
  updateUserStreak,
  getSettings,
  saveSettings,
  getStoredTheme,
  saveStoredTheme,
  exportVocabularyCSV
} from '../services/storageService';

describe('Display Rename to Milli', () => {
  // Test 1: All storage keys keep their exact original string values
  // Write the literal strings in the test, do not import them from the source
  it('all storage keys keep their exact original string values (literal assertions)', () => {
    localStorage.clear();

    // 1. Personal Best literal key: 'word_sprint_personal_best'
    localStorage.setItem('word_sprint_personal_best', '150');
    expect(getPersonalBest()).toBe(150);
    savePersonalBest(200);
    expect(localStorage.getItem('word_sprint_personal_best')).toBe('200');

    // 2. Settings literal key: 'word_sprint_settings'
    localStorage.setItem('word_sprint_settings', JSON.stringify({
      duration: 90,
      difficulty: 'advanced',
      soundEnabled: false,
      speechEnabled: false,
      showHints: false
    }));
    expect(getSettings().duration).toBe(90);
    saveSettings({
      duration: 120,
      difficulty: 'advanced',
      soundEnabled: false,
      speechEnabled: false,
      showHints: false
    });
    expect(JSON.parse(localStorage.getItem('word_sprint_settings') || '{}').duration).toBe(120);

    // 3. Streak literal key: 'word_sprint_streak'
    localStorage.setItem('word_sprint_streak', JSON.stringify({
      currentStreak: 7,
      bestStreak: 14,
      lastPlayedDate: '2026-10-20'
    }));
    expect(getUserStreak().currentStreak).toBe(7);
    updateUserStreak();
    expect(localStorage.getItem('word_sprint_streak')).not.toBeNull();

    // 4. Vocabulary literal key: 'word_sprint_vocabulary'
    saveLearnedWords([
      {
        status: 'valid',
        message: 'Great!',
        pointsEarned: 10,
        word: 'Mango',
        normalizedWord: 'mango',
        category: 'food',
        arabicMeaning: 'مانجو',
        definition: 'A tropical fruit'
      }
    ]);
    const storedVocabRaw = localStorage.getItem('word_sprint_vocabulary');
    expect(storedVocabRaw).not.toBeNull();
    expect(storedVocabRaw).toContain('mango');
    expect(getVocabularyLibrary()['mango']).toBeDefined();

    // 5. Game history literal key: 'word_sprint_history'
    saveGameHistory({
      id: 'h1',
      date: new Date().toISOString(),
      score: 45,
      duration: 60,
      difficulty: 'beginner',
      roundsCompleted: 1,
      correctAnswers: 4,
      incorrectAnswers: 1,
      emptyAnswers: 0,
      newVocabCount: 4,
      accuracyPercent: 80,
      averageResponseTime: 4.2,
      rounds: []
    });
    const storedHistoryRaw = localStorage.getItem('word_sprint_history');
    expect(storedHistoryRaw).not.toBeNull();
    expect(getGameHistory().length).toBeGreaterThanOrEqual(1);

    // 6. Theme literal key: 'word_sprint_theme'
    localStorage.setItem('word_sprint_theme', 'dark');
    expect(getStoredTheme()).toBe('dark');
    saveStoredTheme('light');
    expect(localStorage.getItem('word_sprint_theme')).toBe('light');
  });

  // Test 2: The key in the inline script in index.html equals literal 'word_sprint_theme'
  it('the key in the inline script in index.html equals literal "word_sprint_theme"', () => {
    const indexPath = path.resolve(__dirname, '../../index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');

    // Extract inline script in <head>
    const headScriptMatch = indexHtml.match(/<script>([\s\S]*?)<\/script>/);
    expect(headScriptMatch).not.toBeNull();
    const scriptContent = headScriptMatch![1];

    expect(scriptContent).toContain("localStorage.getItem('word_sprint_theme')");
    // Also verify page title has Milli
    expect(indexHtml).toContain('<title>Milli — Interactive Vocabulary Game | اضرب في الملي</title>');
  });

  // Test 3: Navbar and HomeScreen show "Milli" and Arabic subtitle, and no longer show "Word Sprint"
  it('Navbar shows "Milli" and the Arabic subtitle, and no longer shows "Word Sprint"', () => {
    const { container } = render(
      <Navbar
        currentTab="game"
        onSelectTab={vi.fn()}
        streak={{ currentStreak: 3, bestStreak: 5, lastPlayedDate: '2026-10-29' }}
        vocabCount={10}
        onOpenSettings={vi.fn()}
        onOpenHelp={vi.fn()}
      />
    );

    expect(screen.getByText('Milli')).toBeInTheDocument();
    expect(screen.getByText('اضرب في الملي')).toBeInTheDocument();
    expect(screen.queryByText(/Word Sprint/i)).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Word Sprint/i);
  });

  it('HomeScreen shows "Milli" and the Arabic subtitle, and no longer shows "Word Sprint"', () => {
    const { container } = render(
      <HomeScreen
        settings={{
          duration: 60,
          difficulty: 'beginner',
          soundEnabled: true,
          speechEnabled: true,
          showHints: true
        }}
        onUpdateSettings={vi.fn()}
        onStartGame={vi.fn()}
        personalBest={100}
        totalWordsLearned={25}
        totalGamesPlayed={5}
        onOpenHelp={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Milli' })).toBeInTheDocument();
    expect(screen.getAllByText(/اضرب في الملي/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Word Sprint/i)).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Word Sprint/i);
  });

  // Test 4: CSV export uses milli_vocabulary_ prefix
  it('exports CSV with the milli_vocabulary_ prefix in download filename', () => {
    saveLearnedWords([
      {
        status: 'valid',
        message: 'Correct!',
        pointsEarned: 10,
        word: 'Apple',
        normalizedWord: 'apple',
        category: 'food',
        arabicMeaning: 'تفاح',
        definition: 'A fruit'
      }
    ]);

    const createdLinks: HTMLAnchorElement[] = [];
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        createdLinks.push(el as HTMLAnchorElement);
      }
      return el;
    });

    exportVocabularyCSV();

    expect(createdLinks.length).toBeGreaterThanOrEqual(1);
    const downloadAttr = createdLinks[0].getAttribute('download') || '';
    expect(downloadAttr).toMatch(/^milli_vocabulary_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(downloadAttr).not.toContain('word_sprint_vocabulary_');
  });
});

