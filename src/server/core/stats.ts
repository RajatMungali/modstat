import { redis } from '@devvit/web/server';
import type { RemovalEntry, WeeklyStats, AutomodStats } from '../../shared/api';
import {
  REMOVAL_REASON_AUTOMOD,
  REMOVAL_REASON_AUTOMOD_PENDING,
} from '../../shared/api';
import { listGet } from './redis-list';
import { WEEK_DAY_NAMES } from './week';

type StoredEntry = RemovalEntry & { reasonFinal?: boolean };

function isAutomodMod(modName: string): boolean {
  const l = modName.toLowerCase();
  return l === 'automoderator' || l === 'reddit';
}

export async function buildWeeklyStats(weekKey: string): Promise<WeeklyStats> {
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
  for (const day of WEEK_DAY_NAMES) {
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

  // ── Scan entries for type counts + manual/automod split ──────────────
  const removalIds = await listGet(`${weekKey}:list`);
  let postCount = 0;
  let commentCount = 0;
  let falsePositiveCount = 0;
  const manualReasons: Record<string, number> = {};
  const automodReasons: Record<string, number> = {};

  for (const id of removalIds) {
    const raw = await redis.get(`removal:${id}`).catch(() => null);
    if (!raw) continue;
    try {
      const entry = JSON.parse(raw) as StoredEntry;

      // skip approved entries from counts — they were reversed
      if (entry.approved) {
        if (isAutomodMod(entry.modName)) falsePositiveCount++;
        continue;
      }

      if (entry.contentType === 'post') postCount++;
      else if (entry.contentType === 'comment') commentCount++;

      if (isAutomodMod(entry.modName)) {
        const key = entry.removalReason;
        automodReasons[key] = (automodReasons[key] ?? 0) + 1;
      } else {
        const key = entry.removalReason;
        manualReasons[key] = (manualReasons[key] ?? 0) + 1;
      }
    } catch {}
  }

  // Total excludes approved entries (they were reversed)
  const totalRemovals = postCount + commentCount;

  const automodTotal = Object.values(automodReasons).reduce((a, b) => a + b, 0);
  // false positive rate = approved automod entries / (active automod + approved automod)
  const automodDenominator = automodTotal + falsePositiveCount;
  const falsePositiveRate =
    automodDenominator > 0 ? falsePositiveCount / automodDenominator : 0;

  const automodStats: AutomodStats = {
    totalRemovals: automodTotal,
    byReason: automodReasons,
    falsePositiveCount,
    falsePositiveRate,
  };

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
    byReason, // kept for digest/backwards compat
    manualReasons,
    automodStats,
    byMod,
    byDay,
    topOffenders: offenderList.slice(0, 10),
    weekStart: weekStart.getTime(),
    weekEnd: weekEnd.getTime(),
    postCount,
    commentCount,
  };
}
