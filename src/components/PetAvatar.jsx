import { useEffect, useState } from "react";
import { PawPrint } from "lucide-react";

export default function PetAvatar({ name, photo, className = "size-16", iconSize = 18, alt }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo]);
  if (photo && !failed) return <img src={photo} alt={alt || `${name || "Pet"} photo`} onError={() => setFailed(true)} className={`shrink-0 rounded-full object-cover ${className}`} />;
  return <span role="img" aria-label={alt || `${name || "Pet"} avatar`} className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-50 text-primary-700 ${className}`}>
    <span className="text-xl font-semibold">{name?.trim()?.slice(0, 1).toUpperCase() || "?"}</span>
    <PawPrint aria-hidden="true" size={iconSize} className="absolute bottom-[10%] end-[8%] rounded-full bg-primary-50 p-0.5" />
  </span>;
}