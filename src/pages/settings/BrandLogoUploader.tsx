import { useRef, useState } from 'react';
import { Image as ImageIcon, RefreshCw, RotateCcw, UploadCloud } from 'lucide-react';
import { DEFAULT_BRAND_LOGO_URL } from '../../backend/workspacePreferences';
import { useUILanguage } from '../../i18n/display';

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function formatAspectRatio(width: number, height: number): string {
  if (!width || !height) return '3.2:1';
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.06) return '1:1 (Square)';
  if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9 (Wide)';
  if (Math.abs(ratio - 4 / 3) < 0.08) return '4:3 (Standard)';
  if (Math.abs(ratio - 3 / 1) < 0.25) return `${ratio.toFixed(1)}:1 (Horizontal)`;
  const divisor = gcd(Math.round(width), Math.round(height));
  const rw = Math.round(width / divisor);
  const rh = Math.round(height / divisor);
  if (rw <= 20 && rh <= 20) return `${rw}:${rh}`;
  return `${ratio.toFixed(1)}:1`;
}

function deriveImageName(url: string, uploadedName?: string): string {
  if (uploadedName) return uploadedName;
  if (!url) return 'upclick-logo.svg';
  if (url.startsWith('data:image/')) {
    const ext = url.match(/^data:image\/([a-z0-9+]+);/i)?.[1]?.replace('+xml', '') || 'png';
    return `brand-logo.${ext}`;
  }
  try {
    const pathname = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
    const last = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '');
    return last || 'upclick-logo.svg';
  } catch {
    return 'upclick-logo.svg';
  }
}

export function BrandLogoUploader({
  logoUrl,
  brandName,
  disabled = false,
  busy = false,
  onChangeUrl,
  onUploadFile,
}: {
  logoUrl: string;
  brandName?: string;
  disabled?: boolean;
  busy?: boolean;
  onChangeUrl: (nextUrl: string) => void;
  onUploadFile?: (file: File) => Promise<void>;
}) {
  const ar = useUILanguage().startsWith('ar');
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>({ width: 242, height: 76 });
  const [imgError, setImgError] = useState(false);

  const activeLogo = logoUrl?.trim() || DEFAULT_BRAND_LOGO_URL;
  const displayFileName = deriveImageName(activeLogo, uploadedFileName);
  const aspectLabel = dimensions ? formatAspectRatio(dimensions.width, dimensions.height) : '3.2:1 (Horizontal)';
  const sizeLabel = dimensions ? `${dimensions.width} × ${dimensions.height} px` : 'SVG / Vector';

  async function handleFileSelect(file?: File) {
    if (!file || disabled || busy) return;
    setUploadedFileName(file.name);
    setImgError(false);
    // Instant live preview in 0ms before/during any background processing
    const objectUrl = URL.createObjectURL(file);
    onChangeUrl(objectUrl);
    if (onUploadFile) {
      try {
        await onUploadFile(file);
      } catch {
        // Fallback to data URL if background upload fails
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            onChangeUrl(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChangeUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="ws-logo-uploader">
      <div className="ws-logo-uploader-grid">
        {/* Live Logo Preview Card */}
        <div className="ws-logo-preview-card">
          <div className="ws-logo-preview-header">
            <span className="ws-logo-preview-title">
              <ImageIcon size={14} />
              {ar ? 'معاينة الشعار المباشرة' : 'Active Brand Logo Preview'}
            </span>
            <span className="ws-logo-status-pill">
              {activeLogo === DEFAULT_BRAND_LOGO_URL
                ? ar ? 'الافتراضي للمنصة' : 'System Default'
                : ar ? 'شعار مخصص' : 'Custom Logo'}
            </span>
          </div>

          <div className="ws-logo-preview-stage">
            <img
              key={activeLogo}
              src={imgError ? DEFAULT_BRAND_LOGO_URL : activeLogo}
              alt={brandName ? `${brandName} logo` : 'Brand logo preview'}
              className="ws-logo-preview-img"
              onLoad={e => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                }
              }}
              onError={() => setImgError(true)}
            />
          </div>

          <div className="ws-logo-meta-bar">
            <div className="ws-logo-meta-info">
              <b title={displayFileName}>{displayFileName}</b>
              <small>
                {ar ? 'نسبة الأبعاد:' : 'Aspect Ratio:'} {aspectLabel} · {sizeLabel}
              </small>
            </div>
            <div className="ws-logo-meta-actions">
              <button
                type="button"
                className="ws-logo-btn replace"
                disabled={disabled || busy}
                onClick={() => fileRef.current?.click()}
              >
                <RefreshCw size={13} />
                {ar ? 'استبدال' : 'Replace'}
              </button>
              <button
                type="button"
                className="ws-logo-btn remove"
                disabled={disabled || busy || activeLogo === DEFAULT_BRAND_LOGO_URL}
                onClick={() => {
                  setUploadedFileName('');
                  setImgError(false);
                  onChangeUrl(DEFAULT_BRAND_LOGO_URL);
                }}
                title={ar ? 'إعادة للشعار الافتراضي' : 'Reset to default logo'}
              >
                <RotateCcw size={13} />
                {ar ? 'إزالة / افتراضي' : 'Remove'}
              </button>
            </div>
          </div>
        </div>

        {/* Drag & Drop Upload Box + URL Input */}
        <div className="ws-logo-drop-column">
          <div
            className={`ws-logo-dropzone${dragging ? ' is-dragging' : ''}`}
            onDragOver={e => {
              e.preventDefault();
              if (!disabled && !busy) setDragging(true);
            }}
            onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
            }}
            onDrop={e => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFileSelect(file);
            }}
            onClick={() => !disabled && !busy && fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileRef.current?.click();
              }
            }}
          >
            <span className="ws-logo-drop-icon">
              <UploadCloud size={22} />
            </span>
            <b>
              {busy
                ? ar ? 'جاري رفع الشعار…' : 'Uploading brand logo…'
                : ar ? 'اسحب وأفلت الشعار هنا أو اضغط للاختيار' : 'Drag & drop your logo here, or click to browse'}
            </b>
            <small>
              {ar
                ? 'يدعم PNG وJPEG وWebP وSVG بحد أقصى 10 ميجابايت (يُنصح بنسبة أفقية 3:1 أو مربعة 1:1)'
                : 'Supports PNG, JPEG, WebP & SVG up to 10 MB · Recommended 3:1 horizontal or 1:1 square'}
            </small>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={e => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void handleFileSelect(file);
              }}
            />
          </div>

          <label className="ws-logo-url-field">
            <span>{ar ? 'رابط الشعار المباشر (Logo URL)' : 'Logo Image URL'}</span>
            <input
              type="text"
              dir="ltr"
              disabled={disabled || busy}
              value={logoUrl || DEFAULT_BRAND_LOGO_URL}
              onChange={e => {
                setUploadedFileName('');
                setImgError(false);
                onChangeUrl(e.target.value);
              }}
              placeholder="https://example.com/logo.svg or /upclick-logo.svg"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
