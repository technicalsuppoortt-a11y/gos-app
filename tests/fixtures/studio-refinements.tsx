import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { store } from '../../src/store';
import { Header } from '../../src/components/layout/Header';
import { Select } from '../../src/components/ui/Select';
import { EditorDatePicker } from '../../src/pages/booking/EditorDatePicker';
import '../../src/i18n/i18n';
import '../../src/index.css';
import '../../src/layout-shell.css';
import '../../src/global-controls.css';
import '../../src/theme-controls.css';
import '../../src/pages/booking/booking-workspace.css';
import '../../src/pages/booking/booking-editor-reference.css';

function Fixture() {
  const [currency, setCurrency] = useState('EUR');
  const [date, setDate] = useState('2026-11-02');
  return <div className="layout-dashboard-shell"><aside className="layout-sidebar" aria-label="Sidebar space"/><div className="layout-workspace" style={{ marginInlineStart: 0, minWidth: 0, width: '100%' }}>
    <Header title="AI Follow-up / Knowledge Studio / Customer support and multilingual product documentation"/>
    <main style={{ padding: 24, maxWidth: 500 }}>
      <h2>Dashboard controls</h2>
      <Select label="Billing currency" value={currency} onChange={setCurrency} options={['EUR', 'USD', 'EGP']}/>
      <output data-testid="currency">{currency}</output>
      <EditorDatePicker label="Review date" value={date} change={setDate}/>
      <output data-testid="date">{date}</output>
    </main>
  </div></div>;
}
createRoot(document.getElementById('root')!).render(<Provider store={store}><MemoryRouter initialEntries={['/dashboard/follow-up']}><Fixture/></MemoryRouter></Provider>);
