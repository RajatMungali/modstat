import { StrictMode, useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { REMOVAL_REASON_NONE } from '../shared/api';

async function apiFetch(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    body: options.body,
  });
  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(err.message ?? 'Request failed');
  }
  return response.json();
}

const ORANGE = '#f97316';
const ORANGE_DIM = 'rgba(249,115,22,0.18)';
const ORANGE_BORDER = 'rgba(249,115,22,0.28)';
const BG = '#0c0c0f';
const SURFACE = 'rgba(255,255,255,0.04)';
const SURFACE_HOVER = 'rgba(255,255,255,0.07)';
const BORDER = 'rgba(255,255,255,0.07)';
const TEXT_PRIMARY = '#f1f0ec';
const TEXT_MUTED = '#6b6a66';
const TEXT_SEC = '#9c9a92';

const RULE_COLORS = [
  '#f97316',
  '#ef4444',
  '#a855f7',
  '#3b82f6',
  '#10b981',
  '#eab308',
  '#ec4899',
  '#06b6d4',
];

const Ic = ({ d, size = 16, color = 'currentColor', extra }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d && <path d={d} />}
    {extra}
  </svg>
);

const IcTrash = (p) => (
  <Ic
    {...p}
    d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
  />
);
const IcFile = (p) => (
  <Ic
    {...p}
    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    extra={<polyline points="14 2 14 8 20 8" />}
  />
);
const IcMsg = (p) => (
  <Ic
    {...p}
    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
  />
);
const IcCal = (p) => (
  <Ic
    {...p}
    extra={
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    }
  />
);
const IcBar = (p) => (
  <Ic
    {...p}
    extra={
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </>
    }
  />
);
const IcMail = (p) => (
  <Ic
    {...p}
    d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
    extra={<polyline points="22,6 12,13 2,6" />}
  />
);
const IcWarn = (p) => (
  <Ic
    {...p}
    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
    extra={
      <>
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    }
  />
);
const IcUser = (p) => (
  <Ic
    {...p}
    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
    extra={<circle cx="12" cy="7" r="4" />}
  />
);
const IcRefresh = (p) => (
  <Ic
    {...p}
    d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
    extra={
      <>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
      </>
    }
  />
);
const IcCheck = (p) => (
  <Ic {...p} extra={<polyline points="4 12 9 17 20 6" />} />
);
const IcTarget = (p) => (
  <Ic
    {...p}
    extra={
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    }
  />
);
const IcClip = (p) => (
  <Ic
    {...p}
    d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0-2-2h-2"
    extra={
      <>
        <rect x="9" y="3" width="6" height="4" rx="2" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </>
    }
  />
);
const IcX = (p) => (
  <Ic
    {...p}
    extra={
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    }
  />
);

const DonutChart = ({ data, total }) => {
  const entries = Object.entries(data)
    .filter(([k]) => k !== REMOVAL_REASON_NONE)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  if (!entries.length || total === 0)
    return (
      <p
        style={{
          color: TEXT_MUTED,
          fontSize: 12,
          textAlign: 'center',
          padding: '20px 0',
        }}
      >
        No rule data yet
      </p>
    );
  const cx = 80,
    cy = 80,
    r = 62,
    strokeW = 20;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;
  const slices = entries.map(([label, count], i) => {
    const pct = count / total;
    const offset = circumference * (1 - cumulative);
    const dash = circumference * pct;
    cumulative += pct;
    return {
      label,
      count,
      pct,
      offset,
      dash,
      color: RULE_COLORS[i % RULE_COLORS.length],
    };
  });
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={160} height={160} viewBox="0 0 160 160">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeW}
          />
          {slices.map((s, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeW}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: `${cx}px ${cy}px`,
                transition: 'stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          ))}
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            fill={TEXT_PRIMARY}
            fontSize={26}
            fontWeight={800}
            fontFamily="'DM Sans',sans-serif"
          >
            {total}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fill={TEXT_MUTED}
            fontSize={10}
            fontFamily="'DM Sans',sans-serif"
            letterSpacing="0.08em"
          >
            TOTAL
          </text>
        </svg>
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 120,
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
        }}
      >
        {slices.map((s, i) => (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: TEXT_SEC,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {s.label}
            </span>
            <span
              style={{
                fontSize: 11,
                color: TEXT_MUTED,
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              {Math.round(s.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DayChart = ({ data }) => {
  const entries = Object.entries(data);
  if (!entries.length)
    return <p style={{ color: TEXT_MUTED, fontSize: 12 }}>No data yet</p>;
  const max = Math.max(...entries.map((e) => e[1]), 1);
  const chartH = 100;
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          minWidth: entries.length * 40,
          height: chartH + 40,
        }}
      >
        {entries.map(([label, count], i) => {
          const barH = Math.max(4, (count / max) * chartH);
          const shortLabel = label.length > 4 ? label.slice(0, 3) : label;
          const isMax = count === max;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                flex: 1,
                minWidth: 32,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: TEXT_MUTED,
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {count > 0 ? count : ''}
              </span>
              <div
                style={{
                  width: '100%',
                  height: chartH,
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: barH,
                    background: isMax
                      ? `linear-gradient(180deg, ${ORANGE} 0%, rgba(249,115,22,0.5) 100%)`
                      : 'rgba(249,115,22,0.25)',
                    borderRadius: '4px 4px 2px 2px',
                    boxShadow: isMax ? `0 0 10px rgba(249,115,22,0.4)` : 'none',
                    transition: 'height 0.6s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: isMax ? ORANGE : TEXT_MUTED,
                  fontWeight: isMax ? 700 : 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const HBar = ({ label, count, total, color = ORANGE }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 5,
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: TEXT_SEC,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '68%',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 11,
            color: TEXT_MUTED,
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
            marginLeft: 8,
          }}
        >
          {count} · {pct}%
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 99,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 99,
            transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      </div>
    </div>
  );
};

const KpiCard = ({ label, value, accent, icon }) => (
  <div
    style={{
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderRadius: 16,
      padding: '14px 16px',
      flex: '1 1 0',
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)`,
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: accent,
          letterSpacing: '-1.5px',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: TEXT_MUTED,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 700,
          marginTop: 3,
        }}
      >
        {label}
      </div>
    </div>
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: `${accent}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
  </div>
);

const Card = ({ children, style, glow }) => (
  <div
    style={{
      background: SURFACE,
      border: `1px solid ${glow ? ORANGE_BORDER : BORDER}`,
      borderRadius: 16,
      padding: '16px 18px',
      boxShadow: glow
        ? `0 0 20px rgba(249,115,22,0.08), inset 0 1px 0 rgba(255,255,255,0.04)`
        : `inset 0 1px 0 rgba(255,255,255,0.03)`,
      ...style,
    }}
  >
    {children}
  </div>
);

const SLabel = ({ children, action }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    }}
  >
    <p
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: TEXT_MUTED,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        margin: 0,
      }}
    >
      {children}
    </p>
    {action}
  </div>
);

const CardHead = ({ icon, title, accent = ORANGE_DIM }) => (
  <div
    style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}
  >
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: accent,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <p
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: TEXT_MUTED,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        margin: 0,
      }}
    >
      {title}
    </p>
  </div>
);

const RemovalRow = ({ entry }) => {
  const mins = Math.floor((Date.now() - entry.timestamp) / 60000);
  const timeAgo =
    mins < 1
      ? 'just now'
      : mins < 60
        ? `${mins}m ago`
        : mins < 1440
          ? `${Math.floor(mins / 60)}h ago`
          : `${Math.floor(mins / 1440)}d ago`;
  const isComment = entry.contentType === 'comment';
  const isNoReason = entry.removalReason === REMOVAL_REASON_NONE;
  return (
    <div
      style={{
        display: 'flex',
        gap: 11,
        padding: '10px 0',
        borderBottom: `1px solid ${BORDER}`,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: isComment ? 'rgba(168,85,247,0.12)' : ORANGE_DIM,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isComment ? (
          <IcMsg size={14} color="#a855f7" />
        ) : (
          <IcFile size={14} color={ORANGE} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: TEXT_PRIMARY,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 2,
          }}
        >
          {entry.title}
        </p>
        <p style={{ fontSize: 11, color: TEXT_MUTED }}>
          u/{entry.authorName} ·{' '}
          <span
            style={{
              color: isNoReason ? '#ef4444' : isComment ? '#a855f7' : ORANGE,
              fontWeight: 600,
            }}
          >
            {entry.removalReason}
          </span>{' '}
          · {timeAgo}
        </p>
      </div>
    </div>
  );
};

const NavPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      fontSize: 12,
      fontWeight: active ? 700 : 500,
      color: active ? '#0c0c0f' : TEXT_SEC,
      background: active ? ORANGE : 'transparent',
      border: 'none',
      borderRadius: 99,
      padding: '5px 14px',
      cursor: 'pointer',
      transition: 'all 0.15s',
      fontFamily: 'inherit',
      boxShadow: active ? `0 0 12px rgba(249,115,22,0.5)` : 'none',
    }}
  >
    {label}
  </button>
);

const ConfirmModal = ({ onConfirm, onCancel }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backdropFilter: 'blur(6px)',
    }}
  >
    <div
      style={{
        background: '#13131a',
        border: `1px solid ${BORDER}`,
        borderRadius: 20,
        padding: 28,
        maxWidth: 320,
        width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'rgba(239,68,68,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IcWarn size={16} color="#ef4444" />
        </div>
        <p style={{ fontSize: 16, fontWeight: 800, color: TEXT_PRIMARY }}>
          Clear this week?
        </p>
      </div>
      <p
        style={{
          fontSize: 13,
          color: TEXT_MUTED,
          marginBottom: 22,
          lineHeight: 1.6,
        }}
      >
        This will permanently delete all removal records for the current week.
        This cannot be undone.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '11px 0',
            borderRadius: 12,
            background: SURFACE_HOVER,
            border: `1px solid ${BORDER}`,
            color: TEXT_SEC,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1,
            padding: '11px 0',
            borderRadius: 12,
            background: '#ef4444',
            border: 'none',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Clear Week
        </button>
      </div>
    </div>
  </div>
);

const Spinner = ({ size = 14 }) => (
  <div
    style={{
      width: size,
      height: size,
      border: `2px solid rgba(249,115,22,0.25)`,
      borderTop: `2px solid ${ORANGE}`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }}
  />
);

const DigestBanner = ({ onDismiss }) => (
  <div
    style={{
      background: 'rgba(16,185,129,0.07)',
      border: '1px solid rgba(16,185,129,0.2)',
      borderRadius: 12,
      padding: '12px 14px',
      marginTop: 10,
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: 'rgba(16,185,129,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IcCheck size={12} color="#10b981" />
        </div>
        <div>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#10b981',
              margin: 0,
            }}
          >
            Sent to Mod Discussions!
          </p>
          <p
            style={{ fontSize: 10, color: TEXT_MUTED, margin: 0, marginTop: 1 }}
          >
            Only visible to mods
          </p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: 5,
        }}
      >
        <IcX size={12} color={TEXT_MUTED} />
      </button>
    </div>
    <p style={{ fontSize: 11, color: TEXT_MUTED, textAlign: 'center' }}>
      Check Mod Discussions in modmail.
    </p>
  </div>
);

export const App = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState(null);
  const [recentRemovals, setRecentRemovals] = useState([]);
  const [tab, setTab] = useState('overview');
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestResult, setDigestResult] = useState(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearMsg, setClearMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [isMod, setIsMod] = useState(false);
  const [showAllReasons, setShowAllReasons] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/init');
      if (data.status === 'error') {
        setError(data.message);
        return;
      }
      setUsername(data.username);
      setIsMod(data.isMod);
      setStats(data.stats);
      setRecentRemovals(data.recentRemovals);
      setLastUpdated(Date.now());
    } catch {
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const generateDigest = useCallback(async () => {
    setDigestLoading(true);
    setDigestResult(null);
    try {
      const r = await apiFetch('/generate-digest', { method: 'POST' });
      setDigestResult(
        !r.success
          ? { error: r.message ?? 'Failed' }
          : { postUrl: r.modmailUrl ?? null, error: null }
      );
    } catch (e) {
      setDigestResult({ error: e?.message ?? 'Failed to generate digest' });
    } finally {
      setDigestLoading(false);
    }
  }, []);

  const clearWeek = useCallback(async () => {
    setShowConfirm(false);
    setClearLoading(true);
    setClearMsg('');
    try {
      const r = await apiFetch('/reset-week', { method: 'POST' });
      setClearMsg(r.status === 'success' ? 'Week cleared.' : 'Clear failed.');
      await loadData();
    } catch {
      setClearMsg('Clear failed.');
    } finally {
      setClearLoading(false);
    }
  }, [loadData]);

  if (!loading && !isMod) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at top, #111827 0%, #050505 45%, #000000 100%)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 24px',
            borderRadius: 28,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 0 40px rgba(255, 69, 0, 0.08)',
            maxWidth: 360,
            width: '90%',
          }}
        >
          <img
            src="/deny.png"
            alt="Access Denied"
            style={{
              width: 180,
              height: 'auto',
              marginBottom: 24,
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 20px rgba(255,69,0,0.18))',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />

          <h2
            style={{
              color: '#ef4444',
              fontSize: 24,
              fontWeight: 800,
              margin: 0,
              marginBottom: 10,
              letterSpacing: '-0.03em',
            }}
          >
            Access Restricted
          </h2>

          <p
            style={{
              color: 'rgba(255,255,255,0.58)',
              fontSize: 14,
              lineHeight: 1.7,
              textAlign: 'center',
              margin: 0,
              maxWidth: 280,
            }}
          >
            This dashboard is only available to subreddit moderators.
          </p>
        </div>
      </div>
    );
  }

  const busiestDay = stats
    ? Object.entries(stats.byDay).sort((a, b) => b[1] - a[1])[0]
    : null;
  const topReason = stats
    ? Object.entries(stats.byReason)
        .filter(([r]) => r !== REMOVAL_REASON_NONE)
        .sort((a, b) => b[1] - a[1])[0]
    : null;
  const reasonEntries = stats ? Object.entries(stats.byReason) : [];
  const visibleReasons = showAllReasons
    ? reasonEntries
    : reasonEntries.slice(0, 6);
  const nowMins = Math.floor((Date.now() - lastUpdated) / 60000);
  const updatedLabel = nowMins < 1 ? 'just now' : `${nowMins}m ago`;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        color: TEXT_PRIMARY,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {showConfirm && (
        <ConfirmModal
          onConfirm={clearWeek}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.2); border-radius: 99px; }
        .action-btn:hover { background: rgba(255,255,255,0.1) !important; }
        button { font-family: inherit; }
        @media (max-width: 480px) {
          .kpi-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .two-col { grid-template-columns: 1fr !important; }
          .body-pad { padding: 14px 12px 80px !important; }
        }
        @media (min-width: 900px) {
          .kpi-grid { grid-template-columns: repeat(4,1fr) !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        <div
          style={{
            background: `linear-gradient(135deg, #1a0a00 0%, #110a18 60%, #0c0c0f 100%)`,
            borderBottom: `1px solid ${BORDER}`,
            padding: '14px 16px 0',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* orange glow blob */}
          <div
            style={{
              position: 'absolute',
              top: -40,
              left: -20,
              width: 200,
              height: 160,
              background:
                'radial-gradient(ellipse, rgba(249,115,22,0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Top row: logo+name LEFT — updated badge + refresh RIGHT */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              {/* Left: logo + title + subtitle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: `linear-gradient(135deg,#ea580c,${ORANGE})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 16px rgba(249,115,22,0.45)`,
                    flexShrink: 0,
                  }}
                >
                  <IcBar size={16} color="#fff" />
                </div>
                <div>
                  <h1
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: TEXT_PRIMARY,
                      letterSpacing: '-0.5px',
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    ModStat
                  </h1>
                  <p
                    style={{
                      fontSize: 11,
                      color: TEXT_MUTED,
                      margin: 0,
                      marginTop: 1,
                    }}
                  >
                    {loading ? 'Loading…' : `This week · u/${username}`}
                  </p>
                </div>
              </div>

              {/* Right: updated badge + refresh button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                {!loading && (
                  <span
                    style={{
                      background: 'rgba(249,115,22,0.15)',
                      borderRadius: 99,
                      padding: '4px 10px',
                      fontSize: 11,
                      color: ORANGE,
                      fontWeight: 600,
                      border: `1px solid rgba(249,115,22,0.25)`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {updatedLabel}
                  </span>
                )}
                <button
                  onClick={loadData}
                  className="action-btn"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${BORDER}`,
                    color: TEXT_SEC,
                    borderRadius: 99,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <IcRefresh size={11} color={TEXT_SEC} /> Refresh
                </button>
              </div>
            </div>

            {/* Tab pills */}
            <div
              style={{
                display: 'flex',
                gap: 2,
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 99,
                padding: 3,
                width: 'fit-content',
                border: `1px solid ${BORDER}`,
              }}
            >
              {['overview', 'reasons', 'recent'].map((t) => (
                <NavPill
                  key={t}
                  label={t.charAt(0).toUpperCase() + t.slice(1)}
                  active={tab === t}
                  onClick={() => setTab(t)}
                />
              ))}
            </div>
            <div style={{ height: 12 }} />
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div
        className="body-pad"
        style={{
          flex: 1,
          padding: '16px 16px 48px',
          maxWidth: 960,
          width: '100%',
          margin: '0 auto',
          animation: 'fadeUp 0.35s ease both',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 80,
              gap: 14,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: `2px solid rgba(249,115,22,0.15)`,
                borderTop: `2px solid ${ORANGE}`,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                boxShadow: `0 0 16px rgba(249,115,22,0.2)`,
              }}
            />
            <p style={{ fontSize: 13, color: TEXT_MUTED }}>Loading stats…</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>
            <button
              onClick={loadData}
              style={{
                marginTop: 12,
                fontSize: 13,
                color: ORANGE,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Try again
            </button>
          </div>
        ) : !stats ? null : (
          <>
            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div
                  className="kpi-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2,1fr)',
                    gap: 10,
                  }}
                >
                  <KpiCard
                    label="Removals"
                    value={stats.totalRemovals}
                    accent={ORANGE}
                    icon={<IcTrash size={17} color={ORANGE} />}
                  />
                  <KpiCard
                    label="Posts"
                    value={stats.postCount ?? 0}
                    accent="#3b82f6"
                    icon={<IcFile size={17} color="#3b82f6" />}
                  />
                  <KpiCard
                    label="Comments"
                    value={stats.commentCount ?? 0}
                    accent="#a855f7"
                    icon={<IcMsg size={17} color="#a855f7" />}
                  />
                  <KpiCard
                    label="Busiest Day"
                    value={busiestDay?.[0]?.slice(0, 3) ?? '—'}
                    accent="#10b981"
                    icon={<IcCal size={17} color="#10b981" />}
                  />
                </div>

                {Object.keys(stats.byDay).length > 0 && (
                  <Card glow>
                    <CardHead
                      icon={<IcBar size={13} color={ORANGE} />}
                      title="Removals by Day"
                    />
                    <DayChart data={stats.byDay} />
                  </Card>
                )}

                <div
                  className="two-col"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <Card>
                    <CardHead
                      icon={<IcTarget size={13} color={ORANGE} />}
                      title="By Rule"
                    />
                    <DonutChart
                      data={stats.byReason}
                      total={stats.totalRemovals}
                    />
                  </Card>
                  {stats.topOffenders.length > 0 ? (
                    <Card>
                      <CardHead
                        icon={<IcUser size={13} color="#ef4444" />}
                        title={`Repeat Offenders (${stats.topOffenders.length})`}
                        accent="rgba(239,68,68,0.12)"
                      />
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        {stats.topOffenders.map((o, i) => (
                          <div
                            key={o.username}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                color: TEXT_SEC,
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                                minWidth: 0,
                                marginRight: 8,
                              }}
                            >
                              {i + 1}. u/{o.username}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                background: 'rgba(239,68,68,0.12)',
                                color: '#ef4444',
                                padding: '2px 9px',
                                borderRadius: 99,
                                flexShrink: 0,
                              }}
                            >
                              {o.count}x
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : topReason ? (
                    <Card glow>
                      <CardHead
                        icon={<IcTarget size={13} color={ORANGE} />}
                        title="Most Cited Rule"
                      />
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: ORANGE,
                          marginBottom: 4,
                          letterSpacing: '-0.3px',
                        }}
                      >
                        {topReason[0]}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: TEXT_MUTED,
                          fontWeight: 600,
                        }}
                      >
                        {topReason[1]} of {stats.totalRemovals} (
                        {Math.round((topReason[1] / stats.totalRemovals) * 100)}
                        %)
                      </p>
                    </Card>
                  ) : null}
                </div>

                {Object.keys(stats.byMod).length > 0 && (
                  <Card>
                    <CardHead
                      icon={<IcBar size={13} color="#3b82f6" />}
                      title="Mod Activity"
                      accent="rgba(59,130,246,0.12)"
                    />
                    {Object.entries(stats.byMod)
                      .sort((a, b) => b[1] - a[1])
                      .map(([mod, count]) => (
                        <HBar
                          key={mod}
                          label={mod}
                          count={count}
                          total={stats.totalRemovals}
                          color="#3b82f6"
                        />
                      ))}
                  </Card>
                )}

                {isMod && (
                  <div
                    className="two-col"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 12,
                    }}
                  >
                    <Card>
                      <CardHead
                        icon={<IcMail size={13} color={ORANGE} />}
                        title="Weekly Digest"
                      />
                      {!digestResult && (
                        <p
                          style={{
                            fontSize: 12,
                            color: TEXT_MUTED,
                            marginBottom: 14,
                            lineHeight: 1.6,
                          }}
                        >
                          Send this week's stats to Mod Discussions.
                        </p>
                      )}
                      {(!digestResult || digestResult.error) && (
                        <button
                          onClick={generateDigest}
                          disabled={digestLoading || stats.totalRemovals === 0}
                          style={{
                            width: '100%',
                            padding: '10px 0',
                            background:
                              stats.totalRemovals === 0
                                ? 'rgba(249,115,22,0.2)'
                                : `linear-gradient(135deg,#ea580c,${ORANGE})`,
                            border: 'none',
                            borderRadius: 11,
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 800,
                            cursor:
                              stats.totalRemovals === 0
                                ? 'not-allowed'
                                : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 7,
                            opacity: digestLoading ? 0.7 : 1,
                            boxShadow:
                              stats.totalRemovals > 0
                                ? `0 0 16px rgba(249,115,22,0.3)`
                                : 'none',
                          }}
                        >
                          {digestLoading ? (
                            <>
                              <Spinner /> Posting…
                            </>
                          ) : (
                            <>
                              <IcMail size={13} color="#fff" /> Generate Digest
                            </>
                          )}
                        </button>
                      )}
                      {digestResult?.error && (
                        <p
                          style={{
                            fontSize: 11,
                            color: '#ef4444',
                            textAlign: 'center',
                            marginTop: 10,
                          }}
                        >
                          {digestResult.error}
                        </p>
                      )}
                      {digestResult && !digestResult.error && (
                        <DigestBanner onDismiss={() => setDigestResult(null)} />
                      )}
                    </Card>
                    <Card style={{ borderColor: 'rgba(239,68,68,0.18)' }}>
                      <CardHead
                        icon={<IcWarn size={13} color="#ef4444" />}
                        title="Danger Zone"
                        accent="rgba(239,68,68,0.1)"
                      />
                      <p
                        style={{
                          fontSize: 12,
                          color: TEXT_MUTED,
                          marginBottom: 14,
                          lineHeight: 1.6,
                        }}
                      >
                        Clear all removal data for the current week.
                      </p>
                      <button
                        onClick={() => setShowConfirm(true)}
                        disabled={clearLoading}
                        style={{
                          width: '100%',
                          padding: '10px 0',
                          background: 'rgba(239,68,68,0.07)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: 11,
                          color: '#ef4444',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 7,
                        }}
                      >
                        <IcTrash size={13} color="#ef4444" />
                        {clearLoading ? 'Clearing…' : 'Clear This Week'}
                      </button>
                      {clearMsg && (
                        <p
                          style={{
                            fontSize: 11,
                            color: TEXT_MUTED,
                            textAlign: 'center',
                            marginTop: 8,
                          }}
                        >
                          {clearMsg}
                        </p>
                      )}
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* REASONS */}
            {tab === 'reasons' && (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {reasonEntries.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {reasonEntries
                      .filter(([k]) => k !== REMOVAL_REASON_NONE)
                      .map(([r], i) => (
                        <span
                          key={r}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            background: `${RULE_COLORS[i % RULE_COLORS.length]}18`,
                            color: RULE_COLORS[i % RULE_COLORS.length],
                            padding: '3px 10px',
                            borderRadius: 99,
                            border: `1px solid ${RULE_COLORS[i % RULE_COLORS.length]}22`,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: RULE_COLORS[i % RULE_COLORS.length],
                              display: 'inline-block',
                            }}
                          />
                          {r}
                        </span>
                      ))}
                  </div>
                )}
                <Card glow>
                  <SLabel
                    action={
                      Object.keys(stats.byReason).length > 6 && (
                        <button
                          onClick={() => setShowAllReasons((v) => !v)}
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: ORANGE,
                            background: ORANGE_DIM,
                            border: `1px solid ${ORANGE_BORDER}`,
                            borderRadius: 99,
                            padding: '4px 12px',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          {showAllReasons
                            ? 'Show less'
                            : `Show all ${Object.keys(stats.byReason).length}`}
                        </button>
                      )
                    }
                  >
                    Removal Reasons · {stats.totalRemovals} total
                  </SLabel>
                  {visibleReasons.map(([label, count], i) => (
                    <HBar
                      key={label}
                      label={label}
                      count={count}
                      total={stats.totalRemovals}
                      color={RULE_COLORS[i % RULE_COLORS.length]}
                    />
                  ))}
                </Card>
                <Card>
                  <SLabel>Day-wise Breakdown</SLabel>
                  <DayChart data={stats.byDay} />
                </Card>
                <Card>
                  <SLabel>Rule Distribution</SLabel>
                  <DonutChart
                    data={stats.byReason}
                    total={stats.totalRemovals}
                  />
                </Card>
              </div>
            )}

            {/* RECENT */}
            {tab === 'recent' && (
              <Card>
                <SLabel>
                  Recent Removals — {stats.postCount ?? 0} posts ·{' '}
                  {stats.commentCount ?? 0} comments
                </SLabel>
                {recentRemovals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: SURFACE_HOVER,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                      }}
                    >
                      <IcClip size={20} color={TEXT_MUTED} />
                    </div>
                    <p style={{ fontSize: 13, color: TEXT_MUTED }}>
                      No removals yet.
                    </p>
                  </div>
                ) : (
                  recentRemovals.map((entry) => (
                    <RemovalRow key={entry.id} entry={entry} />
                  ))
                )}
              </Card>
            )}
          </>
        )}
      </div>

      {/* ── Mobile bottom nav ── */}
      <div
        className="mobile-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(12,12,15,0.97)',
          borderTop: `1px solid ${BORDER}`,
          display: 'flex',
          padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
          zIndex: 60,
          backdropFilter: 'blur(16px)',
        }}
      >
        {['overview', 'reasons', 'recent'].map((t) => {
          const isActive = tab === t;
          const icons = {
            overview: (
              <IcBar size={20} color={isActive ? ORANGE : TEXT_MUTED} />
            ),
            reasons: (
              <IcTarget size={20} color={isActive ? ORANGE : TEXT_MUTED} />
            ),
            recent: <IcClip size={20} color={isActive ? ORANGE : TEXT_MUTED} />,
          };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              {icons[t]}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? ORANGE : TEXT_MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {t}
              </span>
              {isActive && (
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: ORANGE,
                    boxShadow: `0 0 6px ${ORANGE}`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        @media (min-width: 640px) { .mobile-nav { display: none !important; } }
        @media (max-width: 639px) { .body-pad { padding-bottom: 80px !important; } }
      `}</style>
    </div>
  );
};

const root = document.getElementById('root');
if (root)
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
export default App;
