import { CHANNEL_IDS } from '../../backend/billing';
import { useCopy } from './ui';

export function ChannelPicker({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const c = useCopy();
  return <fieldset className="bl-section">
    <legend>{c.t('Platform channel capabilities', 'إمكانات قنوات المنصة')}</legend>
    <div className="bl-tools">{CHANNEL_IDS.map(id => <label key={id} className="bl-tool" data-checked={value.includes(id)}>
      <input type="checkbox" checked={value.includes(id)} onChange={event => onChange(event.target.checked ? [...value, id] : value.filter(item => item !== id))} />
      <span>{({ ai: 'AI', whatsapp: 'WhatsApp', messenger: 'Messenger', instagram: 'Instagram', email: 'Email', sms: 'SMS' })[id]}</span>
    </label>)}</div>
  </fieldset>;
}
