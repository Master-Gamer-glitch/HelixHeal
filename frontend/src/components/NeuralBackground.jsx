import React, { useEffect, useRef, useState } from 'react';

/* ── Symbol pool ──────────────────────────────────────────── */
const SYMBOL_POOL = [
    '{ }', '[ ]', '<div>', '&&', 'git', 'npm', '01', '#', '++',
    '=>', '!=', '//', ';', ',', '$', 'return', '<div>', '{ }',
    '[ ]', '01', '++', '#', '&&', '=>', '!=', ';', 'fn', '||',
    'var', 'let', 'const', 'if', 'else', 'for', '==', '<<', '>>',
    '**', 'null', 'true', '0x', '::',
];

/* ── Generate random symbols ─────────────────────────────── */
function generateSymbols(count = 70) {
    const syms = [];
    for (let i = 0; i < count; i++) {
        const text = SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];
        const size = 10 + Math.random() * 22; // 10px to 32px
        syms.push({
            id: i,
            text,
            x: Math.random() * 100,      // % left
            y: Math.random() * 100,      // % top
            size,
            opacity: 0.04 + Math.random() * 0.15,
            moveX: -30 + Math.random() * 60,
            moveY: -30 + Math.random() * 60,
            duration: 15 + Math.random() * 25,
            delay: Math.random() * -40,
        });
    }
    return syms;
}

/* ── Neural canvas: draws lines between nearby symbols ──── */
function useNeuralCanvas(canvasRef, symbolsRef) {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let raf;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const els = symbolsRef.current;
            if (!els || els.length === 0) { raf = requestAnimationFrame(draw); return; }

            const positions = [];
            els.forEach((el) => {
                if (!el) return;
                const rect = el.getBoundingClientRect();
                positions.push({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                });
            });

            // Draw lines between nearby symbols
            const maxDist = 180;
            for (let i = 0; i < positions.length; i++) {
                for (let j = i + 1; j < positions.length; j++) {
                    const dx = positions[i].x - positions[j].x;
                    const dy = positions[i].y - positions[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxDist) {
                        const alpha = (1 - dist / maxDist) * 0.15;
                        ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(positions[i].x, positions[i].y);
                        ctx.lineTo(positions[j].x, positions[j].y);
                        ctx.stroke();
                    }
                }
            }

            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, [canvasRef, symbolsRef]);
}

/* ── Mouse proximity glow ─────────────────────────────────── */
function useMouseGlow(symbolsRef) {
    useEffect(() => {
        const onMove = (e) => {
            const els = symbolsRef.current;
            if (!els) return;
            const mx = e.clientX;
            const my = e.clientY;
            els.forEach((el) => {
                if (!el) return;
                const rect = el.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
                if (dist < 150) {
                    el.classList.add('glow');
                } else {
                    el.classList.remove('glow');
                }
            });
        };
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, [symbolsRef]);
}

/* ── Main component ───────────────────────────────────────── */
export default function NeuralBackground() {
    const canvasRef = useRef(null);
    const symbolRefs = useRef([]);
    const [symbols] = useState(() => generateSymbols(70));

    useNeuralCanvas(canvasRef, symbolRefs);
    useMouseGlow(symbolRefs);

    return (
        <div className="neural-bg" aria-hidden="true">
            {/* Central red glow */}
            <div className="neural-bg-glow" />

            {/* Canvas for constellation lines */}
            <canvas ref={canvasRef} className="neural-canvas" />

            {/* Floating code symbols */}
            {symbols.map((s, i) => (
                <div
                    key={s.id}
                    ref={(el) => (symbolRefs.current[i] = el)}
                    className="neural-symbol"
                    style={{
                        left: `${s.x}%`,
                        top: `${s.y}%`,
                        fontSize: `${s.size}px`,
                        opacity: s.opacity,
                        '--move-x': `${s.moveX}px`,
                        '--move-y': `${s.moveY}px`,
                        animationDuration: `${s.duration}s`,
                        animationDelay: `${s.delay}s`,
                    }}
                >
                    {s.text}
                </div>
            ))}
        </div>
    );
}
