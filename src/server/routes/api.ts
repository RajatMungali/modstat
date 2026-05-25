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

type StoredRemovalEntry = RemovalEntry & {
  reasonFinal?: boolean;
  approved?: boolean;
  approvedAt?: number;
};

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

    // ── Scan all entries for false positive / automod data ───
    const allIds = await listGet(`${weekKey}:list`);
    let automodTotal = 0;
    let automodConfirmed = 0; // caught by automod, human confirmed removal
    let automodFalsePositives = 0; // automod removed → later approved (undone)
    let automodPending = 0;
    let redditFilterTotal = 0;
    let noReasonTotal = 0;

    for (const id of allIds) {
      const raw = await redis.get(`removal:${id}`).catch(() => null);
      if (!raw) continue;
      const entry = JSON.parse(raw) as StoredRemovalEntry;

      const isAutomod = entry.modName.toLowerCase() === 'automoderator';
      const isRedditFilter =
        entry.removalReason === REMOVAL_REASON_REDDIT_FILTER ||
        entry.modName.toLowerCase() === 'reddit';

      if (isRedditFilter) {
        redditFilterTotal++;
      }

      if (isAutomod) {
        automodTotal++;
        if (entry.approved) {
          automodFalsePositives++;
        } else if (entry.removalReason === REMOVAL_REASON_AUTOMOD) {
          automodConfirmed++;
        } else if (entry.removalReason === REMOVAL_REASON_AUTOMOD_PENDING) {
          automodPending++;
        }
      }

      if (!entry.approved && entry.removalReason === REMOVAL_REASON_NONE) {
        noReasonTotal++;
      }
    }

    const automodFalsePositiveRate =
      automodTotal > 0
        ? Math.round((automodFalsePositives / automodTotal) * 100)
        : 0;

    // ── Date labels ──────────────────────────
    const weekStartLabel = new Date(stats.weekStart).toLocaleDateString(
      'en-US',
      { month: 'short', day: 'numeric' }
    );
    const weekEndLabel = new Date(stats.weekEnd).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    // ── Derived values ───────────────────────
    const topViolation = Object.entries(stats.byReason)
      .filter(
        ([r]) =>
          r !== REMOVAL_REASON_NONE &&
          r !== REMOVAL_REASON_AUTOMOD_PENDING &&
          r !== REMOVAL_REASON_REDDIT_FILTER
      )
      .sort((a, b) => b[1] - a[1])[0];

    const busiestDay = Object.entries(stats.byDay).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const repeatOffenders = stats.topOffenders.filter((o) => o.count >= 2);

    // ════════════════════════════════════════
    // DIGEST SECTIONS
    // ════════════════════════════════════════

    // ── At a Glance ──────────────────────────
    const glance = [
      `📊 **${stats.totalRemovals} posts removed this week**${wow(stats.totalRemovals, prevTotal)}`,
      topViolation
        ? `🚨 Top violation: **${topViolation[0]}** - ${topViolation[1]} (${Math.round((topViolation[1] / stats.totalRemovals) * 100)}%)`
        : '',
      busiestDay && busiestDay[1] > 0
        ? `📅 Busiest day: **${busiestDay[0]}** (${busiestDay[1]} removals)`
        : '',
      `👤 Repeat offenders flagged: **${repeatOffenders.length}**`,
    ]
      .filter(Boolean)
      .join('  \n');

    // ── Rules Breakdown ──────────────────────
    // Exclude system-level pseudo-reasons from the rule table; they get their own section below.
    const SYSTEM_REASONS = new Set([
      REMOVAL_REASON_NONE,
      REMOVAL_REASON_AUTOMOD_PENDING,
      REMOVAL_REASON_REDDIT_FILTER,
      REMOVAL_REASON_AUTOMOD,
    ]);

    const ruleLines = Object.entries(stats.byReason)
      .filter(([r, count]) => !SYSTEM_REASONS.has(r) && count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([rule, count]) => {
        const pct = Math.round((count / stats.totalRemovals) * 100);
        return `* **${rule}**: ${count} (${pct}%)${wow(count, prevByReason[rule] ?? 0)}`;
      })
      .join('\n');

    const rulesSection = `**⚖️ Rules Breakdown**\n\n${ruleLines || '* No named rules recorded yet.'}`;

    // ── AutoModerator Section ────────────────
    const automodLines: string[] = [];

    if (automodTotal > 0) {
      automodLines.push(`* **Total AutoMod actions**: ${automodTotal}`);

      if (automodConfirmed > 0) {
        automodLines.push(
          `* Confirmed by mods: **${automodConfirmed}** (${Math.round((automodConfirmed / automodTotal) * 100)}%)`
        );
      }

      if (automodFalsePositives > 0) {
        automodLines.push(
          `* ✅ False positives (approved after removal): **${automodFalsePositives}** - false positive rate **${automodFalsePositiveRate}%**`
        );
      } else {
        automodLines.push(`* ✅ False positives: **0** - great accuracy!`);
      }

      if (automodPending > 0) {
        automodLines.push(
          `* ⏳ Pending reason (AutoMod rule not yet resolved): **${automodPending}**`
        );
      }
    } else {
      automodLines.push(`* No AutoModerator actions recorded this week.`);
    }

    if (redditFilterTotal > 0) {
      automodLines.push(
        `* 🚫 Reddit spam/filter removals: **${redditFilterTotal}**`
      );
    }

    const automodSection = `**🤖 AutoModerator & Filters**\n\n${automodLines.join('\n')}`;

    // ── Repeat Offenders ─────────────────────
    const offenderLines =
      repeatOffenders.length > 0
        ? repeatOffenders
            .map(
              (o, i) =>
                `${i + 1}. [u/${o.username}](https://www.reddit.com/user/${o.username}/) - ${o.count} removals`
            )
            .join('\n')
        : 'None this week.';

    const offenderSection = `**👤 Repeat Offenders**\n\n${offenderLines}`;

    // ── Mod Team Activity ────────────────────
    const modLines = Object.entries(stats.byMod)
      .sort((a, b) => b[1] - a[1])
      .map(([mod, count]) => {
        const lower = mod.toLowerCase();
        const isAuto = lower === 'automoderator' || lower === 'reddit';
        const name = isAuto
          ? mod
          : `[u/${mod}](https://www.reddit.com/user/${mod}/)`;
        return `* ${name}: ${count} action${count > 1 ? 's' : ''}`;
      })
      .join('\n');

    const modSection = `**👮 Mod Team Activity**\n\n${modLines || '* No activity recorded.'}`;

    // ── Data quality nudge ───────────────────
    const nudgeLines: string[] = [];
    if (noReasonTotal > 0) {
      nudgeLines.push(
        `⚠️ **${noReasonTotal}** removal${noReasonTotal > 1 ? 's' : ''} had no reason selected. Adding removal reasons during review helps ModStat track rule enforcement accurately.`
      );
    }
    if (automodPending > 0) {
      nudgeLines.push(
        `⏳ **${automodPending}** AutoMod removal${automodPending > 1 ? 's' : ''} still have an unresolved reason - the scheduled reconciler will retry these automatically.`
      );
    }
    if (nudgeLines.length === 0) {
      nudgeLines.push(
        `✅ All removals this week have reasons recorded - great moderation hygiene!`
      );
    }
    const nudge = nudgeLines.join('  \n');

    // ── Footer ───────────────────────────────
    const footer = `---\n\n*Auto-generated by ModStat every Monday · r/${context.subredditName ?? ''}*`;

    // ── Assemble ─────────────────────────────
    const digestBody = [
      glance,
      rulesSection,
      automodSection,
      offenderSection,
      modSection,
      nudge,
      footer,
    ]
      .filter(Boolean)
      .join('\n\n---\n\n');

    const subject = `[ModStat] Weekly Mod Report - ${weekStartLabel} to ${weekEndLabel}`;

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
    await redis.del(`${weekKey}:automod:false_positives`).catch(() => null);

    return c.json({ status: 'success', message: 'Week cleared.' });
  } catch (error) {
    console.error('[ModStat] Reset error:', error);
    return c.json({ status: 'error', message: 'Failed to clear week.' }, 500);
  }
});
