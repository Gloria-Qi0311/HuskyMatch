import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopNav from "../components/TopNav";
import { API_BASE } from "../lib/api";
import { createPost, fetchFeed } from "../api/posts";
import PostCard from "../components/PostCard";
import MediaModal from "../components/MediaModal";

export default function HomePage() {
  const storedUserId =
    typeof window !== "undefined"
      ? Number(localStorage.getItem("huskyconnect_user_id"))
      : null;
  const userId = useMemo(
    () => (Number.isFinite(storedUserId) ? storedUserId : null),
    [storedUserId]
  );
  const [currentUser, setCurrentUser] = useState(null);
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [posting, setPosting] = useState(false);
  const [createError, setCreateError] = useState("");
  const fileInputRef = useRef(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState(null);

  // Fetch current user info
  useEffect(() => {
    if (!userId) return;
    const base = API_BASE.replace(/\/$/, "");
    const load = async () => {
      try {
        const res = await fetch(`${base}/students/${userId}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setCurrentUser({
          id: data.user_id,
          name: data.name,
          school: data.school_name,
        });
      } catch (err) {
        console.error("Failed to load user profile", err);
      }
    };
    load();
  }, [userId]);

  const loadFeed = useCallback(() => {
    if (!userId) {
      setFeed([]);
      setFeedLoading(false);
      return;
    }
    setFeedLoading(true);
    setFeedError("");
    fetchFeed(userId)
      .then((data) => {
        const posts =
          data.posts?.map((post) => ({
            ...post,
            comments: [],
            commentsLoaded: false,
            showComments: false,
            commentsLoading: false,
          })) || [];
        setFeed(posts);
      })
      .catch((err) => {
        setFeedError(err.message || "Failed to load feed.");
      })
      .finally(() => setFeedLoading(false));
  }, [userId]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!userId) {
      setCreateError("You must be signed in to post.");
      return;
    }
    if (!body.trim() && !file) {
      setCreateError("Write something or attach a file.");
      return;
    }
    setPosting(true);
    setCreateError("");
    try {
      await createPost({
        authorId: userId,
        body: body.trim(),
        file,
      });
      await loadFeed();
      setBody("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setCreateError(err.message || "Failed to create post.");
    } finally {
      setPosting(false);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <TopNav />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <p className="text-center text-slate-600">
            Sign in to see your feed.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-6 overflow-y-auto">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold mb-2">Create Post</h1>
          {currentUser && (
            <p className="text-sm text-slate-500 mb-3">
              {currentUser.name} · {currentUser.school || "HuskyConnect student"}
            </p>
          )}
          {createError && (
            <div className="text-sm text-red-600 mb-2">{createError}</div>
          )}
          <form onSubmit={handleCreatePost} className="space-y-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's happening?"
              className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              rows={3}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,text/plain"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={posting}
                className="inline-flex items-center gap-2 bg-purple-700 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow hover:brightness-110 disabled:opacity-60"
              >
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
      {feedLoading ? (
        <div className="text-sm text-slate-500">Loading feed…</div>
      ) : feedError ? (
        <div className="text-sm text-red-600">{feedError}</div>
      ) : feed.length === 0 ? (
        <div className="text-sm text-slate-500">No posts yet.</div>
      ) : (
        feed.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={userId}
            onUpdate={(id, updated) =>
              setFeed((prev) =>
                prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
              )
            }
            onDelete={(id) =>
              setFeed((prev) => prev.filter((p) => p.id !== id))
            }
            onMediaClick={setSelectedMediaUrl}
          />
        ))
      )}
        </section>
      </main>
      <MediaModal url={selectedMediaUrl} onClose={() => setSelectedMediaUrl(null)} />
    </div>
  );
}
