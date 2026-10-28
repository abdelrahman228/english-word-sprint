import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  SkipForward,
  RotateCcw,
  StopCircle,
  Timer as TimerIcon,
  Award,
  Zap,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Lightbulb
} from 'lucide-react';
import type {
  AnswerValidationResult,
  Category,
  CategoryInfo,
  GameHistoryItem,
  GameSettings,
  RoundAnswers,
  RoundHistory,
  RoundResults
} from '../types';
import { CATEGORIES_CONFIG } from '../data/vocabularyDataset';
import type { WordEntry } from '../data/vocabularyDataset';
import { CategoryInput } from './CategoryInput';
import { getCategoryHint, validateAnswer } from '../services/validationService';
import { soundService } from '../services/soundService';
import { saveLearnedWords, savePersonalBest } from '../services/storageService';
import confetti from 'canvas-confetti';

interface GameScreenProps {
  settings: GameSettings;
  personalBest: number;
  onFinishGame: (gameRecord: GameHistoryItem) => void;
  onExitGame: () => void;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Helpful English vocabulary tips rotated during gameplay
const LEARNING_TIPS = [
  'Tip: Nouns are naming words (people, places, things). Verbs are action words!',
  'Tip: Capitalization does not matter — "Apple" and "apple" are scored the same.',
  'Tip: If you cannot think of a word, leave the box empty — there is no penalty!',
  'Tip: You can use the Skip button to jump to an easier letter at any time.',
  'Tip: Get all 5 categories right in a single round for a +5 point bonus!',
  'Tip: Listen to native pronunciations in your "My Vocabulary" library.',
  'Tip: Use Tab or Enter to quickly jump to the next category input.'
];

export const GameScreen: React.FC<GameScreenProps> = ({
  settings,
  personalBest,
  onFinishGame,
  onExitGame
}) => {
  // Timer State
  const [timeLeft, setTimeLeft] = useState<number>(settings.duration);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Round State
  const [currentLetter, setCurrentLetter] = useState<string>('A');
  const [answers, setAnswers] = useState<RoundAnswers>({
    noun: '',
    verb: '',
    adjective: '',
    country_city: '',
    food: ''
  });
  const [lastResults, setLastResults] = useState<RoundResults | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Active Hint Modal / Notification
  const [currentHint, setCurrentHint] = useState<WordEntry | null>(null);

  // Game Statistics Accumulated Across Rounds
  const [totalScore, setTotalScore] = useState<number>(0);
  const [completedRounds, setCompletedRounds] = useState<number>(0);
  const [totalCorrectAnswers, setTotalCorrectAnswers] = useState<number>(0);
  const [totalIncorrectAnswers, setTotalIncorrectAnswers] = useState<number>(0);
  const [totalEmptyAnswers, setTotalEmptyAnswers] = useState<number>(0);
  const [usedWordsInGame, setUsedWordsInGame] = useState<Set<string>>(new Set());
  const [gameRoundsHistory, setGameRoundsHistory] = useState<RoundHistory[]>([]);
  const [newVocabCollected, setNewVocabCollected] = useState<number>(0);

  // Inputs reference array for auto-focus navigation
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Random letter picker ensuring no consecutive duplicate
  const pickRandomLetter = useCallback((avoidLetter?: string): string => {
    // Weigh common letters slightly higher for beginner
    const candidates = LETTERS.filter(l => l !== avoidLetter);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }, []);

  // Initialize first letter
  useEffect(() => {
    const firstLetter = pickRandomLetter();
    setCurrentLetter(firstLetter);
  }, [pickRandomLetter]);

  // End Game handler
  const handleEndGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsGameOver(true);
    soundService.playGameOver();

    // Calculate final metrics
    const totalAnswersAttempted = totalCorrectAnswers + totalIncorrectAnswers;
    const accuracy = totalAnswersAttempted > 0
      ? Math.round((totalCorrectAnswers / totalAnswersAttempted) * 100)
      : 0;

    const timeElapsed = settings.duration - timeLeft;
    const avgResponseTime = completedRounds > 0
      ? Math.round((timeElapsed / completedRounds) * 10) / 10
      : 0;

    // Check personal best
    if (totalScore > personalBest) {
      savePersonalBest(totalScore);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    const gameRecord: GameHistoryItem = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      score: totalScore,
      duration: settings.duration,
      difficulty: settings.difficulty,
      roundsCompleted: completedRounds,
      correctAnswers: totalCorrectAnswers,
      incorrectAnswers: totalIncorrectAnswers,
      emptyAnswers: totalEmptyAnswers,
      newVocabCount: newVocabCollected,
      accuracyPercent: accuracy,
      averageResponseTime: avgResponseTime,
      rounds: gameRoundsHistory
    };

    onFinishGame(gameRecord);
  }, [
    completedRounds,
    gameRoundsHistory,
    newVocabCollected,
    onFinishGame,
    personalBest,
    settings.difficulty,
    settings.duration,
    timeLeft,
    totalCorrectAnswers,
    totalEmptyAnswers,
    totalIncorrectAnswers,
    totalScore
  ]);

  // Main Countdown Timer Effect
  useEffect(() => {
    if (isGameOver) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        if (prev <= 10) {
          soundService.playTick(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameOver]);

  // Trigger end when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && !isGameOver) {
      handleEndGame();
    }
  }, [timeLeft, isGameOver, handleEndGame]);

  // Focus the first input field on new letter
  const focusFirstInput = () => {
    setTimeout(() => {
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 60);
  };

  // Keyboard navigation: Enter moves to next input, or submits if on last input
  const handleEnterNext = (currentIndex: number) => {
    if (currentIndex < CATEGORIES_CONFIG.length - 1) {
      const nextInput = inputRefs.current[currentIndex + 1];
      if (nextInput) {
        nextInput.focus();
      }
    } else {
      // Last category: submit the round!
      handleSubmitRound();
    }
  };

  // Handle Input Changes
  const handleAnswerChange = (category: Category, value: string) => {
    setAnswers(prev => ({ ...prev, [category]: value }));
  };

  // Clear inputs for current round
  const handleClearAnswers = () => {
    setAnswers({
      noun: '',
      verb: '',
      adjective: '',
      country_city: '',
      food: ''
    });
    setLastResults(null);
    focusFirstInput();
  };

  // Skip Letter
  const handleSkipLetter = () => {
    if (isGameOver || timeLeft <= 0) return;
    const nextLetter = pickRandomLetter(currentLetter);
    setCurrentLetter(nextLetter);
    handleClearAnswers();
    setCurrentHint(null);
  };

  // Submit Round Answers
  const handleSubmitRound = async () => {
    if (isValidating || isGameOver || timeLeft <= 0) return;

    setIsValidating(true);
    const roundResults: Partial<RoundResults> = {};
    const validEntriesForStorage: AnswerValidationResult[] = [];
    const updatedUsedWords = new Set(usedWordsInGame);

    let roundPoints = 0;
    let validCount = 0;
    let roundCorrect = 0;
    let roundIncorrect = 0;
    let roundEmpty = 0;

    // Validate each category asynchronously
    for (const cat of CATEGORIES_CONFIG) {
      const val = answers[cat.id];
      const res = await validateAnswer(val, cat.id, currentLetter, updatedUsedWords);
      roundResults[cat.id] = res;

      if (res.status === 'valid') {
        roundPoints += res.pointsEarned;
        validCount++;
        roundCorrect++;
        if (res.normalizedWord) {
          updatedUsedWords.add(res.normalizedWord);
        }
        validEntriesForStorage.push(res);
      } else if (res.status === 'empty') {
        roundEmpty++;
      } else {
        roundIncorrect++;
      }
    }

    // All 5 Bonus: +5 extra points
    const allBonusEarned = validCount === 5;
    if (allBonusEarned) {
      roundPoints += 5;
      soundService.playBonus();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } else if (validCount > 0) {
      soundService.playCorrect();
    } else {
      soundService.playIncorrect();
    }

    // Save newly learned words into permanent vocabulary library
    const { newWordsCount } = saveLearnedWords(validEntriesForStorage);

    // Save round to history
    const roundRecord: RoundHistory = {
      letter: currentLetter,
      answers: { ...answers },
      results: roundResults as RoundResults,
      roundPoints,
      allBonusEarned,
      timeSpentSeconds: 0
    };

    setTotalScore(prev => prev + roundPoints);
    setCompletedRounds(prev => prev + 1);
    setTotalCorrectAnswers(prev => prev + roundCorrect);
    setTotalIncorrectAnswers(prev => prev + roundIncorrect);
    setTotalEmptyAnswers(prev => prev + roundEmpty);
    setUsedWordsInGame(updatedUsedWords);
    setGameRoundsHistory(prev => [...prev, roundRecord]);
    setNewVocabCollected(prev => prev + newWordsCount);
    setLastResults(roundResults as RoundResults);

    setIsValidating(false);

    // If time remains, move to next letter!
    if (timeLeft > 0) {
      const nextLetter = pickRandomLetter(currentLetter);
      setCurrentLetter(nextLetter);
      setAnswers({
        noun: '',
        verb: '',
        adjective: '',
        country_city: '',
        food: ''
      });
      setCurrentHint(null);
      focusFirstInput();
    }
  };

  // Reveal Hint for Category
  const handleRevealHint = (category: CategoryInfo) => {
    const hint = getCategoryHint(category.id, currentLetter);
    if (hint) {
      setCurrentHint(hint);
    } else {
      alert(`No pre-set hint found for "${category.name}" starting with ${currentLetter}. Think of any valid ${category.name}!`);
    }
  };

  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const avgPointsPerRound = completedRounds > 0
    ? (totalScore / completedRounds).toFixed(1)
    : '0.0';

  const randomTip = LEARNING_TIPS[completedRounds % LEARNING_TIPS.length];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Stats Bar */}
      <div className="stats-header-bar">
        {/* Timer */}
        <div className={`timer-chip ${timeLeft <= 10 ? 'urgent' : ''}`} id="timer-display">
          <TimerIcon size={24} color={timeLeft <= 10 ? 'var(--error)' : 'var(--primary)'} />
          <div>
            <div className="stat-chip-label">Time Remaining</div>
            <div className="timer-val">{formatTime(timeLeft)}</div>
          </div>
        </div>

        {/* Total Score */}
        <div className="stat-chip" id="score-display">
          <div className="stat-chip-icon">
            <Zap size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Total Score</div>
            <div className="stat-chip-val" style={{ color: 'var(--primary)' }}>
              {totalScore} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>pts</span>
            </div>
          </div>
        </div>

        {/* Rounds Completed */}
        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: '#e0e7ff', color: '#4338ca' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Rounds Played</div>
            <div className="stat-chip-val">{completedRounds}</div>
          </div>
        </div>

        {/* Valid Answers */}
        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Correct Answers</div>
            <div className="stat-chip-val">{totalCorrectAnswers}</div>
          </div>
        </div>

        {/* Personal Best */}
        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Award size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Best Score</div>
            <div className="stat-chip-val">{personalBest}</div>
          </div>
        </div>
      </div>

      {/* Prominent Letter Display */}
      <div className="letter-display-box" id="current-letter-box">
        <div className="letter-circle" id="letter-display" key={currentLetter}>
          {currentLetter}
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.2px' }}>
          Round Letter: {currentLetter}
        </div>
        <div className="letter-subtitle">
          Enter words starting with <strong>"{currentLetter}"</strong> for each category below!
        </div>
      </div>

      {/* Category Inputs Reference Sheet */}
      <div className="category-table" id="category-table">
        {CATEGORIES_CONFIG.map((category, index) => (
          <CategoryInput
            key={`${category.id}-${currentLetter}`}
            category={category}
            index={index}
            value={answers[category.id]}
            onChange={(val) => handleAnswerChange(category.id, val)}
            onEnterNext={handleEnterNext}
            result={lastResults ? lastResults[category.id] : undefined}
            isFirst={index === 0}
            disabled={isValidating || isGameOver || timeLeft <= 0}
            requiredLetter={currentLetter}
            onRevealHint={handleRevealHint}
            showHintButton={settings.difficulty !== 'advanced'}
            inputRef={(el) => { inputRefs.current[index] = el; }}
          />
        ))}
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            id="submit-answers-btn"
            onClick={handleSubmitRound}
            disabled={isValidating || isGameOver || timeLeft <= 0}
            className="btn btn-primary"
            style={{ minWidth: '160px' }}
          >
            <Send size={18} />
            <span>{isValidating ? 'Validating...' : 'Submit Answers (Enter)'}</span>
          </button>

          <button
            type="button"
            id="skip-letter-btn"
            onClick={handleSkipLetter}
            disabled={isValidating || isGameOver || timeLeft <= 0}
            className="btn btn-secondary"
            title="Skip this letter and get a new one"
          >
            <SkipForward size={18} />
            <span>Skip Letter</span>
          </button>

          <button
            type="button"
            id="clear-answers-btn"
            onClick={handleClearAnswers}
            disabled={isValidating || isGameOver}
            className="btn btn-secondary"
            title="Clear all 5 input fields"
          >
            <RotateCcw size={18} />
            <span>Clear</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            id="end-game-btn"
            onClick={handleEndGame}
            className="btn btn-danger"
            title="Finish game early and see results"
          >
            <StopCircle size={18} />
            <span>End Game</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Leave current game and return to Home?')) {
                if (timerRef.current) clearInterval(timerRef.current);
                onExitGame();
              }
            }}
            className="btn btn-secondary"
            title="Return to Home screen"
          >
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Average points & New words badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        padding: '0 0.5rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div>
          <span>Avg points / round: </span>
          <strong style={{ color: 'var(--text-main)' }}>{avgPointsPerRound}</strong>
        </div>
        <div>
          <span>New words collected this game: </span>
          <strong style={{ color: 'var(--primary)' }}>{newVocabCollected}</strong>
        </div>
      </div>

      {/* Helpful Vocabulary Learning Tip */}
      <div className="learning-tip-box">
        <Sparkles size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>{randomTip}</span>
      </div>

      {/* Hint Dialog Modal */}
      {currentHint && (
        <div className="modal-overlay" onClick={() => setCurrentHint(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lightbulb size={20} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800 }}>
                  Hint for {currentHint.category.toUpperCase()} ({currentLetter})
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  A great English word you can use:
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-subtle)',
              border: '1.5px solid var(--border-color)',
              borderRadius: 'var(--border-radius-md)',
              padding: '1.25rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary)' }}>
                  {currentHint.word}
                </span>
                <span className="arabic-text" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {currentHint.arabicMeaning}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                {currentHint.definition}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                "{currentHint.exampleSentence}"
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentHint(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  handleAnswerChange(currentHint.category, currentHint.word);
                  setCurrentHint(null);
                }}
              >
                Use This Word
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
