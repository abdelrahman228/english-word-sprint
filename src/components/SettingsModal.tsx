import React from 'react';
import { X, Volume2, VolumeX, Shield, Clock, RotateCcw } from 'lucide-react';
import type { Difficulty, GameDuration, GameSettings } from '../types';
import { clearAllGameData } from '../services/storageService';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
  onDataReset: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onDataReset
}) => {
  const durations: GameDuration[] = [30, 60, 90, 120];
  const difficulties: { id: Difficulty; label: string }[] = [
    { id: 'beginner', label: 'Beginner (A1)' },
    { id: 'intermediate', label: 'Intermediate (B1)' },
    { id: 'advanced', label: 'Advanced (C1)' }
  ];

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all data, high scores, and saved vocabulary?')) {
      clearAllGameData();
      onDataReset();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800 }}>
            Game Settings
          </h2>
          <button
            type="button"
            className="hint-btn"
            onClick={onClose}
            aria-label="Close settings"
            style={{ padding: '0.4rem' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Sound Audio Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1rem',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--border-radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {settings.soundEnabled ? <Volume2 size={20} color="var(--primary)" /> : <VolumeX size={20} color="var(--text-muted)" />}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Sound Effects</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Audio chimes for timer, correct answers & bonus</div>
              </div>
            </div>
            <button
              type="button"
              className={`btn ${settings.soundEnabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            >
              {settings.soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Speech Synthesis Pronunciation Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1rem',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--border-radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Volume2 size={20} color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>English Pronunciation (Text-to-Speech)</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Native audio pronunciation for saved words</div>
              </div>
            </div>
            <button
              type="button"
              className={`btn ${settings.speechEnabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onUpdateSettings({ speechEnabled: !settings.speechEnabled })}
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            >
              {settings.speechEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Default Duration */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Clock size={16} color="var(--primary)" />
              <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Default Game Duration</label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {durations.map(dur => (
                <button
                  key={dur}
                  type="button"
                  className={`btn ${settings.duration === dur ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onUpdateSettings({ duration: dur })}
                  style={{ padding: '0.55rem', fontSize: '0.85rem' }}
                >
                  {dur}s
                </button>
              ))}
            </div>
          </div>

          {/* Default Difficulty */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Shield size={16} color="var(--primary)" />
              <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Default Difficulty</label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {difficulties.map(diff => (
                <button
                  key={diff.id}
                  type="button"
                  className={`btn ${settings.difficulty === diff.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onUpdateSettings({ difficulty: diff.id })}
                  style={{ padding: '0.55rem', fontSize: '0.82rem' }}
                >
                  {diff.label}
                </button>
              ))}
            </div>
          </div>

          {/* Danger Zone: Reset Data */}
          <div style={{
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--error)' }}>Clear Gameplay Data</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reset high score, streak, and saved words</div>
            </div>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleReset}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
            >
              <RotateCcw size={14} />
              <span>Reset All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
