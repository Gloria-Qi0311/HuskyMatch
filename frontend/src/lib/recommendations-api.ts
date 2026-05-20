/** Recommendations backend calls. */

import { apiRequest } from '@/lib/api';

export type Recommendation = {
  userId: number;
  name: string;
  major: string | null;
  year: string | null;
  schoolName: string | null;
  city: string | null;
  country: string | null;
  skills: string[];
  interests: string | null;
  matchScore: number;
  reason: string;
};

type RecRaw = {
  user_id: number;
  name: string;
  major?: string | null;
  year?: string | null;
  school_name?: string | null;
  city?: string | null;
  country?: string | null;
  skills?: string[] | null;
  interests?: string | null;
  match_score?: number | null;
  reason?: string | null;
  match?: string | null;
};

function mapRec(r: RecRaw): Recommendation {
  return {
    userId: r.user_id,
    name: r.name,
    major: r.major ?? null,
    year: r.year ?? null,
    schoolName: r.school_name ?? null,
    city: r.city ?? null,
    country: r.country ?? null,
    skills: r.skills ?? [],
    interests: r.interests ?? null,
    matchScore: typeof r.match_score === 'number' ? r.match_score : 0,
    reason: r.reason ?? r.match ?? '',
  };
}

export async function fetchRecommendations(
  userId: number,
  limit = 10,
): Promise<Recommendation[]> {
  const r = await apiRequest<{ results: RecRaw[] }>(
    `/recommendations/${userId}?limit=${limit}`,
  );
  return r.results.map(mapRec);
}
