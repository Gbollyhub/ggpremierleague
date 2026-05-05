export default function Logo({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer shield */}
      <path
        d="M60 6L108 28V62C108 88.5 86.4 108.6 60 114C33.6 108.6 12 88.5 12 62V28L60 6Z"
        fill="url(#shieldGrad)"
        stroke="url(#borderGrad)"
        strokeWidth="3"
      />
      {/* Inner shield trim */}
      <path
        d="M60 14L100 33V62C100 84.2 81.2 101.5 60 106.4C38.8 101.5 20 84.2 20 62V33L60 14Z"
        fill="none"
        stroke="white"
        strokeWidth="1"
        opacity="0.2"
      />
      {/* Football / pitch lines */}
      <line x1="60" y1="30" x2="60" y2="98" stroke="white" strokeWidth="1" opacity="0.15" />
      <line x1="28" y1="62" x2="92" y2="62" stroke="white" strokeWidth="1" opacity="0.15" />
      <circle cx="60" cy="62" r="12" stroke="white" strokeWidth="1" opacity="0.15" fill="none" />
      {/* GG monogram */}
      <text
        x="60"
        y="56"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Outfit, sans-serif"
        fontWeight="900"
        fontSize="30"
        fill="white"
        letterSpacing="-1"
      >
        GG
      </text>
      {/* PL text below */}
      <text
        x="60"
        y="80"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Outfit, sans-serif"
        fontWeight="700"
        fontSize="14"
        fill="white"
        opacity="0.85"
        letterSpacing="4"
      >
        PL
      </text>
      {/* Stars */}
      <circle cx="38" cy="24" r="2" fill="white" opacity="0.6" />
      <circle cx="60" cy="18" r="2.5" fill="white" opacity="0.8" />
      <circle cx="82" cy="24" r="2" fill="white" opacity="0.6" />
      <defs>
        <linearGradient id="shieldGrad" x1="60" y1="6" x2="60" y2="114" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1e40af" />
          <stop offset="0.5" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="borderGrad" x1="60" y1="6" x2="60" y2="114" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>
    </svg>
  );
}
