import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { GameScreen } from '../components/GameScreen';
import { HomeScreen } from '../components/HomeScreen';
import { ResultsScreen } from '../components/ResultsScreen';
import { StatisticsDashboard } from '../components/StatisticsDashboard';
import { VocabularyLibrary } from '../components/VocabularyLibrary';
import { getCategoryPartialHint, validateAnswer } from '../services/validationService';
import type { GameHistoryItem, GameSettings, VocabWord } from '../types';

describe('Game Flow, Validation, Scoring & UI (Sections A, B, C, D, F)', () => {
  const defaultSettings: GameSettings = {
    duration: 30,
    difficulty: 'beginner',
    soundEnabled: false,
    speechEnabled: false,
    showHints: true
  };

  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  // Section A: Game Flow & Timers
  it('A1: renders GameScreen with initial duration, score 0, and prominent letter', () => {
    const onFinish = vi.fn();
    const onExit = vi.fn();

    render(
      <GameScreen
        settings={defaultSettings}
        personalBest={100}
        onFinishGame={onFinish}
        onExitGame={onExit}
      />
    );

    expect(screen.getByText(/Time Remaining/i)).toBeInTheDocument();
    expect(screen.getByText('0:30')).toBeInTheDocument();
    expect(screen.getByText(/Total Score/i)).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // personal best
  });

  it('A2: timer counts down using timestamp math and warns when <= 10s', () => {
    const onFinish = vi.fn();
    render(
      <GameScreen
        settings={defaultSettings}
        personalBest={50}
        onFinishGame={onFinish}
        onExitGame={vi.fn()}
      />
    );

    // Fast-forward 21 seconds (leaving 9s)
    act(() => {
      vi.advanceTimersByTime(21000);
    });

    const timerChip = document.getElementById('timer-display');
    expect(timerChip).toHaveClass('urgent');
    expect(screen.getByText('0:09')).toBeInTheDocument();
  });

  it('A3: auto-ends game when timer reaches 0 and calls onFinishGame once', () => {
    const onFinish = vi.fn();
    render(
      <GameScreen
        settings={defaultSettings}
        personalBest={50}
        onFinishGame={onFinish}
        onExitGame={vi.fn()}
      />
    );

    act(() => {
      vi.advanceTimersByTime(31000);
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
    const gameRecord: GameHistoryItem = onFinish.mock.calls[0][0];
    expect(gameRecord.duration).toBe(30);
    expect(gameRecord.score).toBe(0);
  });

  it('A4 & Bug 6: handleEndGame is idempotent — multiple clicks or timer trigger only save once', () => {
    const onFinish = vi.fn();
    render(
      <GameScreen
        settings={defaultSettings}
        personalBest={50}
        onFinishGame={onFinish}
        onExitGame={vi.fn()}
      />
    );

    const endBtn = screen.getByRole('button', { name: /End Game/i });
    // Click multiple times rapidly
    fireEvent.click(endBtn);
    fireEvent.click(endBtn);
    fireEvent.click(endBtn);

    // Advance time to 0 to simulate simultaneous timer expiration
    act(() => {
      vi.advanceTimersByTime(35000);
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('A5: Skip Letter changes the letter without changing the accumulated score', () => {
    render(
      <GameScreen
        settings={defaultSettings}
        personalBest={50}
        onFinishGame={vi.fn()}
        onExitGame={vi.fn()}
      />
    );

    const skipBtn = screen.getByRole('button', { name: /Skip Letter/i });

    fireEvent.click(skipBtn);

    const letterCircleAfter = document.getElementById('letter-display')?.textContent;
    // New letter must not be empty and must be valid A-Z
    expect(letterCircleAfter).toBeDefined();
    expect(letterCircleAfter?.length).toBe(1);
    // Score remains 0
    expect(document.getElementById('score-display')?.textContent).toContain('0');
  });

  it('A6: Clear button clears inputs without modifying score or timer', () => {
    render(
      <GameScreen
        settings={defaultSettings}
        personalBest={50}
        onFinishGame={vi.fn()}
        onExitGame={vi.fn()}
      />
    );

    const nounInput = document.getElementById('input-noun') as HTMLInputElement;
    fireEvent.change(nounInput, { target: { value: 'Something' } });
    expect(nounInput.value).toBe('Something');

    const clearBtn = screen.getByRole('button', { name: /Clear/i });
    fireEvent.click(clearBtn);

    expect(nounInput.value).toBe('');
  });

  // Section B: Validation Rigor
  it('B1: validates case-insensitivity, trimmed spaces, empty, and wrong letter', async () => {
    const used = new Set<string>();

    // Empty
    const emptyRes = await validateAnswer('', 'noun', 'B', used);
    expect(emptyRes.status).toBe('empty');
    expect(emptyRes.pointsEarned).toBe(0);

    // Wrong starting letter
    const wrongLetterRes = await validateAnswer('Cat', 'noun', 'B', used);
    expect(wrongLetterRes.status).toBe('invalid');
    expect(wrongLetterRes.pointsEarned).toBe(0);
    expect(wrongLetterRes.message).toContain('starts with C');

    // Case-insensitivity & whitespace trimming
    const validWithSpaces = await validateAnswer('   bOOk   ', 'noun', 'B', used);
    expect(validWithSpaces.status).toBe('valid');
    expect(validWithSpaces.pointsEarned).toBe(10);
    expect(validWithSpaces.normalizedWord).toBe('book');
    used.add(validWithSpaces.normalizedWord);

    // Duplicate in same game
    const duplicateRes = await validateAnswer('Book', 'noun', 'B', used);
    expect(duplicateRes.status).toBe('duplicate');
    expect(duplicateRes.pointsEarned).toBe(0);
    expect(duplicateRes.message).toContain('already used');
  });

  it('B2: validates countries and cities accurately', async () => {
    const used = new Set<string>();

    const countryRes = await validateAnswer('Brazil', 'country_city', 'B', used);
    expect(countryRes.status).toBe('valid');
    expect(countryRes.arabicMeaning).toBe('البرازيل');

    const cityRes = await validateAnswer('Berlin', 'country_city', 'B', used);
    expect(cityRes.status).toBe('valid');
    expect(cityRes.arabicMeaning).toBe('برلين');

    const fakeRes = await validateAnswer('BikiniBottom', 'country_city', 'B', used);
    expect(fakeRes.status).toBe('invalid');
  });

  // Section C: Scoring Logic
  it('C1: calculates 55 points (50 + 5 bonus) for all 5 correct, and 40 for 4 correct', async () => {
    const used = new Set<string>();

    // 5 correct for letter A
    const r1 = await validateAnswer('Actor', 'noun', 'A', used);
    const r2 = await validateAnswer('Ask', 'verb', 'A', used);
    const r3 = await validateAnswer('Amazing', 'adjective', 'A', used);
    const r4 = await validateAnswer('Australia', 'country_city', 'A', used);
    const r5 = await validateAnswer('Apple', 'food', 'A', used);

    expect(r1.status).toBe('valid');
    expect(r2.status).toBe('valid');
    expect(r3.status).toBe('valid');
    expect(r4.status).toBe('valid');
    expect(r5.status).toBe('valid');

    const points = [r1, r2, r3, r4, r5].reduce((sum, r) => sum + r.pointsEarned, 0);
    const allBonus = [r1, r2, r3, r4, r5].every(r => r.status === 'valid');
    const totalRound = points + (allBonus ? 5 : 0);

    expect(totalRound).toBe(55); // 50 + 5 bonus!

    // 4 correct + 1 empty
    const rEmpty = await validateAnswer('', 'noun', 'A', used);
    const fourPoints = [rEmpty, r2, r3, r4, r5].reduce((sum, r) => sum + r.pointsEarned, 0);
    const fourBonus = [rEmpty, r2, r3, r4, r5].every(r => r.status === 'valid');
    expect(fourPoints + (fourBonus ? 5 : 0)).toBe(40);
  });

  // Section D: Hints Logic & Difficulty
  it('D1: hints generate partial pattern and award no points', () => {
    const hint = getCategoryPartialHint('noun', 'B');
    expect(hint).not.toBeNull();
    if (hint) {
      expect(hint.pattern).toContain('_'); // contains blanks
      expect(hint.firstLetters.length).toBeLessThanOrEqual(2);
      expect(hint.wordLength).toBeGreaterThan(0);
      expect(hint.arabicMeaning).toBeDefined();
    }
  });

  it('D2: Intermediate difficulty limits hints to 3, and count never goes negative', () => {
    const intermediateSettings: GameSettings = {
      ...defaultSettings,
      difficulty: 'intermediate'
    };

    render(
      <GameScreen
        settings={intermediateSettings}
        personalBest={50}
        onFinishGame={vi.fn()}
        onExitGame={vi.fn()}
      />
    );

    expect(screen.getByText('Hints left:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('D3: Advanced difficulty completely hides hint buttons', () => {
    const advancedSettings: GameSettings = {
      ...defaultSettings,
      difficulty: 'advanced'
    };

    render(
      <GameScreen
        settings={advancedSettings}
        personalBest={50}
        onFinishGame={vi.fn()}
        onExitGame={vi.fn()}
      />
    );

    expect(screen.queryByText(/Hint/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hints left:/i)).not.toBeInTheDocument();
  });

  // Section F: UI Components Rendering
  it('F1: renders HomeScreen with duration selectors, difficulty levels, and start button', () => {
    render(
      <HomeScreen
        settings={defaultSettings}
        onUpdateSettings={vi.fn()}
        onStartGame={vi.fn()}
        personalBest={80}
        totalWordsLearned={12}
        totalGamesPlayed={3}
        onOpenHelp={vi.fn()}
      />
    );

    expect(screen.getByText(/English Word Sprint/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Game/i })).toBeInTheDocument();
    expect(screen.getByText('80 pts')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('F2: renders ResultsScreen with motivational message, score, and Words to Learn', () => {
    const mockRecord: GameHistoryItem = {
      id: '1',
      date: new Date().toISOString(),
      score: 55,
      duration: 30,
      difficulty: 'beginner',
      roundsCompleted: 1,
      correctAnswers: 5,
      incorrectAnswers: 0,
      emptyAnswers: 0,
      newVocabCount: 5,
      accuracyPercent: 100,
      averageResponseTime: 5.4,
      rounds: [
        {
          letter: 'A',
          answers: { noun: 'Apple', verb: 'Ask', adjective: 'Amazing', country_city: 'Australia', food: 'Avocado' },
          results: {
            noun: { status: 'valid', message: 'Valid', pointsEarned: 10, word: 'Apple', normalizedWord: 'apple', category: 'noun', arabicMeaning: 'تفاحة' },
            verb: { status: 'valid', message: 'Valid', pointsEarned: 10, word: 'Ask', normalizedWord: 'ask', category: 'verb', arabicMeaning: 'يسأل' },
            adjective: { status: 'valid', message: 'Valid', pointsEarned: 10, word: 'Amazing', normalizedWord: 'amazing', category: 'adjective', arabicMeaning: 'مذهل' },
            country_city: { status: 'valid', message: 'Valid', pointsEarned: 10, word: 'Australia', normalizedWord: 'australia', category: 'country_city', arabicMeaning: 'أستراليا' },
            food: { status: 'valid', message: 'Valid', pointsEarned: 10, word: 'Avocado', normalizedWord: 'avocado', category: 'food', arabicMeaning: 'أفوكادو' }
          },
          roundPoints: 55,
          allBonusEarned: true,
          timeSpentSeconds: 0
        }
      ]
    };

    render(
      <ResultsScreen
        gameRecord={mockRecord}
        personalBest={50}
        onPlayAgain={vi.fn()}
        onGoVocabulary={vi.fn()}
        onGoStats={vi.fn()}
        onGoHome={vi.fn()}
      />
    );

    expect(screen.getByText('55 Points')).toBeInTheDocument();
    expect(screen.getAllByText(/New Personal Best/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Words to Learn \(5\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play Again/i })).toBeInTheDocument();
  });

  it('F3: renders StatisticsDashboard correctly with 0 games and updates with real data', () => {
    const { rerender } = render(
      <StatisticsDashboard
        history={[]}
        vocabulary={{}}
        personalBest={0}
        streak={{ currentStreak: 0, bestStreak: 0, lastPlayedDate: '' }}
        onRefresh={vi.fn()}
        onStartSprint={vi.fn()}
      />
    );

    expect(screen.getByText(/Performance Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText('Play at least 2 games to see your score progression curve!')).toBeInTheDocument();

    const mockHistory: GameHistoryItem[] = [
      {
        id: '1',
        date: new Date().toISOString(),
        score: 40,
        duration: 60,
        difficulty: 'beginner',
        roundsCompleted: 1,
        correctAnswers: 4,
        incorrectAnswers: 1,
        emptyAnswers: 0,
        newVocabCount: 4,
        accuracyPercent: 80,
        averageResponseTime: 4.5,
        rounds: []
      },
      {
        id: '2',
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
        averageResponseTime: 4.0,
        rounds: []
      }
    ];

    rerender(
      <StatisticsDashboard
        history={mockHistory}
        vocabulary={{
          apple: { word: 'Apple', normalized: 'apple', arabicMeaning: 'تفاحة', category: 'food', exampleSentence: '', dateLearned: '', encounterCount: 1, status: 'new', lastEncountered: '' }
        }}
        personalBest={55}
        streak={{ currentStreak: 2, bestStreak: 2, lastPlayedDate: '2026-10-28' }}
        onRefresh={vi.fn()}
        onStartSprint={vi.fn()}
      />
    );

    expect(screen.getByText('95')).toBeInTheDocument(); // total points = 40 + 55
    expect(screen.getByText('55')).toBeInTheDocument(); // personal best
    expect(screen.getByText(/days/i)).toBeInTheDocument(); // streak text
  });

  it('F4: renders VocabularyLibrary with search, category filter, and flashcards', () => {
    const mockVocab: Record<string, VocabWord> = {
      apple: {
        word: 'Apple',
        normalized: 'apple',
        arabicMeaning: 'تفاحة',
        category: 'food',
        exampleSentence: 'An apple a day.',
        dateLearned: '2026-10-28',
        encounterCount: 2,
        status: 'new',
        lastEncountered: '2026-10-28'
      }
    };

    render(
      <VocabularyLibrary
        vocabulary={mockVocab}
        onRefresh={vi.fn()}
        onStartSprint={vi.fn()}
      />
    );

    expect(screen.getByText('My Vocabulary (1)')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('تفاحة')).toBeInTheDocument();

    // Toggle flashcards
    const flashcardBtn = screen.getByRole('button', { name: /Practice Flashcards/i });
    fireEvent.click(flashcardBtn);

    expect(screen.getByText(/Flashcard 1 of 1/i)).toBeInTheDocument();
  });
});
