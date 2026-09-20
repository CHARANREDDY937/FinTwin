import React, { useEffect, useRef, useState, useId } from 'react';

export default function FinancialHealthGauge({
  score = 78,
  size = 200,
  strokeWidth = 14,
  label = 'Financial Vitality',
}) {
  const arcRef = useRef(null);
  const gradientId = useId();
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const [displayScore, setDisplayScore] = useState(0);

  // Smooth numeric counter animation
  useEffect(() => {
    let start = 0;
    const end = normalizedScore;
    const duration = 1000;
    const startTime = performance.now();
    let animId;

    const frame = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(start + (end - start) * ease));
      if (progress < 1) {
        animId = requestAnimationFrame(frame);
      }
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [normalizedScore]);

  // Geometry calculations for a clean 240-degree open gauge
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // 240° arc (two thirds of a circle)
  const arcLength = circumference * (240 / 360);
  const strokeDashoffset = arcLength - (normalizedScore / 100) * arcLength;

  // Curated executive luminous tiers
  let scoreColor = '#34D399'; // Mint Emerald
  let gradientStops = ['#059669', '#34D399'];
  let tier = 'Optimal Vitality';
  let tierSub = 'Strong compounding surplus buffer';

  if (normalizedScore < 50) {
    scoreColor = '#FB7185'; // Soft Rose
    gradientStops = ['#E11D48', '#FB7185'];
    tier = 'High Caution';
    tierSub = 'Elevated debt drag & low surplus';
  } else if (normalizedScore < 70) {
    scoreColor = '#FB923C'; // Warm Apricot
    gradientStops = ['#D97706', '#FB923C'];
    tier = 'Moderate';
    tierSub = 'Stable baseline; optimize discretionary leaks';
  } else if (normalizedScore < 85) {
    scoreColor = '#A78BFA'; // Luminous Lavender
    gradientStops = ['#7C3AED', '#A78BFA'];
    tier = 'Strong';
    tierSub = 'Healthy savings rate & prime credit';
  }

  useEffect(() => {
    const arc = arcRef.current;
    if (!arc) return;
    arc.style.strokeDashoffset = String(arcLength);
    const timeout = setTimeout(() => {
      arc.style.strokeDashoffset = String(strokeDashoffset);
    }, 60);
    return () => clearTimeout(timeout);
  }, [arcLength, strokeDashoffset]);

  const scoreFontSize = Math.max(24, Math.round(size * 0.19));

  return (
    <div
      className="health-gauge-card"
      role="img"
      aria-label={`Financial health score ${normalizedScore} out of 100`}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <div
        className="gauge-svg-container"
        style={{
          width: size,
          height: Math.round(size * 0.88),
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="gauge-svg"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientStops[0]} />
              <stop offset="100%" stopColor={gradientStops[1]} />
            </linearGradient>
          </defs>

          {/* Background Track (Razor-sharp, non-blurry) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border-subtle, rgba(255,255,255,0.08))"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(150 ${size / 2} ${size / 2})`}
          />

          {/* Active Score Arc (Crisp gradient with subtle hardware-accelerated glow) */}
          <circle
            ref={arcRef}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(150 ${size / 2} ${size / 2})`}
            className="gauge-meter-arc"
            style={{
              filter: `drop-shadow(0 0 6px ${scoreColor}50)`,
              transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>

        {/* Center Score & Tier Pill (Positioned perfectly inside arc center) */}
        <div
          className="gauge-center-content"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: Math.round(size * 0.12),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            className="gauge-number"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: `${scoreFontSize}px`,
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}
          >
            {displayScore}
          </span>
          <span
            className="gauge-max"
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
              marginTop: '3px',
              letterSpacing: '0.02em',
            }}
          >
            / 100
          </span>
          <span
            className="gauge-tier-pill"
            style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '2px 9px',
              borderRadius: '999px',
              border: `1px solid ${scoreColor}40`,
              color: scoreColor,
              background: `${scoreColor}14`,
              marginTop: '5px',
            }}
          >
            {tier}
          </span>
        </div>
      </div>

      {/* Label and Subtitle below gauge */}
      <div className="gauge-info-col" style={{ textAlign: 'center', marginTop: '10px' }}>
        <h4
          className="gauge-label"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.94rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {label}
        </h4>
        <p
          className="gauge-sub"
          style={{
            fontSize: '0.76rem',
            color: 'var(--text-secondary)',
            marginTop: '3px',
            lineHeight: 1.4,
            maxWidth: `${size + 30}px`,
          }}
        >
          {tierSub}
        </p>
      </div>
    </div>
  );
}
