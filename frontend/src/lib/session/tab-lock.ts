export async function acquireRoomLock():Promise<()=>void> {
 if(!navigator.locks)throw new Error("Trình duyệt chưa hỗ trợ khóa phiên. Hãy dùng Chrome hoặc Edge trên máy tính.");
 return new Promise((resolve,reject)=>{
  void navigator.locks.request("hboardgame-active-room",{ifAvailable:true},async lock=>{
   if(!lock){reject(new Error("Phòng đang mở ở tab khác trong trình duyệt này."));return;}
   await new Promise<void>(release=>{resolve(release);});
  }).catch(()=>reject(new Error("Không thể khóa phiên chơi trong trình duyệt.")));
 });
}
