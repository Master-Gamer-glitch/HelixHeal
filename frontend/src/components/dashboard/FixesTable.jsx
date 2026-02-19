import React, { useState } from 'react';

const BugTypeBadge = ({ type }) => {
    const colors = {
        IMPORT: { color: 'var(--amber)', bg: 'rgba(255,187,0,0.12)', border: 'rgba(255,187,0,0.25)' },
        SYNTAX: { color: 'var(--red)', bg: 'rgba(255,59,59,0.12)', border: 'rgba(255,59,59,0.25)' },
        LOGIC: { color: '#b89aff', bg: 'rgba(155,109,255,0.12)', border: 'rgba(155,109,255,0.25)' },
        INDENTATION: { color: 'var(--blue)', bg: 'rgba(61,159,255,0.12)', border: 'rgba(61,159,255,0.25)' },
        LINTING: { color: 'var(--green)', bg: 'rgba(0,229,160,0.12)', border: 'rgba(0,229,160,0.25)' },
        TYPE_ERROR: { color: '#ff9f2e', bg: 'rgba(255,159,46,0.12)', border: 'rgba(255,159,46,0.25)' },
        UNKNOWN: { color: 'var(--text-3)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' },
    };
    const c = colors[type] || colors.UNKNOWN;
    return (
        <span className="bug-type-badge" style={{ color: c.color, background: c.bg, borderColor: c.border }}>
            {type}
        </span>
    );
};

const DiffRow = ({ fix, colSpan }) => {
    if (!fix.original_code && !fix.fixed_code) return null;
    return (
        <tr className="diff-row">
            <td colSpan={colSpan} style={{ padding: 0 }}>
                <div className="diff-content">
                    {fix.original_code && (
                        <div className="diff-block original">
                            <div className="diff-block-header">Before</div>
                            <pre>{fix.original_code}</pre>
                        </div>
                    )}
                    {fix.fixed_code && (
                        <div className="diff-block fixed">
                            <div className="diff-block-header">After</div>
                            <pre>{fix.fixed_code}</pre>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
};

const FixRow = ({ fix, index }) => {
    const [expanded, setExpanded] = useState(false);
    const hasDiff = fix.original_code || fix.fixed_code;

    return (
        <>
            <tr data-type={fix.bug_type}>
                <td>
                    <span className="file-path">{fix.file}</span>
                </td>
                <td>
                    <BugTypeBadge type={fix.bug_type} />
                </td>
                <td>
                    <span className="text-mono" style={{ color: 'var(--text-3)', fontSize: 12 }}>
                        {fix.line ?? '—'}
                    </span>
                </td>
                <td>
                    <span className="commit-msg" title={fix.commit_message}>
                        {fix.commit_message}
                    </span>
                </td>
                <td>
                    <span className={`badge ${fix.status === 'Fixed' ? 'badge-fixed' : fix.status === 'Failed' ? 'badge-failed' : fix.status === 'Skipped' ? 'badge-pending' : 'badge-pending'}`}>
                        {fix.status}
                    </span>
                </td>
                <td>
                    {hasDiff && (
                        <button
                            className="diff-toggle"
                            onClick={() => setExpanded((v) => !v)}
                            title="Toggle diff view"
                            aria-expanded={expanded}
                        >
                            {expanded ? '▲' : '▼'} diff
                        </button>
                    )}
                </td>
            </tr>
            {expanded && <DiffRow fix={fix} colSpan={6} />}
        </>
    );
};

const FixesTable = ({ fixes }) => {
    if (!fixes || fixes.length === 0) {
        return (
            <div className="card">
                <div className="card-title">
                    <svg className="card-title-icon" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 .5a.5.5 0 01.448.276l7 14a.5.5 0 01-.448.724H1a.5.5 0 01-.448-.724l7-14A.5.5 0 018 .5z" />
                    </svg>
                    Fixes Applied
                </div>
                <div className="empty-state">
                    <span className="empty-state-icon">🔍</span>
                    No fixes recorded yet.
                </div>
            </div>
        );
    }

    const fixedCount = fixes.filter((f) => f.status === 'Fixed').length;

    return (
        <div className="card">
            <div className="card-title">
                <svg className="card-title-icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M10.97 4.97a.75.75 0 011.07 1.05l-3.99 4.99a.75.75 0 01-1.08.02L4.324 8.384a.75.75 0 111.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 01.02-.022z" />
                </svg>
                Fixes Applied
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'none', letterSpacing: 0, color: 'var(--green)' }}>
                        {fixedCount}/{fixes.length} fixed
                    </span>
                </div>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Bug Type</th>
                            <th>Line</th>
                            <th>Commit</th>
                            <th>Status</th>
                            <th style={{ width: 64 }}>Diff</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fixes.map((fix, i) => (
                            <FixRow key={i} fix={fix} index={i} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FixesTable;
