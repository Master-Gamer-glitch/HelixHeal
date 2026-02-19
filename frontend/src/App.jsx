import React, { useEffect, useRef } from 'react';
import './index.css';
import useAgentStore from './store/agentStore';
import InputSection from './components/InputSection';
import RunSummaryCard from './components/dashboard/RunSummaryCard';
import ScorePanel from './components/dashboard/ScorePanel';
import FixesTable from './components/dashboard/FixesTable';
import Timeline from './components/dashboard/Timeline';
import NeuralBackground from './components/NeuralBackground';

/* ── Custom reticle cursor ─────────────────────────────────── */
function useReticleCursor() {
  useEffect(() => {
    const ring = document.createElement('div');
    const dot = document.createElement('div');
    ring.className = 'cursor-ring';
    dot.className = 'cursor-dot';
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    let mx = -100, my = -100; // mouse position
    let rx = -100, ry = -100; // ring position (lerped)

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
    };

    const onDown = () => ring.classList.add('clicking');
    const onUp = () => ring.classList.remove('clicking');

    const onOverInteractive = () => ring.classList.add('hovering');
    const onLeaveInteractive = () => ring.classList.remove('hovering');

    // Smooth ring follow
    let raf;
    const animate = () => {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);

    // Hover detect for interactive elements
    const interactiveSelectors = 'a, button, input, select, textarea, label, [role="button"], .pipeline-step-label, .navbar-badge';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactiveSelectors)) onOverInteractive();
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactiveSelectors)) onLeaveInteractive();
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      ring.remove();
      dot.remove();
    };
  }, []);
}

/* ── Scroll-driven reveal ──────────────────────────────────────── */
function useRevealOnScroll() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    // Observe all current .reveal elements
    const observeAll = () => {
      document.querySelectorAll('.reveal:not(.visible)').forEach((el) => io.observe(el));
    };
    observeAll();

    // Watch for new .reveal elements entering the DOM (e.g. dashboard appearing)
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}

/* ── 3D Parallax hero ─────────────────────────────────────────── */
function useHeroParallax(heroRef) {
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const onMove = (e) => {
      const { innerWidth: W, innerHeight: H } = window;
      const dx = (e.clientX / W - 0.5) * 18;
      const dy = (e.clientY / H - 0.5) * 10;
      hero.style.transform = `perspective(800px) rotateY(${dx * 0.3}deg) rotateX(${-dy * 0.3}deg)`;
    };
    const onLeave = () => {
      hero.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [heroRef]);
}

/* ── Floating particles ───────────────────────────────────────── */
const PARTICLES = [
  { top: '20%', left: '5%', w: 4, h: 4, delay: '0s', duration: '9s' },
  { top: '60%', left: '92%', w: 3, h: 3, delay: '1.5s', duration: '7s' },
  { top: '40%', left: '80%', w: 5, h: 5, delay: '3s', duration: '11s' },
  { top: '75%', left: '20%', w: 2, h: 2, delay: '0.8s', duration: '8s' },
  { top: '10%', left: '55%', w: 3, h: 3, delay: '2s', duration: '10s' },
  { top: '85%', left: '70%', w: 4, h: 4, delay: '4s', duration: '12s' },
];

/* ── Floating code symbols ──────────────────────────────────── */
const CODE_SYMBOLS = [
  { text: 'git', top: '30%', left: '12%', bright: false },
  { text: '$', top: '20%', left: '38%', bright: true },
  { text: ';', top: '25%', left: '35%', bright: false },
  { text: '//', top: '15%', left: '82%', bright: false },
  { text: 'return', top: '45%', left: '78%', bright: true },
  { text: '01', top: '35%', left: '6%', bright: true },
  { text: '=>', top: '70%', left: '88%', bright: false },
  { text: '{}', top: '60%', left: '15%', bright: false },
  { text: 'fn', top: '80%', left: '42%', bright: true },
];

/* ── Constellation lines ──────────────────────────────────── */
const CONSTELLATION_LINES = [
  { top: '28%', left: '10%', width: 120, rotate: 55 },
  { top: '22%', left: '36%', width: 80, rotate: -30 },
  { top: '40%', left: '75%', width: 140, rotate: 25 },
  { top: '65%', left: '20%', width: 90, rotate: -15 },
  { top: '18%', left: '60%', width: 100, rotate: 70 },
];

function HeroBackground() {
  return (
    <div className="hero-parallax-bg" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <div
          key={`particle-${i}`}
          className="hero-particle"
          style={{
            top: p.top, left: p.left,
            width: p.w, height: p.h,
            animationDelay: p.delay, animationDuration: p.duration,
          }}
        />
      ))}
      {CODE_SYMBOLS.map((s, i) => (
        <span
          key={`sym-${i}`}
          className={`code-symbol${s.bright ? ' bright' : ''}`}
          style={{ top: s.top, left: s.left, animationDelay: `${i * 2.3}s` }}
        >
          {s.text}
        </span>
      ))}
      {CONSTELLATION_LINES.map((l, i) => (
        <div
          key={`line-${i}`}
          className="constellation-line"
          style={{
            top: l.top, left: l.left,
            width: l.width,
            transform: `rotate(${l.rotate}deg)`,
          }}
        />
      ))}
      <div className="hero-reticle" />
    </div>
  );
}

const PIPELINE_STEPS = [
  { name: 'Analyzer', icon: '🔍' },
  { name: 'Test Runner', icon: '🧪' },
  { name: 'Classifier', icon: '🏷️' },
  { name: 'Fix Gen', icon: '⚡' },
  { name: 'Commit', icon: '📦' },
  { name: 'CI Monitor', icon: '🔄' },
];

/* ── Glass Dock with fisheye magnification ──────────────── */
function GlassDock({ items }) {
  const dockRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = React.useState(null);

  const getScale = (index) => {
    if (hoveredIndex === null) return 1;
    const dist = Math.abs(hoveredIndex - index);
    if (dist === 0) return 1.5;
    if (dist === 1) return 1.25;
    if (dist === 2) return 1.1;
    return 1;
  };

  return (
    <div className="glass-dock-wrapper">
      <div className="glass-dock" ref={dockRef}>
        {items.map((item, i) => (
          <div
            key={item.name}
            className={`glass-dock-item ${hoveredIndex === i ? 'active' : ''}`}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              transform: `scale(${getScale(i)})`,
              transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <span className="glass-dock-icon">{item.icon}</span>
            {hoveredIndex === i && (
              <div className="glass-dock-tooltip">{item.name}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const { result, status } = useAgentStore();
  const heroRef = useRef(null);
  const showDashboard = result && (status === 'completed' || status === 'failed' || status === 'running');

  useRevealOnScroll();
  useHeroParallax(heroRef);
  useReticleCursor();

  return (
    <>
      <NeuralBackground />
      <div className="app-container">
        {/* ── Navbar ── */}
        <nav className="navbar">
          <div className="navbar-logo" data-text="HelixHeal.AI">
            <div className="navbar-logo-dot" />
            HelixHeal.AI
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="navbar-badge">AGNO + Gemini</span>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="hero" ref={heroRef} style={{ transition: 'transform 0.1s ease-out' }}>

          <div className="hero-eyebrow">
            <span>⚡</span>
            Autonomous Code Healing
          </div>

          <h1 className="hero-title">
            <span className="hero-title-gradient">Autonomous</span><br />
            Code Repair.
          </h1>

          <p className="hero-subtitle">
            Point the agent at any GitHub repo — it clones, tests, classifies failures,
            generates targeted AI fixes, and pushes a clean branch automatically.
          </p>

          {/* Agent pipeline — Glass Dock visualization */}
          <GlassDock items={PIPELINE_STEPS} />
        </section>

        {/* ── Input ── */}
        <div className="reveal">
          <InputSection />
        </div>

        {/* ── Dashboard ── */}
        {showDashboard && (
          <div className="dashboard">
            <div className="reveal">
              <RunSummaryCard result={result} />
            </div>

            <div className="dashboard-row-2">
              <div className="reveal reveal-delay-1">
                <ScorePanel score={result?.score} />
              </div>
              <div className="reveal reveal-delay-2">
                <Timeline timeline={result?.ci_timeline} />
              </div>
            </div>

            <div className="reveal reveal-delay-3">
              <FixesTable fixes={result?.fixes} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
