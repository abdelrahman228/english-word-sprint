import React, { useEffect, useRef } from 'react';
import { Check, X, AlertTriangle, Lightbulb, Volume2 } from 'lucide-react';
import type { AnswerValidationResult, CategoryInfo } from '../types';
import { soundService } from '../services/soundService';

interface CategoryInputProps {
  category: CategoryInfo;
  index: number;
  value: string;
  onChange: (val: string) => void;
  onEnterNext: (currentIndex: number) => void;
  result?: AnswerValidationResult;
  isFirst: boolean;
  disabled: boolean;
  requiredLetter: string;
  onRevealHint?: (category: CategoryInfo) => void;
  showHintButton: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
}

export const CategoryInput: React.FC<CategoryInputProps> = ({
  category,
  index,
  value,
  onChange,
  onEnterNext,
  result,
  isFirst,
  disabled,
  requiredLetter,
  onRevealHint,
  showHintButton,
  inputRef
}) => {
  const localRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isFirst && localRef.current) {
      localRef.current.focus();
    }
  }, [requiredLetter, isFirst]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // IME safe check using nativeEvent
      const isComposing = e.nativeEvent.isComposing || (e as unknown as { keyCode: number }).keyCode === 229;
      if (isComposing) {
        return;
      }
      onEnterNext(index);
    }
  };

  const getStatusClass = () => {
    if (!result) return '';
    if (result.status === 'valid') return 'is-valid';
    if (result.status === 'invalid') return 'is-invalid';
    if (result.status === 'duplicate') return 'is-duplicate';
    return '';
  };

  return (
    <div className={`category-row ${getStatusClass()}`} id={`row-${category.id}`}>
      {/* Category Info */}
      <div className="category-meta">
        <label htmlFor={`input-${category.id}`} className="category-label">
          <span>{category.name}</span>
          <span className="category-arabic">{category.arabicName}</span>
        </label>
        <span className="category-desc">{category.description}</span>
      </div>

      {/* Input Field */}
      <div className="category-input-wrap">
        <input
          id={`input-${category.id}`}
          ref={(el) => {
            localRef.current = el;
            if (inputRef) inputRef(el);
          }}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={category.placeholder}
          className="category-input"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />

        {/* Validation Feedback Message */}
        {result && result.status !== 'empty' && (
          <div className={`category-feedback ${result.status}`}>
            {result.status === 'valid' && <Check size={14} />}
            {result.status === 'invalid' && <X size={14} />}
            {result.status === 'duplicate' && <AlertTriangle size={14} />}
            <span>{result.message}</span>
            {result.arabicMeaning && (
              <span className="arabic-text" style={{ marginRight: '0.4rem', fontWeight: 600 }}>
                ({result.arabicMeaning})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Badges / Hint / Audio */}
      <div className="category-actions">
        {result && (
          <div className={`status-badge ${result.status}`} title={result.message}>
            {result.status === 'valid' && <Check size={16} />}
            {result.status === 'invalid' && <X size={16} />}
            {result.status === 'duplicate' && <AlertTriangle size={16} />}
            {result.status === 'empty' && <span style={{ fontSize: '0.75rem' }}>—</span>}
          </div>
        )}

        {result?.status === 'valid' && (
          <button
            type="button"
            className="hint-btn"
            onClick={() => soundService.speak(result.word || value)}
            title="Listen to pronunciation"
            style={{ padding: '0.4rem 0.5rem' }}
          >
            <Volume2 size={16} />
          </button>
        )}

        {showHintButton && (!result || result.status !== 'valid') && (
          <button
            type="button"
            className="hint-btn"
            onClick={() => onRevealHint && onRevealHint(category)}
            title={`Reveal a hint for ${category.name}`}
          >
            <Lightbulb size={14} />
            <span>Hint</span>
          </button>
        )}
      </div>
    </div>
  );
};
