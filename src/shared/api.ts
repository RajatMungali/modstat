export const REMOVAL_REASON_NONE = 'No removal reason selected';
export const REMOVAL_REASON_AUTOMOD_PENDING = 'AutoMod (mod queue)';
export const REMOVAL_REASON_AUTOMOD = 'AutoMod';
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
  approved?: boolean; // ← new: true when approvelink fires
  approvedAt?: number; // ← new: timestamp of approval
};

export type AutomodStats = {
  totalRemovals: number;
  byReason: Record<string, number>;
  falsePositiveCount: number;
  falsePositiveRate: number; // 0–1
};

export type WeeklyStats = {
  totalRemovals: number;
  byReason: Record<string, number>;
  manualReasons: Record<string, number>; // ← new: human mod removals only
  automodStats: AutomodStats; // ← new: automod breakdown
  byMod: Record<string, number>;
  byDay: Record<string, number>;
  topOffenders: Array<{ username: string; count: number }>;
  weekStart: number;
  weekEnd: number;
  postCount: number;
  commentCount: number;
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
