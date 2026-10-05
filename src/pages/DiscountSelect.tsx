import { CommerceSelect } from '../components/ui/CommerceSelect';

type Props = { label: string; value: string; options: string[]; onChange: (value: string) => void; className?: string; buttonClassName?: string };

export function DiscountSelect({ label, value, options, onChange, className = '', buttonClassName = '' }: Props) {
  return <CommerceSelect label={label} value={value} options={options} onChange={onChange} className={`dc-select ${className}`} triggerClassName={buttonClassName}/>;
}
