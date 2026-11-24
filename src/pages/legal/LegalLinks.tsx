import { NavLink } from 'react-router-dom';
import { getLegalCopy, legalLinks } from './legalNavigation';

export function LegalLinks({ language }: { language: string }) {
  return <nav className="upklick-legal-links" aria-label={getLegalCopy(language).nav} dir={language.startsWith('ar') ? 'rtl' : 'ltr'}>
    {legalLinks(language).map(link => <NavLink key={link.to} to={link.to} className={({ isActive }) => isActive ? 'is-active' : undefined}>{link.label}</NavLink>)}
  </nav>;
}
