import React, { useEffect, useRef } from 'react';

export default function FinancialHealthGauge({
  score = 78,
  size = 200,
  strokeWidth = 14,
  label = 'Financial Vitality',
}) {
  const arcRef = useRef(null);
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // 240-degree open gauge arc
  const arcLength = circumference * 0.72;
  const strokeDashoffset = arcLength - (normalizedScore / 100) * arcLength;

  // Heartwarming color tiers
  let scoreColor = '#10B981'; // Mint Emerald
  let tier = 'Optimal Vitality';
  let tierSub = 'High compounding surplus buffer';

  if (normalizedScore < 50) {
    scoreColor = '#FF5E62'; // Sunset Coral
    tier = 'High Caution';
    tierSub = 'Elevated debt drag & low surplus';
  } else if (normalizedScore < 70) {
    scoreColor = '#F59E0B'; // Warm Amber
    tier = 'Moderate';
    tierSub = 'Stable baseline; optimize discretionary leaks';
  } else if (normalizedScore < 85) {
    scoreColor = '#FF9966'; // Warm Apricot
    tier = 'Strong';
    tierSub = 'Healthy savings rate & prime credit';
  }

  useEffect(() => {
    const arc = arcRef.current;
    if (!arc) return;
    arc.style.strokeDashoffset = String(arcLength);
    const timeout = setTimeout(() => {
      arc.style.strokeDashoffset = String(strokeDashoffset);
    }, 80);
    return () => clearTimeout(timeout);
  }, [arcLength, strokeDashoffset]);

  const scoreFontSize = Math.max(22, Math.round(size * 0.18));

  return (
    <div className="health-gauge-card">
      <div
        className="gauge-svg-container"
        style={{ width: size, height: size * 0.82, position: 'relative' }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="gauge-svg"
        >
          <defs>
            <linearGradient id="warmGaugeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FF5E62" />
              <stop offset="100%" stopColor={scoreColor} />
            </linearGradient>
            <filter id="warmGaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--gauge-track, rgba(0,0,0,0.06))"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(140 ${size / 2} ${size / 2})`}
          />

          {/* Active Score Arc */}
          <circle
            ref={arcRef}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#warmGaugeGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(140 ${size / 2} ${size / 2})`}
            className="gauge-meter-arc"
            filter="url(#warmGaugeGlow)"
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>

        {/* Center Score Inside the Arc */}
        <div
          className="gauge-center-content"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: '14px',
          }}
        >
          <span
            className="gauge-number"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: `${scoreFontSize}px`,
              fontWeight: 800,
              color: scoreColor,
              lineHeight: 1,
            }}
          >
            {normalizedScore}
          </span>
          <span
            className="gauge-max"
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
              marginTop: '2px',
            }}
          >
            / 100
          </span>
          <span
            className="gauge-tier-pill"
            style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '2px 8px',
              borderRadius: '6px',
              border: `1px solid ${scoreColor}`,
              color: scoreColor,
              background: 'var(--bg-surface-solid)',
              marginTop: '4px',
            }}
          >
            {tier}
          </span>
        </div>
      </div>

      <div className="gauge-info-col" style={{ textAlign: 'center', marginTop: '6px' }}>
        <h4
          className="gauge-label"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.92rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </h4>
        <p
          className="gauge-sub"
          style={{
            fontSize: '0.76rem',
            color: 'var(--text-secondary)',
            marginTop: '2px',
            lineHeight: 1.4,
            maxWidth: `${size + 20}px`,
          }}
        >
          {tierSub}
        </p>
      </div>
    </div>
  );
}
