import React from 'react';
import { Zap, BookOpen, BarChart3, HelpCircle, Settings, Flame } from 'lucide-react';
import type { UserStreak } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  currentTab: 'game' | 'vocabulary' | 'statistics';
  onSelectTab: (tab: 'game' | 'vocabulary' | 'statistics') => void;
  streak: UserStreak;
  vocabCount: number;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  streak,
  vocabCount,
  onOpenSettings,
  onOpenHelp
}) => {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <button
          className="brand"
          onClick={() => onSelectTab('game')}
          title="Return to Game"
          aria-label="English Word Sprint home"
        >
          <div className="brand-icon">
            <Zap size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
            <span style={{ lineHeight: 1.1 }}>Word Sprint</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              اضرب في الملي
            </span>
          </div>
          <span className="brand-badge">Vocabulary</span>
        </button>

        <nav className="nav-links">
          {streak.currentStreak > 0 && (
            <div className="streak-pill" title={`${streak.currentStreak} day learning streak!`}>
              <Flame size={16} />
              <span>{streak.currentStreak}d</span>
            </div>
          )}

          <button
            className={`nav-btn ${currentTab === 'game' ? 'active' : ''}`}
            onClick={() => onSelectTab('game')}
            aria-label="Play game"
          >
            <Zap size={18} />
            <span className="nav-label">Play</span>
          </button>

          <button
            className={`nav-btn ${currentTab === 'vocabulary' ? 'active' : ''}`}
            onClick={() => onSelectTab('vocabulary')}
            aria-label="My Vocabulary"
          >
            <BookOpen size={18} />
            <span className="nav-label">Vocabulary</span>
            {vocabCount > 0 && (
              <span style={{
                background: 'var(--primary)',
                color: 'var(--hero-card-text)',
                fontSize: '0.7rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '999px',
                marginLeft: '0.2rem'
              }}>
                {vocabCount}
              </span>
            )}
          </button>

          <button
            className={`nav-btn ${currentTab === 'statistics' ? 'active' : ''}`}
            onClick={() => onSelectTab('statistics')}
            aria-label="Statistics"
          >
            <BarChart3 size={18} />
            <span className="nav-label">Stats</span>
          </button>

          <ThemeToggle />

          <button
            className="nav-btn"
            onClick={onOpenHelp}
            title="How to Play"
            aria-label="How to play instructions"
          >
            <HelpCircle size={18} />
          </button>

          <button
            className="nav-btn"
            onClick={onOpenSettings}
            title="Game Settings"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </nav>
      </div>
    </header>
  );
};
