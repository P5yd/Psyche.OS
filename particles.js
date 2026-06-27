/* ============================================================
   PSYCHE.OS v3  ·  particles.js
   The signature: a monochrome point cloud.
   Uses Three.js + GSAP when available (CDN). If the network is
   down, falls back to a 2D canvas constellation so the screen
   is never empty. Targets 60fps; respects reduced-motion.
   ============================================================ */

const Cloud = (() => {
  let mode = 'none';
  let canvas, raf;
  let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // three.js handles
  let renderer, scene, camera, points, geom, mat;
  let positions, targets, scatter;
  let mouseX = 0, mouseY = 0, t = 0;
  const COUNT = 5200;

  function init(canvasId) {
    // light / professional theme runs without the particle layer
    if (document.documentElement.getAttribute('data-theme') !== 'dark') return;
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (window.THREE && window.WebGLRenderingContext) {
      try { initThree(); mode = 'three'; }
      catch (e) { init2D(); mode = '2d'; }
    } else {
      init2D(); mode = '2d';
    }
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
  }

  /* ---------------- THREE.JS POINT CLOUD ---------------- */
  function initThree() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 520;

    positions = new Float32Array(COUNT * 3);
    targets   = new Float32Array(COUNT * 3);
    scatter   = new Float32Array(COUNT * 3);

    // target = layered sphere shell (a "data sphere")
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      // fibonacci-ish sphere for even distribution
      const phi = Math.acos(1 - 2 * (i + 0.5) / COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 230 * (0.78 + 0.22 * Math.random());
      targets[i3]     = r * Math.sin(phi) * Math.cos(theta);
      targets[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      targets[i3 + 2] = r * Math.cos(phi);
      // scatter = wide random cloud (boot start state)
      scatter[i3]     = (Math.random() - 0.5) * 1600;
      scatter[i3 + 1] = (Math.random() - 0.5) * 1600;
      scatter[i3 + 2] = (Math.random() - 0.5) * 1600;
      // start at scatter
      positions[i3]     = scatter[i3];
      positions[i3 + 1] = scatter[i3 + 1];
      positions[i3 + 2] = scatter[i3 + 2];
    }

    geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.6,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    points = new THREE.Points(geom, mat);
    scene.add(points);

    renderThree();
  }

  function renderThree() {
    raf = requestAnimationFrame(renderThree);
    t += 0.0016;
    if (!reduced) {
      points.rotation.y = t;
      points.rotation.x = Math.sin(t * 0.4) * 0.18;
      // gentle parallax toward cursor
      camera.position.x += (mouseX * 60 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY * 60 - camera.position.y) * 0.03;
      camera.lookAt(scene.position);
    }
    renderer.render(scene, camera);
  }

  /* boot assembly: scatter -> sphere using GSAP (or instant if reduced) */
  function assemble(onDone) {
    if (mode === 'none') { if (onDone) onDone(); return; }   // particles off (light theme)
    if (mode === '2d') { twoD.assemble(); if (onDone) setTimeout(onDone, 1400); return; }
    if (reduced || !window.gsap) {
      for (let i = 0; i < positions.length; i++) positions[i] = targets[i];
      geom.attributes.position.needsUpdate = true;
      if (onDone) onDone();
      return;
    }
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1, duration: 2.4, ease: 'power3.inOut',
      onUpdate() {
        const k = proxy.p;
        for (let i = 0; i < positions.length; i++) {
          positions[i] = scatter[i] + (targets[i] - scatter[i]) * k;
        }
        geom.attributes.position.needsUpdate = true;
      },
      onComplete() { if (onDone) onDone(); }
    });
  }

  /* dissolve back to scatter (used on logout / lock) */
  function disperse(onDone) {
    if (mode !== 'three' || reduced || !window.gsap) { if (onDone) onDone(); return; }
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1, duration: 1.1, ease: 'power2.in',
      onUpdate() {
        const k = proxy.p;
        for (let i = 0; i < positions.length; i++) {
          positions[i] = targets[i] + (scatter[i] - targets[i]) * k;
        }
        geom.attributes.position.needsUpdate = true;
      },
      onComplete() { if (onDone) onDone(); }
    });
  }

  /* ---------------- 2D CANVAS FALLBACK ---------------- */
  const twoD = (() => {
    let ctx, w, h, dots = [], assembled = false;
    const N = 140;
    function start() {
      ctx = canvas.getContext('2d');
      size();
      dots = Array.from({ length: N }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25
      }));
      loop();
    }
    function size() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    function loop() {
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        if (!reduced) { d.x += d.vx; d.y += d.vy; }
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(d.x, d.y, 1.4, 1.4);
      }
      // hairline links = constellation
      ctx.lineWidth = 0.5;
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          const dist = dx * dx + dy * dy;
          if (dist < 13000) {
            ctx.strokeStyle = `rgba(255,255,255,${0.12 * (1 - dist / 13000)})`;
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.stroke();
          }
        }
      }
    }
    return { start, size, assemble() { assembled = true; } };
  })();
  function init2D() { twoD.start(); }

  /* ---------------- shared ---------------- */
  function onResize() {
    if (mode === 'three') {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    } else if (mode === '2d') {
      twoD.size();
    }
  }
  function onMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }

  return { init, assemble, disperse, get mode() { return mode; } };
})();
