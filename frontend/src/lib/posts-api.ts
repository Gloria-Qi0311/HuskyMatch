/** Posts / feed backend calls. */

import { API_URL, ApiError, apiRequest } from '@/lib/api';

export type Post = {
  id: number;
  authorId: number;
  authorName: string;
  authorSchool: string | null;
  body: string | null;
  mediaUrl: string | null;
  mediaName: string | null;
  mediaMime: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
};

export type Comment = {
  id: number;
  postId: number;
  userId: number;
  userName: string;
  userSchool: string | null;
  body: string;
  createdAt: string;
};

type PostRaw = {
  id: number;
  author_id: number;
  author_name: string;
  author_school?: string | null;
  body?: string | null;
  media_url?: string | null;
  media_name?: string | null;
  media_mime?: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  save_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
};

type CommentRaw = {
  id: number;
  post_id: number;
  user_id: number;
  user_name: string;
  user_school?: string | null;
  body: string;
  created_at: string;
};

function mapPost(r: PostRaw): Post {
  return {
    id: r.id,
    authorId: r.author_id,
    authorName: r.author_name,
    authorSchool: r.author_school ?? null,
    body: r.body ?? null,
    mediaUrl: r.media_url ?? null,
    mediaName: r.media_name ?? null,
    mediaMime: r.media_mime ?? null,
    createdAt: r.created_at,
    likeCount: r.like_count,
    commentCount: r.comment_count,
    saveCount: r.save_count,
    likedByMe: r.liked_by_me,
    savedByMe: r.saved_by_me,
  };
}

function mapComment(r: CommentRaw): Comment {
  return {
    id: r.id,
    postId: r.post_id,
    userId: r.user_id,
    userName: r.user_name,
    userSchool: r.user_school ?? null,
    body: r.body,
    createdAt: r.created_at,
  };
}

export async function fetchFeed(viewerId: number, limit = 50): Promise<Post[]> {
  const r = await apiRequest<{ posts: PostRaw[] }>(
    `/posts/feed?viewer_id=${viewerId}&limit=${limit}`,
  );
  return r.posts.map(mapPost);
}

export type CreatePostInput = {
  authorId: number;
  body: string;
  media?: { uri: string; name: string; mime: string };
};

export async function createPost(input: CreatePostInput): Promise<Post> {
  const fd = new FormData();
  fd.append('author_id', String(input.authorId));
  fd.append('body', input.body);
  if (input.media) {
    fd.append('file', {
      uri: input.media.uri,
      name: input.media.name,
      type: input.media.mime,
    } as unknown as Blob);
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}/posts/create`, { method: 'POST', body: fd });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection.');
  }
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data
        ? (data as { detail: unknown }).detail
        : null;
    throw new ApiError(res.status, typeof detail === 'string' ? detail : 'Could not post.');
  }
  return mapPost(data as PostRaw);
}

export async function toggleLike(
  postId: number,
  userId: number,
): Promise<{ liked: boolean; likeCount: number }> {
  const r = await apiRequest<{ liked: boolean; like_count: number }>(
    `/posts/${postId}/like`,
    { method: 'POST', body: JSON.stringify({ user_id: userId }) },
  );
  return { liked: r.liked, likeCount: r.like_count };
}

export async function toggleSave(
  postId: number,
  userId: number,
): Promise<{ saved: boolean; saveCount: number }> {
  const r = await apiRequest<{ saved: boolean; save_count: number }>(
    `/posts/${postId}/save`,
    { method: 'POST', body: JSON.stringify({ user_id: userId }) },
  );
  return { saved: r.saved, saveCount: r.save_count };
}

export async function fetchComments(postId: number): Promise<Comment[]> {
  const r = await apiRequest<{ comments: CommentRaw[] }>(`/posts/${postId}/comments`);
  return r.comments.map(mapComment);
}

export async function addComment(
  postId: number,
  userId: number,
  body: string,
): Promise<Comment> {
  const r = await apiRequest<CommentRaw>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, body }),
  });
  return mapComment(r);
}
