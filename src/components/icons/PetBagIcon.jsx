export default function PetBagIcon({ size = 20, className = "", ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
    <path d="M5 8.5h14l1 12H4l1-12Z" />
    <path d="M8.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" />
    <path d="M12 16.7c-1.5 0-2.7-.8-2.7-1.9 0-.6.4-1.1 1-1.6.4-.3.8-.8 1.1-1.3.2-.3.4-.5.6-.5s.4.2.6.5c.3.5.7 1 1.1 1.3.6.5 1 1 1 1.6 0 1.1-1.2 1.9-2.7 1.9Z" fill="currentColor" stroke="none" />
    <circle cx="9.2" cy="11.3" r=".8" fill="currentColor" stroke="none" />
    <circle cx="11.1" cy="10.4" r=".8" fill="currentColor" stroke="none" />
    <circle cx="13" cy="10.4" r=".8" fill="currentColor" stroke="none" />
    <circle cx="14.8" cy="11.3" r=".8" fill="currentColor" stroke="none" />
  </svg>;
}