import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { thumbnailImageProps } from '../../utils/thumbnailImages';
/** Keep the existing cover/background geometry and gradient; defer offscreen requests. */
export function LazyBackground({ image, className, children }: PropsWithChildren<{ image: string; className: string }>) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!host.current || visible) return;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '300px' });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [visible]);
  const variants = thumbnailImageProps(image).srcSet;
  const preview = variants?.split(', ').find(value => value.endsWith(' 640w'))?.split(' ')[0] || image;
  return <div ref={host} className={className} style={{ backgroundImage: visible
    ? 'linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.12)),url(' + JSON.stringify(preview) + ')'
    : 'linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.12))' }}>{children}</div>;
}
