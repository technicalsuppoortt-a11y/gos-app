import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useUILanguage } from '../../i18n/display';
import { useSelectPortal } from '../../components/ui/select-layer';

type Option = { value: string; label: string };
export function AdminSelect({ value, options, onChange, label, filter=false }: { value:string; options:Option[]; onChange:(value:string)=>void; label:string; filter?:boolean }) {
 const ar=useUILanguage().startsWith('ar'); const empty='__admin_all__';
 const portal = useSelectPortal();
 return <span className="adm-select"><Select.Root dir={ar?'rtl':'ltr'} value={value||empty} onValueChange={v=>onChange(v===empty?'':v)} onOpenChange={portal.onOpenChange}><Select.Trigger ref={portal.trigger} className="adm-select-trigger" aria-label={label}>{filter&&<SlidersHorizontal size={14}/>}<Select.Value/><Select.Icon><ChevronDown size={14}/></Select.Icon></Select.Trigger><Select.Portal container={portal.container}><Select.Content dir={ar?'rtl':'ltr'} className="adm-select-popup" position="popper" sideOffset={5} collisionPadding={12} align="start"><Select.Viewport>{options.map(option=><Select.Item key={option.value} value={option.value||empty} className="adm-select-option" textValue={option.label}><Select.ItemText>{option.label}</Select.ItemText><Select.ItemIndicator className="adm-select-check"><Check size={14}/></Select.ItemIndicator></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal></Select.Root></span>;
}
