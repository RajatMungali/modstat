// ============================================
// MODSTAT — Triggers
// ============================================

import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { context, redis, reddit, scheduler } from '@devvit/web/server';
import type { RemovalEntry } from '../../shared/api';
import {
  REMOVAL_REASON_AUTOMOD,
  REMOVAL_REASON_AUTOMOD_PENDING,
  REMOVAL_REASON_NONE,
  REMOVAL_REASON_REDDIT_FILTER,
} from '../../shared/api';
import { listGet, listPush } from '../core/redis-list';
import { buildWeeklyStats } from '../core/stats';
import { getDayName, getPrevWeekKey, getWeekKey } from '../core/week';

export const triggers = new Hono();

const REASON_AUTOMOD_PENDING = REMOVAL_REASON_AUTOMOD_PENDING;
const REASON_AUTOMOD_CONFIRMED = REMOVAL_REASON_AUTOMOD;
const REASON_REDDIT_FILTER = REMOVAL_REASON_REDDIT_FILTER;
const NO_REASON = REMOVAL_REASON_NONE;
const RECONCILE_BATCH_LIMIT = 40;
const RECONCILE_MIN_AGE_MS = 15_000;

type StoredRemovalEntry = RemovalEntry & {
  reasonFinal?: boolean;
  approved?: boolean;
  approvedAt?: number;
};

type ModActionReasonFields = {
  type?: string;
  description?: string;
  details?: string;
  target?: { id?: string };
};

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function increment(key: string): Promise<void> {
  const current = await redis.get(key);
  const val = current ? parseInt(current) : 0;
  await redis.set(key, String(val + 1));
}

async function decrement(key: string): Promise<void> {
  const current = await redis.get(key);
  const val = current ? parseInt(current) : 0;
  await redis.set(key, String(Math.max(0, val - 1)));
}

async function setRedditIdMap(
  redditId: string,
  entryId: string
): Promise<void> {
  await redis.set(`redditid:${redditId}`, entryId);
}

async function getEntryIdByRedditId(redditId: string): Promise<string | null> {
  const value = await redis.get(`redditid:${redditId}`).catch(() => null);
  return value ?? null;
}

async function clearRedditIdMap(redditId: string): Promise<void> {
  await redis.del(`redditid:${redditId}`).catch(() => null);
}

function normalizeRedditPostId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('t3_')) return trimmed;
  return `t3_${trimmed}`;
}

function isPostFullname(id: string): id is `t3_${string}` {
  return id.startsWith('t3_');
}

function extractPostIdFromRecord(
  record: Record<string, unknown> | null | undefined
): string {
  if (!record) return '';
  const raw = String(record.id ?? record.name ?? '');
  if (!raw) return '';
  return raw.startsWith('t3_') ? raw : normalizeRedditPostId(raw);
}

function extractPostIdFromStickyComment(
  tc: Record<string, unknown> | null
): string {
  if (!tc) return '';
  const linkId = String(tc.linkId ?? tc.link_id ?? '');
  if (linkId.startsWith('t3_')) return linkId;
  const parentId = String(tc.parentId ?? tc.parent_id ?? '');
  if (parentId.startsWith('t3_')) return parentId;
  return '';
}

function extractPostIdFromBody(body: Record<string, unknown>): string {
  const fromPost = extractPostIdFromRecord(
    body.targetPost as Record<string, unknown> | undefined
  );
  if (fromPost) return fromPost;

  const target = body.target as Record<string, unknown> | undefined;
  if (target) {
    const targetId = String(target.id ?? '');
    if (targetId.startsWith('t3_')) return targetId;
  }

  const fromComment = extractPostIdFromStickyComment(
    (body.targetComment as Record<string, unknown> | null) ?? null
  );
  if (fromComment) return fromComment;

  const explicit = String(body.postId ?? body.post_id ?? '');
  if (explicit) return normalizeRedditPostId(explicit);

  return '';
}

function pickModActionReasonText(action: ModActionReasonFields): string | null {
  const raw = [action.description, action.details]
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .join(' — ')
    .trim();
  if (raw.length === 0) return null;
  const cleaned = raw.replace(/\s*—\s*\d+\s*$/, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}

async function findEntryIdByRedditId(
  redditPostId: string
): Promise<string | null> {
  const normalized = normalizeRedditPostId(redditPostId);
  if (!normalized) return null;

  const mapped = await getEntryIdByRedditId(normalized);
  if (mapped) return mapped;

  const weekKey = getWeekKey();
  const ids = await listGet(`${weekKey}:list`);
  for (const entryId of ids) {
    const raw = await redis.get(`removal:${entryId}`).catch(() => null);
    if (!raw) continue;
    const entry = JSON.parse(raw) as RemovalEntry;
    if (normalizeRedditPostId(entry.redditId) === normalized) return entryId;
  }
  return null;
}

async function storePendingAutomodReason(
  postId: string,
  reason: string
): Promise<void> {
  const normalized = normalizeRedditPostId(postId);
  if (!normalized || !reason.trim()) return;
  await redis.set(`pendingreason:${normalized}`, reason.trim());
}

async function consumePendingAutomodReason(
  postId: string
): Promise<string | null> {
  const normalized = normalizeRedditPostId(postId);
  if (!normalized) return null;
  const key = `pendingreason:${normalized}`;
  const pending = await redis.get(key).catch(() => null);
  if (!pending) return null;
  await redis.del(key).catch(() => null);
  const trimmed = pending.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchRemovalReasonFromModLog(
  postId: string
): Promise<string | null> {
  const normalized = normalizeRedditPostId(postId);
  if (!isPostFullname(normalized)) return null;
  const subredditName = context.subredditName ?? '';
  if (!subredditName) return null;
  try {
    const actions = await reddit
      .getModerationLog({
        subredditName,
        type: 'addremovalreason',
        limit: 25,
        pageSize: 25,
      })
      .all();
    const match = actions.find(
      (a) => (a as ModActionReasonFields).target?.id === normalized
    );
    if (!match) return null;
    return pickModActionReasonText(match as ModActionReasonFields);
  } catch (err) {
    console.error('[ModStat] fetchRemovalReasonFromModLog error:', err);
    return null;
  }
}

async function fetchAutomodActionReasonFromModLog(
  postId: string
): Promise<string | null> {
  const normalized = normalizeRedditPostId(postId);
  if (!isPostFullname(normalized)) return null;
  const subredditName = context.subredditName ?? '';
  if (!subredditName) return null;
  try {
    const actions = await reddit
      .getModerationLog({
        subredditName,
        type: 'removelink',
        moderatorUsernames: ['AutoModerator'],
        limit: 25,
        pageSize: 25,
      })
      .all();
    const match = actions.find(
      (a) => (a as ModActionReasonFields).target?.id === normalized
    );
    if (!match) return null;
    const reason = pickModActionReasonText(match as ModActionReasonFields);
    if (reason) {
      console.log(
        `[ModStat] fetchAutomodActionReasonFromModLog: found "${reason}" for ${normalized}`
      );
    }
    return reason;
  } catch (err) {
    console.error('[ModStat] fetchAutomodActionReasonFromModLog error:', err);
    return null;
  }
}

async function resolvePostIdForAddRemovalReason(
  reasonTitle: string
): Promise<string> {
  const subredditName = context.subredditName ?? '';
  if (!subredditName) return '';
  try {
    const actions = await reddit
      .getModerationLog({
        subredditName,
        type: 'addremovalreason',
        limit: 10,
        pageSize: 10,
      })
      .all();
    for (const action of actions) {
      const targetId = action.target?.id ?? '';
      if (!targetId.startsWith('t3_')) continue;
      if (!reasonTitle) return targetId;
      const desc = pickModActionReasonText(action as ModActionReasonFields);
      if (desc && desc.toLowerCase().includes(reasonTitle.toLowerCase()))
        return targetId;
    }
    const newest = actions.find((a) => a.target?.id?.startsWith('t3_'));
    return newest?.target?.id ?? '';
  } catch (err) {
    console.error('[ModStat] resolvePostIdForAddRemovalReason error:', err);
    return '';
  }
}

async function fetchCommentRemovalReasonFromModLog(
  commentId: string
): Promise<string | null> {
  const subredditName = context.subredditName ?? '';
  if (!subredditName || !commentId) return null;
  try {
    const actions = await reddit
      .getModerationLog({
        subredditName,
        type: 'addremovalreason',
        limit: 10,
        pageSize: 10,
      })
      .all();
    const match = actions.find(
      (a) => (a as ModActionReasonFields).target?.id === commentId
    );
    if (!match) return null;
    return pickModActionReasonText(match as ModActionReasonFields);
  } catch (err) {
    console.error('[ModStat] fetchCommentRemovalReasonFromModLog error:', err);
    return null;
  }
}

function extractReasonFromStickyBody(
  messageText: string,
  subredditName: string
): string | null {
  const parts = messageText.split(' - ');
  if (parts.length > 1) {
    const first = parts[0];
    if (first) return first.trim();
  }
  if (
    subredditName.length > 0 &&
    messageText.toLowerCase().includes(subredditName.toLowerCase())
  ) {
    return null;
  }
  return messageText.trim();
}

function isRealComment(tc: Record<string, unknown> | null): boolean {
  if (!tc) return false;
  return typeof tc.id === 'string' && tc.id.length > 0;
}

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

function isAutomatedMod(modName: string): boolean {
  const lower = modName.toLowerCase();
  return lower === 'automoderator' || lower === 'reddit';
}

function isBotAuthor(authorName: string, subredditName: string): boolean {
  const lower = authorName.toLowerCase();
  return (
    lower === 'automoderator' ||
    lower === `${subredditName.toLowerCase()}-modteam` ||
    lower === 'reddit'
  );
}

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
  if (entry.redditId) await setRedditIdMap(entry.redditId, entry.id);
  console.log(
    `[ModStat] Logged: "${entry.title}" | type:${entry.contentType} | mod:${entry.modName} | reason:${entry.removalReason}`
  );
}

async function deleteRemovalEntry(entryId: string): Promise<void> {
  const weekKey = getWeekKey();
  const raw = await redis.get(`removal:${entryId}`).catch(() => null);
  if (!raw) return;

  const entry = JSON.parse(raw) as StoredRemovalEntry;

  // Soft-delete: mark approved instead of wiping the record.
  // Stats scan skips approved entries, so counts stay correct.
  // For automod removals this is also how we detect false positives.
  if (!entry.approved) {
    entry.approved = true;
    entry.approvedAt = Date.now();
    await redis.set(`removal:${entryId}`, JSON.stringify(entry));

    // Decrement the live counters so the reason/mod bars update immediately
    await decrement(`${weekKey}:reason:${entry.removalReason}`);
    await decrement(`${weekKey}:mod:${entry.modName}`);
    await decrement(`${weekKey}:day:${getDayName()}`);
    await decrement(`${weekKey}:offender:${entry.authorName}`);
  }

  console.log(`[ModStat] Entry soft-deleted (approved): "${entry.title}"`);
}

async function updateRemovalEntry(
  entryId: string,
  newReason: string,
  newModName: string
): Promise<void> {
  const weekKey = getWeekKey();
  const raw = await redis.get(`removal:${entryId}`).catch(() => null);
  if (!raw) return;
  const entry = JSON.parse(raw) as StoredRemovalEntry;
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

async function patchReasonForEntry(
  entryId: string,
  reason: string,
  isFinal: boolean = false
): Promise<boolean> {
  if (reason === NO_REASON) return false;
  const weekKey = getWeekKey();
  const raw = await redis.get(`removal:${entryId}`).catch(() => null);
  if (!raw) return false;
  const entry = JSON.parse(raw) as StoredRemovalEntry;
  if (entry.reasonFinal && !isFinal) return false;
  const oldReason = entry.removalReason;
  if (oldReason === reason) {
    if (isFinal && !entry.reasonFinal) {
      entry.reasonFinal = true;
      await redis.set(`removal:${entryId}`, JSON.stringify(entry));
    }
    return true;
  }
  await decrement(`${weekKey}:reason:${oldReason}`);
  await increment(`${weekKey}:reason:${reason}`);
  await listPush(`${weekKey}:reasonKeys`, reason);
  entry.removalReason = reason;
  if (isFinal) entry.reasonFinal = true;
  await redis.set(`removal:${entryId}`, JSON.stringify(entry));
  console.log(
    `[ModStat] Reason patched for ${entry.redditId}: "${oldReason}" → "${reason}"${isFinal ? ' [final]' : ''}`
  );
  return true;
}

async function patchReasonForPost(
  redditPostId: string,
  reason: string,
  isFinal: boolean = false
): Promise<boolean> {
  const normalized = normalizeRedditPostId(redditPostId);
  if (!normalized) return false;
  const entryId = await findEntryIdByRedditId(normalized);
  if (!entryId) return false;
  return patchReasonForEntry(entryId, reason, isFinal);
}

async function reconcilePendingRemovalReasons(): Promise<void> {
  const weekKey = getWeekKey();
  const ids = await listGet(`${weekKey}:list`);
  let updated = 0;

  for (const entryId of ids.slice(0, RECONCILE_BATCH_LIMIT)) {
    const raw = await redis.get(`removal:${entryId}`).catch(() => null);
    if (!raw) continue;
    const entry = JSON.parse(raw) as StoredRemovalEntry;
    if (entry.reasonFinal) continue;

    const needsReason =
      entry.removalReason === NO_REASON ||
      entry.removalReason === REASON_AUTOMOD_PENDING;
    if (!needsReason) continue;
    if (Date.now() - entry.timestamp < RECONCILE_MIN_AGE_MS) continue;

    let reason: string | null = null;

    if (entry.contentType === 'comment') {
      reason = await fetchCommentRemovalReasonFromModLog(entry.redditId);
    } else if (entry.modName.toLowerCase() === 'automoderator') {
      // For AutoMod removals: first try the removelink mod log entry which
      // carries the action_reason field set in the AutoMod config.
      reason = await fetchAutomodActionReasonFromModLog(entry.redditId);
      // Fall back to addremovalreason if a human added one afterwards.
      if (!reason) reason = await fetchRemovalReasonFromModLog(entry.redditId);
    } else {
      reason = await fetchRemovalReasonFromModLog(entry.redditId);
    }

    if (!reason || reason === entry.removalReason) continue;
    const patched = await patchReasonForEntry(entryId, reason, true);
    if (patched) updated += 1;
  }

  console.log(`[ModStat] Reconciled ${updated} pending removal reason(s)`);
}

async function syncRedditFilterRemovals(): Promise<void> {
  try {
    const actions = await reddit
      .getModerationLog({
        subredditName: context.subredditName ?? '',
        moderatorUsernames: ['reddit'],
        limit: 50,
        pageSize: 50,
      })
      .all();

    if (actions.length > 0) {
      console.log(
        '[ModStat] sample ModAction:',
        JSON.stringify(actions[0], null, 2)
      );
    }

    let synced = 0;
    for (const action of actions) {
      const contentId = action.target?.id ?? '';
      if (!contentId.startsWith('t3_')) continue;
      const existing = await getEntryIdByRedditId(contentId);
      if (existing) continue;
      const dedupKey = `dedup:sync:${contentId}`;
      const alreadySeen = await redis.get(dedupKey).catch(() => null);
      if (alreadySeen) continue;
      await redis.set(dedupKey, '1', { ex: 86400 });
      const authorName = String(action.target?.author ?? 'unknown');
      if (isBotAuthor(authorName, context.subredditName ?? '')) continue;
      const title = String(action.target?.title ?? '').trim() || '(no title)';
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
      synced++;
    }
    console.log(
      `[ModStat] Reddit filter sync complete — ${synced} new entries from ${actions.length} mod log actions`
    );
  } catch (err) {
    console.error('[ModStat] syncRedditFilterRemovals error:', err);
  }
}

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
    .filter(([r]) => r !== NO_REASON)
    .sort((a, b) => b[1] - a[1])[0];
  const busiestDay = Object.entries(stats.byDay).sort((a, b) => b[1] - a[1])[0];
  const noReasonCount = stats.byReason[NO_REASON] ?? 0;

  const glance = [
    `📊 **${stats.totalRemovals} removals** this week${wow(stats.totalRemovals, prevTotal)}`,
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
    .filter(([r, count]) => r !== NO_REASON && count > 0)
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
      ? `\n---\n⚠️ ${noReasonCount} removal${noReasonCount > 1 ? 's' : ''} had no removal reason selected.`
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

  await reddit.modMail.createModInboxConversation({
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
    await scheduler.runJob({ name: 'weekly-digest', cron: '0 9 * * 1' });
    await scheduler.runJob({
      name: 'sync-reddit-filter',
      cron: '0 * * * *',
    });
    console.log(`[ModStat] Installed on r/${context.subredditName}`);
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
        (action === 'filterlink' || action === 'spamlink'
          ? 'reddit'
          : undefined) ??
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
      if (isRealComment(tc)) {
        const messageText = String(tc?.body ?? '').trim();
        if (messageText.length > 0) {
          const reason = extractReasonFromStickyBody(
            messageText,
            context.subredditName ?? ''
          );
          if (reason !== null) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            const postId =
              extractPostIdFromBody(body as Record<string, unknown>) ||
              extractPostIdFromStickyComment(tc);
            await patchReasonForPost(postId, reason, false);
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
      const tc = body?.targetComment as Record<string, unknown> | null;
      const commentId = String(tc?.id ?? '');
      const isCommentReason = commentId.startsWith('t1_');

      if (isCommentReason) {
        const reason = await fetchCommentRemovalReasonFromModLog(commentId);
        if (reason) {
          const entryId = await getEntryIdByRedditId(commentId);
          if (entryId) await patchReasonForEntry(entryId, reason, true);
        }
      } else {
        const bodyRecord = body as Record<string, unknown>;
        let postId = extractPostIdFromBody(bodyRecord);
        if (!postId) postId = await resolvePostIdForAddRemovalReason('');
        if (postId) {
          const reason = await fetchRemovalReasonFromModLog(postId);
          if (reason) await patchReasonForPost(postId, reason, true);
        }
      }
      return c.json<TriggerResponse>(
        { status: 'success', message: 'Removal reason captured' },
        200
      );
    }

    // ── REMOVECOMMENT ────────────────────────
    if (action === 'removecomment') {
      const rawComment = body?.targetComment as Record<string, unknown> | null;
      if (!rawComment)
        return c.json<TriggerResponse>(
          { status: 'success', message: 'No comment target' },
          200
        );

      const contentId = String(rawComment?.id ?? '');
      if (!contentId)
        return c.json<TriggerResponse>(
          { status: 'success', message: 'No comment id' },
          200
        );

      const targetUser = body?.targetUser as Record<string, unknown> | null;
      const authorName = String(
        targetUser?.name ??
          (rawComment?.author as Record<string, unknown>)?.name ??
          rawComment?.author ??
          'unknown'
      );

      if (isBotAuthor(authorName, context.subredditName ?? '')) {
        return c.json<TriggerResponse>(
          { status: 'success', message: 'Skipped bot author' },
          200
        );
      }
      if (await isDuplicate(contentId)) {
        return c.json<TriggerResponse>(
          { status: 'success', message: 'Duplicate skipped' },
          200
        );
      }

      const bodyText = String(
        rawComment?.body ?? rawComment?.content ?? ''
      ).trim();
      const title =
        bodyText.length > 0
          ? `"${bodyText.substring(0, 60)}${bodyText.length > 60 ? '...' : ''}"`
          : '(no content)';

      const entry: RemovalEntry = {
        id: makeId(),
        redditId: contentId,
        contentType: 'comment',
        title,
        authorName,
        modName,
        removalReason: NO_REASON,
        timestamp: Date.now(),
      };
      await saveRemoval(entry);
      return c.json<TriggerResponse>(
        { status: 'success', message: 'Logged comment removal' },
        200
      );
    }

    // ── POST REMOVALS ────────────────────────
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
      return c.json<TriggerResponse>(
        { status: 'success', message: 'No post target found' },
        200
      );
    }

    const contentId = String(rawPost?.id ?? rawPost?.name ?? '');
    const targetUser = body?.targetUser as Record<string, unknown> | null;
    const authorName = String(
      targetUser?.name ??
        (rawPost?.author as Record<string, unknown>)?.name ??
        rawPost?.author ??
        rawPost?.authorName ??
        'unknown'
    );

    if (isBotAuthor(authorName, context.subredditName ?? '')) {
      return c.json<TriggerResponse>(
        { status: 'success', message: 'Skipped bot author' },
        200
      );
    }

    const title = String(rawPost?.title ?? '').trim() || '(no title)';

   
    // ── Fetch automod reason from mod log after short delay ──
    if (modName.toLowerCase() === 'automoderator' && contentId) {
      setTimeout(async () => {
        try {
          const reason = await fetchAutomodActionReasonFromModLog(contentId);
          if (reason) {
            await patchReasonForPost(contentId, reason, true);
            console.log(
              `[ModStat] Automod reason patched: "${reason}" for ${contentId}`
            );
          }
        } catch (err) {
          console.error('[ModStat] Automod reason fetch error:', err);
        }
      }, 3000);
    }

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
          return c.json<TriggerResponse>(
            { status: 'success', message: 'Queue removal confirmed' },
            200
          );
        }
      }
    }

    if (await isDuplicate(contentId)) {
      return c.json<TriggerResponse>(
        { status: 'success', message: 'Duplicate skipped' },
        200
      );
    }

    // ── Determine removal reason ─────────────
    // Priority: pending automod reason → payload fields → mod log → fallback
    let removalReason = NO_REASON;
    const pendingAutomodReason = await consumePendingAutomodReason(contentId);

    if (pendingAutomodReason) {
      removalReason = pendingAutomodReason;
    } else if (modName.toLowerCase() === 'automoderator') {
      // Try to read action_reason directly from the payload fields
      const payloadReason = [
        String(body?.details ?? ''),
        String(body?.description ?? ''),
        String((rawPost as any)?.ban_note ?? ''),
        String((rawPost as any)?.mod_note ?? ''),
      ]
        .map((s) => s.trim())
        .find((s) => s.length > 0);

      if (payloadReason) {
        // Clean up trailing " — <number>" Reddit sometimes appends
        removalReason =
          payloadReason.replace(/\s*—\s*\d+\s*$/, '').trim() ||
          REASON_AUTOMOD_PENDING;
      } else {
        removalReason = REASON_AUTOMOD_PENDING;
      }
    } else if (modName.toLowerCase() === 'reddit') {
      removalReason = REASON_REDDIT_FILTER;
    } else if (action === 'filterlink' || action === 'spamlink') {
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

// ── AUTOMODERATOR FILTER POST ──────────────
triggers.post('/on-automoderator-filter-post', async (c) => {
  try {
    const body = await c.req.json();
    const rawPost = body?.post as Record<string, unknown> | undefined;
    const postId = extractPostIdFromRecord(rawPost);
    const reason = String(body?.reason ?? '').trim();

    if (!postId) {
      return c.json<TriggerResponse>(
        { status: 'success', message: 'No post in automod filter event' },
        200
      );
    }

    if (reason) {
      await storePendingAutomodReason(postId, reason);
      const patched = await patchReasonForPost(postId, reason, true);
      console.log(
        `[ModStat] Automod filter post ${postId} | reason:"${reason}" | patched:${patched}`
      );
    }

    return c.json<TriggerResponse>(
      { status: 'success', message: 'Automod filter post handled' },
      200
    );
  } catch (error) {
    console.error('[ModStat] AutomoderatorFilterPost error:', error);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Automod filter handler failed' },
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
      await reconcilePendingRemovalReasons();
      return c.json<TriggerResponse>(
        {
          status: 'success',
          message: 'Reddit filter sync and reconcile complete',
        },
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
