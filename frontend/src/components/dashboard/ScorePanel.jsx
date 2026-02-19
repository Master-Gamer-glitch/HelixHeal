import React, { useEffect, useRef, useState } from 'react';

/* ── Animated count-up ─────────────────────────────────────── */
function useCountUp(target, duration = 1200) {
    const [value, setValue] = useState(0);
    const prev = useRef(0);
    useEffect(() => {
        const from = prev.current;
        const to = Number(target) || 0;
        if (from === to) return;
        const start = performance.now();
        const raf = (now) => {
            const pct = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - pct, 3);
            setValue(Math.round(from + (to - from) * eased));
            if (pct < 1) requestAnimationFrame(raf);
            else prev.current = to;
        };
        requestAnimationFrame(raf);
    }, [target, duration]);
    return value;
}

/* ── Radial ring constants ────────────────────────────────── */
const R = 56;  // radius
const CIRC = 2 * Math.PI * R;  // circumference ≈ 351.9

const getColor = (score) => {
    if (score >= 80) return ['#00e5a0', '#3dffd0'];
    if (score >= 50) return ['#ffbb00', '#ffd760'];
    return ['#ff3b3b', '#ff7070'];
};

const ScorePanel = ({ score }) => {
    if (!score) return null;

    const { speed_bonus = 0, efficiency_penalty = 0, final_score = 0 } = score;
    const displayed = useCountUp(final_score);
    const pct = Math.min(100, Math.max(0, final_score));
    const dashOffset = CIRC * (1 - pct / 100);
    const [c1, c2] = getColor(final_score);

    return (
        <div className="card">
            <div className="card-title">
                <svg className="card-title-icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1 2 2 0 0 0 2 2 1 1 0 0 0 1-1v-.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5V10a1 1 0 0 0 1 1 2 2 0 0 0 2-2 1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2V1.866z" />
                </svg>
                Score Breakdown
            </div>

            {/* Radial ring */}
            <div className="score-ring-wrapper">
                <div className="score-ring">
                    <svg viewBox="0 0 140 140">
                        <defs>
                            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={c1} />
                                <stop offset="100%" stopColor={c2} />
                            </linearGradient>
                        </defs>
                        <circle className="score-ring-bg" cx="70" cy="70" r={R} />
                        <circle
                            className="score-ring-fill"
                            cx="70" cy="70" r={R}
                            stroke="url(#scoreGrad)"
                            strokeDasharray={CIRC}
                            strokeDashoffset={dashOffset}
                            style={{ filter: `drop-shadow(0 0 12px ${c1}88)` }}
                        />
                    </svg>
                    <div className="score-ring-text">
                        <span
                            className="score-number"
                            style={{
                                background: `linear-gradient(135deg, #fff 0%, ${c1} 100%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            {displayed}
                        </span>
                        <span className="score-label">/ 100</span>
                    </div>
                </div>
            </div>

            {/* Bar */}
            <div className="score-bar-track">
                <div
                    className="score-bar-fill"
                    style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${c1} 0%, ${c2} 100%)`,
                        boxShadow: `0 0 20px ${c1}80`,
                    }}
                />
            </div>

            {/* Breakdown */}
            <div className="score-items" style={{ marginTop: 16 }}>
                <div className="score-item">
                    <span className="score-item-label">Base Score</span>
                    <span className="score-item-value">{score.base_score ?? 100}</span>
                </div>
                {speed_bonus !== 0 && (
                    <div className="score-item">
                        <span className="score-item-label">⚡ Speed Bonus (&lt; 5 min)</span>
                        <span className="score-item-value positive">+{speed_bonus}</span>
                    </div>
                )}
                {efficiency_penalty !== 0 && (
                    <div className="score-item">
                        <span className="score-item-label">⚠ Efficiency Penalty</span>
                        <span className="score-item-value negative">−{efficiency_penalty}</span>
                    </div>
                )}
                {(score.ci_penalty ?? 0) > 0 && (
                    <div className="score-item">
                        <span className="score-item-label">🔴 CI Still Failing (cap 50)</span>
                        <span className="score-item-value negative">−{score.ci_penalty}</span>
                    </div>
                )}
                <div className="score-item" style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 14 }}>
                    <span className="score-item-label" style={{ color: 'var(--text)', fontWeight: 700 }}>Final Score</span>
                    <span className="score-item-value total">{final_score}</span>
                </div>
            </div>
        </div>
    );
};

export default ScorePanel;
