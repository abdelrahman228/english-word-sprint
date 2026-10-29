import React from 'react';

export interface TimerProps {
  timeLeft: number;
  totalDuration: number;
}

export const Timer: React.FC<TimerProps> = ({ timeLeft, totalDuration }) => {
  const safeDuration = totalDuration > 0 ? totalDuration : 60;
  const clampedTime = Math.max(0, timeLeft);
  const fraction = Math.min(1, Math.max(0, clampedTime / safeDuration));

  const isUrgent = clampedTime <= 10;
  const isWarning = !isUrgent && fraction <= 0.3;

  const stateClass = isUrgent ? 'urgent' : isWarning ? 'warning' : '';
  const stateName = isUrgent ? 'urgent' : isWarning ? 'warning' : 'normal';

  // SVG ring dimensions
  const size = 70;
  const strokeWidth = 5.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - fraction);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formattedTime = formatTime(clampedTime);

  // Polite announcement at 10s and 5s only
  const liveAnnouncement = clampedTime === 10
    ? '10 seconds remaining'
    : clampedTime === 5
    ? '5 seconds remaining'
    : '';

  return (
    <div
      id="timer-display"
      className={`timer-chip ${stateClass}`.trim()}
      data-state={stateName}
      data-fraction={fraction.toFixed(2)}
      role="timer"
      aria-label={`Time remaining: ${formattedTime}`}
    >
      <div className="timer-ring-wrap">
        <svg
          className="timer-ring-svg"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          {/* Background Track */}
          <circle
            className="timer-ring-track"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Countdown Progress Circle */}
          <circle
            className="timer-ring-progress"
            data-testid="timer-ring-progress"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="timer-val" aria-hidden="true">
          {formattedTime}
        </div>
      </div>
      <div className="stat-chip-label">Time Remaining</div>

      {/* Screen-reader polite live announcement (only at 10s and 5s) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>
    </div>
  );
};
