import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* ── Debug log lines ─────────────────────────────────────── */
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

function formatLine(text) {
    if (text.startsWith('$')) return `<span class="term-cmd">${text}</span>`;
    if (text.includes('[DONE]') || text.includes('✓')) return `<span class="term-success">${text}</span>`;
    if (text.includes('✗') || text.includes('Error')) return `<span class="term-error">${text}</span>`;
    if (text.startsWith('  -')) return `<span class="term-del">${text}</span>`;
    if (text.startsWith('  +')) return `<span class="term-add">${text}</span>`;
    if (text.includes('[')) return `<span class="term-info">${text}</span>`;
    return text;
}

/* ── Three.js 3D Liquid Ocean ────────────────────────────── */
function initThreeScene(container) {
    const width = container.offsetWidth;
    const height = 400;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 35, 60);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── Wave mesh (plane geometry) ──
    const planeSize = 120;
    const segments = 60;
    const geometry = new THREE.PlaneGeometry(planeSize, planeSize, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
        color: 0xd42020,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Solid translucent surface underneath
    const solidGeo = new THREE.PlaneGeometry(planeSize, planeSize, segments, segments);
    solidGeo.rotateX(-Math.PI / 2);
    const solidMat = new THREE.MeshBasicMaterial({
        color: 0xff1050,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
    });
    const solidMesh = new THREE.Mesh(solidGeo, solidMat);
    scene.add(solidMesh);

    // ── Pillars ──
    const pillarData = [
        { x: -30, z: -20, h: 18 },
        { x: -15, z: -10, h: 30 },
        { x: 0, z: -5, h: 40 },
        { x: 12, z: 5, h: 25 },
        { x: 25, z: -15, h: 15 },
        { x: -8, z: 15, h: 22 },
        { x: 20, z: 18, h: 12 },
    ];

    const pillars = pillarData.map((p) => {
        const geo = new THREE.BoxGeometry(3, p.h, 3);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xff1050,
            transparent: true,
            opacity: 0.5,
        });
        const pillar = new THREE.Mesh(geo, mat);
        pillar.position.set(p.x, p.h / 2, p.z);
        pillar.userData = { baseH: p.h, baseX: p.x, baseZ: p.z };
        scene.add(pillar);

        // Wireframe outline
        const edges = new THREE.EdgesGeometry(geo);
        const lineMat = new THREE.LineBasicMaterial({
            color: 0xff3060,
            transparent: true,
            opacity: 0.7,
        });
        const wireframe = new THREE.LineSegments(edges, lineMat);
        pillar.add(wireframe);

        return pillar;
    });

    // ── Animation ──
    const clock = new THREE.Clock();
    let animFrame;

    const posAttr = geometry.attributes.position;
    const solidPosAttr = solidGeo.attributes.position;
    const originalY = new Float32Array(posAttr.count);
    for (let i = 0; i < posAttr.count; i++) {
        originalY[i] = posAttr.getY(i);
    }

    function animate() {
        animFrame = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        // Animate wave vertices
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const z = posAttr.getZ(i);
            const wave =
                Math.sin(x * 0.08 + t * 0.8) * 3 +
                Math.cos(z * 0.06 + t * 0.6) * 2.5 +
                Math.sin((x + z) * 0.05 + t * 1.2) * 1.5;
            posAttr.setY(i, originalY[i] + wave);
            solidPosAttr.setY(i, originalY[i] + wave);
        }
        posAttr.needsUpdate = true;
        solidPosAttr.needsUpdate = true;

        // Animate pillars bobbing
        pillars.forEach((pillar) => {
            const { baseH, baseX, baseZ } = pillar.userData;
            const wave =
                Math.sin(baseX * 0.08 + t * 0.8) * 3 +
                Math.cos(baseZ * 0.06 + t * 0.6) * 2.5;
            pillar.position.y = baseH / 2 + wave;
            pillar.rotation.x = Math.sin(t * 0.5 + baseX) * 0.03;
            pillar.rotation.z = Math.cos(t * 0.4 + baseZ) * 0.03;
        });

        // Slow camera orbit
        camera.position.x = Math.sin(t * 0.1) * 15;
        camera.position.z = 55 + Math.cos(t * 0.08) * 10;
        camera.lookAt(0, 5, 0);

        renderer.render(scene, camera);
    }

    animate();

    // Handle resize
    const onResize = () => {
        const w = container.offsetWidth;
        camera.aspect = w / height;
        camera.updateProjectionMatrix();
        renderer.setSize(w, height);
    };
    window.addEventListener('resize', onResize);

    // Cleanup
    return () => {
        cancelAnimationFrame(animFrame);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
        if (renderer.domElement.parentElement) {
            renderer.domElement.parentElement.removeChild(renderer.domElement);
        }
    };
}

/* ── Main component ───────────────────────────────────────── */
export default function LiquidOcean() {
    const threeRef = useRef(null);
    const terminalRef = useRef(null);

    // Three.js scene
    useEffect(() => {
        if (!threeRef.current) return;
        const cleanup = initThreeScene(threeRef.current);
        return cleanup;
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

            const completedLines = DEBUG_LINES.slice(0, lineIdx).map(formatLine).join('\n');
            const currentLine = formatLine(line.slice(0, charIdx));
            el.innerHTML = completedLines + (completedLines ? '\n' : '') + currentLine + '<span class="terminal-cursor">█</span>';
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
                {/* Three.js canvas mounts here */}
                <div ref={threeRef} className="liquid-ocean-three" />

                {/* Terminal overlay */}
                <div className="liquid-ocean-terminal" ref={terminalRef}></div>
            </div>
        </section>
    );
}
