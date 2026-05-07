// ============================================
// MODPULSE - Settings Forms
// ============================================

import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { redis } from '@devvit/web/server';

export const forms = new Hono();

// ── Settings form values type ─────────────
type ModPulseSettings = {
  criticalKeywords?: string;   // comma separated
  spamKeywords?: string;       // comma separated  
  criticalThreshold?: number;  // score >= this = CRITICAL (default 7)
  reviewThreshold?: number;    // score >= this = REVIEW (default 4)
  rule1Label?: string;
  rule2Label?: string;
  rule3Label?: string;
  rule4Label?: string;
  rule5Label?: string;
};

// ── Save mod settings ─────────────────────
forms.post('/save-settings', async (c) => {
  try {
    const settings = await c.req.json<ModPulseSettings>();

    // Save each setting to Redis
    if (settings.criticalKeywords !== undefined) {
      await redis.set('settings:criticalKeywords', settings.criticalKeywords);
    }
    if (settings.spamKeywords !== undefined) {
      await redis.set('settings:spamKeywords', settings.spamKeywords);
    }
    if (settings.criticalThreshold !== undefined) {
      await redis.set('settings:criticalThreshold', String(settings.criticalThreshold));
    }
    if (settings.reviewThreshold !== undefined) {
      await redis.set('settings:reviewThreshold', String(settings.reviewThreshold));
    }

    // Save rule labels (for QuickMod one-click actions)
    for (let i = 1; i <= 5; i++) {
      const key = `rule${i}Label` as keyof ModPulseSettings;
      if (settings[key] !== undefined) {
        await redis.set(`settings:rule${i}Label`, String(settings[key]));
      }
    }

    return c.json<UiResponse>(
      { showToast: '✅ ModPulse settings saved!' },
      200
    );
  } catch (error) {
    console.error('Settings save error:', error);
    return c.json<UiResponse>(
      { showToast: '❌ Failed to save settings' },
      400
    );
  }
});

// ── Load current settings ─────────────────
forms.get('/get-settings', async (c) => {
  try {
    const [
      criticalKeywords,
      spamKeywords,
      criticalThreshold,
      reviewThreshold,
      rule1, rule2, rule3, rule4, rule5,
    ] = await Promise.all([
      redis.get('settings:criticalKeywords'),
      redis.get('settings:spamKeywords'),
      redis.get('settings:criticalThreshold'),
      redis.get('settings:reviewThreshold'),
      redis.get('settings:rule1Label'),
      redis.get('settings:rule2Label'),
      redis.get('settings:rule3Label'),
      redis.get('settings:rule4Label'),
      redis.get('settings:rule5Label'),
    ]);

    return c.json({
      criticalKeywords: criticalKeywords ?? 'kill yourself, kys, doxx, address, threat',
      spamKeywords: spamKeywords ?? 'buy followers, dm for promo, onlyfans',
      criticalThreshold: criticalThreshold ? parseInt(criticalThreshold) : 7,
      reviewThreshold: reviewThreshold ? parseInt(reviewThreshold) : 4,
      rules: [
        rule1 ?? 'Rule 1: No spam',
        rule2 ?? 'Rule 2: No harassment',
        rule3 ?? 'Rule 3: No doxxing',
        rule4 ?? 'Rule 4: No misinformation',
        rule5 ?? 'Rule 5: Other violation',
      ],
    }, 200);
  } catch (error) {
    console.error('Settings load error:', error);
    return c.json({ error: 'Failed to load settings' }, 400);
  }
});