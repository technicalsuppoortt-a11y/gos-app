import './automation-loading.css'
export function AutomationLoading({ label }: { label: string }) {
return <div className="automation-loading" role="status" aria-live="polite" aria-busy="true"><div className="automation-loading-caption"><span className="automation-loading-spinner" aria-hidden="true" />{label}</div><div aria-hidden="true" className="automation-loading-rows">{[0,1,2].map(i=><div className="automation-loading-row" key={i}><span/><span/><span/></div>)}</div></div>
}
