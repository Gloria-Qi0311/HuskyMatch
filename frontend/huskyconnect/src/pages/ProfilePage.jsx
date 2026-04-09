import { useEffect, useMemo, useState } from "react";
import TopNav from "../components/TopNav";
import { API_BASE } from "../lib/api";
import { fetchSavedPosts } from "../api/posts";
import PostCard from "../components/PostCard";
import MediaModal from "../components/MediaModal";

const defaultForm = {
  name: "",
  bio: "",
  major: "",
  year: "",
  school_name: "",
  dob: "",
  gender: "",
  city: "",
  country: "",
  interests: "",
  skillsText: "",
};

export default function ProfilePage() {
  const userId = useMemo(
    () =>
      typeof window !== "undefined"
        ? localStorage.getItem("huskyconnect_user_id")
        : null,
    []
  );

  const [form, setForm] = useState(defaultForm);
  const [originalForm, setOriginalForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [savedPosts, setSavedPosts] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState("");
  const [selectedMediaUrl, setSelectedMediaUrl] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setError("No user logged in. Please create an account or sign in first.");
        setLoading(false);
        return;
      }

      const base = API_BASE.replace(/\/$/, "");
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${base}/students/${userId}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const hydrated = {
          name: data.name || "",
          bio: "",
          major: data.major || "",
          year: data.year || "",
          school_name: data.school_name || "",
          dob: data.dob ? String(data.dob).substring(0, 10) : "",
          gender: data.gender || "",
          city: data.city || "",
          country: data.country || "",
          interests: data.interests || "",
          skillsText: Array.isArray(data.skills) ? data.skills.join(", ") : "",
        };
        setForm(hydrated);
        setOriginalForm(hydrated);
        setSuccess("");
        setIsEditing(false);
      } catch (err) {
        setError(err.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!userId) {
      setError("No user logged in.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    const base = API_BASE.replace(/\/$/, "");
    const skillsArray = form.skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: form.name || undefined,
      gender: form.gender || undefined,
      dob: form.dob || undefined,
      interests: form.interests || undefined,
      city: form.city || undefined,
      country: form.country || undefined,
      major: form.major || undefined,
      year: form.year || undefined,
      school_name: form.school_name || undefined,
      skills: skillsArray.length ? skillsArray : undefined,
    };

    try {
      const res = await fetch(`${base}/students/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

      await res.json().catch(() => null);
      setSuccess("Profile updated successfully.");
      setOriginalForm({ ...form });
      setIsEditing(false);
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(originalForm);
    setIsEditing(false);
    setError("");
    setSuccess("");
  };

  useEffect(() => {
    if (activeTab !== "saved" || !userId) return;
    setSavedLoading(true);
    setSavedError("");
    fetchSavedPosts(userId)
      .then((data) => {
        const posts =
          data.posts?.map((post) => ({
            ...post,
            comments: [],
            commentsLoaded: false,
            showComments: false,
            commentsLoading: false,
          })) || [];
        setSavedPosts(posts);
      })
      .catch((err) => setSavedError(err.message || "Failed to load saved posts."))
      .finally(() => setSavedLoading(false));
  }, [activeTab, userId]);

  useEffect(() => {
    const handleRefresh = () => {
      if (activeTab === "saved" && userId) {
        setSavedLoading(true);
        fetchSavedPosts(userId)
          .then((data) => {
            const posts =
              data.posts?.map((post) => ({
                ...post,
                comments: [],
                commentsLoaded: false,
                showComments: false,
                commentsLoading: false,
              })) || [];
            setSavedPosts(posts);
          })
          .catch((err) => setSavedError(err.message || "Failed to load saved posts."))
          .finally(() => setSavedLoading(false));
      }
    };
    window.addEventListener("huskySavedPostsUpdate", handleRefresh);
    return () => window.removeEventListener("huskySavedPostsUpdate", handleRefresh);
  }, [activeTab, userId]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile</h1>
          {!loading && userId && !isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setSuccess("");
              }}
              className="inline-flex items-center gap-2 bg-purple-700 text-white px-4 py-2 rounded-2xl text-sm font-semibold shadow hover:brightness-110"
            >
              Edit profile
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-2xl text-sm font-semibold ${
              activeTab === "profile"
                ? "bg-purple-700 text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={`px-4 py-2 rounded-2xl text-sm font-semibold ${
              activeTab === "saved"
                ? "bg-purple-700 text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            Saved
          </button>
        </div>

        {loading ? (
          <div className="text-slate-600">Loading profile...</div>
        ) : !userId ? (
          <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 text-sm p-4 rounded-2xl">
            No user logged in. Please create an account or sign in first.
          </div>
        ) : activeTab === "profile" ? (
          <>
            <Section title="About you">
              <TextField
                label="Full name"
                value={form.name}
                onChange={handleChange("name")}
                disabled={!isEditing}
              />
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Bio (optional)
                </label>
                <textarea
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white disabled:bg-slate-100"
                  rows={3}
                  value={form.bio}
                  onChange={handleChange("bio")}
                  disabled={!isEditing}
                  placeholder="Tell us a bit about yourself"
                />
              </div>
            </Section>

            <Section title="Academic details">
              <TextField
                label="Major"
                value={form.major}
                onChange={handleChange("major")}
                disabled={!isEditing}
              />
              <TextField
                label="Year"
                value={form.year}
                onChange={handleChange("year")}
                disabled={!isEditing}
              />
              <TextField
                label="School name"
                value={form.school_name}
                onChange={handleChange("school_name")}
                disabled={!isEditing}
              />
              <TextField
                label="Gender"
                value={form.gender}
                onChange={handleChange("gender")}
                disabled={!isEditing}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of birth
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                  value={form.dob}
                  onChange={handleChange("dob")}
                  disabled={!isEditing}
                />
              </div>
            </Section>

            <Section title="Location & interests">
              <TextField
                label="City"
                value={form.city}
                onChange={handleChange("city")}
                disabled={!isEditing}
              />
              <TextField
                label="Country"
                value={form.country}
                onChange={handleChange("country")}
                disabled={!isEditing}
              />
              <TextField
                label="Interests"
                value={form.interests}
                onChange={handleChange("interests")}
                disabled={!isEditing}
                placeholder="e.g., AI research, hackathons"
              />
              <TextField
                label="Skills (comma separated)"
                value={form.skillsText}
                onChange={handleChange("skillsText")}
                disabled={!isEditing}
                placeholder="Python, UX, Product"
              />
            </Section>

            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 text-sm p-3 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm p-3 rounded-xl">
                {success}
              </div>
            )}

            {isEditing && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-purple-700 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold border border-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        ) : (
          <section className="space-y-4">
            {savedLoading ? (
              <div className="text-sm text-slate-500">Loading saved posts…</div>
            ) : savedError ? (
              <div className="text-sm text-red-600">{savedError}</div>
            ) : savedPosts.length === 0 ? (
              <div className="text-sm text-slate-500">No saved posts yet.</div>
            ) : (
              savedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={Number(userId)}
                  onUpdate={(id, updated) =>
                    setSavedPosts((prev) =>
                      prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
                    )
                  }
                  onDelete={(id) =>
                    setSavedPosts((prev) => prev.filter((p) => p.id !== id))
                  }
                  onMediaClick={setSelectedMediaUrl}
                />
              ))
            )}
          </section>
        )}
        <MediaModal url={selectedMediaUrl} onClose={() => setSelectedMediaUrl(null)} />
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function TextField({ label, disabled, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        type="text"
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white disabled:bg-slate-100"
        disabled={disabled}
        {...props}
      />
    </div>
  );
}
