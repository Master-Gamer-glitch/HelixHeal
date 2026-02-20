import React, { useEffect, useState, useRef } from 'react';
import useAgentStore from '../store/agentStore';
import ProgressBar from './ProgressBar';

const PLACEHOLDER_REPOS = [
    'https://github.com/psf/requests',
    'https://github.com/pallets/flask',
    'https://github.com/encode/httpx',
    'https://github.com/fastapi/fastapi',
];

const InputSection = () => {
    const {
        repoUrl, teamName, teamLeader, githubToken, retryLimit, status, result,
        setField, submitJob, reset,
    } = useAgentStore();

    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const [placeholder, setPlaceholder] = useState('');
    const phRef = useRef(null);

    const isRunning = status === 'running';
    const isDone = status === 'completed' || status === 'failed';

    // Cycle animated placeholder repos
    useEffect(() => {
        if (repoUrl || isRunning) return;
        let charIdx = 0;
        const target = PLACEHOLDER_REPOS[placeholderIdx];
        setPlaceholder('');
        const typeInterval = setInterval(() => {
            charIdx++;
            setPlaceholder(target.slice(0, charIdx));
            if (charIdx >= target.length) {
                clearInterval(typeInterval);
                phRef.current = setTimeout(() => {
                    setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_REPOS.length);
                }, 2400);
            }
        }, 28);
        return () => {
            clearInterval(typeInterval);
            if (phRef.current) clearTimeout(phRef.current);
        };
    }, [placeholderIdx, isRunning, repoUrl]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!repoUrl.trim() || !teamName.trim() || !teamLeader.trim()) return;
        submitJob();
    };

    const downloadResults = () => {
        if (!result) return;

        const branchName = `${teamName.replace(/\s+/g, '_').toUpperCase()}_${teamLeader.replace(/\s+/g, '_').toUpperCase()}_AI_FIX`;

        const output = {
            repository: repoUrl,
            team: {
                name: teamName,
                leader: teamLeader,
            },
            branch_created: branchName,
            summary: {
                total_failures: result.total_failures ?? result.fixes?.length ?? 0,
                total_fixes: result.fixes?.filter(f => f.status === 'Fixed').length ?? 0,
                ci_status: result.ci_timeline?.slice(-1)[0]?.status ?? result.ci_status ?? 'UNKNOWN',
                time_taken_seconds: result.time_taken_seconds ?? 0,
                iterations_used: result.ci_timeline?.length ?? 0,
            },
            score: {
                base_score: result.score?.base_score ?? 100,
                speed_bonus: result.score?.speed_bonus ?? 0,
                efficiency_penalty: result.score?.efficiency_penalty ?? 0,
                ci_penalty: result.score?.ci_penalty ?? 0,
                final_score: result.score?.final_score ?? 0,
            },
            fixes: (result.fixes || []).map(f => ({
                file: f.file,
                bug_type: f.bug_type,
                line: f.line,
                commit_message: f.commit_message || `[AI-AGENT] Fix ${f.bug_type} in ${f.file}`,
                status: f.status,
            })),
            ci_timeline: (result.ci_timeline || []).map(t => ({
                iteration: t.iteration,
                status: t.status,
                timestamp: t.timestamp,
                ...(t.post_status ? { post_status: t.post_status } : {}),
            })),
        };

        const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'results.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <section className="input-section">
            <div className="card">
                <div className="card-title">
                    <svg className="card-title-icon" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    Configure Agent Run
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label className="form-label" htmlFor="repoUrl">GitHub Repository URL</label>
                        <input
                            id="repoUrl"
                            className="form-input"
                            type="url"
                            placeholder={placeholder || 'https://github.com/owner/repository'}
                            value={repoUrl}
                            onChange={(e) => setField('repoUrl', e.target.value)}
                            disabled={isRunning}
                            required
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="teamName">Team Name</label>
                            <input
                                id="teamName"
                                className="form-input"
                                type="text"
                                placeholder="RIFT ORGANISERS"
                                value={teamName}
                                onChange={(e) => setField('teamName', e.target.value)}
                                disabled={isRunning}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="teamLeader">Team Leader Name</label>
                            <input
                                id="teamLeader"
                                className="form-input"
                                type="text"
                                placeholder="Saiyam Kumar"
                                value={teamLeader}
                                onChange={(e) => setField('teamLeader', e.target.value)}
                                disabled={isRunning}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="githubToken">
                            GitHub Token{' '}
                            <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-3)', fontSize: 11 }}>
                                (optional — needed to push branch)
                            </span>
                        </label>
                        <input
                            id="githubToken"
                            className="form-input"
                            type="password"
                            placeholder="ghp_••••••••••••••••••••"
                            value={githubToken}
                            onChange={(e) => setField('githubToken', e.target.value)}
                            disabled={isRunning}
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="retryLimit">
                            Retry Limit — max fix iterations
                        </label>
                        <div className="form-range">
                            <input
                                id="retryLimit"
                                type="range"
                                min={1}
                                max={10}
                                step={1}
                                value={retryLimit}
                                onChange={(e) => setField('retryLimit', Number(e.target.value))}
                                disabled={isRunning}
                            />
                            <span className="form-range-value">{retryLimit}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            type="submit"
                            className="btn-primary"
                            id="run-agent-btn"
                            disabled={isRunning}
                            style={{ flex: 1 }}
                        >
                            {isRunning ? (
                                <><span className="spinner" />Running Agent...</>
                            ) : (
                                '⚡ Run Agent'
                            )}
                        </button>
                        {isDone && (
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={reset}
                                style={{ flexShrink: 0 }}
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {isDone && result && (
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={downloadResults}
                            style={{ marginTop: 12 }}
                        >
                            📥 Download results.json
                        </button>
                    )}
                </form>

                <ProgressBar />
            </div>
        </section>
    );
};

export default InputSection;
