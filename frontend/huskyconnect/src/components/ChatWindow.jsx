import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchThread,
  sendTextMessage,
  sendMediaMessage,
} from "../api/messages";
import { API_BASE } from "../lib/api";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp";
const GIF_ACCEPT = "image/gif";
const FILE_ACCEPT =
  "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,text/plain";

export default function ChatWindow({ userId, otherId, otherStudent }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [mediaEnabled, setMediaEnabled] = useState(true);
  const [mediaStatus, setMediaStatus] = useState("");

  const listRef = useRef(null);
  const imageInputRef = useRef(null);
  const gifInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const parsedUserId = useMemo(() => (userId ? Number(userId) : null), [userId]);
  const parsedOtherId = useMemo(
    () => (otherId ? Number(otherId) : null),
    [otherId]
  );

  // Auto-scroll when messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Capability check for media uploads
  useEffect(() => {
    let mounted = true;
    const base = API_BASE.replace(/\/$/, "");
    const load = async () => {
      try {
        const res = await fetch(`${base}/config`);
        const data = await res.json();
        if (mounted) {
          setMediaEnabled(Boolean(data.media_upload_enabled));
          if (!data.media_upload_enabled) {
            setMediaStatus("File uploads are currently unavailable.");
          }
        }
      } catch {
        if (mounted) {
          setMediaEnabled(false);
          setMediaStatus("File uploads are currently unavailable.");
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch messages on load or when IDs change
  useEffect(() => {
    let isMounted = true;
    let intervalId;

    const loadMessages = async (showSpinner = false) => {
      if (!parsedUserId || !parsedOtherId) return;
      if (showSpinner) setLoading(true);
      try {
        const data = await fetchThread(parsedUserId, parsedOtherId);
        if (isMounted) {
          setMessages(data);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load messages.");
        }
      } finally {
        if (isMounted && showSpinner) {
          setLoading(false);
        }
      }
    };

    setMessages([]);
    setError("");
    if (parsedUserId && parsedOtherId) {
      loadMessages(true);
      intervalId = setInterval(() => loadMessages(false), 8000);
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [parsedUserId, parsedOtherId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!parsedUserId || !parsedOtherId || !text.trim()) return;
    setSending(true);
    try {
      const newMessage = await sendTextMessage({
        senderId: parsedUserId,
        receiverId: parsedOtherId,
        body: text.trim(),
      });
      setMessages((prev) => [...prev, newMessage]);
      setText("");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleMediaUpload = async (file) => {
    if (!mediaEnabled) {
      setMediaStatus("File uploads are currently unavailable.");
      return;
    }
    if (!file || !parsedUserId || !parsedOtherId) return;
    setUploading(true);
    try {
      const message = await sendMediaMessage({
        senderId: parsedUserId,
        receiverId: parsedOtherId,
        file,
      });
      setMessages((prev) => [...prev, message]);
      setError("");
    } catch (err) {
      setMediaStatus(err.message || "Failed to upload media.");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (gifInputRef.current) gifInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowMediaOptions(false);
    }
  };

  const renderContent = (msg) => {
    const type = msg.message_type || "text";
    if (type === "image" || type === "gif") {
      return (
        <img
          src={msg.media_url}
          alt={msg.media_name || "Shared media"}
          className="rounded-xl max-w-xs"
        />
      );
    }
    if (type === "file") {
      return (
        <a
          href={msg.media_url}
          target="_blank"
          rel="noreferrer"
          className="text-xs underline break-all"
        >
          {msg.media_name || "Download file"}
        </a>
      );
    }
    return <p className="text-sm whitespace-pre-line">{msg.body}</p>;
  };

  if (!parsedUserId) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          Please sign in to view and send messages.
        </p>
      </div>
    );
  }

  if (!parsedOtherId) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          Select a valid conversation to start messaging.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* <div className="rounded-3xl border border-slate-200 bg-white p-4 flex flex-col h-[460px]"> */}
      {/* <div className="rounded-3xl border border-slate-200 bg-white p-4 flex flex-col flex-grow"> */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 flex flex-col min-h-[460px] max-h-[70vh]">
        {loading && messages.length === 0 ? (
          <div className="flex-1 grid place-items-center text-sm text-slate-500">
            Loading messages…
          </div>
        ) : (
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto space-y-3 pr-2"
          >
            {messages.length === 0 ? (
              <div className="text-sm text-slate-500">
                No messages yet. Say hello!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender_id === parsedUserId ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`px-4 py-2 rounded-2xl max-w-xs shadow ${
                      msg.sender_id === parsedUserId
                        ? "bg-purple-600 text-white ml-auto"
                        : "bg-slate-100 text-slate-800 mr-auto"
                    }`}
                  >
                    {renderContent(msg)}
                    <div className="text-[10px] mt-1 opacity-70">
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleString()
                        : ""}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {error && (
          <div className="text-xs text-red-600 mt-2">{error}</div>
        )}
      </div>

      <div className="space-y-2">
        {mediaStatus && (
          <div className="text-xs text-slate-500">{mediaStatus}</div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              mediaEnabled && setShowMediaOptions((prev) => !prev)
            }
            className="size-10 rounded-2xl border border-slate-300 text-lg font-bold hover:bg-slate-100 disabled:opacity-40"
            disabled={uploading || !mediaEnabled}
            aria-label="Add attachment"
          >
            +
          </button>
          {uploading && (
            <span className="text-xs text-slate-500">Uploading…</span>
          )}
        </div>
        {mediaEnabled && showMediaOptions && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-2xl border border-slate-300 text-xs hover:bg-slate-100"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
            >
              📸 Upload Image
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-2xl border border-slate-300 text-xs hover:bg-slate-100"
              onClick={() => gifInputRef.current?.click()}
              disabled={uploading}
            >
              🎞️ Upload GIF
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-2xl border border-slate-300 text-xs hover:bg-slate-100"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              📄 Upload File
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={otherStudent ? `Message ${otherStudent.name}` : "Type a message"}
            className="flex-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            disabled={sending || uploading}
          />
          <button
            type="submit"
            disabled={sending || uploading || !text.trim()}
            className="inline-flex items-center gap-2 bg-purple-700 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow hover:brightness-110 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </div>

      <input
        type="file"
        accept={IMAGE_ACCEPT}
        ref={imageInputRef}
        className="hidden"
        onChange={(e) => handleMediaUpload(e.target.files?.[0])}
      />
      <input
        type="file"
        accept={GIF_ACCEPT}
        ref={gifInputRef}
        className="hidden"
        onChange={(e) => handleMediaUpload(e.target.files?.[0])}
      />
      <input
        type="file"
        accept={FILE_ACCEPT}
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => handleMediaUpload(e.target.files?.[0])}
      />
    </div>
  );
}
