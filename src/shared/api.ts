// ============================================
// MODSTAT — Shared Types
// ============================================

/** Shown when a human mod removes without selecting a removal reason. */
export const REMOVAL_REASON_NONE = 'No removal reason selected';

/** AutoMod filtered to queue; not yet confirmed by a human mod. */
export const REMOVAL_REASON_AUTOMOD_PENDING = 'AutoMod (mod queue)';

/** AutoMod removal confirmed or logged as AutoMod. */
export const REMOVAL_REASON_AUTOMOD = 'AutoMod';

/** Reddit spam/filter pipeline (u/reddit). */
export const REMOVAL_REASON_REDDIT_FILTER = 'Reddit filter';

export type RemovalEntry = {
  id: string;
  redditId: string;
  contentType: 'post' | 'comment';
  title: string;
  authorName: string;
  modName: string;
  removalReason: string;
  timestamp: number;
};

export type WeeklyStats = {
  totalRemovals: number;
  byReason: Record<string, number>;
  byMod: Record<string, number>;
  byDay: Record<string, number>;
  topOffenders: Array<{ username: string; count: number }>;
  weekStart: number;
  weekEnd: number;
  postCount: number;
  commentCount: number; // ← add this
};

export type InitResponse = {
  type: 'init';
  postId: string;
  username: string;
  isMod: boolean;
  stats: WeeklyStats;
  recentRemovals: RemovalEntry[];
};

export type DigestResponse = {
  type: 'digest';
  success: boolean;
  message: string;
  conversationId?: string;
  modmailUrl?: string;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
