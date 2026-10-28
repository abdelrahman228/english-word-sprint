import React, { useState } from 'react';
import {
  RotateCcw,
  BookOpen,
  BarChart3,
  Home,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Volume2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { GameHistoryItem, RoundHistory } from '../types';
import { soundService } from '../services/soundService';

interface ResultsScreenProps {
  gameRecord: GameHistoryItem;
  personalBest: number;
  onPlayAgain: () => void;
  onGoVocabulary: () => void;
  onGoStats: () => void;
  onGoHome: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  gameRecord,
  personalBest,
  onPlayAgain,
  onGoVocabulary,
  onGoStats,
  onGoHome
}) => {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  const isNewRecord = gameRecord.score >= personalBest && gameRecord.score > 0;

  // Generate motivational message
  const getMotivationalMessage = () => {
    if (isNewRecord) {
      return {
        title: 'Outstanding New High Score! 🏆',
        subtitle: 'You set a brand new personal best! Your vocabulary recall speed is truly impressive.'
      };
    }
    if (gameRecord.accuracyPercent >= 80) {
      return {
        title: 'Terrific Accuracy! 🌟',
        subtitle: 'Great job! You are building an exceptional English vocabulary with remarkable precision.'
      };
    }
    if (gameRecord.score >= 50) {
      return {
        title: 'Great Effort! 🚀',
        subtitle: 'Keep up the momentum! Review the new words from this sprint to strengthen your memory.'
      };
    }
    return {
      title: 'Good Warm-up! 🌱',
      subtitle: 'Every sprint builds your brain connections. Review your new words below and try again!'
    };
  };

  const motivation = getMotivationalMessage();

  // Extract newly encountered valid words in this game
  const wordsToLearn: { word: string; category: string; arabic?: string; example?: string }[] = [];
  const seen = new Set<string>();

  for (const round of gameRecord.rounds) {
    for (const catId of Object.keys(round.results) as (keyof typeof round.results)[]) {
      const res = round.results[catId];
      if (res && res.status === 'valid' && res.word && !seen.has(res.word.toLowerCase())) {
        seen.add(res.word.toLowerCase());
        wordsToLearn.push({
          word: res.word,
          category: res.category,
          arabic: res.arabicMeaning,
          example: res.exampleSentence
        });
      }
    }
  }

  const toggleRoundAccordion = (idx: number) => {
    setExpandedRound(prev => (prev === idx ? null : idx));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Celebration & Motivational Banner */}
      <div className="card" style={{
        background: isNewRecord
          ? 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)'
          : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '2.5rem 1.5rem',
        borderRadius: 'var(--border-radius-xl)',
        border: 'none',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'rgba(255, 255, 255, 0.2)',
          padding: '0.35rem 0.9rem',
          borderRadius: '999px',
          fontSize: '0.82rem',
          fontWeight: 700,
          marginBottom: '0.75rem'
        }}>
          <Sparkles size={16} />
          <span>Sprint Complete</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 900,
          marginBottom: '0.5rem'
        }}>
          {gameRecord.score} Points
        </h1>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.35rem' }}>
          {motivation.title}
        </h2>
        <p style={{ opacity: 0.92, maxWidth: '540px', margin: '0 auto', fontSize: '0.95rem' }}>
          {motivation.subtitle}
        </p>

        {isNewRecord && (
          <div style={{
            marginTop: '1.25rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#fef08a',
            color: '#854d0e',
            padding: '0.45rem 1.25rem',
            borderRadius: '999px',
            fontWeight: 800,
            fontSize: '0.9rem'
          }}>
            <Award size={18} />
            <span>New Personal Best!</span>
          </div>
        )}
      </div>

      {/* Detailed Game Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.75rem'
      }}>
        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Award size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Personal Best</div>
            <div className="stat-chip-val">{Math.max(personalBest, gameRecord.score)}</div>
          </div>
        </div>

        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: '#e0e7ff', color: '#4338ca' }}>
            <RotateCcw size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Rounds Completed</div>
            <div className="stat-chip-val">{gameRecord.roundsCompleted}</div>
          </div>
        </div>

        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Correct Answers</div>
            <div className="stat-chip-val">{gameRecord.correctAnswers}</div>
          </div>
        </div>

        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
            <XCircle size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Incorrect Answers</div>
            <div className="stat-chip-val">{gameRecord.incorrectAnswers}</div>
          </div>
        </div>

        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            <HelpCircle size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Empty Fields</div>
            <div className="stat-chip-val">{gameRecord.emptyAnswers}</div>
          </div>
        </div>

        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: '#f3e8ff', color: 'var(--primary)' }}>
            <BookOpen size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">New Words Saved</div>
            <div className="stat-chip-val">{gameRecord.newVocabCount}</div>
          </div>
        </div>

        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Award size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Accuracy</div>
            <div className="stat-chip-val">{gameRecord.accuracyPercent}%</div>
          </div>
        </div>

        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: '#ede9fe', color: '#6d28d9' }}>
            <Award size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Avg Response / Round</div>
            <div className="stat-chip-val">{gameRecord.averageResponseTime}s</div>
          </div>
        </div>
      </div>

      {/* Words to Learn Section */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <div style={{
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
              Words to Learn ({wordsToLearn.length})
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Vocabulary words encountered and verified in this sprint session
            </p>
          </div>
        </div>

        {wordsToLearn.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            No verified words entered in this sprint. Play another round to build your vocabulary!
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.85rem'
          }}>
            {wordsToLearn.map((w, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
                      {w.word}
                    </span>
                    <button
                      type="button"
                      className="hint-btn"
                      onClick={() => soundService.speak(w.word)}
                      title="Pronounce word"
                      style={{ padding: '0.2rem 0.4rem' }}
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>
                  {w.arabic && (
                    <span className="arabic-text" style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                      {w.arabic}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  Category: <strong>{w.category.replace('_', ' / ')}</strong>
                </div>

                {w.example && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                    "{w.example}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Round by Round Review Accordion */}
      {gameRecord.rounds.length > 0 && (
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Round-by-Round Breakdown
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Review every letter, answer, and validation result from this game
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {gameRecord.rounds.map((round: RoundHistory, idx: number) => {
              const isExpanded = expandedRound === idx;
              return (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleRoundAccordion(idx)}
                    style={{
                      width: '100%',
                      padding: '0.85rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-surface)',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: 'white',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem'
                      }}>
                        {round.letter}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          Round {idx + 1} — Letter "{round.letter}"
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {round.allBonusEarned ? '🎉 All 5 categories valid (+5 bonus!)' : `${round.roundPoints} points earned`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                        +{round.roundPoints} pts
                      </span>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{
                      padding: '1rem 1.25rem',
                      background: 'var(--bg-subtle)',
                      borderTop: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      {Object.keys(round.results).map((catKey) => {
                        const res = round.results[catKey as keyof typeof round.results];
                        return (
                          <div
                            key={catKey}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.45rem 0.65rem',
                              background: 'var(--bg-surface)',
                              borderRadius: 'var(--border-radius-sm)',
                              fontSize: '0.85rem'
                            }}
                          >
                            <span style={{ fontWeight: 600, textTransform: 'capitalize', minWidth: '110px' }}>
                              {catKey.replace('_', ' / ')}:
                            </span>
                            <span style={{ flex: 1, padding: '0 0.5rem', fontWeight: 600 }}>
                              {round.answers[catKey as keyof typeof round.answers] || (
                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Empty</span>
                              )}
                            </span>
                            <span style={{
                              fontWeight: 700,
                              color: res.status === 'valid' ? 'var(--success)' : res.status === 'duplicate' ? 'var(--warning)' : 'var(--error)'
                            }}>
                              {res.status === 'valid' ? `+${res.pointsEarned} pts` : res.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation & Action Buttons */}
      <div className="controls-bar" style={{ justifyContent: 'center' }}>
        <button
          type="button"
          onClick={onPlayAgain}
          className="btn btn-primary"
          style={{ minWidth: '170px' }}
        >
          <RotateCcw size={18} />
          <span>Play Again</span>
        </button>

        <button
          type="button"
          onClick={onGoVocabulary}
          className="btn btn-secondary"
        >
          <BookOpen size={18} />
          <span>Review My Words</span>
        </button>

        <button
          type="button"
          onClick={onGoStats}
          className="btn btn-secondary"
        >
          <BarChart3 size={18} />
          <span>View Statistics</span>
        </button>

        <button
          type="button"
          onClick={onGoHome}
          className="btn btn-outline"
        >
          <Home size={18} />
          <span>Home</span>
        </button>
      </div>
    </div>
  );
};
