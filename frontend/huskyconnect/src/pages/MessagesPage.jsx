import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";
import { fetchThreads } from "../api/messages";

export default function MessagesPage() {
  const userId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("huskyconnect_user_id");
    const parsed = stored ? parseInt(stored, 10) : null;
    return Number.isFinite(parsed) ? parsed : null;
  }, []);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadThreads = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await fetchThreads(userId);
        if (mounted) {
          setThreads(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load message threads.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadThreads();
    return () => {
      mounted = false;
    };
  }, [userId]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-slate-600 mt-1">
            Continue your conversations with HuskyConnect peers.
          </p>
        </div>
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 text-sm p-3 rounded-2xl">
            {error}
          </div>
        )}
        <section className="space-y-3">
          {loading ? (
            <div className="text-sm text-slate-500">Loading threads…</div>
          ) : threads.length === 0 ? (
            <div className="text-sm text-slate-500">No conversations yet.</div>
          ) : (
            threads.map((thread) => (
              <Link
                key={thread.other_user_id}
                to={`/messages/${thread.other_user_id}`}
                className="block rounded-3xl border border-slate-200 bg-white p-4 hover:border-purple-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">{thread.other_name}</div>
                    <div className="text-xs text-slate-500 line-clamp-1">
                      {thread.last_message_body || "Start the conversation."}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {thread.last_message_time
                      ? new Date(thread.last_message_time).toLocaleString()
                      : ""}
                  </div>
                </div>
              </Link>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
