import { useEffect, useState } from 'react';
import { Infinity as MetaIcon, Megaphone, MessageCircle } from 'lucide-react';
import { Badge, Card } from './kit';
import { settingsRequest, type SettingsData } from './data';
import { translateText as t, useUILanguage } from '../../i18n/display';
import './settings.css';

export function MetaWalletPanel({ integrations }: { integrations?: SettingsData['integrations'] }) {
  const language = useUILanguage();
  const services = [
    { name: 'WhatsApp Conversations', icon: MessageCircle, color: 'green', connection: 'whatsapp' },
    { name: 'Facebook & Instagram Ad Spend', icon: Megaphone, color: 'blue' },
    { name: 'Meta API Usage', icon: MetaIcon, color: 'purple', connection: 'meta' },
  ];

  return <div className="st-wallet-main" dir={language.startsWith('ar') ? 'rtl' : 'ltr'}>
    <Card title="Meta Messaging & Advertising" description="Charges for supported Meta messaging are recorded automatically when usage is confirmed.">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {services.map(({ name, icon: Icon, color, connection }) => {
          const status = connection && integrations ? integrations[connection]?.status ?? 'Not Connected' : 'Status not available';
          return <div className="st-usage-service" key={name}>
            <div className="st-usage-detail">
              <span className={`st-service-icon ${color}`}><Icon size={19}/></span>
              <div className="min-w-0"><strong className="mb-1 block">{t(name)}</strong><Badge tone={status === 'Connected' ? 'green' : status === 'Needs Attention' ? 'orange' : 'neutral'}>{t(status)}</Badge></div>
            </div>
          </div>;
        })}
      </div>
      <p className="st-note">{t('Review Facebook and Instagram ad spend in Meta Ads Manager.')}</p>
    </Card>
  </div>;
}

export function ManagedMetaWalletPanel() {
  const [integrations, setIntegrations] = useState<SettingsData['integrations']>();
  useEffect(() => {
    let current = true;
    void settingsRequest<SettingsData>('/settings').then(data => {
      if (current) setIntegrations(data.integrations);
    }).catch(() => {
      // The connection status stays unavailable when workspace settings cannot be read.
    });
    return () => { current = false; };
  }, []);
  return <div className="st-workspace"><MetaWalletPanel integrations={integrations}/></div>;
}
