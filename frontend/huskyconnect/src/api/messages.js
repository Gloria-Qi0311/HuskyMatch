import { API_BASE } from "../lib/api";

const BASE_URL = (API_BASE || "").replace(/\/$/, "");

function handleResponse(res) {
  return res.text().then((text) => {
    if (!res.ok) {
      const message = text
        ? (() => {
            try {
              const parsed = JSON.parse(text);
              if (parsed?.detail) return parsed.detail;
              if (typeof parsed === "string") return parsed;
            } catch (_) {
              return text;
            }
            return text;
          })()
        : `HTTP ${res.status}`;
      throw new Error(message);
    }
    return text ? JSON.parse(text) : {};
  });
}

export async function fetchThreads(userId) {
  if (!userId) throw new Error("Missing user ID");
  const res = await fetch(`${BASE_URL}/messages/threads/${userId}`);
  return handleResponse(res);
}

export async function fetchThread(userId, otherId) {
  if (!userId || !otherId) throw new Error("Missing user or conversation ID");
  const res = await fetch(
    `${BASE_URL}/messages/thread?user_id=${encodeURIComponent(userId)}&other_id=${encodeURIComponent(otherId)}`
  );
  const data = await handleResponse(res);
  return Array.isArray(data.messages) ? data.messages : [];
}

export async function sendTextMessage({ senderId, receiverId, body }) {
  if (!senderId || !receiverId) throw new Error("Missing sender or receiver");
  const res = await fetch(`${BASE_URL}/messages/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender_id: senderId,
      receiver_id: receiverId,
      body,
    }),
  });
  return handleResponse(res);
}

export async function sendMediaMessage({ senderId, receiverId, file }) {
  if (!senderId || !receiverId) throw new Error("Missing sender or receiver");
  if (!file) throw new Error("No file selected");
  const formData = new FormData();
  formData.append("sender_id", String(senderId));
  formData.append("receiver_id", String(receiverId));
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/messages/send-media`, {
    method: "POST",
    body: formData,
  });
  const data = await handleResponse(res);
  // Endpoint returns the message object directly.
  return data?.message || data;
}
