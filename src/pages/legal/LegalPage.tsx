import React from 'react';
import { Link } from 'react-router-dom';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { translateText, useUILanguage } from '../../i18n/display';
import { LegalPageContent, type LegalSection } from './LegalPageContent';
import { getLegalCopy, UPKLICK_CONTACT_INFO as contact } from './legalNavigation';
import { LegalLinks } from './LegalLinks';
import './legal.css';

function LegalBrand() {
  return <span className="upklick-legal-logo" dir="ltr"><img src="/upclick-mark.svg" alt="" width="36" height="38" /><span>UpKlick</span></span>;
}

// Apply the existing Dutch/German display catalogs to the reference's English text.
function localizePolicy(node: React.ReactNode): React.ReactNode {
  if (typeof node === 'string') return translateText(node);
  if (Array.isArray(node)) return node.map(localizePolicy);
  if (!React.isValidElement<{ children?: React.ReactNode; title?: string }>(node)) return node;
  return React.cloneElement(node, {
    ...(node.props.title ? { title: translateText(node.props.title) } : {}),
    children: localizePolicy(node.props.children),
  });
}

export function LegalPage({ section }: { section: LegalSection }) {
  const language = useUILanguage();
  const copy = getLegalCopy(language);
  const isAr = language.startsWith('ar');
  const policy = section === 'contact' ? null : LegalPageContent({ section, isAr });
  return <div className="upklick-legal" lang={language} dir={isAr ? 'rtl' : 'ltr'}>
    <header className="upklick-legal-top"><div className="upklick-legal-top-inner"><Link to="/" className="upklick-legal-brand" aria-label="UpKlick"><LegalBrand /></Link><div className="upklick-legal-controls"><Link to="/">{copy.home}</Link><Link to="/login" className="upklick-legal-signin">{copy.login}</Link><LanguageSwitcher /><ThemeToggle /></div></div></header>
    <main className="upklick-legal-main">
      <div className="upklick-legal-intro">
        <Link to="/" className="upklick-legal-brand" aria-label="UpKlick"><LegalBrand /></Link>
        <p className="upklick-legal-identity">{copy.identity}</p>
        <p className="upklick-legal-price">{copy.price}</p>
      </div>
      <div className="upklick-legal-subnav"><LegalLinks language={language} /></div>
      {section === 'contact' ? <>
        <h1>{copy.labels[4]}</h1>
        <address className="uk-card">
          <p><a href={contact.phoneHref} dir="ltr">{contact.phoneDisplay}</a> (<bdi>{contact.phoneLocal}</bdi>)</p>
          <p><a href={`mailto:${contact.emailPrimary}`} dir="ltr">{contact.emailPrimary}</a></p>
          <p>{isAr ? contact.addressAr : contact.addressEn}</p>
        </address>
        <form className="uk-card upklick-contact-form" onSubmit={event => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const subject = encodeURIComponent(`UpKlick Support — ${data.get('name')}`);
          const body = encodeURIComponent(`${data.get('message')}\n\n${data.get('name')}\n${data.get('email')}\n${data.get('phone') || ''}`);
          window.location.href = `mailto:${contact.emailPrimary}?subject=${subject}&body=${body}`;
        }}>
          <p id="contact-form-help">{copy.help}</p>
          <label htmlFor="contact-name">{copy.name}</label><input id="contact-name" name="name" autoComplete="name" required maxLength={120} />
          <label htmlFor="contact-email">{copy.email}</label><input id="contact-email" name="email" type="email" dir="ltr" autoComplete="email" required maxLength={254} />
          <label htmlFor="contact-phone">{copy.phone}</label><input id="contact-phone" name="phone" type="tel" dir="ltr" autoComplete="tel" maxLength={30} />
          <label htmlFor="contact-message">{copy.message}</label><textarea id="contact-message" name="message" rows={5} required maxLength={5000} />
          <button type="submit" aria-describedby="contact-form-help">{copy.send}</button>
        </form>
      </> : isAr ? policy : localizePolicy(policy)}
    </main>
    <footer className="upklick-legal-bottom"><div className="upklick-legal-footer-inner"><Link to="/" className="upklick-legal-brand" aria-label="UpKlick"><LegalBrand /></Link><LegalLinks language={language} /><a href={`mailto:${contact.emailPrimary}`}>{contact.emailPrimary}</a></div></footer>
  </div>;
}
