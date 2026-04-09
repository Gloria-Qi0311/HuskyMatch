import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";
import { API_BASE } from "../lib/api";

export default function RecommendationsPage() {
  const userId = useMemo(
    () =>
      typeof window !== "undefined"
        ? localStorage.getItem("huskyconnect_user_id")
        : null,
    []
  );
  const [results, setResults] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const formatScore = (score) => {
    if (typeof score !== "number" || Number.isNaN(score)) return null;
    return Math.max(0, Math.min(100, score)).toFixed(1);
  };
  const formatList = (value) => {
    if (!value) return "";
    return Array.isArray(value) ? value.filter(Boolean).join(", ") : value;
  };

  useEffect(() => {
    if (!userId) {
      setError("No user ID found. Create an account first.");
      return;
    }
    setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    fetchRecs(userId, offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, offset]);

  async function fetchRecs(id, currentOffset = 0) {
    setLoading(true);
    setError("");
    try {
      const base = API_BASE.replace(/\/$/, "");
      const res = await fetch(`${base}/recommendations/${id}?limit=5&offset=${currentOffset}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      setError(e.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = () => {
    if (!userId) {
      setError("No user selected. Please create an account first.");
      return;
    }
    setOffset((prev) => prev + 5);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav />
      <main className="max-w-5xl mx-auto px-4 py-12 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Recommendations</h1>
            <p className="text-sm text-slate-600">
              Based on shared interests and overlapping details from your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-purple-700 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 text-sm p-3 rounded-xl">
            {error}
          </div>
        )}

        {!error && !userId && (
          <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 text-sm p-3 rounded-xl">
            No user selected. Please create an account first.
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          {loading ? (
            <div className="text-sm text-slate-600">Loading recommendations...</div>
          ) : results.length === 0 ? (
            <div className="text-sm text-slate-600">
              {error ? "Unable to load recommendations." : "No recommendations yet."}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {results.map((r) => (
                <li key={r.user_id} className="py-4 flex flex-col gap-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-base">{r.name}</div>
                      <div className="text-xs text-slate-500">
                        {[r.major, r.year].filter(Boolean).join(" • ") || "No academic info"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {[r.school_name, r.city, r.country].filter(Boolean).join(" • ")}
                      </div>
                    </div>
                    {formatScore(r.match_score) && (
                      <div className="text-xs font-semibold text-purple-700">
                        Match strength: {formatScore(r.match_score)}%
                      </div>
                    )}
                  </div>
                  {r.match && (
                    <div className="text-xs text-slate-600 leading-relaxed">{r.match}</div>
                  )}
                  {formatList(r.interests) && (
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-600">Interests:</span>{" "}
                      {formatList(r.interests)}
                    </div>
                  )}
                  {formatList(r.skills) && (
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-600">Skills:</span>{" "}
                      {formatList(r.skills)}
                    </div>
                  )}
                  <div className="flex gap-3 mt-2 text-xs font-semibold">
                    <Link to={`/students/${r.user_id}`} className="text-purple-700 hover:underline">
                      View profile
                    </Link>
                    <Link to={`/messages/${r.user_id}`} className="text-slate-700 hover:underline">
                      Message
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
