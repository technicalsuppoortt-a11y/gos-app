export function AIGenerateMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 1.75 12.45 7.55 18.25 10l-5.8 2.45L10 18.25l-2.45-5.8L1.75 10l5.8-2.45L10 1.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="15.8" cy="4.2" r="1.15" fill="currentColor" />
      <circle cx="4.1" cy="15.9" r=".9" fill="currentColor" />
    </svg>
  );
}
