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
// ── Paste this into menu.ts, below the post-create route ──

menu.post('/seed-demo-data', async (c) => {
  try {
    const { redis } = await import('@devvit/web/server');

    // ── Helpers (mirrors triggers.ts exactly) ────────────
    async function setCount(key: string, val: number): Promise<void> {
      await redis.set(key, String(val));
    }

    async function listSet(key: string, arr: string[]): Promise<void> {
      await redis.set(key, JSON.stringify(arr));
    }

    // ── Seed config ──────────────────────────────────────
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

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // ── 4 weeks of data ──────────────────────────────────
    // Week numbers relative to current week (0 = this week, -1 = last week, etc.)
    const weeks = [
      {
        offset: 0,   // this week
        total: 47,
        byRule:      [19, 14, 8, 4, 2],
        byMod:       [22, 17, 8],
        byDay:       [8, 4, 11, 6, 9, 14, 5],  // Mon–Sun, Sat is busiest
        byOffender:  [8, 5, 4, 3, 2],
      },
      {
        offset: -1,  // last week
        total: 42,
        byRule:      [16, 16, 6, 3, 1],
        byMod:       [20, 15, 7],
        byDay:       [7, 5, 9, 5, 8, 11, 4],
        byOffender:  [6, 4, 3, 2, 1],
      },
      {
        offset: -2,
        total: 38,
        byRule:      [14, 12, 7, 3, 2],
        byMod:       [18, 13, 7],
        byDay:       [6, 4, 8, 5, 7, 10, 3],
        byOffender:  [5, 4, 3, 2, 1],
      },
      {
        offset: -3,
        total: 31,
        byRule:      [11, 10, 5, 3, 2],
        byMod:       [15, 11, 5],
        byDay:       [5, 3, 7, 4, 6, 8, 3],
        byOffender:  [4, 3, 2, 2, 1],
      },
    ];

    // ── Week key generator (offset in weeks from now) ────
    function weekKeyForOffset(offset: number): string {
      const now = new Date();
      now.setDate(now.getDate() + offset * 7);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const weekNum = Math.ceil(
        ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
      );
      return `week:${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }

    // ── Write all weeks ──────────────────────────────────
    for (const week of weeks) {
      const wk = weekKeyForOffset(week.offset);

      // Rules
      for (let i = 0; i < rules.length; i++) {
        await setCount(`${wk}:reason:${rules[i]}`, week.byRule[i]);
      }
      await listSet(`${wk}:reasonKeys`, rules);

      // Mods
      for (let i = 0; i < mods.length; i++) {
        await setCount(`${wk}:mod:${mods[i]}`, week.byMod[i]);
      }
      await listSet(`${wk}:modKeys`, mods);

      // Days
      for (let i = 0; i < days.length; i++) {
        await setCount(`${wk}:day:${days[i]}`, week.byDay[i]);
      }

      // Offenders
      for (let i = 0; i < offenders.length; i++) {
        await setCount(`${wk}:offender:${offenders[i]}`, week.byOffender[i]);
      }
      await listSet(`${wk}:offenderKeys`, offenders);

      // Removal ID list (fake IDs so recentRemovals has entries)
      const fakeIds: string[] = [];
      for (let i = 0; i < Math.min(week.total, 20); i++) {
        const id = `seed-${wk}-${i}`;
        fakeIds.push(id);

        const ruleIndex = i % rules.length;
        const offenderIndex = i % offenders.length;
        const modIndex = i % mods.length;
        const isComment = i % 3 === 0;

        await redis.set(
          `removal:${id}`,
          JSON.stringify({
            id,
            contentType: isComment ? 'comment' : 'post',
            title: isComment
              ? `"Seeded comment removal #${i + 1}"`
              : `Seeded post removal #${i + 1}`,
            authorName: offenders[offenderIndex],
            modName: mods[modIndex],
            removalReason: rules[ruleIndex],
            timestamp: Date.now() - i * 3600000, // spread over hours
          })
        );
      }
      await listSet(`${wk}:list`, fakeIds);
    }

    console.log('[ModStat] Demo data seeded successfully');

    return c.json<UiResponse>(
      { showToast: '✅ Demo data seeded! 4 weeks of data loaded.' },
      200
    );
  } catch (error) {
    console.error('[ModStat] Seed error:', error);
    return c.json<UiResponse>(
      { showToast: '❌ Seed failed — check logs' },
      400
    );
  }
});
