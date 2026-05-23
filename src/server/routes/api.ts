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
import {
  REMOVAL_REASON_NONE,
  REMOVAL_REASON_AUTOMOD,
  REMOVAL_REASON_AUTOMOD_PENDING,
  REMOVAL_REASON_REDDIT_FILTER,
} from '../../shared/api';
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

// ── Helper: week-over-week tag ──────────────
function wow(current: number, prev: number): string {
  if (prev === 0) return '';
  const diff = current - prev;
  if (diff === 0) return ' (same as last week)';
  const pct = Math.round(Math.abs(diff / prev) * 100);
  return diff > 0 ? ` (+${pct}% vs last week)` : ` (-${pct}% vs last week)`;
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

    // ── Previous week data ───────────────────
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

    // ── Date labels ──────────────────────────
    const weekStartLabel = new Date(stats.weekStart).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
      }
    );
    const weekEndLabel = new Date(stats.weekEnd).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    // ── Derived values ───────────────────────
    const noReasonCount = stats.byReason[REMOVAL_REASON_NONE] ?? 0;

    const topViolation = Object.entries(stats.byReason)
      .filter(([r]) => r !== REMOVAL_REASON_NONE)
      .sort((a, b) => b[1] - a[1])[0];

    const busiestDay = Object.entries(stats.byDay).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const repeatOffenders = stats.topOffenders.filter((o) => o.count >= 2);
    const commentRemovals: RemovalEntry[] = [];
    const commentSection = '';

    // ════════════════════════════════════════
    // DIGEST BODY
    // ════════════════════════════════════════

    // ── At a Glance ──────────────────────────
    const totalLabel =
      stats.postCount !== stats.totalRemovals
        ? `${stats.totalRemovals} removals (${stats.postCount} posts, ${commentRemovals.length} comments)`
        : `${stats.totalRemovals} posts`;

    const glance = [
      `📊 **${totalLabel} removed this week**${wow(stats.totalRemovals, prevTotal)}`,
      topViolation
        ? `🚨 Top violation: **${topViolation[0]}** — ${topViolation[1]} (${Math.round((topViolation[1] / stats.totalRemovals) * 100)}%)`
        : '',
      busiestDay && busiestDay[1] > 0
        ? `📅 Busiest day: **${busiestDay[0]}** (${busiestDay[1]} removals)`
        : '',
      `👤 Repeat offenders flagged: **${repeatOffenders.length}**`,
    ]
      .filter(Boolean)
      .join('  \n');

    // ── Rules Breakdown ──────────────────────
    const ruleLines = Object.entries(stats.byReason)
      .filter(([r, count]) => r !== REMOVAL_REASON_NONE && count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([rule, count]) => {
        const pct = Math.round((count / stats.totalRemovals) * 100);
        return `* ${rule}: ${count} (${pct}%)${wow(count, prevByReason[rule] ?? 0)}`;
      })
      .join('\n');

    const rulesSection = `**⚖️ Rules Breakdown**\n\n${ruleLines || '* No rule data yet.'}`;

    // ── Repeat Offenders ─────────────────────
    const offenderLines =
      repeatOffenders.length > 0
        ? repeatOffenders
            .map(
              (o, i) =>
                `${i + 1}. [u/${o.username}](https://www.reddit.com/user/${o.username}/) — ${o.count} removals`
            )
            .join('\n')
        : 'None this week.';

    const offenderSection = `**👤 Repeat Offenders**\n\n${offenderLines}`;

    // ── Mod Team Activity ────────────────────
    const modLines = Object.entries(stats.byMod)
      .sort((a, b) => b[1] - a[1])
      .map(([mod, count]) => {
        const isAuto =
          mod.toLowerCase() === 'automoderator' ||
          mod.toLowerCase() === 'reddit';
        const name = isAuto
          ? mod
          : `[u/${mod}](https://www.reddit.com/user/${mod}/)`;
        return `* ${name}: ${count} action${count > 1 ? 's' : ''}`;
      })
      .join('\n');

    const modSection = `**👮 Mod Team Activity**\n\n${modLines || '* No activity recorded.'}`;

    // ── Footer nudge ─────────────────────────
    const nudge =
      noReasonCount > 0
        ? `⚠️ ${noReasonCount} removal${noReasonCount > 1 ? 's' : ''} had no reason selected. Adding removal reasons during review helps ModStat track rule enforcement accurately.`
        : `⚠️ Some automated removals may not include moderator reasons. Adding removal reasons during review helps improve ModStat's analytics accuracy.`;

    // ── Footer ───────────────────────────────
    const footer = `---\n\n*Auto-generated by ModStat every Monday · r/${context.subredditName ?? ''}*`;

    // ── Assemble ─────────────────────────────
    const digestBody = [
      glance,
      rulesSection,
      offenderSection,
      modSection,
      commentSection,
      nudge,
      footer,
    ]
      .filter(Boolean)
      .join('\n\n---\n\n');

    const subject = `[ModStat] Weekly Mod Report — ${weekStartLabel} to ${weekEndLabel}`;

    const conversationId = await reddit.modMail.createModInboxConversation({
      subject,
      bodyMarkdown: digestBody,
      subredditId: context.subredditId,
    });

    const modmailUrl = `https://mod.reddit.com/mail/perma/${conversationId}`;

    return c.json<DigestResponse>({
      type: 'digest',
      success: true,
      message: `Digest posted to Modmail.`,
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
        { status: 'error', message: 'Moderator access required' },
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
