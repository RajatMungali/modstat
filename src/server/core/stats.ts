import { redis } from '@devvit/web/server';
import type { RemovalEntry, WeeklyStats } from '../../shared/api';
import { listGet } from './redis-list';
import { WEEK_DAY_NAMES } from './week';

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

  const totalRemovals = Object.values(byReason).reduce((a, b) => a + b, 0);

  const removalIds = await listGet(`${weekKey}:list`);
  let postCount = 0;
  let commentCount = 0;

  for (const id of removalIds) {
    const raw = await redis.get(`removal:${id}`).catch(() => null);
    if (!raw) continue;
    try {
      const entry = JSON.parse(raw) as RemovalEntry;
      if (entry.contentType === 'post') postCount++;
      else if (entry.contentType === 'comment') commentCount++;
    } catch {}
  }

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
    commentCount,
  };
}
