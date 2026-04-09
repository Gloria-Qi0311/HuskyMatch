import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import TopNav from "../components/TopNav";
import { API_BASE } from "../lib/api";
import ChatWindow from "../components/ChatWindow";

export default function DirectMessagePage() {
  const { otherId: otherIdParam } = useParams();
  const userId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("huskyconnect_user_id");
    const parsed = stored ? parseInt(stored, 10) : null;
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  const otherId = useMemo(() => {
    if (!otherIdParam) return null;
    const parsed = parseInt(otherIdParam, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [otherIdParam]);

  const [otherStudent, setOtherStudent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setOtherStudent(null);
    if (!otherId) return;
    const base = API_BASE.replace(/\/$/, "");
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${base}/students/${otherId}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        setOtherStudent(await res.json());
        setError("");
      } catch (err) {
        setError(err.message || "Failed to load student.");
      }
    };
    fetchProfile();
  }, [otherId]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {otherStudent ? otherStudent.name : "Direct messages"}
          </h1>
          {otherStudent && (
            <p className="text-sm text-slate-600">
              {[otherStudent.major, otherStudent.year].filter(Boolean).join(" • ") ||
                "HuskyConnect student"}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 text-sm p-3 rounded-2xl">
            {error}
          </div>
        )}

        <ChatWindow
          userId={userId}
          otherId={otherId}
          otherStudent={otherStudent}
        />
      </main>
    </div>
  );
}
