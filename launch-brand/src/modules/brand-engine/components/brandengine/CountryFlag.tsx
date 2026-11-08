/** Local vector flags: consistent rendering on Windows, without emoji or external requests. */
export function CountryFlag({ code }: { code: string }) {
  const bands: Record<string, string[]> = {
    EG: ["#ce1126", "#fff", "#111"],
    SA: ["#006c35"],
    AE: ["#009739", "#fff", "#111"],
    QA: ["#8a1538"],
    KW: ["#007a3d", "#fff", "#ce1126"],
    JO: ["#111", "#fff", "#007a3d"],
    PS: ["#111", "#fff", "#009736"],
    NL: ["#ae1c28", "#fff", "#21468b"],
  };
  const colors = bands[code];
  if (!colors && !["EU", "US", "GLOBAL", "custom"].includes(code) && /^[A-Z]{2}$/.test(code)) {
    return (
      <img
        className="discover-flag"
        src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <svg className="discover-flag" viewBox="0 0 30 20" aria-hidden="true">
      <defs>
        <clipPath id={`flag-${code}`}>
          <rect width="30" height="20" rx="3" />
        </clipPath>
      </defs>
      <g clipPath={`url(#flag-${code})`}>
        {colors?.map((color, i) => (
          <rect
            key={i}
            width="30"
            height={20 / colors.length}
            y={(i * 20) / colors.length}
            fill={color}
          />
        ))}
        {code === "AE" && <rect width="7" height="20" fill="#ef3340" />}
        {code === "KW" && <path d="M0 0L9 6.67V13.33L0 20Z" fill="#111" />}
        {["JO", "PS"].includes(code) && <path d="M0 0L13 10L0 20Z" fill="#ce1126" />}
        {code === "JO" && (
          <text x="4" y="12" fill="white" fontSize="6">
            ✦
          </text>
        )}
        {code === "QA" && (
          <path
            d="M0 0H8L11 1.1L8 2.2L11 3.3L8 4.4L11 5.5L8 6.6L11 7.7L8 8.8L11 10L8 11.2L11 12.3L8 13.4L11 14.5L8 15.6L11 16.7L8 17.8L11 18.9L8 20H0Z"
            fill="white"
          />
        )}
        {code === "EG" && (
          <path
            d="M13 8H17V11L15 13L13 11ZM11 8L14 9V11L11 10ZM19 8L16 9V11L19 10"
            fill="#c8a444"
          />
        )}
        {code === "SA" && (
          <>
            <text x="15" y="10" textAnchor="middle" fill="white" fontSize="5" fontFamily="Arial">
              لا إله إلا الله
            </text>
            <path d="M8 14H23M9 13V15" stroke="white" strokeWidth="1" />
          </>
        )}
        {code === "EU" && (
          <>
            <rect width="30" height="20" fill="#003399" />
            {Array.from({ length: 12 }, (_, i) => (
              <circle
                key={i}
                cx={15 + 6 * Math.cos((i * Math.PI) / 6)}
                cy={10 + 6 * Math.sin((i * Math.PI) / 6)}
                r=".85"
                fill="#ffcc00"
              />
            ))}
          </>
        )}
        {code === "US" && (
          <>
            <rect width="30" height="20" fill="white" />
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} width="30" height={20 / 13} y={(i * 40) / 13} fill="#b22234" />
            ))}
            <rect width="13" height="11" fill="#3c3b6e" />
            {Array.from({ length: 12 }, (_, i) => (
              <circle
                key={i}
                cx={2 + (i % 4) * 3}
                cy={2 + Math.floor(i / 4) * 3}
                r=".6"
                fill="white"
              />
            ))}
          </>
        )}
        {!colors && !["EU", "US"].includes(code) && (
          <>
            <rect width="30" height="20" fill="#eef2ff" />
            <circle cx="15" cy="10" r="7" fill="none" stroke="#6d3df5" />
            <ellipse cx="15" cy="10" rx="3" ry="7" fill="none" stroke="#6d3df5" />
            <path d="M8 10H22" stroke="#6d3df5" />
          </>
        )}
      </g>
    </svg>
  );
}
