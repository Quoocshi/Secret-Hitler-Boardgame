interface StatusNoticeProps {
  message: string | null;
  error?: boolean;
}

export function StatusNotice({ message, error = false }: StatusNoticeProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={error ? "notice error" : "notice"}
      role={error ? "alert" : "status"}
    >
      {message}
    </p>
  );
}
