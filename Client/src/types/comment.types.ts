export type Comment = {
  id: number;
  prayerId: number;
  parentId: number | null;
  threadRootId: number | null;
  depth: number;
  authorId: number;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

export type RootThread = {
  root: Comment;
  repliesPreview: Comment[];
  hasMoreReplies: boolean;
};

export type ListRootThreadsResponse = {
  items: RootThread[];
  cursor: string | null;
  hasMore: boolean;
  commentCount: number;
  lastCommentAt: string | null;
  isCommentsClosed: boolean;
};

export type ListRepliesResponse = {
  items: Comment[];
  cursor: string | null;
  hasMore: boolean;
};

export type SearchCommentsResponse = {
  items: Array<{ prayerId: number; title: string; matchedIn: string[]; snippet: string | null }>;
  cursor: string | null;
  hasMore: boolean;
};
