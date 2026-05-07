// ============================================
// MODSTAT — Triggers (Dedup + bot-removal fixes)
// ============================================

import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import type { RemovalEntry } from '../../shared/api';

export const triggers = new Hono();

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

// ── Helper: check if targetComment is real or Reddit's empty shell ──
function isRealComment(tc: Record<string, unknown> | null): boolean {
  if (!tc) return false;
  return typeof tc.id === 'string' && tc.id.length > 0;
}

// ── Helper: deduplication check ────────────
// Devvit fires on-mod-action multiple times per event (once per
// connected websocket/session). We use a timestamp-based Redis key
// to skip any duplicate event for the same content within 60 seconds.
async function isDuplicate(contentId: string): Promise<boolean> {
  if (!contentId) return false;
  const dedupKey = `dedup:${contentId}`;
  const existing = await redis.get(dedupKey).catch(() => null);
  if (existing) {
    const age = Date.now() - parseInt(existing);
    if (age < 60000) return true; // duplicate within 60s window
  }
  await redis.set(dedupKey, String(Date.now()));
  return false;
}

// ── Helper: check if author is a bot/mod account to skip ───────────
function isBotAuthor(authorName: string, subredditName: string): boolean {
  const lower = authorName.toLowerCase();
  return (
    lower === 'automoderator' ||
    lower === `${subredditName.toLowerCase()}-modteam` ||
    lower === 'reddit' ||
    (lower === 'unknown' && false) // unknown is kept — real users can be unknown
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
    `[ModStat] Logged: "${entry.title}" | mod:${entry.modName} | reason: pending sticky...`
  );
}

// ── Helper: patch the most recent removal's reason ──
async function patchLatestReason(reason: string): Promise<void> {
  if (reason === 'No reason given') {
    console.log('[ModStat] Reason patch: nothing to improve');
    return;
  }

  const weekKey = getWeekKey();
  const ids = await listGet(`${weekKey}:list`);

  if (ids.length === 0) {
    console.log('[ModStat] Reason patch: no recent removal found');
    return;
  }

  const raw = await redis.get(`removal:${ids[0]}`);
  if (!raw) {
    console.log('[ModStat] Reason patch: entry missing from Redis');
    return;
  }

  const entry = JSON.parse(raw) as RemovalEntry;
  const oldReason = entry.removalReason;

  // Only patch if reason is actually changing
  if (oldReason === reason) {
    console.log('[ModStat] Reason patch: already up to date');
    return;
  }

  await decrement(`${weekKey}:reason:${oldReason}`);
  await increment(`${weekKey}:reason:${reason}`);
  await listPush(`${weekKey}:reasonKeys`, reason);

  entry.removalReason = reason;
  await redis.set(`removal:${ids[0]}`, JSON.stringify(entry));

  console.log(`[ModStat] Reason patched: "${oldReason}" → "${reason}"`);
}

// ── APP INSTALL ────────────────────────────
triggers.post('/on-app-install', async (c) => {
  try {
    await redis.set('modstat:installed', Date.now().toString());
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

    // ── STICKY ──────────────────────────────
    if (action === 'sticky') {
      const tc = body?.targetComment as Record<string, unknown> | null;
      if (isRealComment(tc)) {
        const reasonText = String(tc?.body ?? '').trim();
        if (reasonText.length > 0) {
          console.log(`[ModStat] Sticky reason captured: "${reasonText}"`);
          await patchLatestReason(reasonText);
        }
      }
      return c.json<TriggerResponse>(
        { status: 'success', message: 'Sticky processed' },
        200
      );
    }

    // ── ADDREMOVALREASON — skip gracefully ──
    if (action === 'addremovalreason') {
      console.log(
        '[ModStat] addremovalreason: reason arrives via sticky — skipping'
      );
      return c.json<TriggerResponse>(
        { status: 'success', message: 'Handled by sticky' },
        200
      );
    }

    // ── Only process removal actions ────────
    const isRemoval =
      action === 'removelink' ||
      action === 'removecomment' ||
      action === 'remove' ||
      action.includes('remov');

    if (!isRemoval) {
      console.log(`[ModStat] Skipping: "${action}"`);
      return c.json<TriggerResponse>(
        { status: 'success', message: `Ignored: ${action}` },
        200
      );
    }

    // ── Detect post vs comment ───────────────
    const rawComment = body?.targetComment as Record<string, unknown> | null;
    const rawPost = body?.targetPost as Record<string, unknown> | null;
    const isComment = action === 'removecomment' || isRealComment(rawComment);
    const target = isComment ? rawComment : rawPost;

    if (!target) {
      console.log('[ModStat] No target found — skipping');
      return c.json<TriggerResponse>(
        { status: 'success', message: 'No target found' },
        200
      );
    }

    // ── Deduplication check ──────────────────
    // Reddit fires the same event multiple times per websocket session.
    // Use content ID to skip duplicates within a 60-second window.
    const contentId = String(target?.id ?? target?.name ?? '');
    if (await isDuplicate(contentId)) {
      console.log(`[ModStat] Duplicate skipped: ${contentId}`);
      return c.json<TriggerResponse>(
        { status: 'success', message: 'Duplicate skipped' },
        200
      );
    }

    // ── Extract author ───────────────────────
    const targetUser = body?.targetUser as Record<string, unknown> | null;
    const authorName = String(
      targetUser?.name ??
        (target?.author as Record<string, unknown>)?.name ??
        target?.author ??
        target?.authorName ??
        'unknown'
    );

    // ── Skip bot/mod-team authors ────────────
    // Reddit stickies a removal reason comment using the subreddit's
    // mod-team account. We don't want to log those as real removals.
    if (isBotAuthor(authorName, context.subredditName ?? '')) {
      console.log(`[ModStat] Skipping bot/mod-team removal by u/${authorName}`);
      return c.json<TriggerResponse>(
        { status: 'success', message: 'Skipped bot author' },
        200
      );
    }

    // ── Extract title ────────────────────────
    let title: string;
    if (isComment) {
      const bodyText = String(target?.body ?? target?.content ?? '').trim();
      title =
        bodyText.length > 0
          ? `"${bodyText.substring(0, 60)}${bodyText.length > 60 ? '...' : ''}"`
          : '(no content)';
    } else {
      title = String(rawPost?.title ?? '').trim() || '(no title)';
    }

    const entry: RemovalEntry = {
      id: makeId(),
      contentType: isComment ? 'comment' : 'post',
      title,
      authorName,
      modName,
      removalReason: 'No reason given',
      timestamp: Date.now(),
    };

    await saveRemoval(entry);

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Logged ${isComment ? 'comment' : 'post'} removal`,
      },
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
