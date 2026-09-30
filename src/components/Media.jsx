import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";

export default function Media({ src, alt, className = "", fallbackClassName = "" }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div aria-label={alt} role="img" className={`flex items-center justify-center bg-gradient-to-br from-primary-50 to-stone-100 text-primary-500 ${className} ${fallbackClassName}`}><ImageIcon aria-hidden="true" size={28} /></div>;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />;
}