import { Combobox } from './Combobox';
import { getTimeZoneOptions } from '../../utils/timezones';
import { useUILanguage } from '../../i18n/display';
export function TimezoneSelect({ value, onChange, disabled, label }: { value: string; onChange: (value: string) => void; disabled?: boolean; label?: string }) {
  const ar = useUILanguage().startsWith('ar');
  return <Combobox value={value} onChange={onChange} options={getTimeZoneOptions(value)} disabled={disabled} label={label ?? (ar ? 'المنطقة الزمنية' : 'Timezone')} searchable searchLabel={ar ? 'ابحث عن مدينة أو منطقة زمنية…' : 'Search city or timezone…'} emptyLabel={ar ? 'لا توجد منطقة مطابقة' : 'No matching timezones'} dir={ar ? 'rtl' : 'ltr'} portal/>;
}
