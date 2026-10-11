import type { Metadata } from "next";
import "@fontsource-variable/noto-sans";
import "@fontsource-variable/noto-serif";
import "./globals.css";
import { RoomSessionProvider } from "@/features/room/RoomSessionProvider";
export const metadata: Metadata = { title: "Secret Hitler • Bàn chơi", description: "Chơi Secret Hitler cùng bạn bè trên web." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="vi"><body><RoomSessionProvider>{children}</RoomSessionProvider></body></html>;
}
