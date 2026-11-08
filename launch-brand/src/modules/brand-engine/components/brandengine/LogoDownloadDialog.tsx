import { brandEnginePortalContainer } from "../../lib/portalContainer";
import { useId, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, FileImage, FileCode2, Check, Loader2, X, ChevronDown } from 'lucide-react';
import { Button } from "@/modules/brand-engine/components/ui/button";
import "./LogoDownloadDialog.css";

type Props = {
  logoUrl: string;
  brandName: string;
  ar: boolean;
  original: boolean;
  raster?: boolean;
  disabled: boolean;
  onDownload: (format: "png" | "svg") => Promise<void>;
  concept?: boolean;
};

export function LogoDownloadDialog({
  logoUrl,
  brandName,
  ar,
  original,
  raster = false,
  disabled,
  onDownload,
  concept = false,
}: Props) {
  const formatId = useId();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"png" | "svg">("png");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const download = async () => {
    if (downloading || disabled) return;
    setDownloading(true);
    setError("");
    try {
      await onDownload(raster ? "png" : format);
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("Unable to download. Please try again.", "تعذّر التحميل. حاول مرة أخرى."),
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!downloading) {
          setOpen(value);
          setError("");
          if (value) setFormat("png");
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={concept ? "bs-concept-download" : "studio-logo-download-trigger"}
        >
          <Download aria-hidden="true" />
          {t("Download", "تحميل")}
          {!concept && <ChevronDown aria-hidden="true" />}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal container={brandEnginePortalContainer()}>
        <Dialog.Overlay className="studio-dialog-overlay studio-export-overlay" />
        <Dialog.Content className="studio-theme studio-export-dialog" dir={ar ? "rtl" : "ltr"}>
          <Dialog.Close
            className="studio-export-close"
            disabled={downloading}
            aria-label={t("Close", "إغلاق")}
          >
            <X size={18} />
          </Dialog.Close>
          <span className="studio-export-icon">
            <Download size={22} />
          </span>
          <Dialog.Title>{t("Download your logo", "تحميل اللوجو")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "Choose the right format for your next project.",
              "اختار الصيغة المناسبة لاستخدامك.",
            )}
          </Dialog.Description>
          <div className="studio-export-preview">
            <img src={logoUrl} alt={t("Logo preview", "معاينة اللوجو")} />
            <div>
              <strong>{brandName || t("Your brand", "البراند الخاص بك")}</strong>
              <small>
                {concept
                  ? t("Selected concept", "التصميم المختار")
                  : t("Current logo", "اللوجو الحالي")}
              </small>
            </div>
          </div>
          <fieldset className="studio-export-formats" disabled={downloading}>
            <legend>{t("File format", "صيغة الملف")}</legend>
            {(original ? (["original"] as const) : raster ? (["png"] as const) : (["png", "svg"] as const)).map((option) => {
              const selected = option === "original" || format === option || (raster && option === "png");
              const Icon = option === "svg" ? FileCode2 : FileImage;
              return (
                <label
                  key={option}
                  className={`studio-export-option${selected ? " is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name={formatId}
                    value={option}
                    checked={selected}
                    onChange={() => {
                      if (option !== "original") setFormat(option);
                    }}
                  />
                  <Icon size={22} aria-hidden="true" />
                  <span>
                    <strong>
                      {option === "original"
                        ? t("Original file", "الملف الأصلي")
                        : option.toUpperCase()}
                    </strong>
                    <small>
                      {option === "svg"
                        ? t(
                            "Scalable artwork for design and print",
                            "جودة ثابتة بكل المقاسات للتصميم والطباعة",
                          )
                        : option === "png"
                          ? raster ? t("Full resolution PNG with transparent background", "PNG بدقة الصورة الأصلية وخلفية شفافة") : t(
                              "Transparent background for web and social",
                              "خلفية شفافة للمواقع والسوشيال ميديا",
                            )
                          : t(
                              "Keep the uploaded file's format and quality",
                              "بنفس صيغة وجودة الملف المرفوع",
                            )}
                    </small>
                  </span>
                  <span className="studio-export-radio" aria-hidden="true">
                    {selected && <Check size={12} />}
                  </span>
                </label>
              );
            })}
          </fieldset>
          {error && (
            <p className="studio-export-error" role="alert">
              {error}
            </p>
          )}
          <div className="studio-export-footer">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={downloading}>
                {t("Cancel", "إلغاء")}
              </Button>
            </Dialog.Close>
            <Button
              className="studio-export-submit"
              disabled={downloading || disabled}
              onClick={() => void download()}
            >
              {downloading ? <Loader2 className="animate-spin" /> : <Download />}
              {downloading
                ? t("Preparing…", "جاري التجهيز…")
                : original
                  ? t("Download original", "تحميل الملف الأصلي")
                  : `${t("Download", "تحميل")} ${raster ? "PNG" : format.toUpperCase()}`}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
