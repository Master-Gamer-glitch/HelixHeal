import React, { useEffect, useRef, useState } from 'react';

/* ── Animated count-up hook ─────────────────────────────────── */
function useCountUp(target, duration = 800) {
    const [value, setValue] = useState(0);
    const prev = useRef(0);
    useEffect(() => {
        const from = prev.current;
        const to = Number(target) || 0;
        if (from === to) return;
        const start = performance.now();
        const raf = (now) => {
            const pct = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - pct, 3); // ease-out-cubic
            setValue(Math.round(from + (to - from) * eased));
            if (pct < 1) requestAnimationFrame(raf);
            else prev.current = to;
        };
        requestAnimationFrame(raf);
    }, [target, duration]);
    return value;
}

const CIBadge = ({ status }) => {
    const normalized = (status || '').toUpperCase();
    const cls = normalized === 'PASSED' ? 'passed' : normalized === 'RUNNING' ? 'running' : 'failed';
    return (
        <span className={`ci-badge ${cls}`}>
            <span className="ci-badge-dot" />
            {normalized || 'UNKNOWN'}
        </span>
    );
};

const MetaItem = ({ label, value, valueClass = '' }) => (
    <div className="summary-meta-item">
        <span className="summary-meta-label">{label}</span>
        <span className={`summary-meta-val ${valueClass}`}>{value || '—'}</span>
    </div>
);

const RunSummaryCard = ({ result }) => {
    if (!result) return null;
    const { repository, team, branch_created, summary, status } = result;

    const failures = useCountUp(summary?.total_failures ?? 0);
    const fixes = useCountUp(summary?.total_fixes ?? 0);
    const iters = useCountUp(summary?.iterations_used ?? 0);
    const timeTaken = summary?.time_taken_seconds;

    const truncRepo = repository?.length > 50
        ? '…' + repository.slice(-47)
        : repository;

    const formatTime = (s) => {
        if (!s) return '—';
        if (s < 60) return `${s}s`;
        return `${Math.floor(s / 60)}m ${s % 60}s`;
    };

    return (
        <div className="card">
            <div className="card-title">
                <svg className="card-title-icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zM9 2.5A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zM1 10.5A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zM9 10.5A1.5 1.5 0 0110.5 9h3A1.5 1.5 0 0115 10.5v3A1.5 1.5 0 0113.5 15h-3A1.5 1.5 0 019 13.5v-3z" />
                </svg>
                Run Summary
                <span style={{ marginLeft: 'auto' }}>
                    <CIBadge status={summary?.ci_status || status} />
                </span>
            </div>

            {/* Meta row */}
            <div className="summary-meta">
                <MetaItem label="Repository" value={
                    <span className="text-mono" style={{ fontSize: 11, color: 'var(--blue)' }}>{truncRepo}</span>
                } />
                {team && (
                    <>
                        <MetaItem label="Team" value={team.name} />
                        <MetaItem label="Leader" value={team.leader} />
                    </>
                )}
                {branch_created && (
                    <MetaItem label="Branch" value={
                        <span className="text-mono" style={{ fontSize: 11, color: 'var(--purple)' }}>{branch_created}</span>
                    } />
                )}
            </div>

            {/* Stats */}
            <div className="summary-grid">
                <div className="summary-stat">
                    <div className="summary-stat-label">Failures</div>
                    <div className="summary-stat-value text-red">{failures}</div>
                </div>
                <div className="summary-stat">
                    <div className="summary-stat-label">Fixes</div>
                    <div className="summary-stat-value text-green">{fixes}</div>
                </div>
                <div className="summary-stat">
                    <div className="summary-stat-label">Iterations</div>
                    <div className="summary-stat-value text-blue">{iters}</div>
                </div>
                <div className="summary-stat">
                    <div className="summary-stat-label">Time</div>
                    <div className="summary-stat-value">{formatTime(timeTaken)}</div>
                </div>
            </div>
        </div>
    );
};

export default RunSummaryCard;
