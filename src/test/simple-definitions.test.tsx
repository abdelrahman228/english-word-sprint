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

describe('Definition Ranking & Form-of / Register Filtering', () => {
  beforeEach(() => {
    clearApiCache();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  // (a) game -> "An activity done for enjoyment, often with rules."
  it('(a) selects "An activity done for enjoyment, often with rules." for "game" over shorter "Wild animals hunted for food or sport."', async () => {
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
                    'An activity done for enjoyment, often with rules.',
                  example: 'Children love playing this game.'
                },
                {
                  definition:
                    'Wild animals hunted for food or sport.'
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
      'An activity done for enjoyment, often with rules.'
    );
    expect(result.exampleSentence).toBe('Children love playing this game.');
    expect(result.definition).not.toBe('Wild animals hunted for food or sport.');
    expect(result.exampleSentence).not.toContain('securities game');
  });

  // (b) "Plural of gam." and "Synonym of work." are skipped when a real definition exists
  it('(b) skips form-of / reference definitions like "Plural of gam." and "Synonym of work." when real definition exists', () => {
    const definitions = [
      {
        definition: 'Plural of gam.'
      },
      {
        definition: 'An activity done for enjoyment, often with rules.',
        example: 'They played a board game.'
      },
      {
        definition: 'Synonym of work.'
      }
    ];

    const result = selectBestDefinition(definitions);
    expect(result.definition).toBe(
      'An activity done for enjoyment, often with rules.'
    );
    expect(result.example).toBe('They played a board game.');
  });

  // (c) all-skipped fallback
  it('(c) falls back to the first definition when all definitions are skipped (all-skipped fallback)', () => {
    const definitions = [
      {
        definition: 'Plural of gam.',
        example: 'Look at the gams.'
      },
      {
        definition: 'Synonym of work.'
      },
      {
        definition: '(obsolete) Joy, excitement, or revelry.'
      }
    ];

    const result = selectBestDefinition(definitions);
    expect(result.definition).toBe('Plural of gam.');
    expect(result.example).toBe('Look at the gams.');
  });

  // (d) definition order respected (first valid in range wins, not shortest)
  it('(d) respects original dictionary order: first valid in range [15, 120] wins, not shortest', () => {
    const definitions = [
      {
        definition: 'A contest played according to rules with a winner.', // 50 chars (in range [15, 120])
        example: 'The chess game ended in a draw.'
      },
      {
        definition: 'A game of chance.' // 17 chars (shorter, also in range [15, 120])
      }
    ];

    const result = selectBestDefinition(definitions);
    // Def 1 (50 chars) wins because it comes first in dictionary order, even though Def 2 (17 chars) is shorter
    expect(result.definition).toBe(
      'A contest played according to rules with a winner.'
    );
    expect(result.example).toBe('The chess game ended in a draw.');
  });

  it('skips parenthesized labels such as (slang), (obsolete), (archaic)', () => {
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

  it('skips definitions under 15 characters if a definition between 15 and 120 characters is available', () => {
    const definitions = [
      {
        definition: 'A short def.' // 12 characters (< 15)
      },
      {
        definition: 'A comprehensive explanation of the term.', // 40 characters (in range [15, 120])
        example: 'Here is an example.'
      }
    ];

    const result = selectBestDefinition(definitions);
    expect(result.definition).toBe('A comprehensive explanation of the term.');
    expect(result.example).toBe('Here is an example.');
  });

  it('takes the first remaining definition if none is in range [15, 120]', () => {
    const definitions = [
      {
        definition: 'A very long definition that provides extensive historical context and detailed linguistic etymology spanning multiple clauses well over one hundred and twenty characters in total length.'
      },
      {
        definition: 'Another very long definition that also provides extensive historical context and detailed linguistic etymology spanning multiple clauses well over one hundred and twenty characters in total length.'
      }
    ];

    const result = selectBestDefinition(definitions);
    expect(result.definition).toBe(
      'A very long definition that provides extensive historical context and detailed linguistic etymology spanning multiple clauses well over one hundred and twenty characters in total length.'
    );
  });

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
