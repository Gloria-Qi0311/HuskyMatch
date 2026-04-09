import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";
import { API_BASE } from "../lib/api";

export default function ChatAssistantPage() {
  const userId = useMemo(
    () =>
      typeof window !== "undefined"
        ? localStorage.getItem("huskyconnect_user_id")
        : null,
    []
  );
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      content: "Hi! I'm the HuskyConnect assistant. Ask me who you should meet or collaborate with.",
      students: [],
    },
  ]);
  const [input, setInput] = useState("");
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!userId) {
      setError("Please sign in to chat with the assistant.");
      return;
    }
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const base = API_BASE.replace(/\/$/, "");
      const res = await fetch(`${base}/assistant/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(userId),
          message: trimmed,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = `HTTP ${res.status}`;
        if (text) {
          try {
            const parsed = JSON.parse(text);
            if (parsed?.detail) message = parsed.detail;
            else if (typeof parsed === "string") message = parsed;
          } catch {
            message = text;
          }
        }
        throw new Error(message);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "I couldn't generate a response that time.",
          students: Array.isArray(data.students) ? data.students : [],
        },
      ]);
    } catch (err) {
      setError(err.message || "Failed to contact the assistant.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't reply just now. Please try again in a moment.",
          students: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">AI Chat Assistant</h1>
          <p className="text-sm text-slate-600 mt-1">
            Ask for peer recommendations, club suggestions, or collaborators tailored to your goals.
          </p>
        </div>

        {!userId && (
          <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 text-sm p-4 rounded-2xl">
            You need to create an account or sign in to use the chat assistant.
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 text-sm p-3 rounded-2xl">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 min-h-[400px] flex flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pr-2">
            {messages.map((msg, idx) => (
              <div key={idx} className="space-y-2">
                <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`px-4 py-2 rounded-2xl max-w-xs ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white ml-auto"
                        : "bg-slate-100 text-slate-800 mr-auto"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
                {msg.role === "assistant" && Array.isArray(msg.students) && msg.students.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {msg.students.map((s) => {
                      const interestsText = formatList(s.interests);
                      const skillsText = formatList(s.skills);
                      const scoreText = formatScore(s.match_score);
                      return (
                        <div
                          key={`${idx}-${s.user_id}`}
                          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm text-sm space-y-1"
                        >
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-xs text-slate-500">
                            {[
                              s.major,
                              s.year,
                              s.school_name,
                              [s.city, s.country].filter(Boolean).join(" • "),
                            ]
                              .filter(Boolean)
                              .join(" • ") || "Profile info updating"}
                          </div>
                          {interestsText && (
                            <div className="text-xs text-slate-500">
                              <span className="font-semibold text-slate-600">Interests:</span>{" "}
                              {interestsText}
                            </div>
                          )}
                          {skillsText && (
                            <div className="text-xs text-slate-500">
                              <span className="font-semibold text-slate-600">Skills:</span>{" "}
                              {skillsText}
                            </div>
                          )}
                          {scoreText && (
                            <div className="text-[11px] font-semibold text-purple-700">
                              Match strength: {scoreText}%
                            </div>
                          )}
                          <div className="text-xs text-slate-600">{s.reason}</div>
                          <div className="flex gap-3 text-[11px] font-semibold pt-1">
                            <Link to={`/students/${s.user_id}`} className="text-purple-700 hover:underline">
                              View profile
                            </Link>
                            <Link to={`/messages/${s.user_id}`} className="text-slate-700 hover:underline">
                              Message
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={handleSend} className="flex flex-col gap-3">
            <textarea
              className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              rows={3}
              placeholder="Ask anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!userId || loading}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!userId || loading}
                className="inline-flex items-center gap-2 bg-purple-700 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
