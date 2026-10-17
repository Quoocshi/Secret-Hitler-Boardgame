import { useEffect } from "react";

interface StatusNoticeProps {
  message: string | null;
  error?: boolean;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

export function StatusNotice({
  message,
  error = false,
  onDismiss,
  autoDismissMs,
}: StatusNoticeProps) {
  useEffect(() => {
    if (!message || error || !onDismiss || !autoDismissMs) {
      return;
    }
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [message, error, onDismiss, autoDismissMs]);

  if (!message) {
    return null;
  }

  return (
    <p
      className={`notice${error ? " error" : ""}${onDismiss ? " notice-dismissible" : ""}`}
      role={error ? "alert" : "status"}
    >
      {onDismiss ? (
        <button
          type="button"
          className="notice-dismiss"
          onClick={onDismiss}
          aria-label={`Đóng thông báo: ${message}`}
        >
          <span>{message}</span>
          <span aria-hidden="true">×</span>
        </button>
      ) : (
        message
      )}
    </p>
  );
}
