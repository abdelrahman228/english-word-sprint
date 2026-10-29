import React, { useMemo } from 'react';
import {
  BarChart3,
  Award,
  Zap,
  BookOpen,
  Flame,
  TrendingUp,
  Trash2,
  Play
} from 'lucide-react';
import type { Category, GameHistoryItem, UserStreak, VocabWord } from '../types';
import { clearAllGameData } from '../services/storageService';

interface StatisticsDashboardProps {
  history: GameHistoryItem[];
  vocabulary: Record<string, VocabWord>;
  personalBest: number;
  streak: UserStreak;
  onRefresh: () => void;
  onStartSprint: () => void;
}

export const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({
  history,
  vocabulary,
  personalBest,
  streak,
  onRefresh,
  onStartSprint
}) => {
  // Aggregate stats
  const totalGames = history.length;
  const totalPoints = useMemo(() => history.reduce((sum, g) => sum + g.score, 0), [history]);
  const totalCorrect = useMemo(() => history.reduce((sum, g) => sum + g.correctAnswers, 0), [history]);
  const totalIncorrect = useMemo(() => history.reduce((sum, g) => sum + g.incorrectAnswers, 0), [history]);
  const totalWords = Object.keys(vocabulary).length;

  const overallAccuracy = useMemo(() => {
    const attempts = totalCorrect + totalIncorrect;
    return attempts > 0 ? Math.round((totalCorrect / attempts) * 100) : 0;
  }, [totalCorrect, totalIncorrect]);

  // Category breakdown from saved vocabulary
  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      noun: 0,
      verb: 0,
      adjective: 0,
      country_city: 0,
      food: 0
    };
    for (const w of Object.values(vocabulary)) {
      if (counts[w.category] !== undefined) {
        counts[w.category]++;
      }
    }
    return counts;
  }, [vocabulary]);

  // Performance by category across all rounds in history
  const categoryPerformance = useMemo(() => {
    const stats: Record<Category, { attempts: number; correct: number }> = {
      noun: { attempts: 0, correct: 0 },
      verb: { attempts: 0, correct: 0 },
      adjective: { attempts: 0, correct: 0 },
      country_city: { attempts: 0, correct: 0 },
      food: { attempts: 0, correct: 0 }
    };

    for (const game of history) {
      for (const round of game.rounds) {
        for (const catKey of Object.keys(round.results) as Category[]) {
          const res = round.results[catKey];
          if (res && res.status !== 'empty') {
            stats[catKey].attempts++;
            if (res.status === 'valid') {
              stats[catKey].correct++;
            }
          }
        }
      }
    }

    return stats;
  }, [history]);

  // Frequently missed letters analysis
  const missedLetters = useMemo(() => {
    const counts: Record<string, { total: number; missed: number }> = {};
    for (const game of history) {
      for (const round of game.rounds) {
        const letter = round.letter.toUpperCase();
        if (!counts[letter]) counts[letter] = { total: 0, missed: 0 };
        counts[letter].total++;
        let hadMiss = false;
        for (const catKey of Object.keys(round.results) as Category[]) {
          const res = round.results[catKey];
          if (res && res.status !== 'valid') {
            hadMiss = true;
            break;
          }
        }
        if (hadMiss) counts[letter].missed++;
      }
    }

    return Object.entries(counts)
      .map(([letter, data]) => ({
        letter,
        missed: data.missed,
        total: data.total,
        rate: Math.round((data.missed / data.total) * 100)
      }))
      .sort((a, b) => b.missed - a.missed)
      .slice(0, 6);
  }, [history]);

  // Recent score progression (last 10 games, chronologically)
  const progressionData = useMemo(() => {
    return [...history].reverse().slice(-10);
  }, [history]);

  const handleClear = () => {
    if (confirm('Are you sure you want to reset all saved stats, games, and vocabulary? This cannot be undone.')) {
      clearAllGameData();
      onRefresh();
    }
  };

  const categoryNames: Record<Category, string> = {
    noun: 'Noun (اسم)',
    verb: 'Verb (فعل)',
    adjective: 'Adjective (صفة)',
    country_city: 'Country / City (دولة / مدينة)',
    food: 'Food (طعام)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview Banner */}
      <div className="card" style={{
        background: 'var(--hero-card-bg)',
        color: 'var(--hero-card-text)',
        border: 'none',
        padding: '2rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--hero-badge-bg)',
            padding: '0.3rem 0.8rem',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            marginBottom: '0.5rem'
          }}>
            <BarChart3 size={14} />
            <span>Gameplay Analytics</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 900, marginBottom: '0.25rem' }}>
            Performance Dashboard
          </h1>
          <p style={{ opacity: 0.9, fontSize: '0.9rem', maxWidth: '480px' }}>
            Track your vocabulary growth, accuracy trends, category strengths, and response history.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={onStartSprint}
            style={{
              background: 'var(--hero-btn-bg)',
              color: 'var(--hero-btn-text)',
              fontWeight: 800
            }}
          >
            <Play size={16} fill="currentColor" />
            <span>Play Milli</span>
          </button>

          {history.length > 0 && (
            <button
              type="button"
              className="btn"
              onClick={handleClear}
              style={{
                background: 'var(--error-bg)',
                color: 'var(--error)',
                border: '1px solid var(--error-border)',
                fontSize: '0.85rem'
              }}
            >
              <Trash2 size={16} />
              <span>Reset Stats</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.85rem'
      }}>
        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: 'var(--chip-amber-bg)', color: 'var(--chip-amber-text)' }}>
            <Award size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">High Score</div>
            <div className="stat-chip-val">{personalBest}</div>
          </div>
        </div>

        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: 'var(--chip-purple-bg)', color: 'var(--chip-purple-text)' }}>
            <Zap size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Total Points</div>
            <div className="stat-chip-val">{totalPoints}</div>
          </div>
        </div>

        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: 'var(--chip-indigo-bg)', color: 'var(--chip-indigo-text)' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Games Played</div>
            <div className="stat-chip-val">{totalGames}</div>
          </div>
        </div>

        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: 'var(--chip-green-bg)', color: 'var(--chip-green-text)' }}>
            <BookOpen size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Words Learned</div>
            <div className="stat-chip-val">{totalWords}</div>
          </div>
        </div>

        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: 'var(--chip-blue-bg)', color: 'var(--chip-blue-text)' }}>
            <Award size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Overall Accuracy</div>
            <div className="stat-chip-val">{overallAccuracy}%</div>
          </div>
        </div>

        <div className="stat-chip">
          <div className="stat-chip-icon" style={{ background: 'var(--chip-red-bg)', color: 'var(--chip-red-text)' }}>
            <Flame size={20} />
          </div>
          <div className="stat-chip-content">
            <div className="stat-chip-label">Daily Streak</div>
            <div className="stat-chip-val">{streak.currentStreak} <span style={{ fontSize: '0.8rem' }}>days</span></div>
          </div>
        </div>
      </div>

      {/* Vocabulary Breakdown by Category */}
      <div className="card">
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.35rem' }}>
          Vocabulary Breakdown by Category
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Distribution of your {totalWords} collected vocabulary words across the 5 categories
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.85rem'
        }}>
          {(Object.keys(categoryCounts) as Category[]).map(catKey => {
            const count = categoryCounts[catKey];
            const pct = totalWords > 0 ? Math.round((count / totalWords) * 100) : 0;
            return (
              <div
                key={catKey}
                style={{
                  background: 'var(--bg-subtle)',
                  padding: '1rem',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem'
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {categoryNames[catKey]}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>
                  {count} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>words</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'var(--border-color)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  marginTop: '0.2rem'
                }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: 'var(--primary)',
                    borderRadius: '999px'
                  }} />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {pct}% of library
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Score Progression Chart */}
      <div className="card">
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.35rem' }}>
          Score Progression (Recent Games)
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Visualizing your score trend across the last 10 sprints
        </p>

        {progressionData.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            Play at least 2 games to see your score progression curve!
          </div>
        ) : (
          <div style={{ width: '100%', height: '180px', position: 'relative' }}>
            {(() => {
              const maxScore = Math.max(...progressionData.map(d => d.score), 40);
              const points = progressionData.map((d, i) => {
                const x = (i / (progressionData.length - 1)) * 100;
                const y = 100 - (d.score / maxScore) * 85;
                return `${x},${y}`;
              }).join(' ');

              return (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <line x1="0" y1="20" x2="100" y2="20" stroke="var(--border-color)" strokeDasharray="2" strokeWidth="0.5" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="var(--border-color)" strokeDasharray="2" strokeWidth="0.5" />
                  <line x1="0" y1="80" x2="100" y2="80" stroke="var(--border-color)" strokeDasharray="2" strokeWidth="0.5" />

                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <polygon
                    points={`0,100 ${points} 100,100`}
                    fill="url(#chartGradient)"
                  />

                  <polyline
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                  />

                  {progressionData.map((d, i) => {
                    const cx = (i / (progressionData.length - 1)) * 100;
                    const cy = 100 - (d.score / maxScore) * 85;
                    return (
                      <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r="3"
                        fill="var(--bg-surface)"
                        stroke="var(--primary)"
                        strokeWidth="2"
                      >
                        <title>{`Game ${i + 1}: ${d.score} pts`}</title>
                      </circle>
                    );
                  })}
                </svg>
              );
            })()}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: '0.5rem'
            }}>
              <span>Earlier Sprint</span>
              <span>Latest Sprint</span>
            </div>
          </div>
        )}
      </div>

      {/* Category Accuracy & Missed Letters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Category Accuracy */}
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Category Accuracy & Success Rate
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Your accuracy percentage per category
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {(Object.keys(categoryPerformance) as Category[]).map(catKey => {
              const data = categoryPerformance[catKey];
              const pct = data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0;
              return (
                <div key={catKey}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{categoryNames[catKey]}</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {pct}% ({data.correct}/{data.attempts})
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'var(--bg-subtle)',
                    borderRadius: '999px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                      borderRadius: '999px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Missed Letters */}
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Letters That Need Practice
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Letters where answers were most frequently skipped or incorrect
          </p>

          {missedLetters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              No missed letters yet! Play more games to analyze letter patterns.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {missedLetters.map(item => (
                <div
                  key={item.letter}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--error-bg)',
                      color: 'var(--error)',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem'
                    }}>
                      {item.letter}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Letter "{item.letter}"</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Missed in {item.missed} of {item.total} rounds
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '999px',
                    background: 'var(--error-bg)',
                    color: 'var(--error)'
                  }}>
                    {item.rate}% Miss Rate
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
