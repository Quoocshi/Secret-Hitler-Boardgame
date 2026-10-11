import { roomCodePattern,uuidPattern,type SessionIdentity } from "@/lib/game/types";
const identityKey="hboardgame.identity",nicknameKey="hboardgame.nickname";
export function readIdentity():SessionIdentity|null {
 try {
  const raw=localStorage.getItem(identityKey);if(!raw)return null;
  const v=JSON.parse(raw);
  if(v?.schemaVersion!==1 || typeof v.sessionToken!=="string" || !uuidPattern.test(v.sessionToken) || typeof v.roomCode!=="string" || !roomCodePattern.test(v.roomCode) || typeof v.nickname!=="string" || !v.nickname.trim())throw new Error();
  return {schemaVersion:1,sessionToken:v.sessionToken,roomCode:v.roomCode,nickname:v.nickname};
 }catch{throw new Error("Không thể đọc phiên đã lưu. Hãy xóa phiên cũ để vào phòng lại.");}
}
export function saveIdentity(identity:SessionIdentity) {
 try{localStorage.setItem(identityKey,JSON.stringify(identity));localStorage.setItem(nicknameKey,identity.nickname);}catch{throw new Error("Trình duyệt không cho lưu phiên. Hãy cho phép lưu trữ để phục hồi khi tải lại.");}
}
export function clearIdentity() {try{localStorage.removeItem(identityKey);}catch{throw new Error("Không thể xóa phiên đã lưu trong trình duyệt.");}}
export function savedNickname():string {try{return localStorage.getItem(nicknameKey)??"";}catch{throw new Error("Không thể đọc tên đã lưu trong trình duyệt.");}}
