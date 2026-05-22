// ============================================
// MODSTAT — Shared Types
// ============================================

export type RemovalEntry = {
  id: string;
  redditId: string;
  contentType: 'post';
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
