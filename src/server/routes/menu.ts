// ============================================
// MODSTAT — Menu Actions
// ============================================

import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, reddit } from '@devvit/web/server';

export const menu = new Hono();

// ── Creates the ModStat dashboard post ─────
menu.post('/post-create', async (c) => {
  try {
    const post = await reddit.submitPost({
      subredditName: context.subredditName ?? '',
      title: '📊 ModStat — Weekly Removal Analytics Dashboard',
      text: 'Loading ModStat dashboard...',
    });

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
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
