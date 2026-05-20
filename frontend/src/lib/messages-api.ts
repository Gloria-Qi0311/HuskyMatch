/** Direct messages backend calls. */

import { apiRequest } from '@/lib/api';

export type MessageType = 'text' | 'image' | 'gif' | 'file';

export type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  messageType: MessageType;
  body: string | null;
  mediaUrl: string | null;
  mediaName: string | null;
  mediaMime: string | null;
  createdAt: string;
};

export type ThreadSummary = {
  otherUserId: number;
  otherName: string;
  lastMessageBody: string;
  lastMessageTime: string | null;
};

type MessageRaw = {
  id: number;
  sender_id: number;
  receiver_id: number;
  message_type?: string | null;
  body?: string | null;
  media_url?: string | null;
  media_name?: string | null;
  media_mime?: string | null;
  created_at: string | null;
};

type ThreadRaw = {
  other_user_id: number;
  other_name: string;
  last_message_body: string;
  last_message_time: string | null;
};

function asMessageType(value: string | null | undefined): MessageType {
  if (value === 'image' || value === 'gif' || value === 'file') return value;
  return 'text';
}

function mapMessage(r: MessageRaw): Message {
  return {
    id: r.id,
    senderId: r.sender_id,
    receiverId: r.receiver_id,
    messageType: asMessageType(r.message_type),
    body: r.body ?? null,
    mediaUrl: r.media_url ?? null,
    mediaName: r.media_name ?? null,
    mediaMime: r.media_mime ?? null,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

function mapThread(r: ThreadRaw): ThreadSummary {
  return {
    otherUserId: r.other_user_id,
    otherName: r.other_name,
    lastMessageBody: r.last_message_body,
    lastMessageTime: r.last_message_time ?? null,
  };
}

export async function listThreads(userId: number): Promise<ThreadSummary[]> {
  const rows = await apiRequest<ThreadRaw[]>(`/messages/threads/${userId}`);
  return rows.map(mapThread);
}

export async function fetchThread(userId: number, otherId: number): Promise<Message[]> {
  const r = await apiRequest<{ messages: MessageRaw[] }>(
    `/messages/thread?user_id=${userId}&other_id=${otherId}`,
  );
  return r.messages.map(mapMessage);
}

export async function sendMessage(
  senderId: number,
  receiverId: number,
  body: string,
): Promise<Message> {
  const r = await apiRequest<MessageRaw>('/messages/send', {
    method: 'POST',
    body: JSON.stringify({ sender_id: senderId, receiver_id: receiverId, body }),
  });
  return mapMessage(r);
}
