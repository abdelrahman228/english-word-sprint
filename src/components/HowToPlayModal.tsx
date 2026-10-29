import React from 'react';
import { X, Sparkles, Check, Zap, Keyboard } from 'lucide-react';
import { CATEGORIES_CONFIG } from '../data/vocabularyDataset';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={22} color="var(--primary)" />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 900 }}>
              How to Play English Word Sprint
            </h2>
          </div>
          <button
            type="button"
            className="hint-btn"
            onClick={onClose}
            aria-label="Close instructions"
            style={{ padding: '0.4rem' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Inspiration Note */}
          <div style={{
            background: 'var(--primary-light)',
            borderLeft: '4px solid var(--primary)',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--border-radius-sm)',
            color: 'var(--banner-tip-text)',
            fontSize: '0.9rem',
            lineHeight: 1.5
          }}>
            <strong>Inspired by "اضرب في الملي" (Scattergories):</strong> Players think of words belonging to 5 categories that begin with a specific target English letter before the timer runs out!
          </div>

          {/* Core Rules */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Core Rules & Scoring
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.9rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <Check size={16} color="var(--success)" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span><strong>+10 points</strong> for every correct, unique word that starts with the required letter and fits the category.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <Check size={16} color="var(--success)" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span><strong>+5 bonus points</strong> if you fill all 5 categories correctly in the same round (55 pts max!).</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <Zap size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span><strong>0 points</strong> for empty fields — no penalty for leaving difficult boxes blank!</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <Zap size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span><strong>0 points</strong> for repeated words already entered in the same game session.</span>
              </li>
            </ul>
          </div>

          {/* 5 Categories Reference */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              The 5 Categories Explained
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {CATEGORIES_CONFIG.map((cat, i) => (
                <div
                  key={cat.id}
                  style={{
                    background: 'var(--bg-subtle)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--border-radius-sm)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--primary)' }}>{i + 1}. {cat.name}</strong>: {cat.description}
                  </div>
                  <span className="category-arabic">{cat.arabicName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Keyboard size={18} />
              <span>Keyboard & Tips</span>
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
              <li>• Press <kbd style={{ padding: '0.15rem 0.4rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Enter</kbd> to move to the next field. On the last field, Enter automatically submits your round!</li>
              <li>• Stuck on a letter? Click <strong>"Skip Letter"</strong> to jump to another letter without losing your score.</li>
              <li>• Need inspiration? Click the <strong>"Hint"</strong> button on any category in Beginner/Intermediate mode to view a verified clue!</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-primary" onClick={onClose} style={{ minWidth: '120px' }}>
              Got It, Let's Play!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
