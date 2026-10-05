import React, { useId } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Percent, Tag, Ticket, X, Zap, Calendar, AlertCircle } from 'lucide-react';
import { showToast } from '../utils/toast';
import { DiscountSelect as Select } from './DiscountSelect';
import { type Discount, initialForm, readDiscounts, writeDiscounts, discountsPath } from './discounts-data';
import './discounts-workspace.css';

function generateCode() {
  return `SAVE${Math.random().toString(36).slice(2,8).toUpperCase()}`;
}

export function DiscountEditorPage() {
  const { id } = useParams();
  return <DiscountEditor key={id ?? 'new'} id={id}/>;
}

function DiscountEditor({ id }: { id?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const existing = id ? readDiscounts().find(d => d.id === id) : undefined;
  const [form, setForm] = React.useState<Discount>(() => existing ? { ...existing } : { ...initialForm, code: '', expiry: '', description: '', ...(location.state?.duplicate as Partial<Discount> | undefined), id: '', uses: 0 });
  const codeRef = React.useRef<HTMLInputElement>(null);

  const notify = (message: string) => showToast.error(message);
  const update = <K extends keyof Discount>(key: K, value: Discount[K]) => setForm(current => ({ ...current, [key]: value }));

  const save = (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    const discounts = readDiscounts();
    const code = form.code.trim().toUpperCase();
    const invalid = (message: string) => { notify(message); requestAnimationFrame(() => codeRef.current?.focus()); };

    if (!code || !/^[A-Z0-9_-]+$/.test(code)) { invalid('Use letters, numbers, hyphens or underscores for the discount code.'); return; }
    if (discounts.some(discount => discount.code === code && discount.id !== form.id)) { invalid('This discount code already exists. Choose a unique code.'); return; }
    if (!Number.isFinite(form.value) || form.value <= 0 || (form.type === 'Percentage' && form.value > 100)) { invalid('Enter a valid discount value. Percentages must be between 1 and 100.'); return; }
    if (!Number.isFinite(form.minimum) || form.minimum < 0 || !Number.isInteger(form.limit) || form.limit < 0) { invalid('Minimum purchase must be positive or zero. Usage limit must be a whole number or zero for unlimited.'); return; }
    if (id && !discounts.some(discount => discount.id === id)) { notify('This discount was deleted. Return to Discounts to continue.'); return; }

    const saved = { ...form, code, id: form.id || crypto.randomUUID(), uses: form.id ? form.uses : 0 };
    try { writeDiscounts(form.id ? discounts.map(discount => discount.id === form.id ? saved : discount) : [saved, ...discounts]); }
    catch { notify('Unable to save the discount. Please allow browser storage and try again.'); return; }

    showToast.success(form.id ? 'Discount updated.' : 'Discount created.');
    navigate(discountsPath);
  };

  const idPrefix = useId();

  if (id && !existing) {
    return (
      <main className="dc-editor-route bg-slate-50 flex items-center justify-center">
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <Ticket size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Discount not found</h2>
          <p className="text-slate-500 mb-6">This discount may have been deleted.</p>
          <button className="w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium hover:bg-slate-800 transition-colors" onClick={() => navigate(discountsPath)}>
            Back to Discounts
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="dc-editor-route bg-slate-50/50">
      <div className="dc-editor-content w-full">
        <form id="discount-editor-form" onSubmit={save} className="dc-editor-grid grid grid-cols-1 gap-6 items-start">
          
          {/* Main Form Column */}
          <div className="space-y-6">
            
            {/* Section 1: Basic Information */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Basic Information</h2>
                <p className="text-sm text-slate-500 mt-1">Define the code and how the discount is applied.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor={`${idPrefix}-code`} className="block text-sm font-medium text-slate-700 mb-1.5">
                    Discount Code <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-lg shadow-sm border border-slate-300 focus-within:ring-2 focus-within:ring-[#7C5CFC]/20 focus-within:border-[#7C5CFC] bg-white overflow-hidden transition-shadow">
                    <input
                      id={`${idPrefix}-code`}
                      ref={codeRef}
                      required
                      className="flex-1 block w-full min-w-0 border-none px-3.5 py-2.5 text-slate-900 text-sm font-medium bg-transparent focus:ring-0 placeholder:text-slate-400 font-mono uppercase"
                      value={form.code}
                      placeholder="e.g. SUMMER25"
                      onChange={e => update('code', e.target.value.toUpperCase())}
                    />
                    <div className="w-px bg-slate-200"></div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium text-sm transition-colors focus:outline-none"
                      onClick={() => update('code', generateCode())}
                    >
                      <Zap size={14} className="text-yellow-500" /> Generate
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Discount Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Percentage', 'Fixed Amount'] as const).map(t => (
                      <label
                        key={t}
                        className={`relative flex cursor-pointer rounded-xl border p-4 focus:outline-none transition-all ${
                          form.type === t
                            ? 'bg-purple-50/50 border-[#7C5CFC] shadow-[0_0_0_1px_#7C5CFC]'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="discount-type"
                          className="sr-only"
                          checked={form.type === t}
                          onChange={() => {
                            update('type', t);
                            if (t === 'Percentage' && form.value > 100) update('value', 20);
                          }}
                        />
                        <span className="flex items-center gap-3">
                          <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${form.type === t ? 'bg-[#7C5CFC] text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {t === 'Percentage' ? <Percent size={16} /> : <span className="font-bold">€</span>}
                          </span>
                          <span className="flex flex-col">
                            <span className={`block text-sm font-semibold ${form.type === t ? 'text-purple-900' : 'text-slate-900'}`}>{t}</span>
                            <span className={`block text-xs mt-0.5 ${form.type === t ? 'text-purple-700' : 'text-slate-500'}`}>
                              {t === 'Percentage' ? 'Percentage off total' : 'Fixed amount off total'}
                            </span>
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Value & Restrictions */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Value & Restrictions</h2>
                <p className="text-sm text-slate-500 mt-1">Set the discount amount and usage rules.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor={`${idPrefix}-val`} className="block text-sm font-medium text-slate-700 mb-1.5">
                    Discount Value <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      id={`${idPrefix}-val`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={form.type === 'Percentage' ? 100 : undefined}
                      required
                      className="block w-full pr-12 px-3.5 py-2.5 text-slate-900 text-sm font-medium border border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 bg-white rounded-lg shadow-sm placeholder:text-slate-400"
                      value={form.value}
                      onChange={e => update('value', Number(e.target.value))}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <button
                        type="button"
                        className="h-full px-3.5 text-slate-600 font-semibold text-sm border-l border-slate-200 hover:bg-slate-50 transition-colors rounded-r-lg"
                        onClick={() => update('type', form.type === 'Percentage' ? 'Fixed Amount' : 'Percentage')}
                        title="Click to toggle between % and €"
                      >
                        {form.type === 'Percentage' ? '%' : '€'}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Applies To</label>
                  <Select
                    label="Discount applies to"
                    value={form.applies}
                    options={['All Products', 'Specific Products', 'Memberships', 'Payment Plans']}
                    onChange={value => update('applies', value)}
                    buttonClassName="!px-3.5 !py-2.5 !h-auto text-slate-900 text-sm font-medium border border-slate-300 bg-white rounded-lg shadow-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 hover:bg-slate-50 transition-colors w-full flex items-center"
                  />
                  {form.applies === 'Specific Products' && (
                    <p className="mt-2 text-xs text-purple-600 bg-purple-50 py-1 px-2 rounded font-medium border border-purple-100">
                      Applies to AI Marketing Course, Social Media Templates...
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor={`${idPrefix}-min`} className="block text-sm font-medium text-slate-700 mb-1.5">Minimum Purchase (€)</label>
                  <input
                    id={`${idPrefix}-min`}
                    type="number"
                    min="0"
                    step="0.01"
                    className="block w-full px-3.5 py-2.5 text-slate-900 text-sm font-medium border border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 bg-white rounded-lg shadow-sm placeholder:text-slate-400"
                    value={form.minimum}
                    onChange={e => update('minimum', Number(e.target.value))}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label htmlFor={`${idPrefix}-limit`} className="block text-sm font-medium text-slate-700 mb-1.5">Usage Limit</label>
                  <input
                    id={`${idPrefix}-limit`}
                    type="number"
                    min="0"
                    step="1"
                    className="block w-full px-3.5 py-2.5 text-slate-900 text-sm font-medium border border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 bg-white rounded-lg shadow-sm placeholder:text-slate-400"
                    value={form.limit}
                    onChange={e => update('limit', Number(e.target.value))}
                    placeholder="Unlimited"
                  />
                </div>
              </div>
            </section>

            {/* Section 3: Validity & Status */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Validity & Status</h2>
                  <p className="text-sm text-slate-500 mt-1">Control when and how this discount is shown.</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className={`flex h-2.5 w-2.5 rounded-full ${form.active ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                  <label className="flex items-center cursor-pointer gap-2">
                    <span className="text-sm font-medium text-slate-700">{form.active ? 'Active' : 'Inactive'}</span>
                    <div className="relative inline-block w-10 h-5 align-middle select-none">
                      <input type="checkbox" className="sr-only peer" checked={form.active} onChange={e => update('active', e.target.checked)} />
                      <div className="w-10 h-5 bg-slate-300 rounded-full peer peer-checked:bg-[#7C5CFC] transition-colors"></div>
                      <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor={`${idPrefix}-exp`} className="block text-sm font-medium text-slate-700 mb-1.5">Expiration Date</label>
                  <div className="flex gap-2">
                    <input
                      id={`${idPrefix}-exp`}
                      type="date"
                      className="block w-full px-3.5 py-2.5 text-slate-900 text-sm font-medium border border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 bg-white rounded-lg shadow-sm placeholder:text-slate-400"
                      value={form.expiry}
                      onChange={e => update('expiry', e.target.value)}
                    />
                    {form.expiry && (
                      <button
                        type="button"
                        className="px-3 border border-slate-300 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 bg-white shadow-sm"
                        onClick={() => update('expiry', '')}
                        title="Clear date"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <label htmlFor={`${idPrefix}-desc`} className="block text-sm font-medium text-slate-700">Internal Description</label>
                    <span className={`text-xs ${form.description.length > 1900 ? 'text-orange-500' : 'text-slate-400'}`}>
                      {form.description.length}/2000
                    </span>
                  </div>
                  <textarea
                    id={`${idPrefix}-desc`}
                    maxLength={2000}
                    rows={3}
                    className="block w-full px-3.5 py-2.5 text-slate-900 text-sm font-medium border border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 bg-white rounded-lg shadow-sm placeholder:text-slate-400 resize-y"
                    value={form.description}
                    placeholder="E.g., Summer sale promotion 2026..."
                    onChange={e => update('description', e.target.value)}
                  />
                </div>
              </div>
            </section>

          </div>

          {/* Right Column: Preview & Summary */}
          <div className="lg:sticky lg:top-24 space-y-6">
            
            {/* Live Preview Card */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Tag size={16} className="text-slate-400"/> Live Preview
                </h3>
              </div>
              <div className="p-6">
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/60 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
                  
                  {/* The Preview UI Customer Sees */}
                  <div className="relative">
                    <div className="flex justify-between items-start mb-3">
                      <div className="inline-flex items-center gap-2 bg-white border-2 border-slate-200 border-dashed text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg tracking-widest shadow-sm">
                        <Ticket size={14} className="text-slate-400"/>
                        {form.code || 'CODE'}
                      </div>
                      {form.active ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#7C5CFC] bg-[#7C5CFC]/10 px-2 py-1 rounded-md border border-[#7C5CFC]/20">Active</span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-200 px-2 py-1 rounded-md border border-slate-300">Inactive</span>
                      )}
                    </div>
                    
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {form.type === 'Percentage' ? `${form.value}%` : `€${form.value}`}
                      </span>
                      <span className="text-sm font-medium text-slate-500">OFF</span>
                    </div>
                    
                    <p className="text-sm text-slate-600 font-medium">
                      {form.applies === 'All Products' ? 'Storewide discount' : `Applies to ${form.applies.toLowerCase()}`}
                    </p>

                    {(form.minimum > 0 || form.expiry) && (
                      <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-2">
                        {form.minimum > 0 && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                            Valid on orders over €{form.minimum}
                          </p>
                        )}
                        {form.expiry && (
                          <p className="text-xs text-orange-600 flex items-center gap-1.5 font-medium">
                            <Calendar size={12}/>
                            Expires {new Date(`${form.expiry}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Tips */}
            <section className="bg-purple-50/50 rounded-2xl border border-purple-100 p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-800 mb-3 flex items-center gap-1.5">
                <AlertCircle size={14}/>
                Quick Tips
              </h4>
              <ul className="text-sm text-purple-900/80 space-y-2.5">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  Use clear, memorable codes (e.g., BLACKFRIDAY20).
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  Percentage discounts often convert better for items under €100.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  Setting an expiration date creates urgency and boosts sales.
                </li>
              </ul>
            </section>

          </div>
        </form>
      </div>
    </main>
  );
}

