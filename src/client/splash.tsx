import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// ─────────────────────────────────────────────
// DROP YOUR LOGO HERE
// Replace the src with your actual image URL or
// import e.g.:  import logoSrc from './logo.png';
// ─────────────────────────────────────────────
const LOGO_SRC = '/logo.png'; // ← swap this
const LOGO_ALT = 'ModStat';

// Preload BEFORE React renders so the browser fetches logo & fonts
// in parallel with JS parsing — eliminates the pop-in lag entirely.
(function preload() {
  // Logo: hint browser to fetch it immediately
  const imgLink = document.createElement('link');
  imgLink.rel = 'preload';
  imgLink.as = 'image';
  imgLink.href = LOGO_SRC;
  document.head.appendChild(imgLink);

  // Fonts: <link> loads in parallel; @import inside <style> is render-blocking
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href =
    'https://fonts.googleapis.com/css2?family=Poppins:wght@700;800;900&family=Instrument+Serif:ital@0;1&display=swap';
  document.head.appendChild(fontLink);
})();

const Splash = () => {
  const isMobile = window.innerWidth < 768;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#070707',
        color: '#fff',
        fontFamily: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif",
        WebkitTextSizeAdjust: '100%',
      }}
    >
      <style>{`

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.55; transform: translateX(-50%) scale(1); }
          50%       { opacity: 0.88; transform: translateX(-50%) scale(1.07); }
        }
        @keyframes orb-drift {
          0%, 100% { transform: translateX(-50%) translateY(0px)   scale(1);    opacity: 0.7; }
          50%       { transform: translateX(-50%) translateY(-20px) scale(1.09); opacity: 1;   }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .splash-logo    { animation: fade-up 0.45s ease both; animation-delay: 0.00s; }
        .splash-badge   { animation: fade-up 0.5s  ease both; animation-delay: 0.10s; }
        .splash-heading { animation: fade-up 0.5s  ease both; animation-delay: 0.20s; }
        .splash-sub     { animation: fade-up 0.5s  ease both; animation-delay: 0.30s; }
        .splash-cta     { animation: fade-up 0.5s  ease both; animation-delay: 0.40s; }
        .splash-stats   { animation: fade-up 0.5s  ease both; animation-delay: 0.50s; }

        .cta-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 0 72px rgba(255,106,61,0.42) !important; }
        .nav-btn:hover { background: rgba(255,106,61,0.08) !important; }
      `}</style>

      {/* GRID */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `
          linear-gradient(rgba(255,255,255,0.022) 1px, transparent 8px),
          linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 8px)`,
          backgroundSize: isMobile ? '80px 80px' : '110px 110px',
          opacity: 0.35,
        }}
      />

      {/* TOP GLOW */}
      <div
        style={{
          position: 'absolute',
          top: '-260px',
          left: '50%',
          width: isMobile ? '360px' : '1100px',
          height: isMobile ? '400px' : '750px',
          background:
            'radial-gradient(ellipse, rgba(255,106,61,0.20) 0%, rgba(255,80,20,0.07) 50%, transparent 72%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          animation: 'glow-pulse 6s ease-in-out infinite',
        }}
      />

      {/* CENTRE ORB */}
      <div
        style={{
          position: 'absolute',
          width: isMobile ? '320px' : '700px',
          height: isMobile ? '320px' : '700px',
          background:
            'radial-gradient(circle, rgba(255,106,61,0.12) 0%, rgba(255,60,10,0.05) 55%, transparent 72%)',
          filter: 'blur(55px)',
          top: isMobile ? '80px' : '60px',
          left: '50%',
          pointerEvents: 'none',
          animation: 'orb-drift 8s ease-in-out infinite',
        }}
      />

      {/* BOTTOM EDGE GLOW — desktop */}
      {!isMobile && (
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '320px',
            background:
              'radial-gradient(ellipse, rgba(255,106,61,0.07), transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── FULL PAGE LAYOUT ─────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* ── LOGO AREA ───────────────────────────────────────
            Replace the <img> src with your logo file.
            The wrapper is sized so your logo renders crisply
            on both mobile and desktop with no extra work.
            Recommended logo specs:
              • Format : SVG (best) or PNG with transparency
              • Height : at least 80px @2x (so 160px source)
              • Width  : any — it scales proportionally
        ─────────────────────────────────────────────────────── */}
        <div
          className="splash-logo"
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: isMobile ? 'center' : 'space-between',
            alignItems: 'center',
            padding: isMobile ? '12px 24px' : '20px 52px',
            boxSizing: 'border-box',
          }}
        >
          {/* LOGO IMAGE — swap src below */}
          <img
            src="/logo.png"
            alt="ModStat"
            style={{
              height: isMobile ? '140px' : '72px', // adjust to match your logo's visual weight
              width: 'auto',
              display: 'block',
              objectFit: 'contain',
              // Subtle glow so it reads on the dark bg without touching the image itself
              filter: 'drop-shadow(0 0 12px rgba(255,106,61,0.25))',
            }}
            // Graceful fallback if logo hasn't been swapped in yet
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = 'none';
              const fallback = el.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          {/* FALLBACK placeholder shown only when image fails to load */}
          <div
            style={{
              display: 'none', // hidden by default; shown via onError above
              alignItems: 'center',
              gap: '8px',
              height: isMobile ? '32px' : '40px',
            }}
          >
            <div
              style={{
                width: isMobile ? '32px' : '40px',
                height: isMobile ? '32px' : '40px',
                borderRadius: '8px',
                border: '1.5px dashed rgba(255,106,61,0.5)',
                background: 'rgba(255,106,61,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i
                className="ti ti-photo"
                style={{ fontSize: '14px', color: 'rgba(255,106,61,0.6)' }}
              />
            </div>
            <span
              style={{
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.28)',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Your Logo
            </span>
          </div>

          {/* Desktop "Launch" button stays on the right */}
          {!isMobile && (
            <button
              className="nav-btn"
              onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,106,61,0.32)',
                color: '#ff6a3d',
                padding: '11px 24px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                transition: '0.2s ease',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Launch Dashboard →
            </button>
          )}
        </div>

        {/* ── HERO ────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            textAlign: 'center',
            boxSizing: 'border-box',
            padding: isMobile ? '-80px 24px 24px' : '-80px 80px 40px',
            width: '100%',
          }}
        >
          {/* TRUST BADGE */}
          <div
            className="splash-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: isMobile ? '7px 13px' : '9px 18px',
              borderRadius: '999px',
              border: '1px solid rgba(255,106,61,0.20)',
              background: 'rgba(255,106,61,0.06)',
              backdropFilter: 'blur(12px)',
              marginBottom: isMobile ? '22px' : '40px',
            }}
          >
            <i
              className="ti ti-shield-check"
              style={{ fontSize: '12px', color: '#ff6a3d' }}
            />
            <span
              style={{
                fontSize: isMobile ? '9px' : '11px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.62)',
                fontWeight: 600,
              }}
            >
              Trusted by moderators across communities
            </span>
          </div>

          {/* HEADING */}
          <h2
            className="splash-heading"
            style={{
              margin: 0,
              maxWidth: isMobile ? '100%' : '1200px',
              fontSize: isMobile
                ? 'clamp(2rem, 10vw, 2.7rem)'
                : 'clamp(6rem, 8vw, 9rem)',
              lineHeight: isMobile ? 1.05 : 0.96,
              letterSpacing: isMobile ? '-0.02em' : '-0.035em',
              fontWeight: 400,
              fontFamily: "'Instrument Serif', 'Times New Roman', serif",
            }}
          >
            Smarter moderation.
            <br />
            <span
              style={{
                color: '#ff6a3d',
                fontStyle: 'italic',
                textShadow: '0 0 80px rgba(255,106,61,0.38)',
              }}
            >
              Stronger communities.
            </span>
          </h2>

          {/* ACCENT DIVIDER — desktop */}
          {!isMobile && (
            <div
              style={{
                width: '52px',
                height: '1.5px',
                background: 'rgba(255,106,61,0.5)',
                margin: '32px auto',
                borderRadius: '999px',
                boxShadow: '0 0 14px rgba(255,106,61,0.55)',
              }}
            />
          )}

          {/* SUBTEXT */}
          <p
            className="splash-sub"
            style={{
              marginTop: isMobile ? '18px' : '0',
              marginBottom: isMobile ? '30px' : '44px',
              maxWidth: isMobile ? '100%' : '560px',
              fontSize: isMobile ? '15px' : '20px',
              lineHeight: 1.7,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.52)',
              letterSpacing: '0.01em',
            }}
          >
            Track removals, repeat offenders, and rule trends — delivered to
            your inbox.
          </p>

          {/* CTA */}
          <button
            className="splash-cta cta-btn"
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '9px',
              background: '#ff6a3d',
              color: '#fff',
              border: 'none',
              padding: isMobile ? '13px 24px' : '16px 40px',
              borderRadius: '12px',
              fontSize: isMobile ? '14px' : '17px',
              fontWeight: 700,
              letterSpacing: '0.03em',
              cursor: 'pointer',
              boxShadow:
                '0 0 52px rgba(255,106,61,0.28), inset 0 1px 0 rgba(255,255,255,0.15)',
              transition: 'all 0.22s ease',
              WebkitTapHighlightColor: 'transparent',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Launch Dashboard
            <i className="ti ti-arrow-right" style={{ fontSize: '15px' }} />
          </button>

          {/* STAT ROW — desktop only */}
          {!isMobile && (
            <div
              className="splash-stats"
              style={{
                display: 'flex',
                gap: '64px',
                marginTop: '64px',
                alignItems: 'center',
              }}
            >
              {[
                { value: 'Weekly', label: 'Digest reports' },
                { value: 'Auto', label: 'Zero manual work' },
                { value: 'Real-time', label: 'Rule trend alerts' },
              ].map(({ value, label }, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: '#ff6a3d',
                      fontFamily: "'Poppins', sans-serif",
                      textShadow: '0 0 20px rgba(255,106,61,0.45)',
                    }}
                  >
                    {value}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.32)',
                      marginTop: '5px',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
