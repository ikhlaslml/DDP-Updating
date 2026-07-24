export function HeroGraphic({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 320" className={className} fill="none">
      <path
        d="M 60 40 C 140 10, 230 30, 260 100 S 300 220, 220 260"
        stroke="#122A44"
        strokeOpacity="0.35"
        strokeWidth="2.5"
        strokeDasharray="8 8"
        strokeLinecap="round"
      />
      <rect x="60" y="85" width="168" height="54" rx="6" fill="#7A1F2E" />
      <rect x="60" y="85" width="54" height="126" rx="6" fill="#7A1F2E" />
      <rect x="114" y="181" width="146" height="54" rx="6" fill="#122A44" />
      <rect x="212" y="139" width="48" height="96" rx="6" fill="#122A44" />
    </svg>
  );
}

export function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg width="100%" height="100%" className="absolute inset-0 opacity-[0.05]">
        <defs>
          <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
            <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#122A44" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div
        className="absolute -left-24 top-1/3 h-72 w-72 rounded-full blur-3xl opacity-[0.06]"
        style={{ background: "#122A44" }}
      />
      <div
        className="absolute right-0 bottom-0 h-96 w-96 rounded-full blur-3xl opacity-[0.05]"
        style={{ background: "#7A1F2E" }}
      />
    </div>
  );
}
