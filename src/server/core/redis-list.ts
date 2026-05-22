import { redis } from '@devvit/web/server';

export async function listGet(key: string): Promise<string[]> {
  const current = await redis.get(key);
  return current ? JSON.parse(current) : [];
}

export async function listPush(key: string, value: string): Promise<void> {
  const current = await redis.get(key);
  const arr: string[] = current ? JSON.parse(current) : [];
  arr.unshift(value);
  if (arr.length > 200) arr.splice(200);
  await redis.set(key, JSON.stringify(arr));
}
