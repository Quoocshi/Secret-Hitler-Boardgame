"use client";
import { RoomEntryForm } from "@/features/room/RoomEntryForm";
import { useRoomSession } from "@/features/room/RoomSessionProvider";
import Link from "next/link";
import { LeaveButton } from "@/features/room/LeaveButton";
export default function Home() {
 const session=useRoomSession();
 return <main className="entry-layout"><section className="entry-intro"><span className="brand">BÀN CHƠI / SECRET HITLER</span><p className="eyebrow">TIN AI. NGHI AI. BẦU CHỌN.</p><h1>Một bàn chơi.<br/>Nhiều bí mật.</h1><p className="intro-copy">Cùng nhóm bạn tìm ra phe ẩn sau những lá phiếu. Mỗi lựa chọn đều có thể đổi hướng ván chơi.</p><div className="entry-tracks"><span className="liberal">TỰ DO</span><span className="fascist">PHÁT XÍT</span></div><p className="entry-footnote">5–10 người · Trình duyệt máy tính · Không cần tài khoản</p></section>
 {session.ready?session.identity?<section className="entry-card"><h2>Bạn đang giữ một phiên chơi</h2><p>Phòng <strong>{session.identity.roomCode}</strong>. Quay lại bàn chơi hoặc xác nhận rời phòng để tạo/vào bàn khác.</p><p><Link href={"/room/"+session.identity.roomCode}>Quay lại phòng</Link></p><LeaveButton onLeave={session.leave}/></section>:<RoomEntryForm key={session.entryCode+session.nickname} nickname={session.nickname} roomCode={session.entryCode} busy={["restoring","connecting","syncing"].includes(session.state.connection)} error={session.state.notice} onEnter={(name,code)=>{void session.enter(name,code);}}/>:<p role="status">Đang chuẩn bị bàn chơi…</p>}
 </main>;
}
