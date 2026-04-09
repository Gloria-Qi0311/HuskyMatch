import { useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";
import { API_BASE } from "../lib/api";

export default function StudentSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const base = API_BASE.replace(/\/$/, "");
      const res = await fetch(`${base}/students/search?query=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to search students.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Student directory</h1>
          <p className="text-sm text-slate-600 mt-1">
            Search HuskyConnect students by name, major, interests, or skills.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, major, interests, or skills..."
            className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-purple-700 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 text-sm p-3 rounded-2xl">
            {error}
          </div>
        )}

        <section className="space-y-4">
          {results.map((student) => (
            <div
              key={student.user_id}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-lg font-semibold">{student.name}</div>
                  <div className="text-sm text-slate-500">
                    {[student.major, student.year].filter(Boolean).join(" • ") || "Major/year not set"}
                  </div>
                  <div className="text-sm text-slate-500">
                    {[student.city || "Unknown city", student.country || "Unknown country"]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {student.interests || "No interests added yet."}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link
                    to={`/students/${student.user_id}`}
                    className="inline-flex items-center justify-center bg-purple-700 text-white px-4 py-2 rounded-2xl text-sm font-semibold shadow hover:brightness-110"
                  >
                    View profile
                  </Link>
                  <Link
                    to={`/messages/${student.user_id}`}
                    className="inline-flex items-center justify-center border border-slate-300 px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-slate-50"
                  >
                    Message
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {!loading && results.length === 0 && query.trim() && !error && (
            <div className="text-sm text-slate-500">No students matched “{query.trim()}”.</div>
          )}
        </section>
      </main>
    </div>
  );
}
