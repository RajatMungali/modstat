// ============================================
// MODSTAT — API Routes
// ============================================
import { listGet } from './triggers';
import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  InitResponse,
  DigestResponse,
  WeeklyStats,
  RemovalEntry,
  ErrorResponse,
} from '../../shared/api';

export const api = new Hono();

// ── Helper: get current week key ───────────
function getWeekKey(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const weekNum = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 +
      startOfYear.getDay() +
      1) /
      7
  );

  return `week:${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ── Helper: get previous week key ──────────
function getPrevWeekKey(): string {
  const now = new Date();
  now.setDate(now.getDate() - 7);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const weekNum = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 +
      startOfYear.getDay() +
      1) /
      7
  );

  return `week:${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ── Helper: deduplicate array ───────────────
function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

// ── Helper: build weekly stats ──────────────
async function buildWeeklyStats(weekKey: string): Promise<WeeklyStats> {
  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  const reasonKeys = [...new Set(await listGet(`${weekKey}:reasonKeys`))];
  const modKeys = [...new Set(await listGet(`${weekKey}:modKeys`))];
  const offenderKeys = [...new Set(await listGet(`${weekKey}:offenderKeys`))];

  // Build reason counts
  const byReason: Record<string, number> = {};
  for (const reason of reasonKeys) {
    const val = await redis
      .get(`${weekKey}:reason:${reason}`)
      .catch(() => null);
    byReason[reason] = val ? parseInt(val) : 0;
  }

  // Build mod counts
  const byMod: Record<string, number> = {};
  for (const mod of modKeys) {
    const val = await redis.get(`${weekKey}:mod:${mod}`).catch(() => null);
    byMod[mod] = val ? parseInt(val) : 0;
  }

  // Build day counts
  const byDay: Record<string, number> = {};
  for (const day of days) {
    const val = await redis.get(`${weekKey}:day:${day}`).catch(() => null);
    byDay[day] = val ? parseInt(val) : 0;
  }

  // Build offender list
  const offenderList: Array<{ username: string; count: number }> = [];
  for (const username of offenderKeys) {
    const val = await redis
      .get(`${weekKey}:offender:${username}`)
      .catch(() => null);
    offenderList.push({ username, count: val ? parseInt(val) : 0 });
  }
  offenderList.sort((a, b) => b.count - a.count);

  const totalRemovals = Object.values(byReason).reduce((a, b) => a + b, 0);

  // ── Posts vs Comments breakdown ─────────────
  const removalIds = await listGet(`${weekKey}:list`);
  let postCount = 0;
  let commentCount = 0;

  for (const id of removalIds) {
    const raw = await redis.get(`removal:${id}`).catch(() => null);
    if (raw) {
      try {
        const entry = JSON.parse(raw) as RemovalEntry;
        if (entry.contentType === 'comment') commentCount++;
        else postCount++;
      } catch {}
    }
  }

  const now = new Date();
  const dayOfWeek = now.getDay();

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    totalRemovals,
    byReason,
    byMod,
    byDay,
    topOffenders: offenderList.slice(0, 5),
    weekStart: weekStart.getTime(),
    weekEnd: weekEnd.getTime(),
    postCount,
    commentCount,
  };
}

// ── GET /init ──────────────────────────────
api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'No postId' },
      400
    );
  }

  try {
    const username = await reddit.getCurrentUsername();
    const weekKey = getWeekKey();
    const stats = await buildWeeklyStats(weekKey);

    const ids = await listGet(`${weekKey}:list`);
    const recentRemovals: RemovalEntry[] = [];

    for (const id of ids.slice(0, 20)) {
      const raw = await redis.get(`removal:${id}`).catch(() => null);
      if (raw) {
        try {
          recentRemovals.push(JSON.parse(raw) as RemovalEntry);
        } catch {}
      }
    }

    return c.json<InitResponse>({
      type: 'init',
      postId,
      username: username ?? 'unknown',
      isMod: true,
      stats,
      recentRemovals,
    });
  } catch (error) {
    console.error('[ModStat] Init error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to load stats' },
      400
    );
  }
});

// ── POST /generate-digest ──────────────────
api.post('/generate-digest', async (c) => {
  try {
    const weekKey = getWeekKey();
    const prevWeekKey = getPrevWeekKey();

    const stats = await buildWeeklyStats(weekKey);

    if (stats.totalRemovals === 0) {
      return c.json<DigestResponse>({
        type: 'digest',
        success: false,
        message: 'No removals recorded this week yet.',
      });
    }

    // ── Week-over-week trend ─────────────────
    const prevReasonKeys = [
      ...new Set(await listGet(`${prevWeekKey}:reasonKeys`)),
    ];
    const prevByReason: Record<string, number> = {};
    for (const reason of prevReasonKeys) {
      const val = await redis
        .get(`${prevWeekKey}:reason:${reason}`)
        .catch(() => null);
      prevByReason[reason] = val ? parseInt(val) : 0;
    }
    const prevTotal = Object.values(prevByReason).reduce((a, b) => a + b, 0);

    let trendLine = '';
    if (prevTotal > 0) {
      const diff = stats.totalRemovals - prevTotal;
      const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '→';
      const absDiff = Math.abs(diff);
      trendLine = `${arrow} ${absDiff > 0 ? `${absDiff} ${diff > 0 ? 'more' : 'fewer'} than last week (${prevTotal})` : 'Same as last week'}`;
    }

    // ── No reason given nudge ───────────────
    const noReasonCount = stats.byReason['No reason given'] ?? 0;
    const noReasonPct = Math.round((noReasonCount / stats.totalRemovals) * 100);
    const noReasonNudge =
      noReasonCount > 0
        ? `\n> ⚠️ **${noReasonCount} removal${noReasonCount > 1 ? 's' : ''} (${noReasonPct}%) had no reason attached.** Using removal reasons helps ModStat track rule enforcement accurately.\n`
        : '';

    const weekStart = new Date(stats.weekStart).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const weekEnd = new Date(stats.weekEnd).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    // ── Reason breakdown ────────────────────
    const reasonLines = Object.entries(stats.byReason)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => {
        const pct = Math.round((count / stats.totalRemovals) * 100);
        const bar = '█'.repeat(Math.min(Math.floor(pct / 5), 20));
        return `${bar} **${reason}**: ${count} (${pct}%)`;
      })
      .join('\n\n');

    // ── Mod activity ────────────────────────
    const modLines = Object.entries(stats.byMod)
      .sort((a, b) => b[1] - a[1])
      .map(([mod, count]) => `u/${mod}: ${count} actions`)
      .join('\n\n');

    // ── Offender list ───────────────────────
    const offenderLines =
      stats.topOffenders.length > 0
        ? stats.topOffenders
            .map((o, i) => `${i + 1}. u/${o.username}: ${o.count} removals`)
            .join('\n\n')
        : 'No repeat offenders this week';

    // ── Busiest day ─────────────────────────
    const busiestDay = Object.entries(stats.byDay).sort(
      (a, b) => b[1] - a[1]
    )[0];

    // ── Posts vs Comments ───────────────────
    const contentBreakdown = `📄 Posts: **${stats.postCount}** · 💬 Comments: **${stats.commentCount}**`;

    const digestText = `
# 📊 ModStat Weekly Report — ${weekStart} to ${weekEnd}

**Total Removals This Week: ${stats.totalRemovals}**${trendLine ? `  \n*${trendLine}*` : ''}

${contentBreakdown}
${noReasonNudge}
---

## Removal Reasons Breakdown

${reasonLines || 'No data yet'}

---

## Top Repeat Offenders

${offenderLines}

---

## Busiest Day

${busiestDay ? `**${busiestDay[0]}** with ${busiestDay[1]} removals` : 'No data yet'}

---

## Mod Activity

${modLines || 'No data yet'}

---

*Generated by ModStat • r/${context.subredditName}*
    `.trim();

    const post = await reddit.submitPost({
      subredditName: context.subredditName ?? '',
      title: `[ModStat] Weekly Mod Report — ${weekStart} to ${weekEnd}`,
      text: digestText,
    });

    try {
      await reddit.distinguish(post.id, true);
    } catch {
      // distinguish may fail in playtest - non-fatal
    }

    return c.json<DigestResponse>({
      type: 'digest',
      success: true,
      message: `Digest posted: ${post.url}`,
    });
  } catch (error) {
    console.error('[ModStat] Digest error:', error);
    return c.json<DigestResponse>({
      type: 'digest',
      success: false,
      message: 'Failed to generate digest',
    });
  }
});
