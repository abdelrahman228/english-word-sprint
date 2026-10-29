import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Timer } from '../components/Timer';

describe('Timer Component', () => {
  it('renders with id="timer-display" and role="timer" with accessible label', () => {
    render(<Timer timeLeft={60} totalDuration={60} />);

    const timer = document.getElementById('timer-display');
    expect(timer).toBeInTheDocument();
    expect(timer).toHaveAttribute('role', 'timer');
    expect(timer).toHaveAttribute('aria-label', 'Time remaining: 1:00');
  });

  it('renders time with tabular-nums in .timer-val without jitter', () => {
    render(<Timer timeLeft={9} totalDuration={60} />);

    const timerVal = document.querySelector('.timer-val');
    expect(timerVal).toBeInTheDocument();
    expect(timerVal).toHaveTextContent('0:09');
  });

  it('calculates ring fraction and strokeDashoffset at 100%, 30%, and 0%', () => {
    const totalDuration = 60;
    const size = 70;
    const strokeWidth = 5.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // 1. At 100% time left
    const { unmount: unmount100 } = render(<Timer timeLeft={60} totalDuration={totalDuration} />);
    const timer100 = document.getElementById('timer-display');
    expect(timer100).toHaveAttribute('data-fraction', '1.00');
    const circle100 = screen.getByTestId('timer-ring-progress');
    expect(parseFloat(circle100.getAttribute('stroke-dashoffset') || '')).toBeCloseTo(0, 1);
    unmount100();

    // 2. At 30% time left (18s / 60s)
    const { unmount: unmount30 } = render(<Timer timeLeft={18} totalDuration={totalDuration} />);
    const timer30 = document.getElementById('timer-display');
    expect(timer30).toHaveAttribute('data-fraction', '0.30');
    const circle30 = screen.getByTestId('timer-ring-progress');
    const expectedOffset30 = circumference * 0.7;
    expect(parseFloat(circle30.getAttribute('stroke-dashoffset') || '')).toBeCloseTo(expectedOffset30, 1);
    unmount30();

    // 3. At 0% time left (0s / 60s)
    render(<Timer timeLeft={0} totalDuration={totalDuration} />);
    const timer0 = document.getElementById('timer-display');
    expect(timer0).toHaveAttribute('data-fraction', '0.00');
    const circle0 = screen.getByTestId('timer-ring-progress');
    expect(parseFloat(circle0.getAttribute('stroke-dashoffset') || '')).toBeCloseTo(circumference, 1);
  });

  it('sets warning state when <= 30% left and > 10s', () => {
    // 60s duration: 18s is exactly 30% (> 10s)
    const { unmount: unmount18 } = render(<Timer timeLeft={18} totalDuration={60} />);
    const timer18 = document.getElementById('timer-display');
    expect(timer18).toHaveClass('warning');
    expect(timer18).not.toHaveClass('urgent');
    expect(timer18).toHaveAttribute('data-state', 'warning');
    unmount18();

    // 60s duration: 25s is ~41% (> 30%)
    render(<Timer timeLeft={25} totalDuration={60} />);
    const timer25 = document.getElementById('timer-display');
    expect(timer25).not.toHaveClass('warning');
    expect(timer25).not.toHaveClass('urgent');
    expect(timer25).toHaveAttribute('data-state', 'normal');
  });

  it('sets urgent state and preserves threshold when <= 10s', () => {
    // 11s: not urgent
    const { unmount: unmount11 } = render(<Timer timeLeft={11} totalDuration={60} />);
    const timer11 = document.getElementById('timer-display');
    expect(timer11).not.toHaveClass('urgent');
    unmount11();

    // 10s: exactly at threshold -> urgent
    const { unmount: unmount10 } = render(<Timer timeLeft={10} totalDuration={60} />);
    const timer10 = document.getElementById('timer-display');
    expect(timer10).toHaveClass('urgent');
    expect(timer10).toHaveAttribute('data-state', 'urgent');
    unmount10();

    // 5s: urgent
    const { unmount: unmount5 } = render(<Timer timeLeft={5} totalDuration={60} />);
    const timer5 = document.getElementById('timer-display');
    expect(timer5).toHaveClass('urgent');
    unmount5();

    // 0s: urgent
    render(<Timer timeLeft={0} totalDuration={60} />);
    const timer0 = document.getElementById('timer-display');
    expect(timer0).toHaveClass('urgent');
  });

  it('announces politely only at 10 and 5 seconds, not every second', () => {
    // 20 seconds: no announcement
    const { rerender } = render(<Timer timeLeft={20} totalDuration={60} />);
    const liveRegion = document.querySelector('.sr-only[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveTextContent('');

    // 11 seconds: still empty
    rerender(<Timer timeLeft={11} totalDuration={60} />);
    expect(liveRegion).toHaveTextContent('');

    // 10 seconds: announces 10 seconds remaining
    rerender(<Timer timeLeft={10} totalDuration={60} />);
    expect(liveRegion).toHaveTextContent('10 seconds remaining');

    // 9 seconds: cleared (does not announce every second)
    rerender(<Timer timeLeft={9} totalDuration={60} />);
    expect(liveRegion).toHaveTextContent('');

    // 5 seconds: announces 5 seconds remaining
    rerender(<Timer timeLeft={5} totalDuration={60} />);
    expect(liveRegion).toHaveTextContent('5 seconds remaining');

    // 4 seconds: cleared
    rerender(<Timer timeLeft={4} totalDuration={60} />);
    expect(liveRegion).toHaveTextContent('');

    // 0 seconds: cleared
    rerender(<Timer timeLeft={0} totalDuration={60} />);
    expect(liveRegion).toHaveTextContent('');
  });

  it('safely clamps negative timeLeft values', () => {
    render(<Timer timeLeft={-5} totalDuration={60} />);
    const timer = document.getElementById('timer-display');
    expect(timer).toHaveAttribute('data-fraction', '0.00');
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });
});
