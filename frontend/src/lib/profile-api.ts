/** Student profile backend calls. */

import { apiRequest } from '@/lib/api';

export type Student = {
  userId: number;
  name: string;
  gender: string | null;
  dob: string | null;
  interests: string | null;
  city: string | null;
  country: string | null;
  major: string | null;
  year: string | null;
  skills: string[] | null;
  schoolName: string | null;
};

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

export async function fetchStudent(userId: number): Promise<Student> {
  const r = await apiRequest<StudentRaw>(`/students/${userId}`);
  return mapStudent(r);
}

export type ProfileInput = {
  year: string;
  major: string;
  schoolName: string;
  interests: string[];
  skills: string[];
};

/** Save profile fields collected by the onboarding wizard or edit screen. */
export async function updateProfile(userId: number, input: ProfileInput): Promise<void> {
  await apiRequest<{ message: string }>(`/students/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({
      year: input.year,
      major: input.major,
      school_name: input.schoolName,
      interests: input.interests.join(', '),
      skills: input.skills,
    }),
  });
}
