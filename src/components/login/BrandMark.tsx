import { BRAND_COLORS } from "@/lib/brand-colors";

export function BrandMarkIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="168" height="54" rx="6" fill={BRAND_COLORS.maroon} />
      <rect x="0" y="0" width="54" height="126" rx="6" fill={BRAND_COLORS.maroon} />
      <rect x="54" y="96" width="146" height="54" rx="6" fill={BRAND_COLORS.navy} />
      <rect x="152" y="54" width="48" height="96" rx="6" fill={BRAND_COLORS.navy} />
    </svg>
  );
}

export function BrandWordmark({ tagline = true }: { tagline?: boolean }) {
  return (
    <div>
      <p className="font-extrabold leading-tight text-lg">
        <span style={{ color: BRAND_COLORS.navy }}>Data Desa </span>
        <span style={{ color: BRAND_COLORS.maroon }}>Presisi</span>
      </p>
      {tagline && <p className="text-[11px] font-medium text-slate-400 tracking-wide">Sistem pembaruan data desa</p>}
    </div>
  );
}
