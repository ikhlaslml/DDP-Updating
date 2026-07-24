export function BrandMarkIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="19" height="19" rx="2.5" fill="#7A1F2E" />
      <rect x="3" y="3" width="9.5" height="9.5" rx="2" fill="white" />
      <rect x="17" y="17" width="20" height="20" rx="2.5" fill="#122A44" />
    </svg>
  );
}

export function BrandWordmark({ tagline = true }: { tagline?: boolean }) {
  return (
    <div>
      <p className="font-extrabold leading-tight text-lg">
        <span style={{ color: "#122A44" }}>Data Desa </span>
        <span style={{ color: "#7A1F2E" }}>Presisi</span>
      </p>
      {tagline && <p className="text-[11px] font-medium text-slate-400 tracking-wide">Solusi Satu Data Indonesia</p>}
    </div>
  );
}
