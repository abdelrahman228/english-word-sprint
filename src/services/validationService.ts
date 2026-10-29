import type { AnswerValidationResult, Category } from '../types';
import {
  COUNTRIES_AND_CITIES,
  CURATED_WORDS,
  findCuratedWord
} from '../data/vocabularyDataset';
import type { WordEntry } from '../data/vocabularyDataset';
import {
  EXTENDED_ADJECTIVES,
  EXTENDED_FOODS,
  EXTENDED_NOUNS,
  EXTENDED_VERBS
} from '../data/extendedLexicon';

interface MeaningDetail {
  definition?: string;
  example?: string;
}

interface DictCacheEntry {
  valid: boolean;
  pos: string[];
  meaningsByPos: Record<string, MeaningDetail>;
}

// Cache for online dictionary queries
const API_CACHE = new Map<string, DictCacheEntry>();

export function clearApiCache(): void {
  API_CACHE.clear();
}

// Category readable names
const CATEGORY_NAMES: Record<Category, string> = {
  noun: 'noun',
  verb: 'verb',
  adjective: 'adjective',
  country_city: 'country or city',
  food: 'food or drink'
};

function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function normalizeInput(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Extract base form candidates for nouns (plural inflections only: -s, -es, -ies)
export function getNounCandidates(word: string): string[] {
  const candidates = [word];
  if (word.endsWith('ies') && word.length > 4) {
    candidates.push(word.slice(0, -3) + 'y'); // e.g. babies -> baby
  } else if (word.endsWith('es') && word.length > 3) {
    candidates.push(word.slice(0, -2)); // e.g. boxes -> box
    candidates.push(word.slice(0, -1)); // e.g. houses -> house
  } else if (word.endsWith('s') && word.length > 2 && !word.endsWith('ss')) {
    candidates.push(word.slice(0, -1)); // e.g. apples -> apple
  }
  return candidates;
}

// Extract base form candidates for verbs (-ing, -ed, 3rd person -s/-es/-ies)
export function getVerbCandidates(word: string): string[] {
  const candidates = [word];
  if (word.endsWith('ing') && word.length > 4) {
    candidates.push(word.slice(0, -3)); // e.g. walking -> walk
    candidates.push(word.slice(0, -3) + 'e'); // e.g. dancing -> dance
    if (word.length > 5 && word[word.length - 4] === word[word.length - 5]) {
      candidates.push(word.slice(0, -4)); // e.g. running -> run
    }
  }
  if (word.endsWith('ied') && word.length > 4) {
    candidates.push(word.slice(0, -3) + 'y'); // e.g. hurried -> hurry
  } else if (word.endsWith('ed') && word.length > 3) {
    candidates.push(word.slice(0, -2)); // e.g. walked -> walk
    candidates.push(word.slice(0, -1)); // e.g. danced -> dance
  }
  if (word.endsWith('ies') && word.length > 4) {
    candidates.push(word.slice(0, -3) + 'y'); // e.g. cries -> cry
  } else if (word.endsWith('es') && word.length > 4) {
    candidates.push(word.slice(0, -2)); // e.g. watches -> watch
  } else if (word.endsWith('s') && word.length > 2 && !word.endsWith('ss')) {
    candidates.push(word.slice(0, -1)); // e.g. runs -> run
  }
  return candidates;
}

const FORM_OF_PREFIXES = [
  'plural of',
  'alternative form of',
  'alternative spelling of',
  'synonym of',
  'obsolete form of',
  'past tense of',
  'present participle of',
  'third-person singular of',
  'misspelling of',
  'initialism of',
  'abbreviation of',
  'comparative form of',
  'superlative form of',
  'see '
];

function isFormOfOrReference(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return FORM_OF_PREFIXES.some(prefix => lower.startsWith(prefix));
}

export function selectBestDefinition(
  definitions: Array<{ definition?: string; example?: string }>
): MeaningDetail {
  if (!definitions || definitions.length === 0) {
    return { definition: '', example: '' };
  }

  // Skip definitions that start with a parenthesized label e.g. (nearly always singular), (slang), (obsolete), etc.
  const parenthesizedLabelRegex = /^\s*\([^)]{1,60}\)/;

  // 1. Skip parenthesized labels and form-of / reference definitions
  const cleanCandidates = definitions.filter(d => {
    const text = (d.definition || '').trim();
    if (text.length === 0) return false;
    if (parenthesizedLabelRegex.test(text)) return false;
    if (isFormOfOrReference(text)) return false;
    return true;
  });

  let chosen: { definition?: string; example?: string } | undefined;

  if (cleanCandidates.length > 0) {
    // 2. Prefer definitions in original order: first remaining definition between 15 and 120 characters
    const inRange = cleanCandidates.find(d => {
      const len = (d.definition || '').trim().length;
      return len >= 15 && len <= 120;
    });
    // Only if none is in that range, take the first remaining one
    chosen = inRange || cleanCandidates[0];
  } else {
    // All-skipped fallback: use them only as a last-resort fallback
    const defWithEx = definitions.find(d => d.example && d.example.trim().length > 0);
    chosen = defWithEx || definitions[0];
  }

  const definition = (chosen?.definition || '').trim();
  const rawExample = (chosen?.example || '').trim();

  // 3. Use the dictionary example only if it belongs to the chosen definition and is natural
  const isNatural =
    rawExample.length > 0 &&
    !rawExample.includes('${') &&
    rawExample !== definition;

  return {
    definition,
    example: isNatural ? rawExample : ''
  };
}

// Fetch dictionary data via Free Dictionary API with timeout
async function fetchDictionaryData(word: string): Promise<DictCacheEntry | null> {
  const cached = API_CACHE.get(word);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 404) {
        const notFound: DictCacheEntry = { valid: false, pos: [], meaningsByPos: {} };
        API_CACHE.set(word, notFound);
        return notFound;
      }
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      const notFound: DictCacheEntry = { valid: false, pos: [], meaningsByPos: {} };
      API_CACHE.set(word, notFound);
      return notFound;
    }

    const posSet = new Set<string>();
    const defsByPos: Record<string, Array<{ definition?: string; example?: string }>> = {};

    for (const entry of data) {
      if (Array.isArray(entry.meanings)) {
        for (const m of entry.meanings) {
          const posKey = m.partOfSpeech ? m.partOfSpeech.toLowerCase() : '';
          if (posKey) {
            posSet.add(posKey);
            if (!defsByPos[posKey]) {
              defsByPos[posKey] = [];
            }
            if (Array.isArray(m.definitions)) {
              defsByPos[posKey].push(...m.definitions);
            }
          }
        }
      }
    }

    const meaningsByPos: Record<string, MeaningDetail> = {};
    for (const [posKey, defs] of Object.entries(defsByPos)) {
      meaningsByPos[posKey] = selectBestDefinition(defs);
    }

    const result: DictCacheEntry = {
      valid: true,
      pos: Array.from(posSet),
      meaningsByPos
    };

    API_CACHE.set(word, result);
    return result;
  } catch {
    // Network or timeout failure
    return null;
  }
}

export async function validateAnswer(
  rawInput: string,
  category: Category,
  requiredLetter: string,
  usedWordsInGame: Set<string>
): Promise<AnswerValidationResult> {
  const normalized = normalizeInput(rawInput);
  const letter = requiredLetter.toLowerCase();

  // 1. Empty Check
  if (!normalized) {
    return {
      status: 'empty',
      message: 'No answer entered.',
      pointsEarned: 0,
      word: '',
      normalizedWord: '',
      category
    };
  }

  // Pre-validation checks before letter and dictionary checks
  // Non-English characters (e.g. Arabic, Cyrillic, etc.)
  if (/[^a-z\s'-]/i.test(normalized)) {
    return {
      status: 'invalid',
      message: 'Please type in English.',
      pointsEarned: 0,
      word: rawInput.trim(),
      normalizedWord: normalized,
      category
    };
  }

  // Multi-word with spaces (except country_city e.g. "New York")
  if (category !== 'country_city' && normalized.includes(' ')) {
    return {
      status: 'invalid',
      message: 'Please type one English word.',
      pointsEarned: 0,
      word: rawInput.trim(),
      normalizedWord: normalized,
      category
    };
  }

  // Single letter (length <= 1)
  if (normalized.length <= 1) {
    return {
      status: 'invalid',
      message: 'Please type one English word.',
      pointsEarned: 0,
      word: rawInput.trim(),
      normalizedWord: normalized,
      category
    };
  }

  // Repeated single character (e.g. "jjjj")
  if (/^(.)\1+$/i.test(normalized)) {
    return {
      status: 'invalid',
      message: 'Please type one English word.',
      pointsEarned: 0,
      word: rawInput.trim(),
      normalizedWord: normalized,
      category
    };
  }

  const capitalized = capitalize(normalized);

  // 2. Letter Check
  if (!normalized.startsWith(letter)) {
    const actualFirstLetter = normalized.charAt(0).toUpperCase();
    return {
      status: 'invalid',
      message: `"${capitalized}" starts with ${actualFirstLetter}, but the required letter is ${requiredLetter.toUpperCase()}.`,
      pointsEarned: 0,
      word: rawInput.trim(),
      normalizedWord: normalized,
      category
    };
  }

  // 3. Duplicate in Current Game Check
  if (usedWordsInGame.has(normalized)) {
    return {
      status: 'duplicate',
      message: `You have already used "${capitalized}" in this game.`,
      pointsEarned: 0,
      word: rawInput.trim(),
      normalizedWord: normalized,
      category
    };
  }

  // 4. Local Curated Match (Highest fidelity with Arabic, definition, example)
  const curated = findCuratedWord(normalized, category);
  if (curated) {
    return {
      status: 'valid',
      message: `"${curated.word}" is a verified ${CATEGORY_NAMES[category]}! (+10 pts)`,
      pointsEarned: 10,
      word: curated.word,
      normalizedWord: normalized,
      category,
      isNewWord: true,
      arabicMeaning: curated.arabicMeaning,
      definition: curated.definition,
      exampleSentence: curated.exampleSentence,
      difficulty: curated.difficulty
    };
  }

  // 5. Category-Specific Validation
  // 5a. Country / City
  if (category === 'country_city') {
    const geoEntry = COUNTRIES_AND_CITIES[normalized];
    if (geoEntry) {
      return {
        status: 'valid',
        message: `"${capitalized}" is a recognized ${geoEntry.type}! (+10 pts)`,
        pointsEarned: 10,
        word: capitalized,
        normalizedWord: normalized,
        category,
        isNewWord: true,
        arabicMeaning: geoEntry.arabic,
        definition: `A recognized world ${geoEntry.type}.`
      };
    }

    // Try stripping "the " (e.g. "the gambia")
    if (normalized.startsWith('the ')) {
      const trimmed = normalized.replace(/^the\s+/, '');
      const subGeo = COUNTRIES_AND_CITIES[trimmed];
      if (subGeo) {
        return {
          status: 'valid',
          message: `"${capitalized}" is a recognized ${subGeo.type}! (+10 pts)`,
          pointsEarned: 10,
          word: capitalized,
          normalizedWord: normalized,
          category,
          isNewWord: true,
          arabicMeaning: subGeo.arabic,
          definition: `A recognized world ${subGeo.type}.`
        };
      }
    }

    return {
      status: 'invalid',
      message: `"${capitalized}" is not recognized as a country or major world city.`,
      pointsEarned: 0,
      word: rawInput.trim(),
      normalizedWord: normalized,
      category
    };
  }

  // 5b. Food
  if (category === 'food') {
    if (EXTENDED_FOODS.has(normalized)) {
      return {
        status: 'valid',
        message: `"${capitalized}" is a recognized food or drink! (+10 pts)`,
        pointsEarned: 10,
        word: capitalized,
        normalizedWord: normalized,
        category,
        isNewWord: true
      };
    }
  }

  // 5c. Noun
  if (category === 'noun') {
    const candidates = getNounCandidates(normalized);
    for (const cand of candidates) {
      if (EXTENDED_NOUNS.has(cand)) {
        return {
          status: 'valid',
          message: `"${capitalized}" is a recognized noun! (+10 pts)`,
          pointsEarned: 10,
          word: capitalized,
          normalizedWord: normalized,
          category,
          isNewWord: true,
          definition: 'A person, place, thing, or idea.'
        };
      }
    }
  }

  // 5d. Verb
  if (category === 'verb') {
    const candidates = getVerbCandidates(normalized);
    for (const cand of candidates) {
      if (EXTENDED_VERBS.has(cand)) {
        return {
          status: 'valid',
          message: `"${capitalized}" is a recognized verb! (+10 pts)`,
          pointsEarned: 10,
          word: capitalized,
          normalizedWord: normalized,
          category,
          isNewWord: true,
          definition: 'An action or state word.'
        };
      }
    }
  }

  // 5e. Adjective
  if (category === 'adjective') {
    if (EXTENDED_ADJECTIVES.has(normalized)) {
      return {
        status: 'valid',
        message: `"${capitalized}" is a recognized adjective! (+10 pts)`,
        pointsEarned: 10,
        word: capitalized,
        normalizedWord: normalized,
        category,
        isNewWord: true,
        definition: 'A word describing a noun.'
      };
    }
  }

  // 6. Online Dictionary Fallback & Deep POS Check
  const dictData = await fetchDictionaryData(normalized);

  if (dictData) {
    if (!dictData.valid) {
      return {
        status: 'invalid',
        message: `"${capitalized}" does not appear to be a recognized English word or is misspelled.`,
        pointsEarned: 0,
        word: rawInput.trim(),
        normalizedWord: normalized,
        category
      };
    }

    const { pos, meaningsByPos } = dictData;

    if (category === 'noun' && pos.includes('noun')) {
      const detail = meaningsByPos['noun'] || {};
      return {
        status: 'valid',
        message: `"${capitalized}" is verified as a noun! (+10 pts)`,
        pointsEarned: 10,
        word: capitalized,
        normalizedWord: normalized,
        category,
        isNewWord: true,
        definition: detail.definition || 'A recognized English noun.',
        exampleSentence: detail.example || undefined
      };
    }

    const isVerb = pos.includes('verb') || pos.includes('transitive verb') || pos.includes('intransitive verb');
    if (category === 'verb' && isVerb) {
      const detail = meaningsByPos['verb'] || meaningsByPos['transitive verb'] || meaningsByPos['intransitive verb'] || {};
      return {
        status: 'valid',
        message: `"${capitalized}" is verified as a verb! (+10 pts)`,
        pointsEarned: 10,
        word: capitalized,
        normalizedWord: normalized,
        category,
        isNewWord: true,
        definition: detail.definition || 'A recognized English action word.',
        exampleSentence: detail.example || undefined
      };
    }

    if (category === 'adjective' && pos.includes('adjective')) {
      const detail = meaningsByPos['adjective'] || {};
      return {
        status: 'valid',
        message: `"${capitalized}" is verified as an adjective! (+10 pts)`,
        pointsEarned: 10,
        word: capitalized,
        normalizedWord: normalized,
        category,
        isNewWord: true,
        definition: detail.definition || 'A recognized English descriptive word.',
        exampleSentence: detail.example || undefined
      };
    }

    if (category === 'food') {
      const nounDetail = meaningsByPos['noun'] || {};
      const defLower = (nounDetail.definition || '').toLowerCase();
      const isFoodDef =
        defLower.includes('food') ||
        defLower.includes('edible') ||
        defLower.includes('fruit') ||
        defLower.includes('vegetable') ||
        defLower.includes('meat') ||
        defLower.includes('dish') ||
        defLower.includes('drink') ||
        defLower.includes('beverage') ||
        defLower.includes('culinary') ||
        defLower.includes('plant') ||
        defLower.includes('herb') ||
        defLower.includes('spice') ||
        defLower.includes('cereal') ||
        defLower.includes('pastry');

      if (pos.includes('noun') && isFoodDef) {
        return {
          status: 'valid',
          message: `"${capitalized}" is verified as food! (+10 pts)`,
          pointsEarned: 10,
          word: capitalized,
          normalizedWord: normalized,
          category,
          isNewWord: true,
          definition: nounDetail.definition,
          exampleSentence: nounDetail.example || undefined
        };
      }
    }

    // Word exists, but wrong category
    const posListStr = pos.length > 0 ? pos.join(', ') : 'unknown part of speech';
    return {
      status: 'invalid',
      message: `"${capitalized}" is a recognized English word, but does not appear to be a ${CATEGORY_NAMES[category]} (found: ${posListStr}).`,
      pointsEarned: 0,
      word: rawInput.trim(),
      normalizedWord: normalized,
      category
    };
  }

  // 7. Network / Dictionary Service Unavailable Fallback (Bug 1 Fix: 'review' status)
  return {
    status: 'review',
    message: `Could not verify "${capitalized}" (offline / dictionary unavailable). Needs review. (0 pts)`,
    pointsEarned: 0,
    word: rawInput.trim(),
    normalizedWord: normalized,
    category
  };
}

export interface PartialHint {
  wordLength: number;
  pattern: string; // e.g. "Ap _ _ _"
  category: Category;
  arabicMeaning: string;
  definition: string;
  firstLetters: string;
}

// Generate category partial hint for Beginner / Intermediate mode (Bug 8 Fix)
export function getCategoryPartialHint(category: Category, letter: string): PartialHint | null {
  const matches = CURATED_WORDS.filter(
    w => w.category === category && w.word.toUpperCase().startsWith(letter.toUpperCase())
  );
  if (matches.length === 0) return null;
  const picked = matches[Math.floor(Math.random() * matches.length)];
  const w = picked.word;
  const prefixLen = Math.min(2, w.length);
  const firstLetters = w.slice(0, prefixLen);
  const blanks = '_ '.repeat(Math.max(0, w.length - prefixLen)).trim();
  const pattern = blanks.length > 0 ? `${firstLetters} ${blanks}` : firstLetters;

  return {
    wordLength: w.length,
    pattern,
    category,
    arabicMeaning: picked.arabicMeaning,
    definition: picked.definition,
    firstLetters
  };
}

// Backward compatibility helper if needed
export function getCategoryHint(category: Category, letter: string): WordEntry | null {
  const matches = CURATED_WORDS.filter(
    w => w.category === category && w.word.toUpperCase().startsWith(letter.toUpperCase())
  );
  if (matches.length === 0) return null;
  return matches[Math.floor(Math.random() * matches.length)];
}
