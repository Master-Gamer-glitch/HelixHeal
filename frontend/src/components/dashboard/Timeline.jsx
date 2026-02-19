import React, { useState } from 'react';

const CIBadge = ({ status }) => {
    const s = (status || '').toUpperCase();
    const cls = s === 'PASSED' ? 'passed' : 'failed';
    return (
        <span className={`ci-badge ${cls}`}>
            <span className="ci-badge-dot" />
            {s}
        </span>
    );
};

const TimelineItem = ({ point, total, isLast }) => {
    const [expanded, setExpanded] = useState(false);
    const { iteration, status, timestamp, failures, post_status, post_failures } = point;

    const isPassed = status === 'PASSED' || post_status === 'PASSED';
    const dotClass = `${(status === 'PASSED' ? 'passed' : 'failed')}${isLast ? ' current' : ''}`;

    const ts = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    const displayFailures = post_failures?.length > 0 ? post_failures : failures;
    const hasFailures = displayFailures?.length > 0;

    return (
        <div className="timeline-item">
            <div className={`timeline-dot ${dotClass}`}>{iteration}</div>
            <div className="timeline-content">
                <div className="timeline-header">
                    <span className="timeline-iteration">Iteration {iteration}/{total}</span>
                    <CIBadge status={status} />
                    {post_status && post_status !== status && (
                        <>
                            <span className="timeline-arrow">→</span>
                            <CIBadge status={post_status} />
                        </>
                    )}
                    {ts && <span className="timeline-timestamp">{ts}</span>}
                    {hasFailures && !isPassed && (
                        <button
                            onClick={() => setExpanded((v) => !v)}
                            style={{
                                marginLeft: 'auto',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-3)',
                                cursor: 'pointer',
                                fontSize: 11,
                                padding: '2px 6px',
                                borderRadius: 4,
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={(e) => (e.target.style.color = 'var(--red)')}
                            onMouseLeave={(e) => (e.target.style.color = 'var(--text-3)')}
                        >
                            {expanded ? '▲ hide' : '▼ details'}
                        </button>
                    )}
                </div>
                {expanded && hasFailures && (
                    <div className="timeline-failures">
                        {displayFailures.slice(0, 6).map((f, i) => (
                            <div key={i} style={{ padding: '2px 0', borderBottom: i < displayFailures.slice(0, 6).length - 1 ? '1px solid rgba(255,59,59,0.08)' : 'none' }}>
                                {f}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const Timeline = ({ timeline }) => {
    if (!timeline || timeline.length === 0) {
        return (
            <div className="card">
                <div className="card-title">
                    <svg className="card-title-icon" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 3.5a.5.5 0 00-1 0V9a.5.5 0 00.252.434l3.5 2a.5.5 0 00.496-.868L8 8.71V3.5z" />
                        <path d="M8 16A8 8 0 108 0a8 8 0 000 16z" />
                    </svg>
                    CI/CD Timeline
                </div>
                <div className="empty-state">
                    <span className="empty-state-icon">⏱</span>
                    No iterations yet.
                </div>
            </div>
        );
    }

    const passed = timeline.filter((t) => t.status === 'PASSED' || t.post_status === 'PASSED').length;
    const total = timeline.length;

    return (
        <div className="card">
            <div className="card-title">
                <svg className="card-title-icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 3.5a.5.5 0 00-1 0V9a.5.5 0 00.252.434l3.5 2a.5.5 0 00.496-.868L8 8.71V3.5z" />
                    <path d="M8 16A8 8 0 108 0a8 8 0 000 16z" />
                </svg>
                <span className="card-tag initial">initial</span>
                CI/CD Timeline
                <span style={{
                    marginLeft: 'auto',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'none',
                    letterSpacing: 0,
                    color: passed === total ? 'var(--green)' : 'var(--text-2)',
                }}>
                    {passed}/{total} passed
                </span>
            </div>

            <div className="timeline">
                {timeline.map((point, i) => (
                    <TimelineItem
                        key={i}
                        point={point}
                        total={total}
                        isLast={i === timeline.length - 1}
                    />
                ))}
            </div>
        </div>
    );
};

export default Timeline;
