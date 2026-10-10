
import { Children, isValidElement, useId, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode, SelectHTMLAttributes } from 'react';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size'>;
type Option = { value:string; label:ReactNode; text:string; disabled:boolean };
const empty = '__gos_booking_empty__';
function optionsFrom(children:ReactNode):Option[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{value?:string|number;children?:ReactNode;disabled?:boolean}>(child)) return [];
    if (child.type !== 'option') return optionsFrom(child.props.children);
    const text = Children.toArray(child.props.children).join('');
    return [{value:String(child.props.value ?? text),label:child.props.children,text,disabled:!!child.props.disabled}];
  });
}
// Native-compatible props keep each existing field's value and change handler intact.
export function BookingSelect({children,value,defaultValue,onChange,disabled,required,name,id,className='',...props}:Props) {
  const autoId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [uncontrolled,setUncontrolled] = useState(String(defaultValue ?? ''));
  const [invalid,setInvalid] = useState(false);
  const [container,setContainer] = useState<HTMLElement | null>(null);
  const items = optionsFrom(children).filter((item,index,all)=>all.findIndex(o=>o.value===item.value)===index);
  const current = String(value ?? uncontrolled);
  const selected = items.find(o=>o.value===current);
  const choose = (next:string) => {
    const actual = next===empty?'':next;
    setUncontrolled(actual);setInvalid(false);
    onChange?.({target:{value:actual,name:name||''},currentTarget:{value:actual,name:name||''}} as ChangeEvent<HTMLSelectElement>);
  };
  return <span className={'bk-select '+className}>
    <Select.Root value={current||empty} onValueChange={choose} disabled={disabled} onOpenChange={open=>{if(open)setContainer(trigger.current?.closest('dialog')||null)}}>
      <Select.Trigger ref={trigger} type="button" id={id||autoId} className="bk-select-trigger" aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-required={required} aria-invalid={invalid||undefined} title={selected?.text} onFocus={props.onFocus as never} onBlur={props.onBlur as never}>
        <Select.Value placeholder="Select an option">{selected?.label||'Select an option'}</Select.Value><Select.Icon><ChevronDown size={14}/></Select.Icon>
      </Select.Trigger>
      <Select.Portal container={container||undefined}><Select.Content className="bk-select-content" position="popper" sideOffset={5} collisionPadding={8}>
        <Select.ScrollUpButton className="bk-select-scroll"><ChevronUp size={13}/></Select.ScrollUpButton>
        <Select.Viewport>{items.map((o,index)=><Select.Item key={o.value+'-'+index} value={o.value||empty} disabled={o.disabled} textValue={o.text} className="bk-select-option"><Select.ItemText>{o.label}</Select.ItemText><Select.ItemIndicator><Check size={13}/></Select.ItemIndicator></Select.Item>)}</Select.Viewport>
        <Select.ScrollDownButton className="bk-select-scroll"><ChevronDown size={13}/></Select.ScrollDownButton>
      </Select.Content></Select.Portal>
    </Select.Root>
    <input className="bk-select-validation" name={name} value={current} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true" onChange={()=>{}} onInvalid={e=>{e.preventDefault();setInvalid(true);trigger.current?.focus()}}/>
  </span>;
}


