import { API_BASE } from "../lib/api";

const BASE_URL = (API_BASE || "").replace(/\/$/, "");

async function handleResponse(res) {
  const text = await res.text();
  if (!res.ok) {
    let message = text || `HTTP ${res.status}`;
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (parsed?.detail) message = parsed.detail;
      } catch (err) {
        message = text;
      }
    }
    throw new Error(message);
  }
  return text ? JSON.parse(text) : {};
}

export async function createPost({ authorId, body, file }) {
  const formData = new FormData();
  formData.append("author_id", String(authorId));
  formData.append("body", body || "");
  if (file) formData.append("file", file);
  const res = await fetch(`${BASE_URL}/posts/create`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

export async function fetchFeed(viewerId, limit = 20, offset = 0) {
  const res = await fetch(
    `${BASE_URL}/posts/feed?viewer_id=${encodeURIComponent(
      viewerId
    )}&limit=${limit}&offset=${offset}`
  );
  return handleResponse(res);
}

export async function toggleLike(postId, userId) {
  const res = await fetch(`${BASE_URL}/posts/${postId}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  return handleResponse(res);
}

export async function toggleSave(postId, userId) {
  const res = await fetch(`${BASE_URL}/posts/${postId}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  return handleResponse(res);
}

export async function fetchComments(postId, viewerId) {
  const url = viewerId
    ? `${BASE_URL}/posts/${postId}/comments?viewer_id=${viewerId}`
    : `${BASE_URL}/posts/${postId}/comments`;
  const res = await fetch(url);
  return handleResponse(res);
}

export async function createComment(postId, userId, body) {
  const res = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, body }),
  });
  return handleResponse(res);
}

export async function deletePost(postId, userId) {
  const res = await fetch(`${BASE_URL}/posts/${postId}?user_id=${userId}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

export async function fetchSavedPosts(userId) {
  const res = await fetch(`${BASE_URL}/posts/saved?user_id=${userId}`);
  return handleResponse(res);
}
