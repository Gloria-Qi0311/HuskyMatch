/** AI assistant backend calls. */

import { apiRequest } from '@/lib/api';

export type SuggestedStudent = {
  userId: number;
  name: string;
  major: string | null;
  year: string | null;
  schoolName: string | null;
  city: string | null;
  country: string | null;
  reason: string;
  matchScore: number | null;
  skills: string[];
  interests: string | null;
};

export type AssistantReply = {
  reply: string;
  students: SuggestedStudent[];
};

type SuggestedRaw = {
  user_id: number;
  name: string;
  major?: string | null;
  year?: string | null;
  school_name?: string | null;
  city?: string | null;
  country?: string | null;
  reason: string;
  match_score?: number | null;
  skills?: string[] | null;
  interests?: string | null;
};

type ReplyRaw = {
  reply: string;
  students: SuggestedRaw[];
};

function mapSuggested(r: SuggestedRaw): SuggestedStudent {
  return {
    userId: r.user_id,
    name: r.name,
    major: r.major ?? null,
    year: r.year ?? null,
    schoolName: r.school_name ?? null,
    city: r.city ?? null,
    country: r.country ?? null,
    reason: r.reason,
    matchScore: typeof r.match_score === 'number' ? r.match_score : null,
    skills: r.skills ?? [],
    interests: r.interests ?? null,
  };
}

export async function askAssistant(
  userId: number,
  message: string,
): Promise<AssistantReply> {
  const r = await apiRequest<ReplyRaw>('/assistant/query', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, message }),
  });
  return { reply: r.reply, students: r.students.map(mapSuggested) };
}
