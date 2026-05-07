// ============================================
// MODSTAT — Dashboard UI (Redesigned)
// ============================================

import './index.css';
import { StrictMode, useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import type { InitResponse, WeeklyStats, RemovalEntry } from '../shared/api';

// ── API helper ─────────────────────────────
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json() as Promise<T>;
}

// ── Bar chart ──────────────────────────────
const BarChart = ({
  data,
  total,
  accent = '#f97316',
}: {
  data: Record<string, number>;
  total: number;
  accent?: string;
}) => {
  const sorted = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  if (sorted.length === 0)
    return (
      <p style={{ color: '#6b7280', fontSize: 12, padding: '8px 0' }}>
        No data yet
      </p>
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map(([label, count], i) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={label}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#d1d5db',
                  maxWidth: '70%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: '#9ca3af',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {count} · {pct}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 99,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: accent,
                  borderRadius: 99,
                  transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                  opacity: 1 - i * 0.1,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Stat card ──────────────────────────────
const StatCard = ({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      padding: '14px 12px',
      textAlign: 'center',
      flex: 1,
    }}
  >
    <div
      style={{
        fontSize: 26,
        fontWeight: 700,
        color: accent,
        letterSpacing: '-0.5px',
        lineHeight: 1,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: 10,
        color: '#9ca3af',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {label}
    </div>
    {sub && (
      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{sub}</div>
    )}
  </div>
);

// ── Section card ───────────────────────────
const Card = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      padding: 16,
      ...style,
    }}
  >
    {children}
  </div>
);

// ── Section heading ─────────────────────────
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: 12,
    }}
  >
    {children}
  </p>
);

// ── Recent removal row ─────────────────────
const RemovalRow = ({ entry }: { entry: RemovalEntry }) => {
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

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>
        {entry.contentType === 'post' ? '📄' : '💬'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: '#e5e7eb',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 2,
          }}
        >
          {entry.title}
        </p>
        <p style={{ fontSize: 11, color: '#6b7280' }}>
          u/{entry.authorName} ·{' '}
          <span style={{ color: isNoReason ? '#ef4444' : '#f97316' }}>
            {entry.removalReason}
          </span>{' '}
          · {timeAgo}
        </p>
      </div>
    </div>
  );
};

// ── Tab button ─────────────────────────────
const Tab = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      fontSize: 12,
      fontWeight: active ? 700 : 500,
      color: active ? '#111827' : 'rgba(255,255,255,0.6)',
      background: active ? '#ffffff' : 'transparent',
      border: 'none',
      borderRadius: 99,
      padding: '5px 14px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }}
  >
    {label}
  </button>
);

// ── Confirm modal ──────────────────────────
const ConfirmModal = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}
  >
    <div
      style={{
        background: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 24,
        maxWidth: 320,
        width: '100%',
      }}
    >
      <p
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#f9fafb',
          marginBottom: 8,
        }}
      >
        Clear this week's data?
      </p>
      <p
        style={{
          fontSize: 13,
          color: '#9ca3af',
          marginBottom: 20,
          lineHeight: 1.5,
        }}
      >
        This will permanently delete all removal records for the current week.
        This cannot be undone.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#d1d5db',
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
            padding: '10px 0',
            borderRadius: 10,
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

// ── Main App ───────────────────────────────
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
    ? Object.entries(stats.byReason).sort((a, b) => b[1] - a[1])[0]
    : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f0f1a',
        color: '#f9fafb',
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      {showConfirm && (
        <ConfirmModal
          onConfirm={clearWeek}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
          padding: '14px 16px 0',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 10,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 17,
                fontWeight: 800,
                margin: 0,
                letterSpacing: '-0.3px',
              }}
            >
              📊 ModStat
            </h1>
            <p
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.7)',
                margin: '2px 0 0',
              }}
            >
              {loading ? 'Loading…' : `This week · u/${username}`}
            </p>
          </div>
          <button
            onClick={loadData}
            style={{
              fontSize: 11,
              fontWeight: 600,
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff',
              borderRadius: 99,
              padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Tabs */}
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
            <Tab
              key={t}
              label={t.charAt(0).toUpperCase() + t.slice(1)}
              active={tab === t}
              onClick={() => setTab(t)}
            />
          ))}
        </div>

        {/* Tab underline spacer */}
        <div style={{ height: 12 }} />
      </div>

      {/* Body */}
      <div
        style={{ maxWidth: 600, margin: '0 auto', padding: '16px 14px 32px' }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 80,
              gap: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: '3px solid rgba(249,115,22,0.2)',
                borderTop: '3px solid #f97316',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ fontSize: 13, color: '#6b7280' }}>Loading stats…</p>
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
        ) : !stats ? null : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {/* Stat row */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <StatCard
                    label="Removals"
                    value={stats.totalRemovals}
                    accent="#f97316"
                  />
                  <StatCard
                    label="Busiest Day"
                    value={busiestDay?.[0]?.slice(0, 3) ?? '—'}
                    accent="#60a5fa"
                  />
                  <StatCard
                    label="Top Reason"
                    value={
                      topReason
                        ? `${Math.round((topReason[1] / stats.totalRemovals) * 100)}%`
                        : '—'
                    }
                    accent="#f43f5e"
                  />
                </div>

                {/* Top reason callout */}
                {topReason && (
                  <div
                    style={{
                      background: 'rgba(249,115,22,0.08)',
                      border: '1px solid rgba(249,115,22,0.2)',
                      borderRadius: 16,
                      padding: '12px 14px',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#f97316',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: 4,
                      }}
                    >
                      Most cited rule this week
                    </p>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#fed7aa',
                        marginBottom: 2,
                      }}
                    >
                      {topReason[0]}
                    </p>
                    <p style={{ fontSize: 11, color: '#fb923c' }}>
                      {topReason[1]} of {stats.totalRemovals} removals (
                      {Math.round((topReason[1] / stats.totalRemovals) * 100)}%)
                    </p>
                  </div>
                )}

                {/* Repeat offenders */}
                {stats.topOffenders.length > 0 && (
                  <Card>
                    <SectionTitle>Repeat Offenders</SectionTitle>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
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
                          <span style={{ fontSize: 12, color: '#d1d5db' }}>
                            {i + 1}. u/{o.username}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              background: 'rgba(239,68,68,0.15)',
                              color: '#fca5a5',
                              padding: '2px 8px',
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

                {/* Mod activity */}
                {Object.keys(stats.byMod).length > 0 && (
                  <Card>
                    <SectionTitle>Mod Activity</SectionTitle>
                    <BarChart
                      data={stats.byMod}
                      total={stats.totalRemovals}
                      accent="#60a5fa"
                    />
                  </Card>
                )}

                {/* Digest */}
                <Card>
                  <SectionTitle>Weekly Digest</SectionTitle>
                  <p
                    style={{
                      fontSize: 12,
                      color: '#6b7280',
                      marginBottom: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    Post this week's stats as a mod-only sticky.
                  </p>
                  <button
                    onClick={generateDigest}
                    disabled={digestLoading || stats.totalRemovals === 0}
                    style={{
                      width: '100%',
                      padding: '11px 0',
                      background:
                        stats.totalRemovals === 0
                          ? 'rgba(249,115,22,0.3)'
                          : '#ea580c',
                      border: 'none',
                      borderRadius: 10,
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor:
                        stats.totalRemovals === 0 ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    {digestLoading
                      ? 'Generating…'
                      : '📬 Generate Weekly Digest'}
                  </button>
                  {digestMsg && (
                    <p
                      style={{
                        fontSize: 11,
                        color: '#9ca3af',
                        textAlign: 'center',
                        marginTop: 8,
                      }}
                    >
                      {digestMsg}
                    </p>
                  )}
                </Card>

                {/* Clear week */}
                <Card style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
                  <SectionTitle>Danger Zone</SectionTitle>
                  <p
                    style={{
                      fontSize: 12,
                      color: '#6b7280',
                      marginBottom: 12,
                      lineHeight: 1.5,
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
                      padding: '11px 0',
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      borderRadius: 10,
                      color: '#fca5a5',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    {clearLoading ? 'Clearing…' : '🗑 Clear This Week'}
                  </button>
                  {clearMsg && (
                    <p
                      style={{
                        fontSize: 11,
                        color: '#9ca3af',
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

            {/* ── REASONS ── */}
            {tab === 'reasons' && (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <Card>
                  <SectionTitle>
                    Removal Reasons This Week ({stats.totalRemovals} total)
                  </SectionTitle>
                  <BarChart data={stats.byReason} total={stats.totalRemovals} />
                </Card>
                <Card>
                  <SectionTitle>Removals by Day</SectionTitle>
                  <BarChart
                    data={stats.byDay}
                    total={Math.max(...Object.values(stats.byDay), 1)}
                    accent="#a78bfa"
                  />
                </Card>
              </div>
            )}

            {/* ── RECENT ── */}
            {tab === 'recent' && (
              <Card>
                <SectionTitle>Recent Removals (this week)</SectionTitle>
                {recentRemovals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <p style={{ fontSize: 28, marginBottom: 8 }}>✨</p>
                    <p style={{ fontSize: 13, color: '#6b7280' }}>
                      No removals logged yet.
                    </p>
                    <p style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>
                      Remove a post or comment to see it here.
                    </p>
                  </div>
                ) : (
                  <div>
                    {recentRemovals.map((entry) => (
                      <RemovalRow key={entry.id} entry={entry} />
                    ))}
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
      `}</style>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
