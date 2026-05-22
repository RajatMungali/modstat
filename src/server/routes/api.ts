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

// ── Helper: check moderator ─────────────────
async function checkModerator(): Promise<boolean> {
  try {
    const currentUser = await reddit.getCurrentUser();

    if (!currentUser) return false;

    const subreddit = await reddit.getCurrentSubreddit();
    const moderators = await subreddit.getModerators();

    return (await moderators.all()).some((mod) => mod.id === currentUser.id);
  } catch {
    return false;
  }
}

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

  const byReason: Record<string, number> = {};
  for (const reason of reasonKeys) {
    const val = await redis
      .get(`${weekKey}:reason:${reason}`)
      .catch(() => null);
    byReason[reason] = val ? parseInt(val) : 0;
  }

  const byMod: Record<string, number> = {};
  for (const mod of modKeys) {
    const val = await redis.get(`${weekKey}:mod:${mod}`).catch(() => null);
    byMod[mod] = val ? parseInt(val) : 0;
  }

  const byDay: Record<string, number> = {};
  for (const day of days) {
    const val = await redis.get(`${weekKey}:day:${day}`).catch(() => null);
    byDay[day] = val ? parseInt(val) : 0;
  }

  const offenderList: Array<{ username: string; count: number }> = [];
  for (const username of offenderKeys) {
    const val = await redis
      .get(`${weekKey}:offender:${username}`)
      .catch(() => null);
    offenderList.push({ username, count: val ? parseInt(val) : 0 });
  }
  offenderList.sort((a, b) => b.count - a.count);

  const totalRemovals = Object.values(byReason).reduce((a, b) => a + b, 0);

  const removalIds = await listGet(`${weekKey}:list`);
  let postCount = 0;

  for (const id of removalIds) {
    const raw = await redis.get(`removal:${id}`).catch(() => null);

    if (raw) {
      try {
        const entry = JSON.parse(raw) as RemovalEntry;

        if (entry.contentType === 'post') {
          postCount++;
        }
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
    topOffenders: offenderList.slice(0, 10),
    weekStart: weekStart.getTime(),
    weekEnd: weekEnd.getTime(),
    postCount,
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
    const isMod = await checkModerator();

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
      isMod,
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
    const isMod = await checkModerator();

    if (!isMod) {
      return c.json(
        {
          type: 'digest',
          success: false,
          message: 'Moderator access required',
        },
        403
      );
    }

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

    // ── Load previous week data ──────────────────
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

    // ── Helper: week-over-week tag ───────────────
    function wow(current: number, prev: number): string {
      if (prev === 0) return '';
      const diff = current - prev;
      if (diff === 0) return ' (same as last week)';
      const pct = Math.round(Math.abs(diff / prev) * 100);
      return diff > 0 ? ` (+${pct}% vs last week)` : ` (-${pct}% vs last week)`;
    }

    // ── Date labels ──────────────────────────────
    const weekStart = new Date(stats.weekStart).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const weekEnd = new Date(stats.weekEnd).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    // ── Derived values ───────────────────────────
    const busiestDay = Object.entries(stats.byDay).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const topViolation = Object.entries(stats.byReason)
      .filter(([r]) => r !== 'No reason given')
      .sort((a, b) => b[1] - a[1])[0];

    const noReasonCount = stats.byReason['No reason given'] ?? 0;

    // ── Section: glance ──────────────────────────
    const glance = [
      `📊 **${stats.totalRemovals} posts removed** this week${wow(stats.totalRemovals, prevTotal)}`,
      topViolation
        ? `🚨 Top violation: **${topViolation[0]}** — ${topViolation[1]} (${Math.round((topViolation[1] / stats.totalRemovals) * 100)}%)`
        : '',
      busiestDay && busiestDay[1] > 0
        ? `📅 Busiest day: **${busiestDay[0]}** (${busiestDay[1]} removals)`
        : '',
      `👤 Repeat offenders flagged: **${stats.topOffenders.filter((o) => o.count >= 2).length}**`,
    ]
      .filter(Boolean)
      .join('  \n');

    // ── Section: rules breakdown ─────────────────
    const ruleLines = Object.entries(stats.byReason)
      .filter(([r, count]) => r !== 'No reason given' && count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([rule, count]) => {
        const pct = Math.round((count / stats.totalRemovals) * 100);
        const wowTag = wow(count, prevByReason[rule] ?? 0);
        return `- **${rule}**: ${count} (${pct}%)${wowTag}`;
      })
      .join('\n');

    // ── Section: offenders ───────────────────────
    const offenderLines =
      stats.topOffenders.length > 0
        ? stats.topOffenders
            .map((o, i) => `${i + 1}. u/${o.username} — ${o.count} removals`)
            .join('\n')
        : 'None this week.';

    // ── Section: mod activity ────────────────────
    const modLines =
      Object.entries(stats.byMod)
        .sort((a, b) => b[1] - a[1])
        .map(([mod, count]) => `- u/${mod}: ${count} actions`)
        .join('\n') || 'No activity recorded.';

    // ── No-reason nudge ──────────────────────────
    const nudge =
      noReasonCount > 0
        ? `\n---\n⚠️ ${noReasonCount} removal${noReasonCount > 1 ? 's' : ''} had no reason attached. Adding reasons helps ModStat track rule enforcement accurately.`
        : '';

    // ── Assemble digest body ─────────────────────
    const digestBody = `
${glance}
 
---
 
**⚖️ Rules Breakdown**
 
${ruleLines || 'No rule data yet.'}
 
---
 
**👤 Repeat Offenders**
 
${offenderLines}
 
---
 
**👮 Mod Team Activity**
 
${modLines}
${nudge}
 
---
 
*Generated by ModStat · r/${context.subredditName ?? ''}*
`.trim();

    const subject = `[ModStat] Weekly Mod Report — ${weekStart} to ${weekEnd}`;

    const conversationId = await reddit.modMail.createModDiscussionConversation(
      {
        subject,
        bodyMarkdown: digestBody,
        subredditId: context.subredditId,
      }
    );

    const modmailUrl = `https://mod.reddit.com/mail/perma/${conversationId}`;

    return c.json<DigestResponse>({
      type: 'digest',
      success: true,
      message: `Digest posted to Mod Discussions.`,
      conversationId,
      modmailUrl,
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

// ── POST /reset-week ───────────────────────
api.post('/reset-week', async (c) => {
  try {
    const isMod = await checkModerator();

    if (!isMod) {
      return c.json(
        {
          status: 'error',
          message: 'Moderator access required',
        },
        403
      );
    }

    const weekKey = getWeekKey();
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
    for (const reason of reasonKeys) {
      await redis.del(`${weekKey}:reason:${reason}`).catch(() => null);
    }

    const modKeys = [...new Set(await listGet(`${weekKey}:modKeys`))];
    for (const mod of modKeys) {
      await redis.del(`${weekKey}:mod:${mod}`).catch(() => null);
    }

    for (const day of days) {
      await redis.del(`${weekKey}:day:${day}`).catch(() => null);
    }

    const offenderKeys = [...new Set(await listGet(`${weekKey}:offenderKeys`))];
    for (const username of offenderKeys) {
      await redis.del(`${weekKey}:offender:${username}`).catch(() => null);
    }

    const removalIds = await listGet(`${weekKey}:list`);
    for (const id of removalIds) {
      await redis.del(`removal:${id}`).catch(() => null);
    }

    await redis.del(`${weekKey}:reasonKeys`).catch(() => null);
    await redis.del(`${weekKey}:modKeys`).catch(() => null);
    await redis.del(`${weekKey}:offenderKeys`).catch(() => null);
    await redis.del(`${weekKey}:list`).catch(() => null);

    return c.json({ status: 'success', message: 'Week cleared.' });
  } catch (error) {
    console.error('[ModStat] Reset error:', error);
    return c.json({ status: 'error', message: 'Failed to clear week.' }, 500);
  }
});
