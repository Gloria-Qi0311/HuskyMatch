/** Student profile backend calls. */

import { apiRequest } from '@/lib/api';

export type ProfileInput = {
  year: string;
  major: string;
  schoolName: string;
  interests: string[];
  skills: string[];
};

/** Save profile fields collected by the onboarding wizard. */
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
