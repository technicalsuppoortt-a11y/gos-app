import { Clock3, Download, FileDown, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Field, Select, Toggle } from './primitives';
import type { FormProps } from './TypeForms';
import { translateText } from '../../i18n/display';

export function DigitalAccessSettings({ config: c, experience: e, editing, configure, customize }: FormProps) {
  return <>
    <Toggle icon={FileDown} label="Allow direct download after purchase" checked={e.directDownload && c.delivery === 'Instant'} disabled={!editing} onChange={directDownload => configure(current => ({ delivery: directDownload ? 'Instant' : 'After approval', enrollment: directDownload ? 'Automatic' : 'After approval', experience: { ...current.experience!, directDownload, accessRule: directDownload ? 'Immediately after payment' : 'After manual approval' } }))}/>
    <div className="dw-limit"><Toggle icon={Download} label="Download limit" checked={e.downloadLimitEnabled ?? true} disabled={!editing} onChange={downloadLimitEnabled => customize({ downloadLimitEnabled })}/></div>
    {(e.downloadLimitEnabled ?? true) && <Field label="Download limit per customer *"><input aria-label={translateText('Download limit per customer')} type="number" min="1" step="1" disabled={!editing} value={Number.isFinite(c.downloadLimit) ? c.downloadLimit : ''} onChange={event => configure({ downloadLimit: event.target.value === '' ? NaN : Number(event.target.value) })}/></Field>}
    <Field icon={Clock3} label="Access duration"><Select label="Access duration" disabled={!editing} value={c.access === 'Lifetime access' ? 'Lifetime' : c.access === '12 months' ? '1 Year' : c.access === '30 days' ? '30 Days' : c.access} options={['Lifetime', '30 Days', '1 Year', 'Custom', ...(c.access === 'While subscribed' ? ['While subscribed'] : [])]} onChange={access => configure({ access: access === 'Lifetime' ? 'Lifetime access' : access === '1 Year' ? '12 months' : access === '30 Days' ? '30 days' : access as typeof c.access })}/></Field>
    {c.access === 'Custom' && <Field label="Custom access duration (days) *"><input type="number" min="1" step="1" disabled={!editing} value={c.accessDays ?? ''} onChange={event => configure({ accessDays: event.target.value === '' ? undefined : Number(event.target.value) })}/></Field>}
    <Toggle icon={LockKeyhole} label="Require account login" checked={e.requireLogin} disabled={!editing} onChange={requireLogin => customize({ requireLogin })}/>
    <Toggle icon={ShieldCheck} label="Watermark files" checked={e.watermark} disabled={!editing} onChange={watermark => customize({ watermark })}/>
  </>;
}
