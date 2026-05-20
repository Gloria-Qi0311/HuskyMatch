/** Student search backend call. */

import { apiRequest } from '@/lib/api';
import type { Student } from '@/lib/profile-api';

type StudentRaw = {
  user_id: number;
  name: string;
  gender?: string | null;
  dob?: string | null;
  interests?: string | null;
  city?: string | null;
  country?: string | null;
  major?: string | null;
  year?: string | null;
  skills?: string[] | null;
  school_name?: string | null;
};

function mapStudent(r: StudentRaw): Student {
  return {
    userId: r.user_id,
    name: r.name,
    gender: r.gender ?? null,
    dob: r.dob ?? null,
    interests: r.interests ?? null,
    city: r.city ?? null,
    country: r.country ?? null,
    major: r.major ?? null,
    year: r.year ?? null,
    skills: r.skills ?? null,
    schoolName: r.school_name ?? null,
  };
}

export async function searchStudents(query: string, limit = 25): Promise<Student[]> {
  const cleaned = query.trim();
  if (!cleaned) return [];
  const params = new URLSearchParams({ query: cleaned, limit: String(limit) });
  const rows = await apiRequest<StudentRaw[]>(`/students/search?${params.toString()}`);
  return rows.map(mapStudent);
}
