import React, { useEffect, useRef } from 'react';
import './index.css';
import useAgentStore from './store/agentStore';
import InputSection from './components/InputSection';
import RunSummaryCard from './components/dashboard/RunSummaryCard';
import ScorePanel from './components/dashboard/ScorePanel';
import FixesTable from './components/dashboard/FixesTable';
import Timeline from './components/dashboard/Timeline';

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

function HeroParticles() {
  return (
    <div className="hero-parallax-bg" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="hero-particle"
          style={{
            top: p.top, left: p.left,
            width: p.w, height: p.h,
            animationDelay: p.delay, animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

const PIPELINE_STEPS = ['Analyzer', 'Test Runner', 'Classifier', 'Fix Gen', 'Commit', 'CI Monitor'];

function App() {
  const { result, status } = useAgentStore();
  const heroRef = useRef(null);
  const showDashboard = result && (status === 'completed' || status === 'failed' || status === 'running');

  useRevealOnScroll();
  useHeroParallax(heroRef);

  return (
    <>
      <div className="app-container">
        {/* ── Navbar ── */}
        <nav className="navbar">
          <div className="navbar-logo">
            <div className="navbar-logo-dot" />
            AI Fix Agent
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="navbar-badge">AGNO + Gemini</span>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="hero" ref={heroRef} style={{ transition: 'transform 0.1s ease-out' }}>
          <HeroParticles />

          <div className="hero-eyebrow">
            <span>⚡</span>
            Autonomous Code Fixing
          </div>

          <h1 className="hero-title">
            <span className="hero-title-gradient">Ship Fixes,</span><br />
            Not Bugs.
          </h1>

          <p className="hero-subtitle">
            Point the agent at any GitHub repo — it clones, tests, classifies failures,
            generates targeted AI fixes, and pushes a clean branch automatically.
          </p>

          {/* Agent pipeline visualization */}
          <div className="pipeline-visual">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step} className="pipeline-step">
                <span className="pipeline-step-label">{step}</span>
                {i < PIPELINE_STEPS.length - 1 && (
                  <span className="pipeline-arrow">→</span>
                )}
              </div>
            ))}
          </div>
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
