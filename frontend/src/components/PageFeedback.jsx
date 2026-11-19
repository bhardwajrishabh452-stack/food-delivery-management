import React from "react";

export const PageFeedback = ({ message, type = "error" }) => {
  if (!message) return null;

  return (
    <div className={`page-feedback page-feedback-${type}`} role={type === "error" ? "alert" : "status"} aria-live="polite">
      {message}
    </div>
  );
};

export const PageLoading = ({ label = "Loading..." }) => (
  <div className="page-loading" role="status" aria-live="polite">
    <span className="loading-spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
);
