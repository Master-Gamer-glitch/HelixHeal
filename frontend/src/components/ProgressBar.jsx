import React, { useEffect, useState } from 'react';
import useAgentStore from '../store/agentStore';

const PIPELINE_STEPS = [
    { name: 'Analyzer', threshold: 15 },
    { name: 'Test Runner', threshold: 30 },
    { name: 'Classifier', threshold: 50 },
    { name: 'Fix Gen', threshold: 70 },
    { name: 'Commit', threshold: 85 },
    { name: 'CI Monitor', threshold: 95 },
];

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

const ProgressBar = () => {
    const { result, status, elapsedTime } = useAgentStore();
    const [displayStep, setDisplayStep] = useState('');
    const progress = result?.progress ?? 0;
    const step = result?.current_step ?? (status === 'running' ? 'Initializing...' : '');

    // Typing effect for step text
    useEffect(() => {
        if (!step) return;
        setDisplayStep('');
        let i = 0;
        const t = setInterval(() => {
            i++;
            setDisplayStep(step.slice(0, i));
            if (i >= step.length) clearInterval(t);
        }, 18);
        return () => clearInterval(t);
    }, [step]);

    if (status !== 'running') return null;

    // Determine which pipeline step is active
    const activeStep = PIPELINE_STEPS.findLastIndex((s) => progress >= s.threshold);

    return (
        <div className="progress-wrapper animate-enter" role="status" aria-live="polite">
            <div className="progress-header">
                <span className="progress-step-text">
                    <span className="spinner" aria-hidden="true" />
                    <span>{displayStep || step}</span>
                </span>
                <span className="progress-pct">{progress}%</span>
            </div>

            <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>

            {/* Pipeline step nodes */}
            <div className="pipeline-steps" aria-hidden="true">
                {PIPELINE_STEPS.map((s, i) => {
                    const isDone = i < activeStep;
                    const isActive = i === activeStep;
                    return (
                        <div key={s.name} className={`p-step ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                            <div className="p-step-dot">
                                {isDone ? '✓' : i + 1}
                            </div>
                            <span className="p-step-name">{s.name}</span>
                        </div>
                    );
                })}
            </div>

            {elapsedTime > 0 && (
                <div className="progress-elapsed">
                    ⏱ {formatTime(elapsedTime)} elapsed
                </div>
            )}
        </div>
    );
};

export default ProgressBar;
