import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Volume2,
  CheckCircle,
  Clock,
  Sparkles,
  BookOpen,
  Filter,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { Category, VocabStatus, VocabWord } from '../types';
import { exportVocabularyCSV, updateVocabStatus } from '../services/storageService';
import { soundService } from '../services/soundService';

interface VocabularyLibraryProps {
  vocabulary: Record<string, VocabWord>;
  onRefresh: () => void;
  onStartSprint: () => void;
}

export const VocabularyLibrary: React.FC<VocabularyLibraryProps> = ({
  vocabulary,
  onRefresh,
  onStartSprint
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<VocabStatus | 'all'>('all');

  // Flashcard Practice Mode
  const [practiceMode, setPracticeMode] = useState<boolean>(false);
  const [practiceIndex, setPracticeIndex] = useState<number>(0);
  const [cardFlipped, setCardFlipped] = useState<boolean>(false);

  const wordsList = useMemo(() => Object.values(vocabulary), [vocabulary]);

  // Filter words
  const filteredWords = useMemo(() => {
    return wordsList.filter(w => {
      // Search check
      if (searchTerm) {
        const query = searchTerm.toLowerCase().trim();
        const matchesWord = w.word.toLowerCase().includes(query);
        const matchesArabic = (w.arabicMeaning || '').includes(query);
        if (!matchesWord && !matchesArabic) return false;
      }
      // Category check
      if (selectedCategory !== 'all' && w.category !== selectedCategory) {
        return false;
      }
      // Status check
      if (selectedStatus !== 'all' && w.status !== selectedStatus) {
        return false;
      }
      return true;
    }).sort((a, b) => new Date(b.lastEncountered).getTime() - new Date(a.lastEncountered).getTime());
  }, [wordsList, searchTerm, selectedCategory, selectedStatus]);

  const handleStatusChange = (word: VocabWord, newStatus: VocabStatus) => {
    updateVocabStatus(word.normalized, newStatus);
    onRefresh();
  };

  // Next flashcard
  const handleNextFlashcard = () => {
    setCardFlipped(false);
    if (practiceIndex < filteredWords.length - 1) {
      setPracticeIndex(prev => prev + 1);
    } else {
      setPracticeIndex(0);
    }
  };

  const currentFlashcard = filteredWords[practiceIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
        color: 'white',
        padding: '2rem 1.5rem',
        border: 'none',
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
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '0.3rem 0.8rem',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            marginBottom: '0.5rem'
          }}>
            <BookOpen size={14} />
            <span>My Personal English Lexicon</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 900, marginBottom: '0.25rem' }}>
            My Vocabulary ({wordsList.length})
          </h1>
          <p style={{ opacity: 0.9, fontSize: '0.9rem', maxWidth: '480px' }}>
            All verified words encountered in your sprints. Review meanings in Arabic, practice pronunciation, and track mastery.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setPracticeMode(!practiceMode);
              setCardFlipped(false);
              setPracticeIndex(0);
            }}
            style={{
              background: 'white',
              color: 'var(--primary)',
              fontWeight: 800
            }}
          >
            <Layers size={18} />
            <span>{practiceMode ? 'Exit Flashcards' : 'Practice Flashcards'}</span>
          </button>

          <button
            type="button"
            className="btn"
            onClick={exportVocabularyCSV}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.4)'
            }}
            title="Download your full vocabulary library as CSV"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Flashcard Practice Modal Mode */}
      {practiceMode && currentFlashcard && (
        <div className="card" style={{
          background: 'var(--bg-surface)',
          border: '2px solid var(--primary)',
          textAlign: 'center',
          padding: '2.5rem 1.5rem',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            fontWeight: 700,
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>Flashcard {practiceIndex + 1} of {filteredWords.length}</span>
            <span>•</span>
            <span style={{ textTransform: 'capitalize' }}>{currentFlashcard.category.replace('_', ' / ')}</span>
          </div>

          <div
            onClick={() => setCardFlipped(!cardFlipped)}
            style={{
              background: 'var(--bg-subtle)',
              border: '1.5px dashed var(--primary)',
              borderRadius: 'var(--border-radius-xl)',
              padding: '3rem 2rem',
              cursor: 'pointer',
              marginBottom: '1.5rem',
              transition: 'all 0.3s ease',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {!cardFlipped ? (
              <>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2.8rem',
                  fontWeight: 900,
                  color: 'var(--primary)',
                  marginBottom: '0.75rem'
                }}>
                  {currentFlashcard.word}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Click or tap to reveal Arabic meaning & definition
                </div>
              </>
            ) : (
              <>
                <div className="arabic-text" style={{
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  marginBottom: '0.75rem'
                }}>
                  {currentFlashcard.arabicMeaning || '—'}
                </div>
                {currentFlashcard.definition && (
                  <div style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.5rem', maxWidth: '500px' }}>
                    {currentFlashcard.definition}
                  </div>
                )}
                {currentFlashcard.exampleSentence && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--primary-dark)', fontStyle: 'italic', maxWidth: '500px' }}>
                    "{currentFlashcard.exampleSentence}"
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => soundService.speak(currentFlashcard.word)}
            >
              <Volume2 size={18} />
              <span>Pronounce</span>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleStatusChange(currentFlashcard, 'learning')}
            >
              <span>Still Learning</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                handleStatusChange(currentFlashcard, 'mastered');
                handleNextFlashcard();
              }}
            >
              <CheckCircle size={18} />
              <span>Mark Mastered</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleNextFlashcard}
            >
              <span>Next Card</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          alignItems: 'center'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search in English or بالعربية..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="category-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as Category | 'all')}
              className="category-input"
              style={{ padding: '0.65rem 0.85rem' }}
            >
              <option value="all">All Categories</option>
              <option value="noun">Noun (اسم)</option>
              <option value="verb">Verb (فعل)</option>
              <option value="adjective">Adjective (صفة)</option>
              <option value="country_city">Country / City (دولة / مدينة)</option>
              <option value="food">Food (طعام)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as VocabStatus | 'all')}
              className="category-input"
              style={{ padding: '0.65rem 0.85rem' }}
            >
              <option value="all">All Statuses</option>
              <option value="new">🌱 New</option>
              <option value="learning">⏳ Learning</option>
              <option value="mastered">⭐ Mastered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vocabulary Cards Grid */}
      {filteredWords.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Sparkles size={40} color="var(--primary)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            {wordsList.length === 0 ? 'No Words Saved Yet' : 'No Matching Words Found'}
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
            {wordsList.length === 0
              ? 'Play your first Word Sprint game! Any correct answers you enter will be automatically saved here.'
              : 'Try clearing your search query or changing the filter options above.'}
          </p>
          {wordsList.length === 0 && (
            <button type="button" className="btn btn-primary" onClick={onStartSprint}>
              Start a Word Sprint
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: '1rem'
        }}>
          {filteredWords.map((item) => (
            <div
              key={item.normalized}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                padding: '1.25rem'
              }}
            >
              {/* Header with word and audio */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--primary)'
                  }}>
                    {item.word}
                  </span>
                  <button
                    type="button"
                    className="hint-btn"
                    onClick={() => soundService.speak(item.word)}
                    title="Pronounce word"
                    style={{ padding: '0.2rem 0.4rem' }}
                  >
                    <Volume2 size={15} />
                  </button>
                </div>

                {item.arabicMeaning && item.arabicMeaning !== '—' && (
                  <span className="arabic-text" style={{
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: 'var(--text-main)'
                  }}>
                    {item.arabicMeaning}
                  </span>
                )}
              </div>

              {/* Category & Status badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: 'var(--primary-light)',
                  color: 'var(--primary-dark)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px'
                }}>
                  {item.category.replace('_', ' / ')}
                </span>

                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  background: item.status === 'mastered' ? '#dcfce7' : item.status === 'learning' ? '#fef3c7' : '#e0e7ff',
                  color: item.status === 'mastered' ? '#15803d' : item.status === 'learning' ? '#b45309' : '#4338ca'
                }}>
                  {item.status === 'mastered' ? '⭐ Mastered' : item.status === 'learning' ? '⏳ Learning' : '🌱 New'}
                </span>

                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  Seen {item.encounterCount}x
                </span>
              </div>

              {/* Definition */}
              {item.definition && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                  {item.definition}
                </div>
              )}

              {/* Example Sentence */}
              {item.exampleSentence && (
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                  background: 'var(--bg-subtle)',
                  padding: '0.4rem 0.65rem',
                  borderRadius: 'var(--border-radius-sm)',
                  borderLeft: '2px solid var(--primary)'
                }}>
                  "{item.exampleSentence}"
                </div>
              )}

              {/* Footer Actions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 'auto',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--border-color)',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
                  <Clock size={13} />
                  <span>Learned {new Date(item.dateLearned).toLocaleDateString()}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {item.status !== 'mastered' ? (
                    <button
                      type="button"
                      className="hint-btn"
                      onClick={() => handleStatusChange(item, 'mastered')}
                      style={{ color: '#059669', borderColor: '#a7f3d0' }}
                    >
                      <CheckCircle size={13} />
                      <span>Master</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="hint-btn"
                      onClick={() => handleStatusChange(item, 'learning')}
                    >
                      <span>Re-learn</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
