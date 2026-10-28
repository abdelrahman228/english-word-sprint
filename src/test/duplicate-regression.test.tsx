import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { GameScreen } from '../components/GameScreen';
import { getVocabularyLibrary } from '../services/storageService';
import type { GameHistoryItem, GameSettings } from '../types';

vi.mock('canvas-confetti', () => ({
  default: vi.fn()
}));

describe('Regression: Intra-round duplicates handling', () => {
  const defaultSettings: GameSettings = {
    duration: 60,
    difficulty: 'beginner',
    soundEnabled: false,
    speechEnabled: false,
    showHints: true
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    // Mock global fetch so no network calls occur
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));
  });

  it('1. Same word in two categories in one round scores 10 points total, and the second is shown as "duplicate"', async () => {
    // Force letter 'C' (index 2 in alphabet)
    vi.spyOn(Math, 'random').mockReturnValue(2 / 26);

    const onFinish = vi.fn();
    render(
      <GameScreen
        settings={defaultSettings}
        personalBest={50}
        onFinishGame={onFinish}
        onExitGame={vi.fn()}
      />
    );

    expect(document.getElementById('letter-display')?.textContent?.trim()).toBe('C');

    // Fill verb = 'clean', adjective = 'clean'
    const verbInput = document.getElementById('input-verb') as HTMLInputElement;
    const adjInput = document.getElementById('input-adjective') as HTMLInputElement;

    fireEvent.change(verbInput, { target: { value: 'clean' } });
    fireEvent.change(adjInput, { target: { value: 'clean' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Answers/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Score should be 10 points (not 20)
    const scoreVal = document.getElementById('score-display')?.textContent;
    expect(scoreVal).toContain('10');
    expect(scoreVal).not.toContain('20');

    // End game to inspect round history
    const endBtn = screen.getByRole('button', { name: /End Game/i });
    act(() => {
      fireEvent.click(endBtn);
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
    const gameRecord: GameHistoryItem = onFinish.mock.calls[0][0];
    const round1 = gameRecord.rounds[0];

    // Category order: noun, verb, adjective, country_city, food
    // First occurrence (verb) is valid
    expect(round1.results.verb.status).toBe('valid');
    expect(round1.results.verb.pointsEarned).toBe(10);

    // Second occurrence (adjective) is duplicate with 0 points
    expect(round1.results.adjective.status).toBe('duplicate');
    expect(round1.results.adjective.pointsEarned).toBe(0);
    expect(round1.results.adjective.message).toContain('already used');
  });

  it('2. Five valid UNIQUE words in one round = 55 points (50 + 5 bonus)', async () => {
    // Force letter 'A' (index 0)
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const onFinish = vi.fn();
    render(
      <GameScreen
        settings={defaultSettings}
        personalBest={100}
        onFinishGame={onFinish}
        onExitGame={vi.fn()}
      />
    );

    expect(document.getElementById('letter-display')?.textContent?.trim()).toBe('A');

    // 5 unique valid words
    fireEvent.change(document.getElementById('input-noun') as HTMLInputElement, { target: { value: 'Actor' } });
    fireEvent.change(document.getElementById('input-verb') as HTMLInputElement, { target: { value: 'Ask' } });
    fireEvent.change(document.getElementById('input-adjective') as HTMLInputElement, { target: { value: 'Amazing' } });
    fireEvent.change(document.getElementById('input-country_city') as HTMLInputElement, { target: { value: 'Australia' } });
    fireEvent.change(document.getElementById('input-food') as HTMLInputElement, { target: { value: 'Apple' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Answers/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Score should be exactly 55 pts (50 + 5 bonus)
    const scoreVal = document.getElementById('score-display')?.textContent;
    expect(scoreVal).toContain('55');

    // End game to inspect round history
    const endBtn = screen.getByRole('button', { name: /End Game/i });
    act(() => {
      fireEvent.click(endBtn);
    });

    const gameRecord: GameHistoryItem = onFinish.mock.calls[0][0];
    const round1 = gameRecord.rounds[0];
    expect(round1.allBonusEarned).toBe(true);
    expect(round1.roundPoints).toBe(55);
  });

  it('3. Five answers where two are the same word = no bonus', async () => {
    // Force letter 'A' (index 0)
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const onFinish = vi.fn();
    render(
      <GameScreen
        settings={defaultSettings}
        personalBest={100}
        onFinishGame={onFinish}
        onExitGame={vi.fn()}
      />
    );

    expect(document.getElementById('letter-display')?.textContent?.trim()).toBe('A');

    // 5 answers, but noun and food are both 'Apple'
    fireEvent.change(document.getElementById('input-noun') as HTMLInputElement, { target: { value: 'Apple' } });
    fireEvent.change(document.getElementById('input-verb') as HTMLInputElement, { target: { value: 'Ask' } });
    fireEvent.change(document.getElementById('input-adjective') as HTMLInputElement, { target: { value: 'Amazing' } });
    fireEvent.change(document.getElementById('input-country_city') as HTMLInputElement, { target: { value: 'Australia' } });
    fireEvent.change(document.getElementById('input-food') as HTMLInputElement, { target: { value: 'Apple' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Answers/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Score should be 40 pts (4 valid * 10, no 5 bonus)
    const scoreVal = document.getElementById('score-display')?.textContent;
    expect(scoreVal).toContain('40');
    expect(scoreVal).not.toContain('45');
    expect(scoreVal).not.toContain('55');

    // End game to inspect round history
    const endBtn = screen.getByRole('button', { name: /End Game/i });
    act(() => {
      fireEvent.click(endBtn);
    });

    const gameRecord: GameHistoryItem = onFinish.mock.calls[0][0];
    const round1 = gameRecord.rounds[0];
    expect(round1.allBonusEarned).toBe(false);
    expect(round1.roundPoints).toBe(40);
    // Noun is valid
    expect(round1.results.noun.status).toBe('valid');
    // Food is duplicate
    expect(round1.results.food.status).toBe('duplicate');
    expect(round1.results.food.pointsEarned).toBe(0);
  });

  it('4. The duplicate word is saved to vocabulary only once', async () => {
    // Force letter 'C' (index 2 in alphabet)
    vi.spyOn(Math, 'random').mockReturnValue(2 / 26);

    render(
      <GameScreen
        settings={defaultSettings}
        personalBest={50}
        onFinishGame={vi.fn()}
        onExitGame={vi.fn()}
      />
    );

    // Fill verb = 'clean', adjective = 'clean'
    fireEvent.change(document.getElementById('input-verb') as HTMLInputElement, { target: { value: 'clean' } });
    fireEvent.change(document.getElementById('input-adjective') as HTMLInputElement, { target: { value: 'clean' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Answers/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    const library = getVocabularyLibrary();
    expect(library['clean']).toBeDefined();
    expect(library['clean'].encounterCount).toBe(1);
    expect(Object.keys(library)).toHaveLength(1);
  });

  it('5. Same word in a LATER round is still a duplicate (existing behaviour)', async () => {
    // When Math.random returns 0:
    // Round 1 candidate list is full -> index 0 is 'A'
    // Round 2 avoids 'A' -> index 0 of [B, C, ...] is 'B'
    // Round 3 avoids 'B' -> index 0 of [A, C, ...] is 'A' again!
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const onFinish = vi.fn();
    render(
      <GameScreen
        settings={defaultSettings}
        personalBest={50}
        onFinishGame={onFinish}
        onExitGame={vi.fn()}
      />
    );

    // Initial round: letter A
    expect(document.getElementById('letter-display')?.textContent?.trim()).toBe('A');

    // Round 1: Enter Apple as food
    fireEvent.change(document.getElementById('input-food') as HTMLInputElement, { target: { value: 'Apple' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Submit Answers/i }));
    });

    // Score is 10
    expect(document.getElementById('score-display')?.textContent).toContain('10');

    // After submit, next round letter is 'B'
    expect(document.getElementById('letter-display')?.textContent?.trim()).toBe('B');

    // Skip letter 'B' to get back to letter 'A' in the next round
    const skipBtn = screen.getByRole('button', { name: /Skip Letter/i });
    fireEvent.click(skipBtn);
    expect(document.getElementById('letter-display')?.textContent?.trim()).toBe('A');

    // Later round (letter A again): Try entering 'Apple' again
    fireEvent.change(document.getElementById('input-food') as HTMLInputElement, { target: { value: 'Apple' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Submit Answers/i }));
    });

    // Score remains 10 (no points gained in this round)
    const scoreVal = document.getElementById('score-display')?.textContent;
    expect(scoreVal).toContain('10');
    expect(scoreVal).not.toContain('20');

    // End game and verify the later round status is 'duplicate'
    const endBtn = screen.getByRole('button', { name: /End Game/i });
    act(() => {
      fireEvent.click(endBtn);
    });

    const gameRecord: GameHistoryItem = onFinish.mock.calls[0][0];
    const lastRound = gameRecord.rounds[gameRecord.rounds.length - 1];
    expect(lastRound.results.food.status).toBe('duplicate');
    expect(lastRound.results.food.pointsEarned).toBe(0);
    expect(lastRound.results.food.message).toContain('already used');
  });
});
