function url(value: string, name: string): string {
  const parsed = new URL(value);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(`Cấu hình ${name} không hợp lệ.`);
  }
  return value.replace(/\/$/, "");
}
export const config = {
  apiUrl: url(import.meta.env.VITE_API_URL ?? "http://localhost:8080", "API"),
  wsUrl: url(
    import.meta.env.VITE_WS_URL ?? "http://localhost:8080/ws",
    "WebSocket",
  ),
};
