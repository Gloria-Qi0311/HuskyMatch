import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import TopNav from "../components/TopNav";
import { API_BASE } from "../lib/api";

export default function StudentProfilePage() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const base = API_BASE.replace(/\/$/, "");
        const res = await fetch(`${base}/students/${id}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setStudent(data);
      } catch (err) {
        setError(err.message || "Failed to load student profile.");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProfile();
    }
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        {loading ? (
          <div className="text-slate-600">Loading profile...</div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 border border-red-200 text-sm p-3 rounded-2xl">
            {error}
          </div>
        ) : student ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">{student.name}</h1>
                <p className="text-sm text-slate-600 mt-1">
                  {[student.major, student.year].filter(Boolean).join(" • ") || "Major/year not set"}
                </p>
                <p className="text-sm text-slate-600">
                  {[student.school_name, student.city, student.country].filter(Boolean).join(" • ")}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/messages/${student.user_id}`}
                  className="inline-flex items-center gap-2 bg-purple-700 text-white px-4 py-2 rounded-2xl text-sm font-semibold shadow hover:brightness-110"
                >
                  Message
                </Link>
              </div>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-slate-800">Interests</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {student.interests || "No interests provided yet."}
                </p>
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">Skills</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(Array.isArray(student.skills) ? student.skills : []).length > 0 ? (
                    student.skills.map((skill, idx) => (
                      <span
                        key={`${skill}-${idx}`}
                        className="text-xs border border-slate-300 rounded-full px-2 py-0.5 text-slate-600"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No skills listed yet.</span>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
