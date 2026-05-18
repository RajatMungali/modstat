import './index.css';
import { StrictMode, useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import type { InitResponse, WeeklyStats, RemovalEntry } from '../shared/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json() as Promise<T>;
}

const RULE_COLORS = [
  { bg: 'rgba(249,115,22,0.15)', color: '#f97316', bar: '#f97316' },
  { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', bar: '#ef4444' },
  { bg: 'rgba(168,85,247,0.15)', color: '#a855f7', bar: '#a855f7' },
  { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', bar: '#3b82f6' },
  { bg: 'rgba(16,185,129,0.15)', color: '#10b981', bar: '#10b981' },
  { bg: 'rgba(234,179,8,0.15)', color: '#eab308', bar: '#eab308' },
];

// ── Inline SVG Icons (Lucide-style paths, zero dependencies) ────────────────
type IconProps = { size?: number; color?: string };

const IcHome = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IcShield = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IcClock = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IcTrash = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const IcFileText = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IcMessageSquare = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IcCalendar = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IcBarChart2 = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const IcMail = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const IcAlertTriangle = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IcTarget = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const IcUser = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IcRefreshCw = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IcSun = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const IcMoon = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const IcMoreHorizontal = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <circle cx="5" cy="12" r="1" fill={color} stroke="none" />
    <circle cx="12" cy="12" r="1" fill={color} stroke="none" />
    <circle cx="19" cy="12" r="1" fill={color} stroke="none" />
  </svg>
);

const IcMenu = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IcClipboardList = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="2" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);

const IcCheckCircle = ({ size = 16, color = 'currentColor' }: IconProps) => (
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
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

// ── Sparkline ───────────────────────────────────────────────────────────────
const Sparkline = ({ color }: { color: string }) => {
  const points = [3, 7, 4, 9, 6, 11, 8, 14, 10, 12];
  const max = Math.max(...points);
  const w = 64,
    h = 28;
  const pts = points
    .map((v, i) => `${(i / (points.length - 1)) * w},${h - (v / max) * h}`)
    .join(' ');
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ overflow: 'visible' }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
};

// ── Bar Chart ───────────────────────────────────────────────────────────────
const BarChart = ({
  data,
  total,
  accent = '#f97316',
  colorized = false,
  dark,
}: {
  data: Record<string, number>;
  total: number;
  accent?: string;
  colorized?: boolean;
  dark: boolean;
}) => {
  const sorted = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  if (sorted.length === 0)
    return (
      <p
        style={{
          color: dark ? '#6b7280' : '#9ca3af',
          fontSize: 12,
          padding: '8px 0',
        }}
      >
        No data yet
      </p>
    );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sorted.map(([label, count], i) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const barColor = colorized
          ? RULE_COLORS[i % RULE_COLORS.length].bar
          : accent;
        return (
          <div key={label}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  maxWidth: '70%',
                }}
              >
                {colorized && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: barColor,
                      flexShrink: 0,
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
                }}
              >
                {count} · {pct}%
              </span>
            </div>
            <div
              style={{
                height: 6,
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

// ── Rule Badge ──────────────────────────────────────────────────────────────
const RuleBadge = ({ label, index }: { label: string; index: number }) => {
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

// ── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({
  label,
  value,
  accent,
  icon,
  dark,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon: React.ReactNode;
  dark: boolean;
}) => (
  <div
    style={{
      background: dark ? 'rgba(255,255,255,0.04)' : '#ffffff',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      borderRadius: 16,
      padding: '16px 18px',
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      boxShadow: dark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s',
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      if (!dark)
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 4px 16px rgba(0,0,0,0.1)';
    }}
    onMouseLeave={(e) => {
      if (!dark)
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 1px 4px rgba(0,0,0,0.06)';
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${accent}1a`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <Sparkline color={accent} />
    </div>
    <div
      style={{
        fontSize: 28,
        fontWeight: 800,
        color: accent,
        letterSpacing: '-1px',
        lineHeight: 1,
        marginTop: 8,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: 11,
        color: dark ? '#9ca3af' : '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  </div>
);

// ── Card ────────────────────────────────────────────────────────────────────
const Card = ({
  children,
  style,
  dark,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  dark: boolean;
}) => (
  <div
    style={{
      background: dark ? 'rgba(255,255,255,0.04)' : '#ffffff',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      borderRadius: 16,
      padding: '18px 20px',
      boxShadow: dark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
      ...style,
    }}
  >
    {children}
  </div>
);

// ── Section Title ───────────────────────────────────────────────────────────
const SectionTitle = ({
  children,
  dark,
}: {
  children: React.ReactNode;
  dark: boolean;
}) => (
  <p
    style={{
      fontSize: 11,
      fontWeight: 700,
      color: dark ? '#6b7280' : '#9ca3af',
      textTransform: 'uppercase',
      letterSpacing: '0.09em',
      marginBottom: 14,
    }}
  >
    {children}
  </p>
);

// ── Card Header ─────────────────────────────────────────────────────────────
const CardHeader = ({
  icon,
  title,
  iconBg,
  dark,
}: {
  icon: React.ReactNode;
  title: string;
  iconBg: string;
  dark: boolean;
}) => (
  <div
    style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        background: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </div>
    <SectionTitle dark={dark}>{title}</SectionTitle>
  </div>
);

// ── Removal Row ─────────────────────────────────────────────────────────────
const RemovalRow = ({
  entry,
  dark,
}: {
  entry: RemovalEntry;
  dark: boolean;
}) => {
  const mins = Math.floor((Date.now() - entry.timestamp) / 60000);
  const timeAgo =
    mins < 1
      ? 'just now'
      : mins < 60
        ? `${mins}m ago`
        : mins < 1440
          ? `${Math.floor(mins / 60)}h ago`
          : `${Math.floor(mins / 1440)}d ago`;
  const isNoReason = entry.removalReason === 'No reason given';
  const isComment = entry.contentType === 'comment';
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
          background: isComment
            ? 'rgba(168,85,247,0.12)'
            : 'rgba(249,115,22,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isComment ? (
          <IcMessageSquare size={15} color="#a855f7" />
        ) : (
          <IcFileText size={15} color="#f97316" />
        )}
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

// ── Nav Item ────────────────────────────────────────────────────────────────
const NavItem = ({
  icon,
  label,
  active,
  onClick,
  dark,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  dark: boolean;
}) => (
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
    }}
    onMouseEnter={(e) => {
      if (!active)
        (e.currentTarget as HTMLElement).style.background = dark
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(0,0,0,0.04)';
    }}
    onMouseLeave={(e) => {
      if (!active)
        (e.currentTarget as HTMLElement).style.background = 'transparent';
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

// ── Confirm Modal ───────────────────────────────────────────────────────────
const ConfirmModal = ({
  onConfirm,
  onCancel,
  dark,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  dark: boolean;
}) => (
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
          }}
        >
          Clear Week
        </button>
      </div>
    </div>
  </div>
);

// ── Empty State ─────────────────────────────────────────────────────────────
const EmptyState = ({ dark }: { dark: boolean }) => (
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
      No removals yet this week
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
      ModStat automatically tracks every post and comment removal. Remove
      something to see it appear here.
    </p>
    <div
      style={{
        marginTop: 24,
        background: 'rgba(249,115,22,0.08)',
        border: '1px solid rgba(249,115,22,0.2)',
        borderRadius: 14,
        padding: '12px 16px',
        fontSize: 12,
        color: '#fb923c',
        lineHeight: 1.7,
        maxWidth: 300,
        margin: '24px auto 0',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        textAlign: 'left',
      }}
    >
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        <IcTarget size={13} color="#f97316" />
      </div>
      <span>
        Add removal reasons in mod tools so ModStat can track rule violations
        accurately.
      </span>
    </div>
  </div>
);

// ── Last Updated ────────────────────────────────────────────────────────────
const LastUpdated = ({ ts, dark }: { ts: number; dark: boolean }) => {
  const mins = Math.floor((Date.now() - ts) / 60000);
  const label =
    mins < 1 ? 'just now' : mins === 1 ? '1 min ago' : `${mins} mins ago`;
  return (
    <span
      style={{
        fontSize: 11,
        color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)',
        fontWeight: 500,
      }}
    >
      Updated {label}
    </span>
  );
};

// ── Main App ─────────────────────────────────────────────────────────────────
export const App = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [recentRemovals, setRecentRemovals] = useState<RemovalEntry[]>([]);
  const [tab, setTab] = useState<'overview' | 'reasons' | 'recent'>('overview');
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestMsg, setDigestMsg] = useState('');
  const [clearLoading, setClearLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearMsg, setClearMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [dark, setDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<InitResponse>('/init');
      if ('status' in data && (data as any).status === 'error') {
        setError((data as any).message);
        return;
      }
      setUsername(data.username);
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
    setDigestMsg('');
    try {
      const res = await apiFetch<{
        type: string;
        success: boolean;
        message: string;
      }>('/generate-digest', { method: 'POST' });
      setDigestMsg(res.message);
    } catch {
      setDigestMsg('Failed to generate digest');
    } finally {
      setDigestLoading(false);
    }
  }, []);

  const clearWeek = useCallback(async () => {
    setShowConfirm(false);
    setClearLoading(true);
    setClearMsg('');
    try {
      const res = await apiFetch<{ status: string; message: string }>(
        '/reset-week',
        { method: 'POST' }
      );
      setClearMsg(res.status === 'success' ? 'Week cleared.' : 'Clear failed.');
      await loadData();
    } catch {
      setClearMsg('Clear failed.');
    } finally {
      setClearLoading(false);
    }
  }, [loadData]);

  const busiestDay = stats
    ? Object.entries(stats.byDay).sort((a, b) => b[1] - a[1])[0]
    : null;
  const topReason = stats
    ? Object.entries(stats.byReason)
        .filter(([r]) => r !== 'No reason given')
        .sort((a, b) => b[1] - a[1])[0]
    : null;
  const ruleKeys = stats
    ? Object.keys(stats.byReason).filter((r) => r !== 'No reason given')
    : [];

  const bg = dark ? '#0d0d1a' : '#f4f5f7';
  const sideBg = dark ? '#13131f' : '#ffffff';
  const borderColor = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textPrimary = dark ? '#f9fafb' : '#111827';
  const textMuted = dark ? '#9ca3af' : '#6b7280';
  const headerBg = dark ? 'rgba(13,13,26,0.95)' : 'rgba(255,255,255,0.95)';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: bg,
        color: textPrimary,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: 'flex',
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 99px; }
      `}</style>

      {/* Sidebar */}
      <div
        style={{
          width: sidebarOpen ? 220 : 0,
          background: sideBg,
          borderRight: `1px solid ${borderColor}`,
          display: 'flex',
          flexDirection: 'column',
          padding: sidebarOpen ? '20px 12px' : 0,
          gap: 4,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'width 0.25s, padding 0.25s',
        }}
      >
        {sidebarOpen && (
          <>
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
              onClick={() => setTab('overview')}
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
              onClick={() => setTab('reasons')}
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
              onClick={() => setTab('recent')}
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
                background: dark
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(0,0,0,0.05)',
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

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                color: textMuted,
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <IcMoreHorizontal size={14} color={textMuted} />
              More
            </button>
          </>
        )}
      </div>

      {/* Main */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Sticky header */}
        <div
          style={{
            background: headerBg,
            borderBottom: `1px solid ${borderColor}`,
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            style={{
              background:
                'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #a855f7 100%)',
              padding: '16px 20px 0',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 0%, transparent 55%)',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IcBarChart2 size={20} color="#fff" />
                  </div>
                  <div>
                    <h1
                      style={{
                        fontSize: 20,
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
                        gap: 8,
                        marginTop: 2,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.75)',
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
                            padding: '1px 8px',
                            fontSize: 10,
                            color: '#fff',
                            fontWeight: 600,
                          }}
                        >
                          <LastUpdated ts={lastUpdated} dark={true} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={loadData}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff',
                    borderRadius: 99,
                    padding: '6px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <IcRefreshCw size={12} color="#fff" /> Refresh
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
                {(['overview', 'reasons', 'recent'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      fontSize: 12,
                      fontWeight: t === tab ? 700 : 500,
                      color: t === tab ? '#111827' : 'rgba(255,255,255,0.75)',
                      background: t === tab ? '#ffffff' : 'transparent',
                      border: 'none',
                      borderRadius: 99,
                      padding: '5px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{ height: 14 }} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            padding: '20px 20px 40px',
            maxWidth: 900,
            width: '100%',
            margin: '0 auto',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 100,
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: '3px solid rgba(249,115,22,0.2)',
                  borderTop: '3px solid #f97316',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <p style={{ fontSize: 13, color: textMuted }}>Loading stats…</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', paddingTop: 100 }}>
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
              {/* OVERVIEW */}
              {tab === 'overview' && (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <KpiCard
                      label="Removals"
                      value={stats.totalRemovals}
                      accent="#f97316"
                      icon={<IcTrash size={17} color="#f97316" />}
                      dark={dark}
                    />
                    <KpiCard
                      label="Posts"
                      value={stats.postCount}
                      accent="#3b82f6"
                      icon={<IcFileText size={17} color="#3b82f6" />}
                      dark={dark}
                    />
                    <KpiCard
                      label="Comments"
                      value={stats.commentCount}
                      accent="#a855f7"
                      icon={<IcMessageSquare size={17} color="#a855f7" />}
                      dark={dark}
                    />
                    <KpiCard
                      label="Busiest Day"
                      value={busiestDay?.[0]?.slice(0, 3) ?? '—'}
                      accent="#10b981"
                      icon={<IcCalendar size={17} color="#10b981" />}
                      dark={dark}
                    />
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 14,
                    }}
                  >
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
                          icon={<IcTarget size={15} color="#f97316" />}
                          title="Most Cited Rule This Week"
                          iconBg="rgba(249,115,22,0.15)"
                          dark={dark}
                        />
                        <p
                          style={{
                            fontSize: 16,
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
                            fontSize: 12,
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
                          icon={<IcUser size={15} color="#ef4444" />}
                          title="Repeat Offenders"
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
                        icon={<IcBarChart2 size={15} color="#3b82f6" />}
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

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 14,
                    }}
                  >
                    <Card dark={dark}>
                      <CardHeader
                        icon={<IcMail size={15} color="#f97316" />}
                        title="Weekly Digest"
                        iconBg="rgba(249,115,22,0.12)"
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
                        Post this week's stats as a mod-only sticky.
                      </p>
                      <button
                        onClick={generateDigest}
                        disabled={digestLoading || stats.totalRemovals === 0}
                        style={{
                          width: '100%',
                          padding: '12px 0',
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
                          gap: 8,
                        }}
                      >
                        <IcMail size={14} color="#fff" />
                        {digestLoading
                          ? 'Generating…'
                          : 'Generate Weekly Digest'}
                      </button>
                      {digestMsg && (
                        <p
                          style={{
                            fontSize: 11,
                            color: textMuted,
                            textAlign: 'center',
                            marginTop: 8,
                          }}
                        >
                          {digestMsg}
                        </p>
                      )}
                    </Card>

                    <Card
                      dark={dark}
                      style={{ borderColor: 'rgba(239,68,68,0.2)' }}
                    >
                      <CardHeader
                        icon={<IcAlertTriangle size={15} color="#ef4444" />}
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
                        Clear all removal data for the current week. This is
                        permanent.
                      </p>
                      <button
                        onClick={() => setShowConfirm(true)}
                        disabled={clearLoading}
                        style={{
                          width: '100%',
                          padding: '12px 0',
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
                          gap: 8,
                        }}
                      >
                        <IcTrash size={14} color="#ef4444" />
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

              {/* REASONS */}
              {tab === 'reasons' && (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  {ruleKeys.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {ruleKeys.map((r, i) => (
                        <RuleBadge key={r} label={r} index={i} />
                      ))}
                    </div>
                  )}
                  <Card dark={dark}>
                    <SectionTitle dark={dark}>
                      Removal Reasons This Week ({stats.totalRemovals} total)
                    </SectionTitle>
                    <BarChart
                      data={stats.byReason}
                      total={stats.totalRemovals}
                      colorized
                      dark={dark}
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

              {/* RECENT */}
              {tab === 'recent' && (
                <Card dark={dark}>
                  <SectionTitle dark={dark}>
                    Recent Removals (this week)
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
                        No removals logged yet.
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: dark ? '#4b5563' : '#9ca3af',
                          marginTop: 4,
                        }}
                      >
                        Remove a post or comment to see it here.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {recentRemovals.map((entry) => (
                        <RemovalRow key={entry.id} entry={entry} dark={dark} />
                      ))}
                    </div>
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
