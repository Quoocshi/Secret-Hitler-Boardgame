import { RoomScreen } from "@/features/room/RoomScreen";
export default async function RoomPage({params}:{params:Promise<{roomCode:string}>}) {const {roomCode}=await params;return <RoomScreen roomCode={roomCode.toUpperCase()}/>;}
