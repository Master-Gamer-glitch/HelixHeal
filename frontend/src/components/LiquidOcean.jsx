import React, { useEffect, useRef } from 'react';

/* ── Debug log lines for the overlay ──────────────────────── */
const DEBUG_LINES = [
    '$ git clone https://github.com/user/repo.git',
    '[CLONE] Repository cloned successfully',
    '$ npm test -- --reporter=json',
    '[TEST]  ✗ 12 tests failed, 43 passed, 2 skipped',
    '[ANALYZE] Parsing failure traces...',
    '[CLASSIFY] TypeError: Cannot read property \'map\' of undefined',
    '[CLASSIFY] AssertionError: expected 200 but got 500',
    '[FIX-GEN] Generating patch for src/api/routes.js:42',
    '  - const data = response.map(item => item.id)',
    '  + const data = (response || []).map(item => item.id)',
    '[FIX-GEN] Generating patch for tests/auth.test.js:18',
    '[COMMIT] Applying fix to branch helix/auto-fix-001',
    '$ git push origin helix/auto-fix-001',
    '[CI] Pipeline triggered — waiting for results...',
    '[CI] ✓ All 55 tests passing',
    '[DONE] Fix verified and committed successfully',
];

/* ── Canvas wave grid animation ───────────────────────────── */
function drawWaveGrid(ctx, w, h, time) {
    ctx.clearRect(0, 0, w, h);

    const cols = 40;
    const rows = 20;
    const cellW = w / cols;
    const cellH = h / rows;

    // Draw horizontal lines
    for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
            const x = c * cellW;
            const baseY = r * cellH;
            const wave = Math.sin(c * 0.3 + time * 0.8) * 8 +
                Math.cos(r * 0.5 + time * 0.6) * 5 +
                Math.sin((c + r) * 0.2 + time * 1.2) * 3;
            const y = baseY + wave;

            if (c === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        const alpha = 0.04 + (r / rows) * 0.12;
        ctx.strokeStyle = `rgba(212, 32, 32, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    // Draw vertical lines
    for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        for (let r = 0; r <= rows; r++) {
            const x = c * cellW;
            const baseY = r * cellH;
            const wave = Math.sin(c * 0.3 + time * 0.8) * 8 +
                Math.cos(r * 0.5 + time * 0.6) * 5 +
                Math.sin((c + r) * 0.2 + time * 1.2) * 3;
            const y = baseY + wave;

            if (r === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        const alpha = 0.03 + (c / cols) * 0.08;
        ctx.strokeStyle = `rgba(212, 32, 32, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    // Draw "pillars" bobbing on waves
    const pillarPositions = [5, 12, 20, 28, 35];
    const pillarRow = Math.floor(rows * 0.6);
    pillarPositions.forEach((col) => {
        const x = col * cellW;
        const baseY = pillarRow * cellH;
        const wave = Math.sin(col * 0.3 + time * 0.8) * 8 +
            Math.cos(pillarRow * 0.5 + time * 0.6) * 5;
        const y = baseY + wave;
        const pillarH = 30 + Math.sin(col + time) * 10;

        ctx.fillStyle = 'rgba(212, 32, 32, 0.15)';
        ctx.fillRect(x - 2, y - pillarH, 4, pillarH);

        // Glow tip
        ctx.beginPath();
        ctx.arc(x, y - pillarH, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 50, 50, 0.4)';
        ctx.fill();
    });
}

/* ── Main component ───────────────────────────────────────── */
export default function LiquidOcean() {
    const canvasRef = useRef(null);
    const terminalRef = useRef(null);

    // Canvas wave animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let raf;
        let time = 0;

        const resize = () => {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = 300;
        };
        resize();
        window.addEventListener('resize', resize);

        const animate = () => {
            time += 0.016;
            drawWaveGrid(ctx, canvas.width, canvas.height, time);
            raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, []);

    // Terminal typing animation
    useEffect(() => {
        const el = terminalRef.current;
        if (!el) return;
        let lineIdx = 0;
        let charIdx = 0;
        let timeout;

        const typeLine = () => {
            if (lineIdx >= DEBUG_LINES.length) {
                // Reset after a pause
                timeout = setTimeout(() => {
                    el.innerHTML = '';
                    lineIdx = 0;
                    charIdx = 0;
                    typeLine();
                }, 3000);
                return;
            }

            const line = DEBUG_LINES[lineIdx];
            charIdx++;

            // Build current display
            const completedLines = DEBUG_LINES.slice(0, lineIdx).map(formatLine).join('\n');
            const currentLine = formatLine(line.slice(0, charIdx));
            el.innerHTML = completedLines + (completedLines ? '\n' : '') + currentLine + '<span class="terminal-cursor">█</span>';

            // Auto-scroll
            el.scrollTop = el.scrollHeight;

            if (charIdx >= line.length) {
                lineIdx++;
                charIdx = 0;
                timeout = setTimeout(typeLine, 200 + Math.random() * 400);
            } else {
                timeout = setTimeout(typeLine, 15 + Math.random() * 25);
            }
        };

        typeLine();
        return () => clearTimeout(timeout);
    }, []);

    return (
        <section className="liquid-ocean-section">
            <div className="liquid-ocean-header">
                <span className="liquid-ocean-tag">LIVE DEBUG</span>
                <h2 className="liquid-ocean-title">Debugging the Code</h2>
                <p className="liquid-ocean-desc">
                    Watch the autonomous agent analyze, classify, and repair failures in real time.
                </p>
            </div>

            <div className="liquid-ocean-container">
                {/* Wave canvas */}
                <canvas ref={canvasRef} className="liquid-ocean-canvas" />

                {/* Terminal overlay */}
                <div className="liquid-ocean-terminal" ref={terminalRef}></div>
            </div>
        </section>
    );
}

/* Simple line colorizer */
function formatLine(text) {
    if (text.startsWith('$')) return `<span class="term-cmd">${text}</span>`;
    if (text.includes('[DONE]') || text.includes('✓')) return `<span class="term-success">${text}</span>`;
    if (text.includes('✗') || text.includes('Error')) return `<span class="term-error">${text}</span>`;
    if (text.startsWith('  -')) return `<span class="term-del">${text}</span>`;
    if (text.startsWith('  +')) return `<span class="term-add">${text}</span>`;
    if (text.includes('[')) return `<span class="term-info">${text}</span>`;
    return text;
}
