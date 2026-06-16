import React, { useEffect, useRef } from 'react';

const FlamoraHero = () => {
  const heroRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const fxCanvasRef = useRef(null);

  useEffect(() => {
    const hero = heroRef.current;
    const bgC = bgCanvasRef.current;
    const fxC = fxCanvasRef.current;

    if (!hero || !bgC || !fxC) return;

    const bgCtx = bgC.getContext('2d');
    const fxCtx = fxC.getContext('2d');

    let W = 0;
    let H = 0;
    let t = 0;
    let flameX = 0;
    let flameY = 0;
    let scaleFactor = 1.0;
    let cylTop = 0;
    let scaledH = 0;
    let scaledW = 0;
    let cylLeft = 0;
    let sparkleX = 0;
    let sparkleY = 0;
    let sparkleR = 0;
    
    const DT = 0.45; // Time-step delta (animation speed factor)

    function resize() {
      if (!hero || !bgC || !fxC) return;
      W = hero.offsetWidth;
      H = hero.offsetHeight;
      bgC.width = W;
      bgC.height = H;
      fxC.width = W;
      fxC.height = H;

      // Horizontal center
      flameX = W * 0.5;

      // Image aspect ratio (2752x1536)
      const imgRatio = 2752 / 1536;
      const containerRatio = W / H;

      if (containerRatio > imgRatio) {
        scaledW = W;
        scaledH = W / imgRatio;
        cylTop = (H - scaledH) / 2;
        cylLeft = 0;
      } else {
        scaledW = H * imgRatio;
        scaledH = H;
        cylTop = 0;
        cylLeft = (W - scaledW) / 2;
      }

      // Nozzle coordinate at 30% of cylinder height
      flameY = cylTop + scaledH * 0.30;

      // Size scale factor based on container size
      scaleFactor = (scaledH / 357.26) * 1.5;

      // Watermark mask position (Sparkle is at x=95.9%, y=92.7% of original image)
      sparkleX = cylLeft + scaledW * 0.959;
      sparkleY = cylTop + scaledH * 0.927;
      sparkleR = scaledW * (65 / 2752);
    }
    resize();
    window.addEventListener('resize', resize);

    // --- Smoke particles ---
    const smokeParticles = [];
    const SMOKE_COUNT = 65;

    function SmokeParticle(i) {
      if (i < SMOKE_COUNT * 0.35) {
        this.type = 'center';
      } else if (i < SMOKE_COUNT * 0.68) {
        this.type = 'left';
      } else {
        this.type = 'right';
      }

      this.reset = function(delay) {
        this.delay = delay || 0;
        this.life = 0;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.005 + Math.random() * 0.005;
        this.alpha = 0;

        if (this.type === 'center') {
          this.r_color = Math.floor(52 + Math.random() * 22);
          this.g_color = Math.floor(this.r_color * 0.85);
          this.b_color = Math.floor(this.r_color * 0.75);

          this.x = flameX + (Math.random() - 0.5) * 16 * scaleFactor;
          this.y = flameY;
          this.vx = (Math.random() - 0.5) * 0.25 * scaleFactor;
          this.vy = -(0.55 + Math.random() * 0.65) * scaleFactor;
          this.r = (6 + Math.random() * 10) * scaleFactor;
          this.maxAlpha = 0.16 + Math.random() * 0.12;
          this.maxLife = 60 + Math.random() * 50;
        } else if (this.type === 'left') {
          this.r_color = Math.floor(135 + Math.random() * 25);
          this.g_color = Math.floor(this.r_color * 0.82);
          this.b_color = Math.floor(this.r_color * 0.70);

          this.x = flameX - scaledW * 0.22 + (Math.random() - 0.5) * scaledW * 0.15;
          this.y = cylTop + scaledH * 0.55 + (Math.random() - 0.5) * scaledH * 0.4;
          this.vx = -(0.05 + Math.random() * 0.18) * scaleFactor;
          this.vy = -(0.12 + Math.random() * 0.3) * scaleFactor;
          this.r = (18 + Math.random() * 25) * scaleFactor;
          this.maxAlpha = 0.25 + Math.random() * 0.15;
          this.maxLife = 160 + Math.random() * 100;
        } else {
          this.r_color = Math.floor(135 + Math.random() * 25);
          this.g_color = Math.floor(this.r_color * 0.82);
          this.b_color = Math.floor(this.r_color * 0.70);

          this.x = flameX + scaledW * 0.22 + (Math.random() - 0.5) * scaledW * 0.15;
          this.y = cylTop + scaledH * 0.55 + (Math.random() - 0.5) * scaledH * 0.4;
          this.vx = (0.05 + Math.random() * 0.18) * scaleFactor;
          this.vy = -(0.12 + Math.random() * 0.3) * scaleFactor;
          this.r = (18 + Math.random() * 25) * scaleFactor;
          this.maxAlpha = 0.25 + Math.random() * 0.15;
          this.maxLife = 160 + Math.random() * 100;
        }
      };
      this.reset(i * (200 / SMOKE_COUNT));
    }

    for (let i = 0; i < SMOKE_COUNT; i++) {
      const p = new SmokeParticle(i);
      smokeParticles.push(p);
    }

    // --- Flame particles ---
    const flameParticles = [];
    const FLAME_COUNT = 55;

    function FlameParticle(i) {
      this.reset = function(delay) {
        this.x = flameX + (Math.random() - 0.5) * 7 * scaleFactor;
        this.y = flameY + 2 * scaleFactor;
        this.vx = (Math.random() - 0.5) * 0.6 * scaleFactor;
        this.vy = -(0.9 + Math.random() * 1.4) * scaleFactor;
        this.r = (3 + Math.random() * 7) * scaleFactor;
        this.life = 0;
        this.maxLife = 28 + Math.random() * 30;
        this.delay = delay || 0;
        this.hue = 20 + Math.random() * 25;
        this.bright = Math.random() > 0.5;
      };
      this.reset(i * (60 / FLAME_COUNT));
    }

    for (let i = 0; i < FLAME_COUNT; i++) {
      const p = new FlameParticle(i);
      flameParticles.push(p);
    }

    // --- Ember sparks ---
    const embers = [];
    const EMBER_COUNT = 18;

    function Ember(isStartup) {
      this.reset = function() {
        this.x = flameX + (Math.random() - 0.5) * 8 * scaleFactor;
        this.y = flameY;
        this.vx = (Math.random() - 0.5) * 1.2 * scaleFactor;
        this.vy = -(1.2 + Math.random() * 2.5) * scaleFactor;
        this.ay = 0.04 * scaleFactor;
        this.r = (0.8 + Math.random() * 1.5) * scaleFactor;
        this.life = 0;
        this.maxLife = 40 + Math.random() * 50;
        this.alpha = 1;
      };
      this.reset();
      if (isStartup) {
        this.life = Math.random() * this.maxLife;
        const tVal = this.life;
        this.x += this.vx * tVal;
        this.y += this.vy * tVal + 0.5 * this.ay * tVal * tVal;
        this.vy += this.ay * tVal;
      }
    }

    for (let i = 0; i < EMBER_COUNT; i++) {
      embers.push(new Ember(true));
    }

    // Pre-age smoke and flame at startup
    smokeParticles.forEach((p) => {
      p.delay = 0;
      p.life = Math.floor(Math.random() * p.maxLife * 0.85);
      p.x += p.vx * p.life * DT;
      p.y += p.vy * p.life * DT;
      const growthRate = (p.type === 'center') ? 0.18 : 0.08;
      p.r += p.life * growthRate * scaleFactor * DT;
      p.alpha = p.maxAlpha * 0.7;
    });

    flameParticles.forEach((p) => {
      p.delay = 0;
      p.life = Math.floor(Math.random() * p.maxLife * 0.9);
      p.x = flameX + (Math.random() - 0.5) * 7 * scaleFactor + p.vx * p.life * DT;
      p.y = flameY + 2 * scaleFactor + p.vy * p.life * DT;
      p.r = Math.max(0.1, p.r - p.life * 0.06 * scaleFactor * DT);
    });

    // Draw background ground glow
    function drawBg() {
      bgCtx.clearRect(0, 0, W, H);
      bgCtx.fillStyle = '#000';
      bgCtx.fillRect(0, 0, W, H);

      const pulse = 0.55 + 0.45 * Math.sin(t * 0.008);

      const halo = bgCtx.createRadialGradient(flameX, flameY, 2, flameX, flameY, 95 * pulse * scaleFactor);
      halo.addColorStop(0, `rgba(255,120,30,${0.18 * pulse})`);
      halo.addColorStop(0.5, `rgba(255,70,10,${0.07 * pulse})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      bgCtx.fillStyle = halo;
      bgCtx.fillRect(0, 0, W, H);

      const floorY = cylTop + scaledH * 0.95;
      const floor = bgCtx.createRadialGradient(flameX, floorY, 5, flameX, floorY, 140 * scaleFactor);
      floor.addColorStop(0, `rgba(255,90,20,${0.055 * pulse})`);
      floor.addColorStop(1, 'rgba(0,0,0,0)');
      bgCtx.fillStyle = floor;
      bgCtx.fillRect(0, 0, W, H);
    }

    // Draw smoke
    function drawSmoke() {
      for (const p of smokeParticles) {
        if (p.delay > 0) { p.delay--; continue; }
        p.life += DT;

        const wobbleOffset = 0.15 * Math.sin(p.wobble + t * p.wobbleSpeed) * scaleFactor;
        p.x += (p.vx + wobbleOffset) * DT;
        p.y += p.vy * DT;
        p.vy *= Math.pow(0.997, DT);

        const growthRate = (p.type === 'center') ? 0.18 : 0.08;
        p.r += growthRate * scaleFactor * DT;
        p.wobble += p.wobbleSpeed * DT;

        const progress = p.life / p.maxLife;
        if (progress < 0.15) {
          p.alpha = p.maxAlpha * (progress / 0.15);
        } else if (progress > 0.65) {
          p.alpha = p.maxAlpha * (1 - (progress - 0.65) / 0.35);
        } else {
          p.alpha = p.maxAlpha;
        }

        if (p.life >= p.maxLife) { p.reset(0); }

        if (p.alpha > 0.005) {
          const g = fxCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, `rgba(${p.r_color},${p.g_color},${p.b_color},${p.alpha})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          fxCtx.fillStyle = g;
          fxCtx.beginPath();
          fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          fxCtx.fill();
        }
      }
    }

    // Draw flame
    function drawFlame() {
      for (const p of flameParticles) {
        if (p.delay > 0) { p.delay--; continue; }
        p.life += DT;
        p.x += p.vx * DT;
        p.y += p.vy * DT;
        p.vy *= Math.pow(0.985, DT);
        p.vx += (Math.random() - 0.5) * 0.04 * scaleFactor * DT;
        p.r -= 0.06 * scaleFactor * DT;

        const progress = p.life / p.maxLife;
        let alpha;
        if (progress < 0.2) alpha = progress / 0.2;
        else alpha = 1 - (progress - 0.2) / 0.8;
        alpha = Math.max(0, alpha);

        if (p.life >= p.maxLife || p.r <= 0.5 * scaleFactor) {
          p.reset(0);
          p.x = flameX + (Math.random() - 0.5) * 7 * scaleFactor;
          continue;
        }

        if (alpha > 0.01) {
          const innerR = Math.max(p.r * 0.35, 0.1);
          const gf = fxCtx.createRadialGradient(p.x, p.y, innerR, p.x, p.y, p.r);
          if (p.bright) {
            gf.addColorStop(0, `rgba(255,255,200,${alpha * 0.95})`);
            gf.addColorStop(0.3, `rgba(255,180,50,${alpha * 0.8})`);
            gf.addColorStop(0.7, `rgba(255,${60 + p.hue},10,${alpha * 0.6})`);
          } else {
            gf.addColorStop(0, `rgba(255,160,30,${alpha * 0.85})`);
            gf.addColorStop(0.5, `rgba(220,60,10,${alpha * 0.55})`);
            gf.addColorStop(1, `rgba(150,20,5,${alpha * 0.15})`);
          }
          gf.addColorStop(1, 'rgba(0,0,0,0)');
          fxCtx.fillStyle = gf;
          fxCtx.beginPath();
          fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          fxCtx.fill();
        }
      }
    }

    // Draw embers
    function drawEmbers() {
      for (const e of embers) {
        e.life += DT;
        e.x += e.vx * DT;
        e.y += e.vy * DT;
        e.vy += e.ay * DT;
        const prog = e.life / e.maxLife;
        e.alpha = 1 - prog;
        if (e.life >= e.maxLife) { e.reset(); e.x = flameX + (Math.random() - 0.5) * 8 * scaleFactor; }

        if (e.alpha > 0.05) {
          fxCtx.beginPath();
          fxCtx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
          fxCtx.fillStyle = `rgba(255,${160 + Math.floor(e.alpha * 80)},40,${e.alpha * 0.9})`;
          fxCtx.fill();

          fxCtx.beginPath();
          fxCtx.arc(e.x, e.y, e.r * 2.5, 0, Math.PI * 2);
          fxCtx.fillStyle = `rgba(255,100,20,${e.alpha * 0.18})`;
          fxCtx.fill();
        }
      }
    }

    // Core nozzle flame mass
    function drawCoreFlame() {
      const pulse1 = 0.78 + 0.22 * Math.sin(t * 0.04);
      const pulse2 = 0.82 + 0.18 * Math.sin(t * 0.06 + 1.3);
      const pulse3 = 0.70 + 0.30 * Math.sin(t * 0.03 + 2.1);

      const g0 = fxCtx.createRadialGradient(flameX, flameY, 0, flameX, flameY, 36 * pulse1 * scaleFactor);
      g0.addColorStop(0, `rgba(255,140,20,${0.22 * pulse2})`);
      g0.addColorStop(0.5, `rgba(220,60,5,${0.12 * pulse1})`);
      g0.addColorStop(1, 'rgba(0,0,0,0)');
      fxCtx.fillStyle = g0;
      fxCtx.beginPath();
      fxCtx.arc(flameX, flameY, 36 * pulse1 * scaleFactor, 0, Math.PI * 2);
      fxCtx.fill();

      const g1 = fxCtx.createRadialGradient(flameX, flameY - 3 * scaleFactor, 0, flameX, flameY - 3 * scaleFactor, 18 * pulse2 * scaleFactor);
      g1.addColorStop(0, `rgba(255,240,160,${0.85 * pulse3})`);
      g1.addColorStop(0.25, `rgba(255,180,40,${0.7 * pulse2})`);
      g1.addColorStop(0.6, `rgba(255,80,10,${0.45 * pulse1})`);
      g1.addColorStop(1, 'rgba(0,0,0,0)');
      fxCtx.fillStyle = g1;
      fxCtx.beginPath();
      fxCtx.arc(flameX, flameY - 3 * scaleFactor, 18 * pulse2 * scaleFactor, 0, Math.PI * 2);
      fxCtx.fill();

      const g2 = fxCtx.createRadialGradient(flameX, flameY - 5 * scaleFactor, 0, flameX, flameY - 5 * scaleFactor, 7 * pulse3 * scaleFactor);
      g2.addColorStop(0, `rgba(255,255,240,${0.95})`);
      g2.addColorStop(0.4, `rgba(255,220,100,${0.7 * pulse3})`);
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      fxCtx.fillStyle = g2;
      fxCtx.beginPath();
      fxCtx.arc(flameX, flameY - 5 * scaleFactor, 7 * pulse3 * scaleFactor, 0, Math.PI * 2);
      fxCtx.fill();

      const tongueH = (28 + 10 * Math.sin(t * 0.05)) * scaleFactor;
      const tongueW = (6 + 3 * Math.sin(t * 0.06 + 0.8)) * scaleFactor;
      const g3 = fxCtx.createLinearGradient(flameX, flameY, flameX, flameY - tongueH);
      g3.addColorStop(0, `rgba(255,200,60,${0.7 * pulse2})`);
      g3.addColorStop(0.5, `rgba(255,100,20,${0.4 * pulse1})`);
      g3.addColorStop(1, 'rgba(220,30,5,0)');
      fxCtx.fillStyle = g3;
      fxCtx.beginPath();
      fxCtx.ellipse(flameX, flameY - tongueH * 0.4, tongueW, tongueH * 0.55, 0, 0, Math.PI * 2);
      fxCtx.fill();
    }

    // Mask Gemini watermark
    function drawMask() {
      if (sparkleR > 0) {
        const g = fxCtx.createRadialGradient(sparkleX, sparkleY, 0, sparkleX, sparkleY, sparkleR);
        g.addColorStop(0, 'rgb(3, 4, 3)');
        g.addColorStop(0.7, 'rgb(3, 4, 3)');
        g.addColorStop(1, 'rgba(3, 4, 3, 0)');
        fxCtx.fillStyle = g;
        fxCtx.beginPath();
        fxCtx.arc(sparkleX, sparkleY, sparkleR, 0, Math.PI * 2);
        fxCtx.fill();
      }
    }

    let animationFrameId;

    function loop() {
      t += DT;
      fxCtx.clearRect(0, 0, W, H);
      drawBg();
      fxCtx.globalCompositeOperation = 'source-over';
      drawMask();
      drawSmoke();
      fxCtx.globalCompositeOperation = 'lighter';
      drawCoreFlame();
      drawFlame();
      fxCtx.globalCompositeOperation = 'screen';
      drawEmbers();
      fxCtx.globalCompositeOperation = 'source-over';
      animationFrameId = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={heroRef}
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <canvas
        ref={bgCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      />
      <img
        id="cyl-img"
        src="/images/cylinder.png"
        alt="Cylinder"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 2,
          pointerEvents: 'none',
          imageRendering: 'high-quality',
        }}
      />
      <canvas
        ref={fxCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 3,
        }}
      />
    </div>
  );
};

export default FlamoraHero;
