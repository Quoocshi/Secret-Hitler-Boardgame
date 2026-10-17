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
  apiUrl: url(
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
    "API",
  ),
  wsUrl: url(
    process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:8080/ws",
    "WebSocket",
  ),
};
