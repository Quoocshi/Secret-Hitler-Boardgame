import type { InputHTMLAttributes } from "react";
export function Field({label,error,id,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string;error?:string}) {return <div className="field"><label htmlFor={id}>{label}</label><input id={id} aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined} {...props}/>{error&&<p id={`${id}-error`} className="error">{error}</p>}</div>;}
