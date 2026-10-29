import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  validateAnswer,
  selectBestDefinition,
  clearApiCache
} from '../services/validationService';
import {
  getVocabularyLibrary,
  saveLearnedWords,
  updateVocabStatus
} from '../services/storageService';
import { ResultsScreen } from '../components/ResultsScreen';
import { VocabularyLibrary } from '../components/VocabularyLibrary';
import type { GameHistoryItem, VocabWord } from '../types';

describe('Issue 1: Simple Definitions & Register Label Filtering', () => {
  beforeEach(() => {
    clearApiCache();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  // (a) "game" with a rare first definition and a simple later definition selects the simple one
  it('selects simple definition for "game" instead of rare securities/domain definition', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          word: 'game',
          meanings: [
            {
              partOfSpeech: 'noun',
              definitions: [
                {
                  definition:
                    '(nearly always singular) A field of gainful activity, as an industry or profession.',
                  example: "He's in the securities game somehow."
                },
                {
                  definition:
                    'An activity that one engages in for amusement or fun.',
                  example: 'Children love playing this game.'
                }
              ]
            }
          ]
        }
      ]
    } as unknown as Response);

    const result = await validateAnswer('game', 'noun', 'G', new Set());
    global.fetch = originalFetch;

    expect(result.status).toBe('valid');
    expect(result.definition).toBe(
      'An activity that one engages in for amusement or fun.'
    );
    expect(result.exampleSentence).toBe('Children love playing this game.');
    expect(result.exampleSentence).not.toContain('securities game');
  });

  // (b) labels like (slang)/(obsolete) are skipped
  it('skips definitions with labels like (slang), (obsolete), (archaic)', () => {
    const definitions = [
      {
        definition: '(slang) Skill or ability in romantic situations.',
        example: "He's got game."
      },
      {
        definition: '(obsolete) Joy, excitement, or revelry.'
      },
      {
        definition: 'A contest played according to rules with a winner.',
        example: 'The chess game ended in a draw.'
      }
    ];

    const result = selectBestDefinition(definitions);
    expect(result.definition).toBe(
      'A contest played according to rules with a winner.'
    );
    expect(result.example).toBe('The chess game ended in a draw.');
  });

  // (c) fallback when all are filtered
  it('falls back to the first definition when all definitions start with parenthesized labels', () => {
    const definitions = [
      {
        definition: '(slang) An exceptionally cool or admirable thing.',
        example: 'That car is game.'
      },
      {
        definition: '(rare) An archaic dialect expression for wild fowl.'
      }
    ];

    const result = selectBestDefinition(definitions);
    expect(result.definition).toBe(
      '(slang) An exceptionally cool or admirable thing.'
    );
    expect(result.example).toBe('That car is game.');
  });

  // (d) the part-of-speech match is still respected (verb gets the verb definition)
  it('respects requested part-of-speech: verb gets verb definition for "game"', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          word: 'game',
          meanings: [
            {
              partOfSpeech: 'noun',
              definitions: [
                {
                  definition: 'An activity that one engages in for amusement.'
                }
              ]
            },
            {
              partOfSpeech: 'verb',
              definitions: [
                {
                  definition: 'To play video games or games of chance.',
                  example: 'They game together every weekend.'
                }
              ]
            }
          ]
        }
      ]
    } as unknown as Response);

    const result = await validateAnswer('game', 'verb', 'G', new Set());
    global.fetch = originalFetch;

    expect(result.status).toBe('valid');
    expect(result.definition).toBe('To play video games or games of chance.');
    expect(result.exampleSentence).toBe('They game together every weekend.');
  });

  it('prefers the shortest clean definition under 120 characters', () => {
    const definitions = [
      {
        definition:
          'A very long definition that provides extensive historical context and detailed linguistic etymology spanning multiple clauses well over one hundred and twenty characters in total length.'
      },
      {
        definition: 'A brief definition.'
      },
      {
        definition: 'A medium-length definition describing an object.'
      }
    ];

    const result = selectBestDefinition(definitions);
    expect(result.definition).toBe('A brief definition.');
    expect(result.example).toBe('');
  });
});

describe('Issue 2: Vocabulary Mastery & Encounter Count Lifecycle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts as status "new" on first encounter and does NOT auto-promote on encounters 2 and 3', () => {
    const wordResult = {
      status: 'valid' as const,
      message: 'Verified!',
      pointsEarned: 10,
      word: 'Game',
      normalizedWord: 'game',
      category: 'noun' as const,
      definition: 'An activity for amusement.',
      exampleSentence: 'They played a game.'
    };

    // Encounter 1
    saveLearnedWords([wordResult]);
    let lib = getVocabularyLibrary();
    expect(lib['game']).toBeDefined();
    expect(lib['game'].encounterCount).toBe(1);
    expect(lib['game'].status).toBe('new');

    // Encounter 2 (played again in round 2)
    saveLearnedWords([wordResult]);
    lib = getVocabularyLibrary();
    expect(lib['game'].encounterCount).toBe(2);
    expect(lib['game'].status).toBe('new');

    // Encounter 3 (played again in round 3)
    saveLearnedWords([wordResult]);
    lib = getVocabularyLibrary();
    expect(lib['game'].encounterCount).toBe(3);
    expect(lib['game'].status).toBe('new');

    // Explicit user action: "Mark Mastered"
    updateVocabStatus('game', 'mastered');
    lib = getVocabularyLibrary();
    expect(lib['game'].status).toBe('mastered');
    expect(lib['game'].encounterCount).toBe(3);

    // Subsequent encounter 4 does NOT reset mastered back to new
    saveLearnedWords([wordResult]);
    lib = getVocabularyLibrary();
    expect(lib['game'].encounterCount).toBe(4);
    expect(lib['game'].status).toBe('mastered');
  });
});

describe('Input Pre-validation (Before Dictionary Calls)', () => {
  beforeEach(() => {
    clearApiCache();
  });

  it('rejects multi-word inputs with spaces for standard categories', async () => {
    const resNoun = await validateAnswer('ice cream', 'food', 'I', new Set());
    expect(resNoun.status).toBe('invalid');
    expect(resNoun.message).toBe('Please type one English word.');
    expect(resNoun.pointsEarned).toBe(0);

    const resAnimal = await validateAnswer('big dog', 'noun', 'B', new Set());
    expect(resAnimal.status).toBe('invalid');
    expect(resAnimal.message).toBe('Please type one English word.');
  });

  it('allows spaces for country_city category (e.g. "New York")', async () => {
    const resGeo = await validateAnswer('New York', 'country_city', 'N', new Set());
    // "New York" is in COUNTRIES_AND_CITIES, must be recognized and not rejected by pre-validation
    expect(resGeo.status).toBe('valid');
    expect(resGeo.normalizedWord).toBe('new york');
  });

  it('rejects single letter inputs with "Please type one English word."', async () => {
    const resA = await validateAnswer('a', 'noun', 'A', new Set());
    expect(resA.status).toBe('invalid');
    expect(resA.message).toBe('Please type one English word.');

    const resJ = await validateAnswer('j', 'verb', 'J', new Set());
    expect(resJ.status).toBe('invalid');
    expect(resJ.message).toBe('Please type one English word.');
  });

  it('rejects repeated single characters (e.g. "jjjj", "aaaa", "zz")', async () => {
    const resJ = await validateAnswer('jjjj', 'noun', 'J', new Set());
    expect(resJ.status).toBe('invalid');
    expect(resJ.message).toBe('Please type one English word.');

    const resA = await validateAnswer('aaaa', 'adjective', 'A', new Set());
    expect(resA.status).toBe('invalid');
    expect(resA.message).toBe('Please type one English word.');

    const resZ = await validateAnswer('zz', 'noun', 'Z', new Set());
    expect(resZ.status).toBe('invalid');
    expect(resZ.message).toBe('Please type one English word.');
  });

  it('rejects non-English characters (e.g. Arabic) with "Please type in English."', async () => {
    const resArabic = await validateAnswer('تفاحة', 'food', 'T', new Set());
    expect(resArabic.status).toBe('invalid');
    expect(resArabic.message).toBe('Please type in English.');
    expect(resArabic.message).not.toContain('starts with');

    const resCity = await validateAnswer('الرياض', 'country_city', 'R', new Set());
    expect(resCity.status).toBe('invalid');
    expect(resCity.message).toBe('Please type in English.');
  });

  it('allows hyphenated words and apostrophes', async () => {
    // Mock fetch for uncurated word checks so it doesn't wait for network timeout
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    } as unknown as Response);

    const usedWords = new Set<string>();
    const resHyphen = await validateAnswer('ice-cream', 'food', 'I', usedWords);
    expect(resHyphen.message).not.toBe('Please type one English word.');
    expect(resHyphen.message).not.toBe('Please type in English.');

    const resApos = await validateAnswer("don't", 'verb', 'D', usedWords);
    expect(resApos.message).not.toBe('Please type one English word.');
    expect(resApos.message).not.toBe('Please type in English.');

    global.fetch = originalFetch;
  });
});

describe('UI: "No example available" fallback display', () => {
  it('displays "No example available" in ResultsScreen when word has no example', () => {
    const mockGameHistoryItem: GameHistoryItem = {
      id: 'test-game',
      date: new Date().toISOString(),
      score: 10,
      duration: 60,
      difficulty: 'medium',
      roundsCompleted: 1,
      correctAnswers: 1,
      incorrectAnswers: 0,
      emptyAnswers: 0,
      newVocabCount: 1,
      accuracyPercent: 100,
      averageResponseTime: 5,
      rounds: [
        {
          
          letter: 'G',
          answers: { noun: 'game', verb: '', adjective: '', country_city: '', food: '' },
          results: {
            noun: {
              status: 'valid',
              message: 'Correct!',
              pointsEarned: 10,
              word: 'Game',
              normalizedWord: 'game',
              category: 'noun',
              arabicMeaning: 'لعبة',
              definition: 'An activity for amusement.',
              exampleSentence: '' // Empty example
            }
          },
          roundPoints: 10,
          allBonusEarned: false,
          timeSpentSeconds: 10
        }
      ]
    };

    render(
      <ResultsScreen
        gameRecord={mockGameHistoryItem}
        personalBest={20}
        onPlayAgain={() => {}}
        onBackToHome={() => {}}
        onViewVocabulary={() => {}}
      />
    );

    expect(screen.getByText('No example available')).toBeInTheDocument();
  });

  it('displays "No example available" in VocabularyLibrary when card has no example', () => {
    const mockVocabulary: Record<string, VocabWord> = {
      game: {
        word: 'Game',
        normalized: 'game',
        category: 'noun',
        arabicMeaning: 'لعبة',
        definition: 'An activity for amusement.',
        exampleSentence: '', // Empty example
        dateLearned: new Date().toISOString(),
        encounterCount: 1,
        status: 'new',
        lastEncountered: new Date().toISOString()
      }
    };

    render(
      <VocabularyLibrary
        vocabulary={mockVocabulary}
        onRefresh={() => {}}
        onStartSprint={() => {}}
      />
    );

    expect(screen.getByText('No example available')).toBeInTheDocument();
  });
});
