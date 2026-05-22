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

const RULE_COLORS = [
  { bg: 'rgba(249,115,22,0.15)', color: '#f97316', bar: '#f97316' },
  { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', bar: '#ef4444' },
  { bg: 'rgba(168,85,247,0.15)', color: '#a855f7', bar: '#a855f7' },
  { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', bar: '#3b82f6' },
  { bg: 'rgba(16,185,129,0.15)', color: '#10b981', bar: '#10b981' },
  { bg: 'rgba(234,179,8,0.15)', color: '#eab308', bar: '#eab308' },
];

const Icon = ({
  d,
  size = 16,
  color = 'currentColor',
  poly,
  circle,
  line,
  rect,
}) => (
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
    {poly && poly.map((p, i) => <polyline key={i} points={p} />)}
    {circle && circle.map((c, i) => <circle key={i} {...c} />)}
    {line && line.map((l, i) => <line key={i} {...l} />)}
    {rect && rect.map((r, i) => <rect key={i} {...r} />)}
  </svg>
);

const IcHome = (p) => (
  <Icon
    {...p}
    d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    poly={['9 22 9 12 15 12 15 22']}
  />
);
const IcShield = (p) => (
  <Icon {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
);
const IcClock = (p) => (
  <Icon
    {...p}
    circle={[{ cx: 12, cy: 12, r: 10 }]}
    poly={['12 6 12 12 16 14']}
  />
);
const IcTrash = (p) => (
  <Icon
    {...p}
    poly={['3 6 5 6 21 6']}
    d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
  />
);
const IcFileText = (p) => (
  <Icon
    {...p}
    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    poly={['14 2 14 8 20 8']}
    line={[
      { x1: 16, y1: 13, x2: 8, y2: 13 },
      { x1: 16, y1: 17, x2: 8, y2: 17 },
    ]}
  />
);
const IcCalendar = (p) => (
  <Icon
    {...p}
    rect={[{ x: 3, y: 4, width: 18, height: 18, rx: 2, ry: 2 }]}
    line={[
      { x1: 16, y1: 2, x2: 16, y2: 6 },
      { x1: 8, y1: 2, x2: 8, y2: 6 },
      { x1: 3, y1: 10, x2: 21, y2: 10 },
    ]}
  />
);
const IcBarChart2 = (p) => (
  <Icon
    {...p}
    line={[
      { x1: 18, y1: 20, x2: 18, y2: 10 },
      { x1: 12, y1: 20, x2: 12, y2: 4 },
      { x1: 6, y1: 20, x2: 6, y2: 14 },
    ]}
  />
);
const IcMail = (p) => (
  <Icon
    {...p}
    d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
    poly={['22,6 12,13 2,6']}
  />
);
const IcAlertTriangle = (p) => (
  <Icon
    {...p}
    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
    line={[
      { x1: 12, y1: 9, x2: 12, y2: 13 },
      { x1: 12, y1: 17, x2: 12.01, y2: 17 },
    ]}
  />
);
const IcTarget = (p) => (
  <Icon
    {...p}
    circle={[
      { cx: 12, cy: 12, r: 10 },
      { cx: 12, cy: 12, r: 6 },
      { cx: 12, cy: 12, r: 2 },
    ]}
  />
);
const IcUser = (p) => (
  <Icon
    {...p}
    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
    circle={[{ cx: 12, cy: 7, r: 4 }]}
  />
);
const IcRefreshCw = (p) => (
  <Icon
    {...p}
    poly={['23 4 23 10 17 10', '1 20 1 14 7 14']}
    d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
  />
);
const IcSun = (p) => (
  <Icon
    {...p}
    circle={[{ cx: 12, cy: 12, r: 5 }]}
    line={[
      { x1: 12, y1: 1, x2: 12, y2: 3 },
      { x1: 12, y1: 21, x2: 12, y2: 23 },
      { x1: 4.22, y1: 4.22, x2: 5.64, y2: 5.64 },
      { x1: 18.36, y1: 18.36, x2: 19.78, y2: 19.78 },
      { x1: 1, y1: 12, x2: 3, y2: 12 },
      { x1: 21, y1: 12, x2: 23, y2: 12 },
      { x1: 4.22, y1: 19.78, x2: 5.64, y2: 18.36 },
      { x1: 18.36, y1: 5.64, x2: 19.78, y2: 4.22 },
    ]}
  />
);
const IcMoon = (p) => (
  <Icon {...p} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
);
const IcMenu = (p) => (
  <Icon
    {...p}
    line={[
      { x1: 3, y1: 12, x2: 21, y2: 12 },
      { x1: 3, y1: 6, x2: 21, y2: 6 },
      { x1: 3, y1: 18, x2: 21, y2: 18 },
    ]}
  />
);
const IcClipboardList = (p) => (
  <Icon
    {...p}
    d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0-2-2h-2"
    rect={[{ x: 9, y: 3, width: 6, height: 4, rx: 2 }]}
    line={[
      { x1: 9, y1: 12, x2: 15, y2: 12 },
      { x1: 9, y1: 16, x2: 13, y2: 16 },
    ]}
  />
);
const IcCheckCircle = (p) => (
  <Icon
    {...p}
    circle={[{ cx: 12, cy: 12, r: 10 }]}
    poly={['9 12 11 14 15 10']}
  />
);
const IcExternalLink = (p) => (
  <Icon
    {...p}
    d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
    poly={['12 3 21 3 21 12']}
    line={[{ x1: 21, y1: 3, x2: 11, y2: 13 }]}
  />
);
const IcCheck = (p) => <Icon {...p} poly={['4 12 9 17 20 6']} />;

const BarChart = ({
  data,
  total,
  accent = '#f97316',
  colorized = false,
  dark,
  showAll = false,
  colorMap = {},
}) => {
  const allSorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const sorted = showAll ? allSorted : allSorted.slice(0, 6);
  if (!sorted.length)
    return (
      <p style={{ color: dark ? '#6b7280' : '#9ca3af', fontSize: 12 }}>
        No data yet
      </p>
    );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sorted.map(([label, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const colorIndex =
          colorized && colorMap[label] !== undefined ? colorMap[label] : 0;
        const barColor = colorized
          ? RULE_COLORS[colorIndex % RULE_COLORS.length].bar
          : accent;
        return (
          <div key={label}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  maxWidth: '65%',
                  minWidth: 0,
                }}
              >
                {colorized && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: barColor,
                      flexShrink: 0,
                      display: 'inline-block',
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: dark ? '#d1d5db' : '#374151',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: dark ? '#9ca3af' : '#6b7280',
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
                height: 5,
                background: dark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.06)',
                borderRadius: 99,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: barColor,
                  borderRadius: 99,
                  transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const KpiCard = ({ label, value, accent, icon, dark }) => (
  <div
    style={{
      background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
      borderRadius: 18,
      padding: '16px 18px',
      flex: '1 1 0',
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      backdropFilter: 'blur(16px)',
      boxShadow: dark
        ? '0 2px 12px rgba(0,0,0,0.2)'
        : '0 2px 12px rgba(0,0,0,0.06)',
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div
        style={{
          fontSize: 30,
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
          color: dark ? '#9ca3af' : '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 700,
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        background: `${accent}1a`,
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

const Card = ({ children, style, dark }) => (
  <div
    style={{
      background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      borderRadius: 18,
      padding: '18px 20px',
      backdropFilter: 'blur(16px)',
      boxShadow: dark
        ? '0 2px 12px rgba(0,0,0,0.2)'
        : '0 2px 12px rgba(0,0,0,0.05)',
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionTitle = ({ children, dark }) => (
  <p
    style={{
      fontSize: 10,
      fontWeight: 700,
      color: dark ? '#6b7280' : '#9ca3af',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      marginBottom: 14,
    }}
  >
    {children}
  </p>
);

const CardHeader = ({ icon, title, iconBg, dark }) => (
  <div
    style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}
  >
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        background: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <SectionTitle dark={dark}>{title}</SectionTitle>
  </div>
);

const RuleBadge = ({ label, index }) => {
  const c = RULE_COLORS[index % RULE_COLORS.length];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        background: c.bg,
        color: c.color,
        padding: '3px 10px',
        borderRadius: 99,
        whiteSpace: 'nowrap',
        border: `1px solid ${c.color}22`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: c.color,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
};

// Posts only — always show post icon
const RemovalRow = ({ entry, dark }) => {
  const mins = Math.floor((Date.now() - entry.timestamp) / 60000);
  const timeAgo =
    mins < 1
      ? 'just now'
      : mins < 60
        ? `${mins}m ago`
        : mins < 1440
          ? `${Math.floor(mins / 60)}h ago`
          : `${Math.floor(mins / 1440)}d ago`;
  const isNoReason = entry.removalReason === REMOVAL_REASON_NONE;
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '10px 0',
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: 'rgba(249,115,22,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <IcFileText size={15} color="#f97316" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: dark ? '#e5e7eb' : '#111827',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 3,
          }}
        >
          {entry.title}
        </p>
        <p style={{ fontSize: 11, color: dark ? '#6b7280' : '#9ca3af' }}>
          u/{entry.authorName} ·{' '}
          <span
            style={{
              color: isNoReason ? '#ef4444' : '#f97316',
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

const NavItem = ({ icon, label, active, onClick, dark }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      padding: '9px 12px',
      borderRadius: 10,
      border: 'none',
      background: active
        ? dark
          ? 'rgba(249,115,22,0.15)'
          : 'rgba(249,115,22,0.1)'
        : 'transparent',
      color: active ? '#f97316' : dark ? '#9ca3af' : '#6b7280',
      fontWeight: active ? 700 : 500,
      fontSize: 13,
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'all 0.15s',
      fontFamily: 'inherit',
    }}
  >
    {icon}
    <span>{label}</span>
    {active && (
      <span
        style={{
          marginLeft: 'auto',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#f97316',
        }}
      />
    )}
  </button>
);

const ConfirmModal = ({ onConfirm, onCancel, dark }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backdropFilter: 'blur(4px)',
    }}
  >
    <div
      style={{
        background: dark ? '#1a1a2e' : '#ffffff',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: 20,
        padding: 28,
        maxWidth: 340,
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(239,68,68,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IcAlertTriangle size={18} color="#ef4444" />
        </div>
        <p
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: dark ? '#f9fafb' : '#111827',
          }}
        >
          Clear this week?
        </p>
      </div>
      <p
        style={{
          fontSize: 13,
          color: dark ? '#9ca3af' : '#6b7280',
          marginBottom: 24,
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
            background: dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            color: dark ? '#d1d5db' : '#374151',
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

const EmptyState = ({ dark }) => (
  <div style={{ textAlign: 'center', padding: '64px 24px' }}>
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 16,
        background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
      }}
    >
      <IcClipboardList size={26} color={dark ? '#6b7280' : '#9ca3af'} />
    </div>
    <p
      style={{
        fontSize: 18,
        fontWeight: 800,
        color: dark ? '#e5e7eb' : '#111827',
        marginBottom: 8,
      }}
    >
      No posts removed yet this week
    </p>
    <p
      style={{
        fontSize: 13,
        color: dark ? '#6b7280' : '#9ca3af',
        lineHeight: 1.7,
        maxWidth: 280,
        margin: '0 auto',
      }}
    >
      ModStat automatically tracks every post removal.
    </p>
  </div>
);

const LastUpdated = ({ ts }) => {
  const mins = Math.floor((Date.now() - ts) / 60000);
  return (
    <span
      style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}
    >
      Updated {mins < 1 ? 'just now' : `${mins}m ago`}
    </span>
  );
};

const DigestSuccessBanner = ({ postUrl, dark, onDismiss }) => (
  <div
    style={{
      background: dark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
      border: '1px solid rgba(16,185,129,0.25)',
      borderRadius: 14,
      padding: '14px 16px',
      marginTop: 12,
      animation: 'fadeUp 0.3s ease',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'rgba(16,185,129,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IcCheck size={14} color="#10b981" />
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
            style={{
              fontSize: 11,
              color: dark ? '#9ca3af' : '#6b7280',
              margin: 0,
              marginTop: 1,
            }}
          >
            Only visible to mods — not public
          </p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: dark ? '#6b7280' : '#9ca3af',
          fontSize: 18,
          lineHeight: 1,
          padding: '2px 6px',
          borderRadius: 6,
        }}
      >
        ×
      </button>
    </div>
    {postUrl ? (
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          color: '#fff',
          background: '#10b981',
          padding: '9px 14px',
          borderRadius: 10,
          textDecoration: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#059669')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#10b981')}
      >
        <IcExternalLink size={12} color="#fff" /> Open in Modmail
      </a>
    ) : (
      <p
        style={{
          fontSize: 11,
          color: dark ? '#9ca3af' : '#6b7280',
          textAlign: 'center',
        }}
      >
        Sent — check Mod Discussions in modmail.
      </p>
    )}
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
  const [dark, setDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllReasons, setShowAllReasons] = useState(false);
  const [isMod, setIsMod] = useState(false);

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
      if (!r.success) {
        setDigestResult({ error: r.message ?? 'Failed to post digest' });
        return;
      }
      setDigestResult({ postUrl: r.modmailUrl ?? null, error: null });
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
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0d1a',
          color: '#fff',
          fontFamily: "'DM Sans', sans-serif",
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🐰</div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              marginBottom: 10,
            }}
          >
            ModStat
          </h1>

          <p
            style={{
              color: '#9ca3af',
              fontSize: 14,
              lineHeight: 1.6,
              maxWidth: 320,
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
  const ruleKeys = stats
    ? Object.keys(stats.byReason).filter((r) => r !== REMOVAL_REASON_NONE)
    : [];
  const reasonColorMap = stats
    ? Object.fromEntries(Object.keys(stats.byReason).map((key, i) => [key, i]))
    : {};

  const textPrimary = dark ? '#f9fafb' : '#111827';
  const textMuted = dark ? '#9ca3af' : '#6b7280';
  const borderColor = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const bgGradient = dark
    ? 'radial-gradient(ellipse at 20% 0%, rgba(234,88,12,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(168,85,247,0.15) 0%, transparent 55%), radial-gradient(ellipse at 60% 40%, rgba(59,130,246,0.1) 0%, transparent 50%), #0d0d1a'
    : 'radial-gradient(ellipse at 20% 0%, rgba(234,88,12,0.1) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(168,85,247,0.08) 0%, transparent 55%), radial-gradient(ellipse at 60% 40%, rgba(59,130,246,0.06) 0%, transparent 50%), #f0f1f4';
  const sideBg = dark ? 'rgba(13,13,26,0.97)' : 'rgba(255,255,255,0.97)';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: bgGradient,
        color: textPrimary,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: 'flex',
        position: 'relative',
      }}
    >
      {showConfirm && (
        <ConfirmModal
          onConfirm={clearWeek}
          onCancel={() => setShowConfirm(false)}
          dark={dark}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.15); border-radius: 99px; }
        .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 49; backdrop-filter: blur(2px); }
        .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .two-col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 640px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .two-col-grid { grid-template-columns: 1fr; gap: 10px; }
          .header-title { font-size: 17px !important; }
          .content-pad { padding: 14px 12px 40px !important; }
        }
        @media (min-width: 1024px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
        button { font-family: inherit; }
      `}</style>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          width: 220,
          background: sideBg,
          borderRight: `1px solid ${borderColor}`,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 12px',
          gap: 4,
          flexShrink: 0,
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          overflowY: 'auto',
          zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '4px 8px 20px',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg,#ea580c,#f97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IcBarChart2 size={16} color="#fff" />
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 15,
              color: textPrimary,
              letterSpacing: '-0.3px',
            }}
          >
            modswift25
          </span>
        </div>
        <div
          style={{
            padding: '0 8px 8px',
            fontSize: 10,
            fontWeight: 700,
            color: textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          ModStat
        </div>
        <NavItem
          icon={
            <IcHome
              size={15}
              color={tab === 'overview' ? '#f97316' : textMuted}
            />
          }
          label="Overview"
          active={tab === 'overview'}
          onClick={() => {
            setTab('overview');
            setSidebarOpen(false);
          }}
          dark={dark}
        />
        <NavItem
          icon={
            <IcShield
              size={15}
              color={tab === 'reasons' ? '#f97316' : textMuted}
            />
          }
          label="Reasons"
          active={tab === 'reasons'}
          onClick={() => {
            setTab('reasons');
            setSidebarOpen(false);
          }}
          dark={dark}
        />
        <NavItem
          icon={
            <IcClock
              size={15}
              color={tab === 'recent' ? '#f97316' : textMuted}
            />
          }
          label="Recent"
          active={tab === 'recent'}
          onClick={() => {
            setTab('recent');
            setSidebarOpen(false);
          }}
          dark={dark}
        />
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setDark(!dark)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 12px',
            borderRadius: 10,
            border: 'none',
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            color: textMuted,
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          {dark ? (
            <IcSun size={14} color={textMuted} />
          ) : (
            <IcMoon size={14} color={textMuted} />
          )}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* Main */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: '100%',
        }}
      >
        {/* Header */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            style={{
              background:
                'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #a855f7 100%)',
              padding: '14px 16px 0',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 55%)',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: 8,
                      padding: '7px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IcMenu size={15} color="#fff" />
                  </button>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IcBarChart2 size={18} color="#fff" />
                  </div>
                  <div>
                    <h1
                      className="header-title"
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: '#fff',
                        letterSpacing: '-0.5px',
                        margin: 0,
                      }}
                    >
                      ModStat
                    </h1>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 1,
                        flexWrap: 'wrap',
                      }}
                    >
                      <p
                        style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.8)',
                          margin: 0,
                        }}
                      >
                        {loading ? 'Loading…' : `This week · u/${username}`}
                      </p>
                      {!loading && (
                        <span
                          style={{
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: 99,
                            padding: '1px 7px',
                            fontSize: 10,
                            color: '#fff',
                            fontWeight: 600,
                          }}
                        >
                          <LastUpdated ts={lastUpdated} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={loadData}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff',
                    borderRadius: 99,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    backdropFilter: 'blur(4px)',
                    flexShrink: 0,
                  }}
                >
                  <IcRefreshCw size={11} color="#fff" /> Refresh
                </button>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 2,
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 99,
                  padding: 3,
                  width: 'fit-content',
                }}
              >
                {['overview', 'reasons', 'recent'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      fontSize: 12,
                      fontWeight: t === tab ? 700 : 500,
                      color: t === tab ? '#111827' : 'rgba(255,255,255,0.8)',
                      background: t === tab ? '#ffffff' : 'transparent',
                      border: 'none',
                      borderRadius: 99,
                      padding: '5px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{ height: 12 }} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          className="content-pad"
          style={{
            flex: 1,
            padding: '18px 16px 48px',
            maxWidth: 1200,
            width: '100%',
            margin: '0 auto',
            animation: 'fadeUp 0.3s ease',
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
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  border: '3px solid rgba(249,115,22,0.2)',
                  borderTop: '3px solid #f97316',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <p style={{ fontSize: 13, color: textMuted }}>Loading stats…</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>
              <button
                onClick={loadData}
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: '#f97316',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Try again
              </button>
            </div>
          ) : !stats ? null : stats.totalRemovals === 0 &&
            tab === 'overview' ? (
            <EmptyState dark={dark} />
          ) : (
            <>
              {tab === 'overview' && (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div className="kpi-grid">
                    <KpiCard
                      label="Removals"
                      value={stats.totalRemovals}
                      accent="#f97316"
                      icon={<IcTrash size={18} color="#f97316" />}
                      dark={dark}
                    />
                    <KpiCard
                      label="Posts"
                      value={stats.postCount}
                      accent="#3b82f6"
                      icon={<IcFileText size={18} color="#3b82f6" />}
                      dark={dark}
                    />
                    <KpiCard
                      label="Busiest Day"
                      value={busiestDay?.[0]?.slice(0, 3) ?? '—'}
                      accent="#10b981"
                      icon={<IcCalendar size={18} color="#10b981" />}
                      dark={dark}
                    />
                  </div>

                  <div className="two-col-grid">
                    {topReason && (
                      <Card
                        dark={dark}
                        style={{
                          background: dark
                            ? 'rgba(249,115,22,0.06)'
                            : 'rgba(249,115,22,0.04)',
                          borderColor: 'rgba(249,115,22,0.2)',
                        }}
                      >
                        <CardHeader
                          icon={<IcTarget size={14} color="#f97316" />}
                          title="Most Cited Rule"
                          iconBg="rgba(249,115,22,0.15)"
                          dark={dark}
                        />
                        <p
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: dark ? '#fed7aa' : '#ea580c',
                            marginBottom: 4,
                            letterSpacing: '-0.3px',
                          }}
                        >
                          {topReason[0]}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: '#fb923c',
                            fontWeight: 600,
                          }}
                        >
                          {topReason[1]} of {stats.totalRemovals} removals (
                          {Math.round(
                            (topReason[1] / stats.totalRemovals) * 100
                          )}
                          %)
                        </p>
                      </Card>
                    )}
                    {stats.topOffenders.length > 0 && (
                      <Card dark={dark}>
                        <CardHeader
                          icon={<IcUser size={14} color="#ef4444" />}
                          title={`Repeat Offenders (${stats.topOffenders.length})`}
                          iconBg="rgba(239,68,68,0.12)"
                          dark={dark}
                        />
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 7,
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
                                  color: dark ? '#d1d5db' : '#374151',
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
                    )}
                  </div>

                  {Object.keys(stats.byMod).length > 0 && (
                    <Card dark={dark}>
                      <CardHeader
                        icon={<IcBarChart2 size={14} color="#3b82f6" />}
                        title="Mod Activity"
                        iconBg="rgba(59,130,246,0.12)"
                        dark={dark}
                      />
                      <BarChart
                        data={stats.byMod}
                        total={stats.totalRemovals}
                        accent="#3b82f6"
                        dark={dark}
                      />
                    </Card>
                  )}

                  <div className="two-col-grid">
                    <Card dark={dark}>
                      <CardHeader
                        icon={<IcMail size={14} color="#f97316" />}
                        title="Weekly Digest"
                        iconBg="rgba(249,115,22,0.12)"
                        dark={dark}
                      />
                      {!digestResult && (
                        <p
                          style={{
                            fontSize: 12,
                            color: textMuted,
                            marginBottom: 14,
                            lineHeight: 1.6,
                          }}
                        >
                          Post this week's stats as a mod-only sticky.
                        </p>
                      )}
                      {(!digestResult || digestResult.error) && (
                        <button
                          onClick={generateDigest}
                          disabled={digestLoading || stats.totalRemovals === 0}
                          style={{
                            width: '100%',
                            padding: '11px 0',
                            background:
                              stats.totalRemovals === 0
                                ? 'rgba(249,115,22,0.3)'
                                : 'linear-gradient(135deg,#ea580c,#f97316,#a855f7)',
                            border: 'none',
                            borderRadius: 12,
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
                          }}
                        >
                          {digestLoading ? (
                            <>
                              <div
                                style={{
                                  width: 14,
                                  height: 14,
                                  border: '2px solid rgba(255,255,255,0.3)',
                                  borderTop: '2px solid #fff',
                                  borderRadius: '50%',
                                  animation: 'spin 0.7s linear infinite',
                                }}
                              />{' '}
                              Posting…
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
                        <DigestSuccessBanner
                          postUrl={digestResult.postUrl}
                          dark={dark}
                          onDismiss={() => setDigestResult(null)}
                        />
                      )}
                    </Card>

                    <Card
                      dark={dark}
                      style={{ borderColor: 'rgba(239,68,68,0.2)' }}
                    >
                      <CardHeader
                        icon={<IcAlertTriangle size={14} color="#ef4444" />}
                        title="Danger Zone"
                        iconBg="rgba(239,68,68,0.1)"
                        dark={dark}
                      />
                      <p
                        style={{
                          fontSize: 12,
                          color: textMuted,
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
                          padding: '11px 0',
                          background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.25)',
                          borderRadius: 12,
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
                            color: textMuted,
                            textAlign: 'center',
                            marginTop: 8,
                          }}
                        >
                          {clearMsg}
                        </p>
                      )}
                    </Card>
                  </div>
                </div>
              )}

              {tab === 'reasons' && (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  {ruleKeys.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {ruleKeys.map((r) => (
                        <RuleBadge
                          key={r}
                          label={r}
                          index={reasonColorMap[r]}
                        />
                      ))}
                    </div>
                  )}
                  <Card dark={dark}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 14,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: dark ? '#6b7280' : '#9ca3af',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          margin: 0,
                        }}
                      >
                        Removal Reasons This Week ({stats.totalRemovals} total)
                      </p>
                      {Object.keys(stats.byReason).length > 6 && (
                        <button
                          onClick={() => setShowAllReasons((v) => !v)}
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#f97316',
                            background: 'rgba(249,115,22,0.1)',
                            border: '1px solid rgba(249,115,22,0.2)',
                            borderRadius: 99,
                            padding: '4px 12px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            fontFamily: 'inherit',
                          }}
                        >
                          {showAllReasons
                            ? 'Show less'
                            : `Show all ${Object.keys(stats.byReason).length}`}
                        </button>
                      )}
                    </div>
                    <BarChart
                      data={stats.byReason}
                      total={stats.totalRemovals}
                      colorized
                      dark={dark}
                      showAll={showAllReasons}
                      colorMap={reasonColorMap}
                    />
                  </Card>
                  <Card dark={dark}>
                    <SectionTitle dark={dark}>Removals by Day</SectionTitle>
                    <BarChart
                      data={stats.byDay}
                      total={Math.max(...Object.values(stats.byDay), 1)}
                      accent="#a855f7"
                      dark={dark}
                    />
                  </Card>
                </div>
              )}

              {tab === 'recent' && (
                <Card dark={dark}>
                  <SectionTitle dark={dark}>
                    Recent Post Removals (this week)
                  </SectionTitle>
                  {recentRemovals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: dark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 12px',
                        }}
                      >
                        <IcCheckCircle
                          size={22}
                          color={dark ? '#6b7280' : '#9ca3af'}
                        />
                      </div>
                      <p style={{ fontSize: 13, color: textMuted }}>
                        No posts removed yet.
                      </p>
                    </div>
                  ) : (
                    recentRemovals.map((entry) => (
                      <RemovalRow key={entry.id} entry={entry} dark={dark} />
                    ))
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
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
