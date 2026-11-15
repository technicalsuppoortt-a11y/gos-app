const logoSrc = `${import.meta.env.BASE_URL}joe-academy-logo.svg`;

export default function JoeAcademyLogo({ className = '', glow = false }: { className?: string; glow?: boolean }) {
  return <span className={`joe-academy-logo ${glow ? 'joe-academy-logo-glow' : ''} ${className}`}><img src={logoSrc} alt="Joe Academy" width={64} height={64} draggable={false} /></span>;
}
