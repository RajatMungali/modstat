// ============================================
// MODSTAT — Menu Actions
// ============================================

import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, reddit, redis } from '@devvit/web/server';

export const menu = new Hono();

const DASHBOARD_POST_KEY = 'modstat:dashboardPostId';

// ── Creates OR navigates to the ModStat dashboard post ─────
menu.post('/post-create', async (c) => {
  try {
    const subredditName = context.subredditName ?? '';

    const existingPostId = await redis
      .get(DASHBOARD_POST_KEY)
      .catch(() => null);

    if (existingPostId) {
      console.log(
        '[ModStat] Dashboard post exists, navigating to:',
        existingPostId
      );
      return c.json<UiResponse>(
        {
          navigateTo: `https://reddit.com/r/${subredditName}/comments/${existingPostId}`,
        },
        200
      );
    }

    const post = await reddit.submitCustomPost({
      subredditName,
      title: 'ModStat — Weekly Removal Analytics Dashboard',
      entrypoint: 'game',
    });

    await redis.set(DASHBOARD_POST_KEY, post.id);
    console.log('[ModStat] Dashboard post created:', post.id);

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error('[ModStat] Menu post-create error:', error);
    return c.json<UiResponse>(
      { showToast: 'Failed to create ModStat dashboard' },
      400
    );
  }
});

// ── Reset dashboard post ID (if post was deleted) ──────────
menu.post('/reset-dashboard', async (c) => {
  try {
    await redis.del(DASHBOARD_POST_KEY);
    return c.json<UiResponse>(
      { showToast: 'Dashboard reset. Open ModStat again to create a new one.' },
      200
    );
  } catch (error) {
    console.error('[ModStat] Reset error:', error);
    return c.json<UiResponse>({ showToast: 'Reset failed — check logs' }, 400);
  }
});
