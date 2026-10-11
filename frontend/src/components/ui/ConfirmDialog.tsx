"use client";
import { useEffect,useRef } from "react";
import { Button } from "./Button";
export function ConfirmDialog({title,children,onConfirm,onCancel,confirmLabel="Xác nhận"}:{title:string;children:React.ReactNode;onConfirm:()=>void;onCancel:()=>void;confirmLabel?:string}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const dialog=ref.current;const previous=document.activeElement as HTMLElement|null;
  dialog?.showModal();dialog?.querySelector<HTMLButtonElement>("button")?.focus();
  return ()=>{dialog?.close();previous?.focus();};
 },[]);
 return <dialog ref={ref} className="confirm-dialog" aria-labelledby="confirm-title" onCancel={e=>{e.preventDefault();onCancel();}} onKeyDown={e=>{
  if(e.key!=="Tab")return;const elements=Array.from(ref.current?.querySelectorAll<HTMLElement>("button, input, select, [tabindex='0']")??[]).filter(x=>!x.hasAttribute("disabled"));const first=elements[0],last=elements.at(-1);
  if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
 }}>
 <h2 id="confirm-title">{title}</h2><div>{children}</div><div className="dialog-actions"><Button onClick={onCancel}>Hủy</Button><Button className="primary" onClick={onConfirm}>{confirmLabel}</Button></div></dialog>;
}
