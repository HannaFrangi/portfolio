/** Shared drawn icons: one stroke weight, so nothing leans on unicode glyphs. */
export function Arrow({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M4 12 12 4M6 4h6v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
