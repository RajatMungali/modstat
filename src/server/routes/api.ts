// ============================================
// MODSTAT — API Routes
// ============================================
import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  InitResponse,
  DigestResponse,
  RemovalEntry,
  ErrorResponse,
} from '../../shared/api';
import { REMOVAL_REASON_NONE } from '../../shared/api';
import { listGet } from '../core/redis-list';
import { buildWeeklyStats } from '../core/stats';
import { getPrevWeekKey, getWeekKey } from '../core/week';

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
      .filter(([r]) => r !== REMOVAL_REASON_NONE)
      .sort((a, b) => b[1] - a[1])[0];

    const noReasonCount = stats.byReason[REMOVAL_REASON_NONE] ?? 0;

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
      .filter(([r, count]) => r !== REMOVAL_REASON_NONE && count > 0)
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
        ? `\n---\n⚠️ ${noReasonCount} removal${noReasonCount > 1 ? 's' : ''} had no removal reason selected. Choosing a saved response (with rule + message) helps ModStat track rule enforcement accurately.`
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
