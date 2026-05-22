import './index.css';

import { navigateTo, context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const features = [
  {
    icon: 'ti-chart-bar',
    title: 'Weekly Analytics',
    description: 'Track removal reasons and moderation trends over time.',
  },
  {
    icon: 'ti-robot',
    title: 'Fully Automatic',
    description: 'Runs silently 24/7 with no intervention needed.',
  },
  {
    icon: 'ti-bolt',
    title: 'Zero Effort',
    description: 'Install once and receive weekly reports in your inbox.',
  },
];

const Splash = () => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background:
          'radial-gradient(ellipse at 50% 0%, #3a1a0a 0%, #1a0a00 40%, #0f0f0f 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        overflow: 'hidden',
        padding: '24px 20px',
        boxSizing: 'border-box',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '400px',
          height: '300px',
          background:
            'radial-gradient(ellipse, rgba(249,115,22,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo icon centered */}
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #f97316, #ef4444)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 32px rgba(249,115,22,0.45)',
          marginBottom: '12px',
        }}
      >
        <i
          className="ti ti-chart-bar"
          style={{ fontSize: '26px', color: '#fff' }}
          aria-hidden="true"
        />
      </div>

      {/* Wordmark */}
      <h1
        style={{
          margin: '0 0 4px',
          fontSize: '2.4rem',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: '#fff',
        }}
      >
        Mod
        <span
          style={{
            background: 'linear-gradient(90deg, #f97316, #ef4444)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Stat
        </span>
      </h1>

      {/* Subtitle label */}
      <p
        style={{
          margin: '0 0 10px',
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
        }}
      >
        Reddit Analytics &amp; Trends
      </p>

      {/* Welcome */}
      <p
        style={{
          margin: '0 0 10px',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.45)',
        }}
      >
        Welcome back,{' '}
        <span style={{ color: '#f97316', fontWeight: 600 }}>
          {context.username ?? 'Moderator'}
        </span>
      </p>

      {/* Heading */}
      <h2
        style={{
          margin: '0 0 8px',
          fontSize: '1.35rem',
          fontWeight: 800,
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1.3,
          maxWidth: '340px',
        }}
      >
        Get private weekly insights into your moderation trends.
      </h2>

      {/* Description */}
      <p
        style={{
          margin: '0 0 20px',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.45)',
          textAlign: 'center',
          maxWidth: '320px',
          lineHeight: 1.5,
        }}
      >
        Track removals, repeat offenders, and rule patterns automatically
        delivered to your inbox.
      </p>

      {/* Feature list */}
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        {features.map(({ icon, title, description }) => (
          <div
            key={title}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.09)',
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(249,115,22,0.15)',
                border: '0.5px solid rgba(249,115,22,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i
                className={`ti ${icon}`}
                style={{ fontSize: '17px', color: '#f97316' }}
                aria-hidden="true"
              />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                {title}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '11.5px',
                  color: 'rgba(255,255,255,0.4)',
                  lineHeight: 1.4,
                }}
              >
                {description}
              </p>
            </div>
            <i
              className="ti ti-chevron-right"
              style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.25)',
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '13px 0',
          width: '100%',
          maxWidth: '380px',
          borderRadius: '100px',
          border: 'none',
          background: 'linear-gradient(135deg, #f97316, #ef4444)',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 8px 28px rgba(249,115,22,0.45)',
          marginBottom: '14px',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
        }}
      >
        <i
          className="ti ti-rocket"
          style={{ fontSize: '16px' }}
          aria-hidden="true"
        />
        Launch Dashboard
        <i
          className="ti ti-chevron-right"
          style={{ fontSize: '15px' }}
          aria-hidden="true"
        />
      </button>

      {/* Trust line */}
      <p
        style={{
          margin: '0 0 10px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        <i
          className="ti ti-shield-check"
          style={{ fontSize: '13px', color: 'rgba(249,115,22,0.5)' }}
          aria-hidden="true"
        />
        Trusted by moderators across hundreds of communities.
      </p>

      {/* Footer links */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {[
          {
            label: 'Docs',
            url: 'https://developers.reddit.com/docs',
            icon: 'ti-file-text',
          },
          {
            label: 'Community',
            url: 'https://www.reddit.com/r/Devvit',
            icon: 'ti-users',
          },
          {
            label: 'Support',
            url: 'https://discord.com/invite/R7yu2wh9Qz',
            icon: 'ti-headset',
          },
        ].map(({ label, url, icon }, i, arr) => (
          <span
            key={label}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <button
              onClick={() => navigateTo(url)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.3)',
                borderRadius: '6px',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  'rgba(255,255,255,0.65)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  'rgba(255,255,255,0.3)';
              }}
            >
              <i
                className={`ti ${icon}`}
                style={{ fontSize: '12px' }}
                aria-hidden="true"
              />
              {label}
            </button>
            {i < arr.length - 1 && (
              <span
                style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}
              >
                •
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
