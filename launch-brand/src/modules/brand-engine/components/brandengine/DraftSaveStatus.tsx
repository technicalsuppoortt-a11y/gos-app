import { Check, Cloud, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { activityActions } from '../../store/activitySlice';
import { hasUnsavedBrandDraft, isDevPreview } from '../../services/brandDraft';
import { saveFailureMessage } from '../../data/saveFailure';

export function DraftSaveStatus() {
  const dispatch = useAppDispatch();
  const brand = useAppSelector(state => state.brand);
  const activity = useAppSelector(state => state.activity);
  const ar = brand.language === 'ar';
  const uid = brand.userProfile?.uid;
  const preview = isDevPreview();
  const dirty = Boolean(uid && hasUnsavedBrandDraft(uid));
  const failed = !preview && activity.status === 'error';
  const saving = !preview && activity.status === 'saving';
  const saved = !preview && activity.status === 'saved' && !dirty;
  const label = preview ? (ar ? 'معاينة محلية' : 'Local preview')
    : failed ? (ar ? 'تعذّر الحفظ' : 'Could not save')
    : saving ? (ar ? 'جارٍ الحفظ…' : 'Saving…')
    : saved ? (ar ? 'تم الحفظ' : 'Saved')
    : dirty ? (ar ? 'تغييرات غير محفوظة' : 'Unsaved changes')
    : (ar ? 'مسودة البراند' : 'Brand draft');
  return <div className="draft-save-status" data-state={failed ? 'error' : saved ? 'saved' : 'pending'}>
    <span role="status" aria-live="polite">
      {failed ? <TriangleAlert size={16} aria-hidden="true" /> : saving ? <LoaderCircle size={16} className="save-spin" aria-hidden="true" /> : saved ? <Check size={16} aria-hidden="true" /> : <Cloud size={16} aria-hidden="true" />}
      {label}
    </span>
    {failed && <><small>{saveFailureMessage(activity.saveErrorCode, ar)}</small><button type="button" onClick={() => dispatch(activityActions.retrySave())}>{ar ? 'إعادة المحاولة' : 'Retry'}</button></>}
  </div>;
}
