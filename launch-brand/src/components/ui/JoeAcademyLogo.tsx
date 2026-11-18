import joeAcademyLogoUrl from '../../../public/joe-academy-logo.svg?url';

export { joeAcademyLogoUrl };

export default function JoeAcademyLogo({ className = '', glow = false }: { className?: string; glow?: boolean }) {
  return <span className={`joe-academy-logo ${glow ? 'joe-academy-logo-glow' : ''} ${className}`}><img src={joeAcademyLogoUrl} alt="Launch Brand" width={64} height={64} draggable={false} /></span>;
}
