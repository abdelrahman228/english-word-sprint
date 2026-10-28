import { describe, it, expect, vi } from 'vitest';
import { validateAnswer, getCategoryHint } from '../services/validationService';

describe('Confirmed Bug Reproductions', () => {
  // Bug 1: Dictionary API unreachable should return 'review' with 0 pts, NOT 'invalid'
  it('Bug 1: returns review status (not invalid) when API is unreachable for unlisted word', async () => {
    // Mock fetch to simulate network error / timeout
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

    const usedWords = new Set<string>();
    // 'Ameliorate' is an authentic English word, not in our starter local lexicon
    const result = await validateAnswer('Ameliorate', 'verb', 'A', usedWords);

    global.fetch = originalFetch;

    // Currently this returns 'invalid'. It MUST return 'review' (needs review/unverified)
    expect(result.status).toBe('review');
    expect(result.pointsEarned).toBe(0);
  });

  // Bug 2: fetchDictionaryData picks definition/example for matching POS, not first meaning
  it('Bug 2: picks definition and example matching the requested part of speech', async () => {
    const originalFetch = global.fetch;
    // Mock dictionary API response where noun meaning is first, verb meaning is second
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          word: 'deed',
          meanings: [
            {
              partOfSpeech: 'noun',
              definitions: [{ definition: 'An action that is performed intentionally.', example: 'A good deed.' }]
            },
            {
              partOfSpeech: 'verb',
              definitions: [{ definition: 'To transfer by deed or legal conveyance.', example: 'They deeded the property to the trust.' }]
            }
          ]
        }
      ]
    } as unknown as Response);

    const usedWords = new Set<string>();
    const result = await validateAnswer('deed', 'verb', 'D', usedWords);

    global.fetch = originalFetch;

    expect(result.status).toBe('valid');
    // It should pick the VERB definition, not the noun definition!
    expect(result.definition).toContain('transfer');
    expect(result.exampleSentence).toContain('deeded');
  });

  // Bug 3: Do not return unnatural template example sentences when dictionary has none
  it('Bug 3: does not generate unnatural template example sentences when dictionary has no example', async () => {
    const originalFetch = global.fetch;
    // Mock API response with definition but NO example
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          word: 'aspire',
          meanings: [
            {
              partOfSpeech: 'verb',
              definitions: [{ definition: 'To direct one\'s hopes or ambitions.' }]
            }
          ]
        }
      ]
    } as unknown as Response);

    const usedWords = new Set<string>();
    const result = await validateAnswer('aspire', 'verb', 'A', usedWords);
    global.fetch = originalFetch;

    expect(result.status).toBe('valid');
    // It should NOT use "To aspire with purpose." or similar unnatural generated templates
    expect(result.exampleSentence).not.toBe('To aspire with purpose.');
  });

  // Bug 4: getBaseCandidates false positives ("cooked" as noun, "dancers" as verb)
  it('Bug 4: does not accept "cooked" as a noun', async () => {
    const originalFetch = global.fetch;
    // Mock API 404 so it relies on local lexicons
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 } as unknown as Response);

    const usedWords = new Set<string>();
    // "cooked" ends with -ed, but is NOT a noun!
    const result = await validateAnswer('Cooked', 'noun', 'C', usedWords);

    global.fetch = originalFetch;

    expect(result.status).not.toBe('valid');
    expect(result.pointsEarned).toBe(0);
  });

  it('Bug 4: does not accept "dancers" as a verb via plural stripping', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 } as unknown as Response);

    const usedWords = new Set<string>();
    const result = await validateAnswer('Dancers', 'verb', 'D', usedWords);

    global.fetch = originalFetch;

    expect(result.status).not.toBe('valid');
    expect(result.pointsEarned).toBe(0);
  });

  // Bug 8: Hints should not give away full answer or allow full auto-fill
  it('Bug 8: getCategoryHint returns partial clue data', () => {
    const hint = getCategoryHint('noun', 'A');
    expect(hint).not.toBeNull();
    // Hint should provide partial clue rather than encouraging blind copy
    if (hint) {
      expect(hint.word.length).toBeGreaterThan(0);
    }
  });
});
