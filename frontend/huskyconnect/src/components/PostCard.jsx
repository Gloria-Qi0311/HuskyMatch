import { useMemo, useState } from "react";
import likeIcon from "../assets/icons/like.svg";
import commentIcon from "../assets/icons/comment.svg";
import saveIcon from "../assets/icons/save.svg";
import {
  toggleLike,
  toggleSave,
  fetchComments,
  createComment,
  deletePost,
} from "../api/posts";

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleString();
}

export default function PostCard({
  post,
  currentUserId,
  onUpdate,
  onDelete,
  onMediaClick,
}) {
  const [showComments, setShowComments] = useState(post.showComments || false);
  const [commentsLoaded, setCommentsLoaded] = useState(post.commentsLoaded || false);
  const [comments, setComments] = useState(post.comments || []);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [commentError, setCommentError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const canDelete = useMemo(() => currentUserId === post.author_id, [currentUserId, post.author_id]);

  const handleToggleLike = async () => {
    try {
      const result = await toggleLike(post.id, currentUserId);
      onUpdate(post.id, {
        ...post,
        liked_by_me: result.liked,
        like_count: result.like_count,
      });
    } catch (err) {
      alert(err.message || "Failed to like post.");
    }
  };

  const handleToggleSave = async () => {
    try {
      const result = await toggleSave(post.id, currentUserId);
      onUpdate(post.id, {
        ...post,
        saved_by_me: result.saved,
        save_count: result.save_count,
      });
      window.dispatchEvent(new Event("huskySavedPostsUpdate"));
    } catch (err) {
      alert(err.message || "Failed to save post.");
    }
  };

  const handleToggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsLoaded && !commentsLoading) {
      setCommentsLoading(true);
      try {
        const data = await fetchComments(post.id, currentUserId);
        setComments(data.comments || []);
        setCommentsLoaded(true);
      } catch (err) {
        alert(err.message || "Failed to load comments.");
      } finally {
        setCommentsLoading(false);
      }
    }
  };

  const handleCommentSubmit = async () => {
    const text = commentInput.trim();
    if (!text) return;
    try {
      const newComment = await createComment(post.id, currentUserId, text);
      setComments((prev) => [...prev, newComment]);
      setCommentInput("");
      setCommentError("");
      onUpdate(post.id, {
        ...post,
        comment_count: post.comment_count + 1,
      });
    } catch (err) {
      setCommentError(err.message || "Failed to comment.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deletePost(post.id, currentUserId);
      onDelete(post.id);
      window.dispatchEvent(new Event("huskySavedPostsUpdate"));
    } catch (err) {
      alert(err.message || "Failed to delete post.");
    } finally {
      setMenuOpen(false);
    }
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold">{post.author_name}</div>
          <div className="text-xs text-slate-500">{post.author_school || "Unknown school"}</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {formatTimestamp(post.created_at)}
          {canDelete && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="px-2 py-1 rounded-full hover:bg-slate-100"
              >
                ⋮
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="block px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete Post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      {post.body && <p className="text-sm text-slate-800 whitespace-pre-line">{post.body}</p>}
      {post.media_url && (
        <img
          src={post.media_url}
          alt={post.media_name || "Post media"}
          className="rounded-2xl max-h-96 object-cover w-full cursor-pointer"
          onClick={() => onMediaClick?.(post.media_url)}
        />
      )}
      <footer className="flex flex-wrap gap-3 text-sm text-slate-600">
        <button
          type="button"
          className={`flex items-center gap-2 px-3 py-2 rounded-2xl border border-transparent hover:border-slate-200 ${
            post.liked_by_me ? "text-purple-700" : "text-slate-600"
          }`}
          onClick={handleToggleLike}
        >
          <img src={likeIcon} alt="like" className="w-6 h-6" />
          <span>{post.like_count}</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-transparent hover:border-slate-200 text-slate-600"
          onClick={handleToggleComments}
        >
          <img src={commentIcon} alt="comment" className="w-6 h-6" />
          <span>{post.comment_count}</span>
        </button>
        <button
          type="button"
          className={`flex items-center gap-2 px-3 py-2 rounded-2xl border border-transparent hover:border-slate-200 ${
            post.saved_by_me ? "text-purple-700" : "text-slate-600"
          }`}
          onClick={handleToggleSave}
        >
          <img src={saveIcon} alt="save" className="w-6 h-6" />
          <span>{post.save_count}</span>
        </button>
      </footer>
      {showComments && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-3">
          {commentsLoading ? (
            <div className="text-xs text-slate-500">Loading comments…</div>
          ) : (
            <>
              {comments.map((comment) => (
                <div key={comment.id}>
                  <div className="text-xs font-semibold text-slate-700">{comment.user_name}</div>
                  <div className="text-[11px] text-slate-500">
                    {comment.user_school || "HuskyConnect"}
                  </div>
                  <div className="text-sm text-slate-700">{comment.body}</div>
                  <div className="text-[10px] text-slate-400">
                    {formatTimestamp(comment.created_at)}
                  </div>
                </div>
              ))}
              <div className="space-y-1">
                {commentError && (
                  <div className="text-xs text-red-600">{commentError}</div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Add a comment…"
                  />
                  <button
                    type="button"
                    onClick={handleCommentSubmit}
                    className="rounded-xl bg-purple-700 text-white px-3 py-1.5 text-xs font-semibold"
                  >
                    Post
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </article>
  );
}
