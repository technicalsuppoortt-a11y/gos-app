import { useMemo, useState } from 'react';

function extractBrandMark(src: string) {
  const prefix = 'data:image/svg+xml;charset=utf-8,';
  if (!src.startsWith(prefix)) return '';
  try {
    const svg = new DOMParser().parseFromString(decodeURIComponent(src.slice(prefix.length)), 'image/svg+xml');
    const mark = svg.querySelector('[data-brand-mark="true"]');
    if (!mark?.children.length) return '';
    const defs = svg.querySelector('defs')?.outerHTML ?? '';
    return prefix + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="-120 -120 240 240">${defs}${mark.innerHTML}</svg>`,
    );
  } catch {
    return '';
  }
}

export function SidebarBrandLogo({ src, name, className, collapsed, wordmark = false }: {
  src: string;
  name: string;
  className: string;
  collapsed: boolean;
  wordmark?: boolean;
}) {
  const mark = useMemo(() => collapsed ? extractBrandMark(src) : '', [collapsed, src]);
  const [wideLogo, setWideLogo] = useState('');
  const alt = `${name} logo`;

  if (collapsed && !mark && (wordmark || wideLogo === src)) {
    return <span className="sidebar-brand-initial" role="img" aria-label={alt}>{Array.from(name.trim())[0]?.toLocaleUpperCase()}</span>;
  }

  return <img src={mark || src} alt={alt} className={className} onLoad={({currentTarget}) => {
    if (!mark && currentTarget.naturalWidth > currentTarget.naturalHeight * 1.5) setWideLogo(src);
  }}/>;
}
