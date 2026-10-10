
import { useNavigate, useParams } from 'react-router-dom';
import { showToast } from '../../utils/toast';
import { BookingBuilder } from './BookingBuilder';
import { KEYS, readPages, useStored } from './model';
import { Empty } from './ui';
import './booking-workspace.css';

export default function BookingEditorPage() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [pages,savePages] = useStored(KEYS.pages,readPages);
  const page = pages.find(p=>p.id===pageId);
  const close = ()=>navigate('/dashboard/booking?tab=dashboard');
  if(pageId && !page) return <section className="bk-workspace"><Empty title="Booking page not found" detail="The page may have been removed."/><button className="bk-button" onClick={close}>Back to booking pages</button></section>;
  return <BookingBuilder key={pageId||'new'} page={page} pages={pages} close={close} save={draft=>{
    try {savePages([...readPages().filter(p=>p.id!==draft.id),draft]);showToast.success(page?'Booking page updated.':'Booking page created.');close()}
    catch {showToast.error('Could not save changes. Browser storage may be full or unavailable.')}
  }}/>;
}


