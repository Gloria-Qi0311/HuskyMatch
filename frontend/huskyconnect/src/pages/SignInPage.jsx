import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";

const requiredProfileFields = [
  "interests",
  "city",
  "country",
  "major",
  "year",
  "school_name",
  "gender",
  "dob",
];

function isProfileComplete(profile) {
  if (!profile) return false;
  for (const field of requiredProfileFields) {
    const value = profile[field];
    if (!value || (typeof value === "string" && !value.trim())) {
      return false;
    }
  }
  const skills = profile.skills;
  if (!Array.isArray(skills) || skills.length === 0) {
    return false;
  }
  return true;
}

export default function SignInPage() {
  const navigate = useNavigate();
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");

    if (!loginName.trim() || !loginPassword) {
      setError("Please enter both name and password.");
      return;
    }

    setLoading(true);
    try {
      const base = API_BASE.replace(/\/$/, "");
      const res = await fetch(`${base}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: loginName.trim(),
          password: loginPassword,
        }),
      });

      const text = await res.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // ignore
        }
      }

      if (!res.ok) {
        const msg =
          (data && data.detail) ||
          (typeof data === "string" ? data : "") ||
          `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const userId = data?.user_id;
      if (!userId) {
        throw new Error("Login response missing user ID.");
      }

      localStorage.setItem("huskyconnect_user_id", String(userId));
      localStorage.setItem("huskyconnect_name", data.name || loginName.trim());

      let profileComplete = false;
      try {
        const profileRes = await fetch(`${base}/students/${userId}`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          profileComplete = isProfileComplete(profileData);
        }
      } catch {
        profileComplete = false;
      }

      if (profileComplete) {
        navigate("/home");
      } else {
        navigate("/profile");
      }
    } catch (err) {
      setError(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Sign in to HuskyConnect</h1>
          <p className="text-sm text-slate-600 mt-2">
            Use the same name and password you used during sign-up.
          </p>
        </div>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="Exact name used at signup"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-purple-700 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="text-sm text-slate-600 mt-6 text-center">
          New here?{" "}
          <Link to="/signup" className="text-purple-700 font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
