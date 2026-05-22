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

    // Check if a dashboard post already exists
    const existingPostId = await redis
      .get(DASHBOARD_POST_KEY)
      .catch(() => null);

    if (existingPostId) {
      // Post already exists — just navigate to it
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

    // No existing post — create a new custom post (loads the game entrypoint)
    const post = await reddit.submitCustomPost({
      subredditName,
      title: 'ModStat — Weekly Removal Analytics Dashboard',
      entrypoint: 'game',
    });

    // Store the post ID so we reuse it next time
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

// ── Seed demo data ──────────────────────────────────────────
menu.post('/seed-demo-data', async (c) => {
  try {
    const rules = [
      'No Spam',
      'Harassment',
      'Off-Topic',
      'Self-Promotion',
      'Misinformation',
    ];

    const mods = ['alpha_mod', 'beta_mod', 'gamma_mod'];

    const offenders = [
      'spambot99',
      'selfpromo_guy',
      'ruleviolator',
      'troll_account',
      'repeat_Karen',
    ];

    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    const weeks = [
      {
        offset: 0,
        total: 47,
        byRule: [19, 14, 8, 4, 2],
        byMod: [22, 17, 8],
        byDay: [8, 4, 11, 6, 9, 14, 5],
        byOffender: [8, 5, 4, 3, 2],
      },
      {
        offset: -1,
        total: 42,
        byRule: [16, 16, 6, 3, 1],
        byMod: [20, 15, 7],
        byDay: [7, 5, 9, 5, 8, 11, 4],
        byOffender: [6, 4, 3, 2, 1],
      },
      {
        offset: -2,
        total: 38,
        byRule: [14, 12, 7, 3, 2],
        byMod: [18, 13, 7],
        byDay: [6, 4, 8, 5, 7, 10, 3],
        byOffender: [5, 4, 3, 2, 1],
      },
      {
        offset: -3,
        total: 31,
        byRule: [11, 10, 5, 3, 2],
        byMod: [15, 11, 5],
        byDay: [5, 3, 7, 4, 6, 8, 3],
        byOffender: [4, 3, 2, 2, 1],
      },
    ];

    function weekKeyForOffset(offset: number): string {
      const now = new Date();
      now.setDate(now.getDate() + offset * 7);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const weekNum = Math.ceil(
        ((now.getTime() - startOfYear.getTime()) / 86400000 +
          startOfYear.getDay() +
          1) /
          7
      );
      return `week:${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }

    for (const week of weeks) {
      const wk = weekKeyForOffset(week.offset);

      for (let i = 0; i < rules.length; i++)
        await redis.set(`${wk}:reason:${rules[i]}`, String(week.byRule[i]));
      await redis.set(`${wk}:reasonKeys`, JSON.stringify(rules));

      for (let i = 0; i < mods.length; i++)
        await redis.set(`${wk}:mod:${mods[i]}`, String(week.byMod[i]));
      await redis.set(`${wk}:modKeys`, JSON.stringify(mods));

      for (let i = 0; i < days.length; i++)
        await redis.set(`${wk}:day:${days[i]}`, String(week.byDay[i]));

      for (let i = 0; i < offenders.length; i++)
        await redis.set(
          `${wk}:offender:${offenders[i]}`,
          String(week.byOffender[i])
        );
      await redis.set(`${wk}:offenderKeys`, JSON.stringify(offenders));

      const fakeIds: string[] = [];
      for (let i = 0; i < Math.min(week.total, 20); i++) {
        const id = `seed-${wk}-${i}`;
        fakeIds.push(id);
        await redis.set(
          `removal:${id}`,
          JSON.stringify({
            id,
            contentType: i % 3 === 0 ? 'comment' : 'post',
            title:
              i % 3 === 0
                ? `"Seeded comment removal #${i + 1}"`
                : `Seeded post removal #${i + 1}`,
            authorName: offenders[i % offenders.length],
            modName: mods[i % mods.length],
            removalReason: rules[i % rules.length],
            timestamp: Date.now() - i * 3600000,
          })
        );
      }
      await redis.set(`${wk}:list`, JSON.stringify(fakeIds));
    }

    return c.json<UiResponse>(
      { showToast: 'Demo data seeded! 4 weeks loaded.' },
      200
    );
  } catch (error) {
    console.error('[ModStat] Seed error:', error);
    return c.json<UiResponse>({ showToast: 'Seed failed — check logs' }, 400);
  }
});
