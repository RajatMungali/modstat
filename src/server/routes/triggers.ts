// ============================================
// MODSTAT — Triggers
// ============================================

import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { context, redis, reddit, scheduler } from '@devvit/web/server';
import type { RemovalEntry, WeeklyStats } from '../../shared/api';

export const triggers = new Hono();

// ── Constants ──────────────────────────────
const REASON_AUTOMOD_PENDING = 'AutoModerator (review in mod queue)';
const REASON_AUTOMOD_CONFIRMED = 'Removed by AutoModerator';
const REASON_REDDIT_FILTER = 'Removed by Reddit filter';

// ── Helper: generate unique ID ─────────────
function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

// ── Helper: get day name ───────────────────
function getDayName(): string {
  return [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][new Date().getDay()];
}

// ── Helper: safe increment ─────────────────
async function increment(key: string): Promise<void> {
  const current = await redis.get(key);
  const val = current ? parseInt(current) : 0;
  await redis.set(key, String(val + 1));
}

// ── Helper: safe decrement (floors at 0) ───
async function decrement(key: string): Promise<void> {
  const current = await redis.get(key);
  const val = current ? parseInt(current) : 0;
  await redis.set(key, String(Math.max(0, val - 1)));
}

// ── Helper: append to list ─────────────────
async function listPush(key: string, value: string): Promise<void> {
  const current = await redis.get(key);
  const arr: string[] = current ? JSON.parse(current) : [];
  arr.unshift(value);
  if (arr.length > 200) arr.splice(200);
  await redis.set(key, JSON.stringify(arr));
}

// ── Helper: get list ───────────────────────
export async function listGet(key: string): Promise<string[]> {
  const current = await redis.get(key);
  return current ? JSON.parse(current) : [];
}

// ── Helper: store redditId → entryId mapping ──
async function setRedditIdMap(
  redditId: string,
  entryId: string
): Promise<void> {
  await redis.set(`redditid:${redditId}`, entryId);
}

// ── Helper: get entryId from redditId ──────
async function getEntryIdByRedditId(redditId: string): Promise<string | null> {
  return await redis.get(`redditid:${redditId}`).catch(() => null);
}

// ── Helper: clear redditId mapping ─────────
async function clearRedditIdMap(redditId: string): Promise<void> {
  await redis.del(`redditid:${redditId}`).catch(() => null);
}

// ── Helper: extract reason from sticky body ─
function extractReasonFromStickyBody(
  messageText: string,
  subredditName: string
): string | null {
  const parts = messageText.split(' - ');

  if (parts.length > 1) {
    return parts[0].trim();
  }

  if (
    subredditName.length > 0 &&
    messageText.toLowerCase().includes(subredditName.toLowerCase())
  ) {
    console.log(
      '[ModStat] Sticky body looks like macro output — treating as no reason'
    );
    return null;
  }

  return messageText.trim();
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
  const postCount = removalIds.length;

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

// ── Helper: check if targetComment is real ──
function isRealComment(tc: Record<string, unknown> | null): boolean {
  if (!tc) return false;
  return typeof tc.id === 'string' && tc.id.length > 0;
}

// ── Helper: deduplication check ────────────
async function isDuplicate(contentId: string): Promise<boolean> {
  if (!contentId) return false;
  const dedupKey = `dedup:${contentId}`;
  const existing = await redis.get(dedupKey).catch(() => null);
  if (existing) {
    const age = Date.now() - parseInt(existing);
    if (age < 60000) return true;
  }
  await redis.set(dedupKey, String(Date.now()));
  return false;
}

// ── Helper: check if mod is automated ──────
function isAutomatedMod(modName: string): boolean {
  const lower = modName.toLowerCase();
  return lower === 'automoderator' || lower === 'reddit';
}

// ── Helper: check if author is a bot ───────
function isBotAuthor(authorName: string, subredditName: string): boolean {
  const lower = authorName.toLowerCase();
  return (
    lower === 'automoderator' ||
    lower === `${subredditName.toLowerCase()}-modteam` ||
    lower === 'reddit'
  );
}

// ── Helper: save a removal entry ───────────
async function saveRemoval(entry: RemovalEntry): Promise<void> {
  const weekKey = getWeekKey();
  await redis.set(`removal:${entry.id}`, JSON.stringify(entry));
  await listPush(`${weekKey}:list`, entry.id);
  await increment(`${weekKey}:reason:${entry.removalReason}`);
  await increment(`${weekKey}:mod:${entry.modName}`);
  await increment(`${weekKey}:day:${getDayName()}`);
  await increment(`${weekKey}:offender:${entry.authorName}`);
  await listPush(`${weekKey}:reasonKeys`, entry.removalReason);
  await listPush(`${weekKey}:modKeys`, entry.modName);
  await listPush(`${weekKey}:offenderKeys`, entry.authorName);
  console.log(
    `[ModStat] Logged post: "${entry.title}" | mod:${entry.modName} | reason:${entry.removalReason}`
  );
}

// ── Helper: delete a removal entry entirely ─
async function deleteRemovalEntry(entryId: string): Promise<void> {
  const weekKey = getWeekKey();
  const raw = await redis.get(`removal:${entryId}`).catch(() => null);
  if (!raw) return;

  const entry = JSON.parse(raw) as RemovalEntry;

  await decrement(`${weekKey}:reason:${entry.removalReason}`);
  await decrement(`${weekKey}:mod:${entry.modName}`);
  await decrement(`${weekKey}:day:${getDayName()}`);
  await decrement(`${weekKey}:offender:${entry.authorName}`);

  const ids = await listGet(`${weekKey}:list`);
  const filtered = ids.filter((id) => id !== entryId);
  await redis.set(`${weekKey}:list`, JSON.stringify(filtered));

  await redis.del(`removal:${entryId}`).catch(() => null);

  console.log(`[ModStat] Entry deleted (approved): "${entry.title}"`);
}

// ── Helper: update existing entry reason and mod ─
async function updateRemovalEntry(
  entryId: string,
  newReason: string,
  newModName: string
): Promise<void> {
  const weekKey = getWeekKey();
  const raw = await redis.get(`removal:${entryId}`).catch(() => null);
  if (!raw) return;

  const entry = JSON.parse(raw) as RemovalEntry & { reasonFinal?: boolean };
  const oldReason = entry.removalReason;
  const oldMod = entry.modName;

  await decrement(`${weekKey}:reason:${oldReason}`);
  await decrement(`${weekKey}:mod:${oldMod}`);
  await increment(`${weekKey}:reason:${newReason}`);
  await increment(`${weekKey}:mod:${newModName}`);
  await listPush(`${weekKey}:reasonKeys`, newReason);
  await listPush(`${weekKey}:modKeys`, newModName);

  entry.removalReason = newReason;
  entry.modName = newModName;
  entry.reasonFinal = true;

  await redis.set(`removal:${entryId}`, JSON.stringify(entry));
  console.log(
    `[ModStat] Entry updated: "${oldReason}" → "${newReason}" | mod: ${oldMod} → ${newModName}`
  );
}

// ── Helper: patch the most recent removal's reason ─────────────────────────
async function patchLatestReason(
  reason: string,
  isFinal: boolean = false
): Promise<void> {
  if (reason === 'No reason given') return;

  const weekKey = getWeekKey();
  const ids = await listGet(`${weekKey}:list`);
  if (ids.length === 0) return;

  const raw = await redis.get(`removal:${ids[0]}`);
  if (!raw) return;

  const entry = JSON.parse(raw) as RemovalEntry & { reasonFinal?: boolean };

  if (entry.reasonFinal && !isFinal) {
    console.log(
      `[ModStat] Sticky skipped — reason already finalised as "${entry.removalReason}"`
    );
    return;
  }

  const oldReason = entry.removalReason;
  if (oldReason === reason) {
    if (isFinal && !entry.reasonFinal) {
      entry.reasonFinal = true;
      await redis.set(`removal:${ids[0]}`, JSON.stringify(entry));
    }
    return;
  }

  await decrement(`${weekKey}:reason:${oldReason}`);
  await increment(`${weekKey}:reason:${reason}`);
  await listPush(`${weekKey}:reasonKeys`, reason);

  entry.removalReason = reason;
  if (isFinal) entry.reasonFinal = true;

  await redis.set(`removal:${ids[0]}`, JSON.stringify(entry));
  console.log(
    `[ModStat] Reason patched: "${oldReason}" → "${reason}"${isFinal ? ' [final]' : ''}`
  );
}

// ── Helper: sync Reddit filter removals from mod log ──
async function syncRedditFilterRemovals(): Promise<void> {
  try {
    const actions = await reddit
      .getModerationLog({
        subredditName: context.subredditName ?? '',
        moderatorUsernames: ['reddit'],
        type: 'removelink',
        limit: 50,
        pageSize: 50,
      })
      .all();

    // On first run, log the raw shape so we can confirm field names
    if (actions.length > 0) {
      console.log(
        '[ModStat] sample ModAction:',
        JSON.stringify(actions[0], null, 2)
      );
    }

    let synced = 0;

    for (const action of actions) {
      // Try every known field variation for the post id
      const contentId = String(
        (action as any).targetPost?.id ??
          (action as any).target?.id ??
          (action as any).targetId ??
          ''
      );
      if (!contentId) continue;

      // Already tracked — skip
      const existing = await getEntryIdByRedditId(contentId);
      if (existing) continue;

      // Dedup guard (prefix with 'sync:' to avoid colliding with trigger dedup keys)
      if (await isDuplicate(`sync:${contentId}`)) continue;

      const authorName = String(
        (action as any).targetPost?.author ??
          (action as any).target?.author ??
          (action as any).targetAuthor ??
          'unknown'
      );
      if (isBotAuthor(authorName, context.subredditName ?? '')) continue;

      const title =
        String(
          (action as any).targetPost?.title ??
            (action as any).target?.title ??
            (action as any).targetTitle ??
            ''
        ).trim() || '(no title)';

      const entry: RemovalEntry = {
        id: makeId(),
        redditId: contentId,
        contentType: 'post',
        title,
        authorName,
        modName: 'reddit',
        removalReason: REASON_REDDIT_FILTER,
        timestamp: Date.now(),
      };

      await saveRemoval(entry);
      await setRedditIdMap(contentId, entry.id);
      synced++;
      console.log(`[ModStat] Synced Reddit filter removal: "${title}"`);
    }

    console.log(
      `[ModStat] Reddit filter sync complete — ${synced} new entries from ${actions.length} mod log actions`
    );
  } catch (err) {
    console.error('[ModStat] syncRedditFilterRemovals error:', err);
  }
}

// ── Helper: build and send digest via modmail ──
async function sendWeeklyDigest(): Promise<void> {
  const weekKey = getWeekKey();
  const prevWeekKey = getPrevWeekKey();
  const stats = await buildWeeklyStats(weekKey);

  if (stats.totalRemovals === 0) {
    console.log('[ModStat] No removals this week — skipping digest');
    return;
  }

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

  function wow(current: number, prev: number): string {
    if (prev === 0) return '';
    const diff = current - prev;
    if (diff === 0) return ' (same as last week)';
    const pct = Math.round(Math.abs(diff / prev) * 100);
    return diff > 0 ? ` (+${pct}% vs last week)` : ` (-${pct}% vs last week)`;
  }

  const weekStartLabel = new Date(stats.weekStart).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const weekEndLabel = new Date(stats.weekEnd).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const topViolation = Object.entries(stats.byReason)
    .filter(([r]) => r !== 'No reason given')
    .sort((a, b) => b[1] - a[1])[0];

  const busiestDay = Object.entries(stats.byDay).sort((a, b) => b[1] - a[1])[0];
  const noReasonCount = stats.byReason['No reason given'] ?? 0;

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

  const ruleLines = Object.entries(stats.byReason)
    .filter(([r, count]) => r !== 'No reason given' && count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([rule, count]) => {
      const pct = Math.round((count / stats.totalRemovals) * 100);
      return `- **${rule}**: ${count} (${pct}%)${wow(count, prevByReason[rule] ?? 0)}`;
    })
    .join('\n');

  const offenderLines =
    stats.topOffenders.length > 0
      ? stats.topOffenders
          .map((o, i) => `${i + 1}. u/${o.username} — ${o.count} removals`)
          .join('\n')
      : 'None this week.';

  const modLines =
    Object.entries(stats.byMod)
      .sort((a, b) => b[1] - a[1])
      .map(([mod, count]) => `- u/${mod}: ${count} actions`)
      .join('\n') || 'No activity recorded.';

  const nudge =
    noReasonCount > 0
      ? `\n---\n⚠️ ${noReasonCount} removal${noReasonCount > 1 ? 's' : ''} had no reason attached. Adding reasons helps ModStat track rule enforcement accurately.`
      : '';

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

*Auto-generated by ModStat every Monday · r/${context.subredditName ?? ''}*
`.trim();

  await reddit.modMail.createModDiscussionConversation({
    subject: `[ModStat] Weekly Mod Report — ${weekStartLabel} to ${weekEndLabel}`,
    bodyMarkdown: digestBody,
    subredditId: context.subredditId,
  });

  console.log('[ModStat] Weekly digest sent to Mod Discussions ✓');
}

// ── APP INSTALL ────────────────────────────
triggers.post('/on-app-install', async (c) => {
  try {
    await redis.set('modstat:installed', Date.now().toString());

    const existing = await scheduler.listJobs();
    for (const job of existing) {
      if (job.name === 'weekly-digest' || job.name === 'sync-reddit-filter') {
        await scheduler.cancelJob(job.id);
      }
    }

    await scheduler.runJob({
      name: 'weekly-digest',
      cron: '0 9 * * 1',
    });

    await scheduler.runJob({
      name: 'sync-reddit-filter',
      cron: '*/10 * * * *',
    });

    console.log(
      `[ModStat] Installed on r/${context.subredditName} — weekly digest + Reddit filter sync scheduled`
    );
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `ModStat installed on r/${context.subredditName}`,
      },
      200
    );
  } catch (error) {
    console.error('[ModStat] Install error:', error);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Install failed' },
      400
    );
  }
});

// ── MOD ACTION ─────────────────────────────
triggers.post('/on-mod-action', async (c) => {
  try {
    const body = await c.req.json();

    console.log(
      '[ModStat] on-mod-action fired | action:',
      String(body?.action ?? body?.type ?? ''),
      '| mod:',
      String(body?.moderator?.name ?? body?.moderator ?? '')
    );

    const action = String(
      body?.action ?? body?.type ?? body?.actionType ?? ''
    ).toLowerCase();

    const modName = String(
      body?.moderator?.name ??
        body?.moderator ??
        body?.mod ??
        body?.performedBy ??
        'mod'
    );

    // ── APPROVELINK ─────────────────────────
    if (action === 'approvelink') {
      const rawPost = body?.targetPost as Record<string, unknown> | null;
      const contentId = String(rawPost?.id ?? rawPost?.name ?? '');

      if (contentId) {
        const existingEntryId = await getEntryIdByRedditId(contentId);
        if (existingEntryId) {
          await deleteRemovalEntry(existingEntryId);
          await clearRedditIdMap(contentId);
          console.log(
            `[ModStat] Approved — entry removed for post: ${contentId}`
          );
        }
      }

      return c.json<TriggerResponse>(
        { status: 'success', message: 'Approve handled' },
        200
      );
    }

    // ── STICKY ──────────────────────────────
    if (action === 'sticky') {
      const tc = body?.targetComment as Record<string, unknown> | null;
      console.log(
        '[ModStat] sticky fired | isRealComment:',
        isRealComment(tc),
        '| body:',
        String(tc?.body ?? '').substring(0, 80)
      );

      if (isRealComment(tc)) {
        const messageText = String(tc?.body ?? '').trim();

        if (messageText.length > 0) {
          const reason = extractReasonFromStickyBody(
            messageText,
            context.subredditName ?? ''
          );

          if (reason === null) {
            console.log(
              '[ModStat] Sticky skipped — macro-only message, no reason logged'
            );
          } else {
            console.log('[ModStat] Extracted reason:', reason);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await patchLatestReason(reason, false);
          }
        }
      }

      return c.json<TriggerResponse>(
        { status: 'success', message: 'Sticky processed' },
        200
      );
    }

    // ── ADDREMOVALREASON ────────────────────
    if (action === 'addremovalreason') {
      console.log(
        '[ModStat] addremovalreason full payload:',
        JSON.stringify(body, null, 2)
      );

      const reasonTitle = String(
        body?.removalReason?.title ??
          body?.removalReason?.name ??
          body?.removalReason?.text ??
          body?.removalReason?.message ??
          body?.reason?.title ??
          body?.reason?.name ??
          body?.reason ??
          body?.title ??
          body?.details ??
          body?.description ??
          body?.message ??
          ''
      ).trim();

      if (reasonTitle.length > 0) {
        console.log(
          `[ModStat] addremovalreason: captured title "${reasonTitle}"`
        );
        await patchLatestReason(reasonTitle, true);
      } else {
        console.log(
          '[ModStat] addremovalreason: no title in payload — sticky path handles resolution'
        );
      }

      return c.json<TriggerResponse>(
        { status: 'success', message: 'Removal reason captured' },
        200
      );
    }

    // ── Only process post removal actions ───
    // removecomment is intentionally excluded — posts only
    // spamlink / filterlink = Reddit's automated spam/content filter
    const isRemoval =
      action === 'removelink' ||
      action === 'remove' ||
      action === 'spamlink' ||
      action === 'filterlink' ||
      (action.includes('remov') && action !== 'removecomment');

    if (!isRemoval) {
      console.log(`[ModStat] Skipping: "${action}"`);
      return c.json<TriggerResponse>(
        { status: 'success', message: `Ignored: ${action}` },
        200
      );
    }

    const rawPost = body?.targetPost as Record<string, unknown> | null;

    if (!rawPost) {
      console.log('[ModStat] No post target found — skipping');
      return c.json<TriggerResponse>(
        { status: 'success', message: 'No post target found' },
        200
      );
    }

    const contentId = String(rawPost?.id ?? rawPost?.name ?? '');

    // ── Extract author ───────────────────────
    const targetUser = body?.targetUser as Record<string, unknown> | null;
    const authorName = String(
      targetUser?.name ??
        (rawPost?.author as Record<string, unknown>)?.name ??
        rawPost?.author ??
        rawPost?.authorName ??
        'unknown'
    );

    if (isBotAuthor(authorName, context.subredditName ?? '')) {
      console.log(`[ModStat] Skipping bot/mod-team removal by u/${authorName}`);
      return c.json<TriggerResponse>(
        { status: 'success', message: 'Skipped bot author' },
        200
      );
    }

    const title = String(rawPost?.title ?? '').trim() || '(no title)';

    // ── Check if human is acting on an existing automod/reddit entry ─
    if (!isAutomatedMod(modName) && contentId) {
      const existingEntryId = await getEntryIdByRedditId(contentId);

      if (existingEntryId) {
        const existingRaw = await redis
          .get(`removal:${existingEntryId}`)
          .catch(() => null);

        if (existingRaw) {
          const existingEntry = JSON.parse(existingRaw) as RemovalEntry;
          const wasAutomod =
            existingEntry.modName.toLowerCase() === 'automoderator';
          const pendingReason = wasAutomod
            ? REASON_AUTOMOD_CONFIRMED
            : REASON_REDDIT_FILTER;

          await updateRemovalEntry(existingEntryId, pendingReason, modName);
          await clearRedditIdMap(contentId);

          console.log(
            `[ModStat] Human confirmed queue removal: "${title}" | was:${existingEntry.modName} now:${modName}`
          );

          return c.json<TriggerResponse>(
            { status: 'success', message: 'Queue removal confirmed' },
            200
          );
        }
      }
    }

    // ── Deduplication check ──────────────────
    if (await isDuplicate(contentId)) {
      console.log(`[ModStat] Duplicate skipped: ${contentId}`);
      return c.json<TriggerResponse>(
        { status: 'success', message: 'Duplicate skipped' },
        200
      );
    }

    // ── Determine removal reason ─────────────
    let removalReason = 'No reason given';
    if (modName.toLowerCase() === 'automoderator') {
      removalReason = REASON_AUTOMOD_PENDING;
    } else if (modName.toLowerCase() === 'reddit') {
      removalReason = REASON_REDDIT_FILTER;
    } else if (action === 'filterlink' || action === 'spamlink') {
      // Catch Reddit filter actions regardless of what modName comes through
      removalReason = REASON_REDDIT_FILTER;
    }

    const entry: RemovalEntry = {
      id: makeId(),
      redditId: contentId,
      contentType: 'post',
      title,
      authorName,
      modName,
      removalReason,
      timestamp: Date.now(),
    };

    await saveRemoval(entry);
    console.log(
      '[ModStat] modName check:',
      modName,
      '| isAutomated:',
      isAutomatedMod(modName),
      '| contentId:',
      contentId
    );

    if (isAutomatedMod(modName) && contentId) {
      await setRedditIdMap(contentId, entry.id);
      console.log(`[ModStat] RedditId mapped: ${contentId} → ${entry.id}`);
    }

    return c.json<TriggerResponse>(
      { status: 'success', message: 'Logged post removal' },
      200
    );
  } catch (error) {
    console.error('[ModStat] ModAction error:', error);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Failed to process mod action' },
      400
    );
  }
});

// ── SCHEDULER ─────────────────────────────
triggers.post('/on-scheduler', async (c) => {
  try {
    const body = await c.req.json();
    const jobName = String(body?.name ?? body?.job?.name ?? '');

    if (jobName === 'weekly-digest') {
      console.log('[ModStat] Running scheduled weekly digest...');
      await sendWeeklyDigest();
      return c.json<TriggerResponse>(
        { status: 'success', message: 'Weekly digest sent' },
        200
      );
    }

    if (jobName === 'sync-reddit-filter') {
      console.log('[ModStat] Running Reddit filter sync...');
      await syncRedditFilterRemovals();
      return c.json<TriggerResponse>(
        { status: 'success', message: 'Reddit filter sync complete' },
        200
      );
    }

    return c.json<TriggerResponse>(
      { status: 'success', message: `Ignored job: ${jobName}` },
      200
    );
  } catch (error) {
    console.error('[ModStat] Scheduler error:', error);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Scheduler failed' },
      400
    );
  }
});
