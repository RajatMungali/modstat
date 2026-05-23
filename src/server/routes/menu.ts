// ============================================
// MODSTAT — Menu Actions
// ============================================

import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, reddit, redis } from '@devvit/web/server';
import { getWeekKeyForWeekOffset } from '../core/week';

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

// ── Seed demo data ──────────────────────────────────────────
menu.post('/seed-demo-data', async (c) => {
  try {
    const rules = [
      'No Pornography',
      'No Promotions',
      'No Spam',
      'No OnlyFans',
      'No Racism',
      'Low Effort',
      'Bullying',
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

    // Realistic post titles per rule
    const postTitles: Record<string, string[]> = {
      'No Pornography': [
        'Rate my girlfriend 😈',
        'Anyone got the full video?',
        'NSFW cosplay drop',
        'Late night content for the boys',
      ],

      'No Promotions': [
        'Check out my YouTube channel!',
        'I just launched my new app',
        'Follow my Instagram for more',
        'Join my Discord server!',
      ],

      'No Spam': [
        'FREE ROBUX CLICK HERE',
        'Best crypto investment 2026',
        'Make money fast with this method',
        'This site gives free followers',
      ],

      'No OnlyFans': [
        'New content just dropped 💋',
        'Link in bio for exclusive pics',
        'Subscribe for the uncensored version',
        'DM me for premium content',
      ],

      'No Racism': [
        'Why are people from [group] like this?',
        'This meme is actually true',
        'Certain races ruin every game',
        'Guess the stereotype 😂',
      ],

      'Low Effort': ['lol', 'W or L?', 'Title says it all', '💀'],

      'Bullying': [
        'This dude is actually pathetic',
        'Everyone point and laugh at this clown',
        'Bro should delete his account',
        'Imagine being this stupid',
      ],
    };

    // Realistic comment texts per rule
    const commentTitles: Record<string, string[]> = {
      'No Pornography': [
        'Send the full pic',
        'Got any more NSFW stuff?',
        'That video turned me on ngl',
      ],

      'No Promotions': [
        'Sub to my channel if you like this',
        'Use my referral code for rewards',
        'Follow me on TikTok for more clips',
      ],

      'No Spam': [
        'CLICK HERE TO WIN FREE MONEY',
        'Best casino site online',
        'Earn $500 daily from home',
      ],

      'No OnlyFans': [
        'My OF link is in bio 😘',
        'Selling exclusive content cheap',
        'DM for premium access',
      ],

      'No Racism': [
        'Typical behavior from them',
        'That race always does this',
        'Nobody wants those people here',
      ],

      'Low Effort': ['lol', 'k', '💀'],

      'Bullying': [
        'You are actually embarrassing',
        'Nobody cares what you think',
        'Touch grass loser',
      ],
    };

    const weeks = [
      {
        offset: 0,
        total: 18,
        byRule: [5, 4, 3, 2, 2, 1, 1],
        byMod: [9, 6, 3],
        byDay: [3, 2, 4, 2, 3, 3, 1],
        byOffender: [4, 3, 2, 2, 1],
        commentRatio: 0.3,
      },
      {
        offset: -1,
        total: 16,
        byRule: [5, 3, 3, 2, 1, 1, 1],
        byMod: [8, 5, 3],
        byDay: [2, 2, 3, 2, 3, 3, 1],
        byOffender: [3, 3, 2, 2, 1],
        commentRatio: 0.28,
      },
      {
        offset: -2,
        total: 14,
        byRule: [4, 3, 2, 2, 1, 1, 1],
        byMod: [7, 4, 3],
        byDay: [2, 1, 3, 2, 2, 3, 1],
        byOffender: [3, 2, 2, 1, 1],
        commentRatio: 0.32,
      },
      {
        offset: -3,
        total: 12,
        byRule: [4, 3, 2, 1, 1, 1, 0],
        byMod: [6, 4, 2],
        byDay: [2, 1, 2, 2, 2, 2, 1],
        byOffender: [3, 2, 2, 1, 1],
        commentRatio: 0.25,
      },
    ];

    for (const week of weeks) {
      const wk = getWeekKeyForWeekOffset(week.offset);

      // Reason counts
      for (let i = 0; i < rules.length; i++)
        await redis.set(`${wk}:reason:${rules[i]}`, String(week.byRule[i]));
      await redis.set(`${wk}:reasonKeys`, JSON.stringify(rules));

      // Mod counts
      for (let i = 0; i < mods.length; i++)
        await redis.set(`${wk}:mod:${mods[i]}`, String(week.byMod[i]));
      await redis.set(`${wk}:modKeys`, JSON.stringify(mods));

      // Day counts
      for (let i = 0; i < days.length; i++)
        await redis.set(`${wk}:day:${days[i]}`, String(week.byDay[i]));

      // Offender counts
      for (let i = 0; i < offenders.length; i++)
        await redis.set(
          `${wk}:offender:${offenders[i]}`,
          String(week.byOffender[i])
        );
      await redis.set(`${wk}:offenderKeys`, JSON.stringify(offenders));

      // Build removal entries — mixed posts + comments
      const fakeIds: string[] = [];
      const seedCount = Math.min(week.total, 20);

      for (let i = 0; i < seedCount; i++) {
        const id = `seed-${wk}-${i}`;
        fakeIds.push(id);

        const isComment = Math.random() < week.commentRatio;
        const rule = rules[i % rules.length];
        const titlePool = isComment
          ? (commentTitles[rule] ?? [`Comment removed for ${rule}`])
          : (postTitles[rule] ?? [`Post removed for ${rule}`]);
        const title = titlePool[i % titlePool.length];

        // Spread timestamps across the week naturally (not just hourly)
        const dayOffset = Math.floor(i / 3) % 7; // group ~3 removals per day
        const hourOffset = (i % 3) * 2 + Math.floor(Math.random() * 2);
        const timestamp =
          Date.now() - dayOffset * 86400000 - hourOffset * 3600000;

        await redis.set(
          `removal:${id}`,
          JSON.stringify({
            id,
            contentType: isComment ? 'comment' : 'post',
            title,
            authorName: offenders[i % offenders.length],
            modName: mods[i % mods.length],
            removalReason: rule,
            timestamp,
          })
        );
      }

      await redis.set(`${wk}:list`, JSON.stringify(fakeIds));
    }

    return c.json<UiResponse>(
      { showToast: 'Demo data seeded! 4 weeks of posts + comments loaded.' },
      200
    );
  } catch (error) {
    console.error('[ModStat] Seed error:', error);
    return c.json<UiResponse>({ showToast: 'Seed failed — check logs' }, 400);
  }
});
