import React from "react";

export default function MediaModal({ url, onClose }) {
  if (!url) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div className="max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <img
          src={url}
          alt="Media preview"
          className="max-h-[90vh] max-w-[90vw] object-contain rounded-3xl"
        />
      </div>
    </div>
  );
}
