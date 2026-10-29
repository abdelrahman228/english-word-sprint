import React from 'react';
import { Play, Clock, Sparkles, Award, Shield, BookOpen, ChevronRight, Zap } from 'lucide-react';
import type { Difficulty, GameDuration, GameSettings } from '../types';
import { CATEGORIES_CONFIG } from '../data/vocabularyDataset';

interface HomeScreenProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onStartGame: () => void;
  personalBest: number;
  totalWordsLearned: number;
  totalGamesPlayed: number;
  onOpenHelp: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  settings,
  onUpdateSettings,
  onStartGame,
  personalBest,
  totalWordsLearned,
  totalGamesPlayed,
  onOpenHelp
}) => {
  const durations: GameDuration[] = [30, 60, 90, 120];
  const difficulties: { id: Difficulty; label: string; desc: string; icon: string }[] = [
    { id: 'beginner', label: 'Beginner (A1)', desc: 'Everyday common words & category hints enabled', icon: '🌱' },
    { id: 'intermediate', label: 'Intermediate (B1)', desc: 'Broader vocabulary with fewer hints', icon: '🚀' },
    { id: 'advanced', label: 'Advanced (C1)', desc: 'Rapid recall, rare words, maximum challenge', icon: '⚡' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Hero Welcome Card */}
      <div className="card" style={{
        background: 'var(--hero-card-bg)',
        color: 'var(--hero-card-text)',
        border: 'none',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg), var(--shadow-glow)'
      }}>
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '180px',
          height: '180px',
          background: 'var(--hero-glow)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--hero-badge-bg)',
          backdropFilter: 'blur(8px)',
          padding: '0.4rem 1rem',
          borderRadius: '999px',
          fontSize: '0.85rem',
          fontWeight: 700,
          marginBottom: '1rem',
          border: '1px solid var(--hero-glass-border)'
        }}>
          <Sparkles size={16} />
          <span>Interactive English Vocabulary Sprint • اضرب في الملي</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(2rem, 5vw, 3.2rem)',
          fontWeight: 900,
          letterSpacing: '-0.5px',
          marginBottom: '0.75rem',
          lineHeight: 1.15
        }}>
          English Word Sprint
        </h1>

        <p style={{
          maxWidth: '620px',
          margin: '0 auto 1.75rem auto',
          fontSize: '1.1rem',
          opacity: 0.95,
          fontWeight: 500,
          lineHeight: 1.6
        }}>
          Think fast, type faster! Enter words starting with the target letter across 5 categories under time pressure. Includes full English verification and Arabic translations.
        </p>

        {/* Quick Highlights / Stats Badges */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'var(--hero-glass-bg)',
            backdropFilter: 'blur(10px)',
            padding: '0.6rem 1.25rem',
            borderRadius: 'var(--border-radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <Award size={20} color="var(--badge-gold)" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.7rem', opacity: 0.85, textTransform: 'uppercase', fontWeight: 700 }}>Personal Best</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{personalBest} pts</div>
            </div>
          </div>

          <div style={{
            background: 'var(--hero-glass-bg)',
            backdropFilter: 'blur(10px)',
            padding: '0.6rem 1.25rem',
            borderRadius: 'var(--border-radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <BookOpen size={20} color="var(--badge-mint)" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.7rem', opacity: 0.85, textTransform: 'uppercase', fontWeight: 700 }}>Words Saved</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{totalWordsLearned}</div>
            </div>
          </div>

          <div style={{
            background: 'var(--hero-glass-bg)',
            backdropFilter: 'blur(10px)',
            padding: '0.6rem 1.25rem',
            borderRadius: 'var(--border-radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <Zap size={20} color="var(--badge-pink)" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.7rem', opacity: 0.85, textTransform: 'uppercase', fontWeight: 700 }}>Games Played</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{totalGamesPlayed}</div>
            </div>
          </div>
        </div>

        {/* Start Game Action Button */}
        <div>
          <button
            onClick={onStartGame}
            id="start-game-btn"
            className="btn"
            style={{
              background: 'var(--hero-btn-bg)',
              color: 'var(--hero-btn-text)',
              fontSize: '1.2rem',
              padding: '1rem 2.8rem',
              borderRadius: 'var(--border-radius-xl)',
              boxShadow: 'var(--shadow-lg)',
              fontWeight: 800
            }}
          >
            <Play size={24} fill="currentColor" />
            <span>Start Game</span>
          </button>
        </div>
      </div>

      {/* Game Setup Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Duration Selection */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Clock size={20} color="var(--primary)" />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 700 }}>
              Game Duration
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {durations.map(sec => (
              <button
                key={sec}
                type="button"
                onClick={() => onUpdateSettings({ duration: sec })}
                className={`btn ${settings.duration === sec ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: '1.05rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}
              >
                <span>{sec}s</span>
                <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                  {sec === 30 ? 'Lightning' : sec === 60 ? 'Standard' : sec === 90 ? 'Extended' : 'Marathon'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Shield size={20} color="var(--primary)" />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 700 }}>
              Difficulty Level
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {difficulties.map(diff => (
              <button
                key={diff.id}
                type="button"
                onClick={() => onUpdateSettings({ difficulty: diff.id })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--border-radius-md)',
                  border: `2px solid ${settings.difficulty === diff.id ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: settings.difficulty === diff.id ? 'var(--primary-light)' : 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{diff.icon}</span>
                    <span>{diff.label}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {diff.desc}
                  </div>
                </div>
                {settings.difficulty === diff.id && (
                  <span style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    boxShadow: '0 0 0 3px var(--primary-light)'
                  }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* The 5 Categories Preview Table */}
      <div className="card">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800 }}>
              Every Round Covers 5 Categories
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Based on the classic paper reference game sheet ("اضرب في الملي")
            </p>
          </div>
          <button
            onClick={onOpenHelp}
            className="btn btn-outline"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
          >
            <span>Read Rules & Tips</span>
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem'
        }}>
          {CATEGORIES_CONFIG.map((cat, idx) => (
            <div
              key={cat.id}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: 'var(--text-inverse)',
                  background: 'var(--primary)',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {idx + 1}
                </span>
                <span className="category-arabic">{cat.arabicName}</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{cat.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cat.description}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontStyle: 'italic', marginTop: 'auto' }}>
                Ex: {cat.example.split(',')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
