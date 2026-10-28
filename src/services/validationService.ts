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

// Cache for online dictionary queries
const API_CACHE = new Map<string, { valid: boolean; pos: string[]; definition?: string; example?: string }>();

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

// Extract base form simple heuristic for common verb inflections (e.g. running -> run, played -> play)
function getBaseCandidates(word: string): string[] {
  const candidates = [word];
  if (word.endsWith('ing') && word.length > 4) {
    candidates.push(word.slice(0, -3));
    if (word.length > 5 && word[word.length - 4] === word[word.length - 5]) {
      candidates.push(word.slice(0, -4)); // e.g. running -> run
    }
  }
  if (word.endsWith('ed') && word.length > 3) {
    candidates.push(word.slice(0, -2));
    candidates.push(word.slice(0, -1)); // e.g. danced -> dance
  }
  if (word.endsWith('s') && word.length > 3) {
    candidates.push(word.slice(0, -1));
    if (word.endsWith('es') && word.length > 4) {
      candidates.push(word.slice(0, -2));
    }
  }
  return candidates;
}

// Fetch dictionary data via Free Dictionary API with timeout
async function fetchDictionaryData(word: string): Promise<{ valid: boolean; pos: string[]; definition?: string; example?: string } | null> {
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
        const notFound = { valid: false, pos: [] };
        API_CACHE.set(word, notFound);
        return notFound;
      }
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      const notFound = { valid: false, pos: [] };
      API_CACHE.set(word, notFound);
      return notFound;
    }

    const posSet = new Set<string>();
    let definition = '';
    let example = '';

    for (const entry of data) {
      if (Array.isArray(entry.meanings)) {
        for (const m of entry.meanings) {
          if (m.partOfSpeech) {
            posSet.add(m.partOfSpeech.toLowerCase());
          }
          if (!definition && Array.isArray(m.definitions) && m.definitions.length > 0) {
            definition = m.definitions[0].definition || '';
            example = m.definitions[0].example || '';
          }
        }
      }
    }

    const result = {
      valid: true,
      pos: Array.from(posSet),
      definition,
      example
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
        definition: `A recognized world ${geoEntry.type}.`,
        exampleSentence: `${capitalized} is known for its unique culture and landmarks.`
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
          definition: `A recognized world ${subGeo.type}.`,
          exampleSentence: `${capitalized} is a celebrated geographic location.`
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
        isNewWord: true,
        exampleSentence: `People enjoy eating ${normalized}.`
      };
    }
  }

  // 5c. Noun
  if (category === 'noun') {
    const candidates = getBaseCandidates(normalized);
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
          definition: 'A person, place, thing, or idea.',
          exampleSentence: `The ${normalized} was clearly visible.`
        };
      }
    }
  }

  // 5d. Verb
  if (category === 'verb') {
    const candidates = getBaseCandidates(normalized);
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
          definition: 'An action or state word.',
          exampleSentence: `They decided to ${cand} together.`
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
        definition: 'A word describing a noun.',
        exampleSentence: `It was a truly ${normalized} experience.`
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

    const { pos, definition, example } = dictData;

    if (category === 'noun' && pos.includes('noun')) {
      return {
        status: 'valid',
        message: `"${capitalized}" is verified as a noun! (+10 pts)`,
        pointsEarned: 10,
        word: capitalized,
        normalizedWord: normalized,
        category,
        isNewWord: true,
        definition: definition || 'A recognized English noun.',
        exampleSentence: example || `A notable example of ${normalized}.`
      };
    }

    if (category === 'verb' && (pos.includes('verb') || pos.includes('transitive verb') || pos.includes('intransitive verb'))) {
      return {
        status: 'valid',
        message: `"${capitalized}" is verified as a verb! (+10 pts)`,
        pointsEarned: 10,
        word: capitalized,
        normalizedWord: normalized,
        category,
        isNewWord: true,
        definition: definition || 'A recognized English action word.',
        exampleSentence: example || `To ${normalized} with purpose.`
      };
    }

    if (category === 'adjective' && pos.includes('adjective')) {
      return {
        status: 'valid',
        message: `"${capitalized}" is verified as an adjective! (+10 pts)`,
        pointsEarned: 10,
        word: capitalized,
        normalizedWord: normalized,
        category,
        isNewWord: true,
        definition: definition || 'A recognized English descriptive word.',
        exampleSentence: example || `Described as ${normalized}.`
      };
    }

    if (category === 'food') {
      const defLower = (definition || '').toLowerCase();
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
          definition,
          exampleSentence: example || `Fresh ${normalized} is eaten with pleasure.`
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

  // 7. Network / Dictionary Service Unavailable Fallback
  return {
    status: 'invalid',
    message: `Could not verify "${capitalized}" as a valid ${CATEGORY_NAMES[category]}. Check your spelling or try another word.`,
    pointsEarned: 0,
    word: rawInput.trim(),
    normalizedWord: normalized,
    category
  };
}

// Generate category hint for Beginner / Intermediate mode
export function getCategoryHint(category: Category, letter: string): WordEntry | null {
  const matches = CURATED_WORDS.filter(
    w => w.category === category && w.word.toUpperCase().startsWith(letter.toUpperCase())
  );
  if (matches.length === 0) return null;
  // Return random match from curated list
  return matches[Math.floor(Math.random() * matches.length)];
}
