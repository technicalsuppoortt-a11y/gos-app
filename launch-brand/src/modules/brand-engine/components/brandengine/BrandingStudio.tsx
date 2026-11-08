import { brandEnginePortalContainer } from "../../lib/portalContainer";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Heart,
  LoaderCircle,
  LockKeyhole,
  PanelsTopLeft,
  Save,
  Upload,
  X,
} from 'lucide-react';
import { AIGenerateMark } from "./AIGenerateMark";
import { Button } from "@/modules/brand-engine/components/ui/button";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { store } from "@/modules/brand-engine/store";
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import {
  brandFonts,
  arabicBrandFonts,
  brandContrastIssues,
  resolveBrandTheme,
  readableBrandForeground,
  type BrandColors,
  type BrandFont,
  type ArabicBrandFont,
  type BrandElement,
  type BrandElementAnswers,
  type BrandElementCandidate,
  type BrandElementGeneration,
  type BrandDirectionParts,
} from "@/modules/brand-engine/data/brandTheme";
import { useAIConnection } from "@/modules/brand-engine/hooks/useAIConnection";
import { generateBrandIdentity, generateBrandElement, aiError } from "@/modules/brand-engine/services/aiConnection";
import { uploadBrandImage, prepareBrandImage, brandUploadError } from "@/modules/brand-engine/services/brandAssets";
import { beginLogoSelection, logoSelectionVersion } from "@/modules/brand-engine/data/logoSelection";
import { saveBrandDraft } from "@/modules/brand-engine/services/brandDraft";
import {
  currentLogoFingerprint,
  currentLogoIdentity,
  ensureBrandLogoSaved,
} from "@/modules/brand-engine/services/brandLogoPersistence";
import {
  createBrandLogoSvg,
  prepareBrandLogoSvg,
  validateBrandLogoArtwork,
  logoDataUrl,
  logoPngFile,
  isRasterBrandLogo,
} from "@/modules/brand-engine/services/brandLogo";
import { rasterLogoPngFile } from "@/modules/brand-engine/services/logoImageAssets";
import { useDashboardBrand } from "./useDashboardBrand";
import {
  StudioBrandPreview,
  type StudioPreviewSurface,
  type StudioPreviewDevice,
} from "./StudioBrandPreview";
import { LogoDownloadDialog } from "./LogoDownloadDialog";
import "./BrandStudio.css";
import "./StudioGuided.css";
import "./BrandStudioWorkspace.css";
import "./StudioIdentityLayout.css";
import {
  brandGenerationFingerprint,
  brandElementFingerprint,
  effectiveBrandLocks,
  resolveIdentityLanguage,
} from "@/modules/brand-engine/data/ai/brandStudioCore.js";
import { serializeBrandPages } from "@/modules/brand-engine/data/brandPages";
import { motion } from "framer-motion";
import { usePageParameter } from "@/modules/brand-engine/hooks/usePageParameter";
import { getDiscoverySelection } from "@/modules/brand-engine/data/discovery";
import type { BrandIdentity } from "@/modules/brand-engine/data/types";
import { createLogoTemplateIdentities } from "@/modules/brand-engine/data/logoTemplates";
import { BrandLogoImage } from "./BrandLogoImage";
import { StudioGuidedChoices } from "./StudioGuidedChoices";
import { StudioElementGenerator } from "./StudioElementGenerator";
import { StudioOptionalDirections } from "./StudioOptionalDirections";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/modules/brand-engine/components/ui/sheet";
const colorLabels: Record<keyof BrandColors, [string, string]> = {
  primary: ["Brand color", "لون البراند"],
  buttonBackground: ["Button color", "لون الأزرار"],
  onPrimary: ["Button text", "نص الأزرار"],
  secondary: ["Secondary accent", "اللون الثانوي"],
  background: ["Page background", "خلفية الصفحة"],
  surface: ["Cards & panels", "الكروت والمربعات"],
  text: ["Main text", "النص الرئيسي"],
  mutedText: ["Supporting text", "النص الفرعي"],
  border: ["Borders", "الإطارات"],
  footerBackground: ["Footer background", "خلفية الفوتر"],
  headerBackground: ["Header background", "خلفية الهيدر"],
  success: ["Success", "النجاح"],
  warning: ["Warning", "التنبيه"],
  error: ["Error", "الخطأ"],
  focus: ["Focus outline", "إطار التحديد"],
};
const colorGroups: { label: [string, string]; keys: (keyof BrandColors)[] }[] = [
  { label: ["Brand colors", "ألوان البراند"], keys: ["primary", "secondary"] },
  { label: ["Button colors", "ألوان الأزرار"], keys: ["buttonBackground", "onPrimary"] },
  {
    label: ["Surfaces & text", "الخلفيات والنصوص"],
    keys: [
      "background",
      "surface",
      "text",
      "mutedText",
      "border",
      "footerBackground",
      "headerBackground",
    ],
  },
  {
    label: ["Interaction states", "حالات التفاعل"],
    keys: ["success", "warning", "error", "focus"],
  },
];
export type StudioSaveAction = { run: () => Promise<boolean>; disabled: boolean };
export type StudioResetAction = { run: () => void; disabled: boolean };

export function BrandingStudio({
  onSaveActionChange,
  onResetActionChange,
}: {
  onSaveActionChange?: (action: StudioSaveAction | null) => void;
  onResetActionChange?: (action: StudioResetAction | null) => void;
}) {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.brand);
  const ar = state.language === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const theme = resolveBrandTheme(state);
  const { connection } = useAIConnection();
  const brand = useDashboardBrand();

  const [advanced, setAdvanced] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewSurface, setPreviewSurface] = useState<StudioPreviewSurface>("dashboard");
  const [previewDevice, setPreviewDevice] = useState<StudioPreviewDevice>("desktop");
  const [busy, setBusy] = useState<"generate" | "upload" | "save" | null>(null);
  const [error, setError] = useState("");
  const [elementToGenerate, setElementToGenerate] = useState<BrandElement | null>(null);
  const activeElementRequest = useRef<{ fingerprint: string; id: string } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingLogo, setPendingLogo] = useState<{ uid: string; file: File; url: string } | null>(
    null,
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<
    "idle" | "uploading" | "saving" | "saved" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState("");
  useEffect(
    () => () => {
      if (pendingLogo) URL.revokeObjectURL(pendingLogo.url);
    },
    [pendingLogo],
  );
  const activeRequest = useRef<{ fingerprint: string; id: string } | null>(null);
  const currentUid = useRef(state.userProfile?.uid);
  currentUid.current = state.userProfile?.uid;
  useEffect(() => {
    setError("");

    setBusy(null);
    activeRequest.current = null;
    activeElementRequest.current = null;
    setElementToGenerate(null);
    setPendingLogo(null);
    setUploadPhase("idle");
    setUploadError("");
    setAdvanced(false);
    setPreview(false);
    setGalleryOpen(false);
    setAllConcepts(false);
  }, [state.userProfile?.uid]);
  const mode = state.theme === "dark" ? "dark" : "light";
  const colors = theme[mode];
  const issues = brandContrastIssues(theme, mode);
  const manualLogo = Boolean(
    state.pageParameters["branding"]?.["uploadedLogo"] && !brand.generatedLogo,
  );
  const customLogo = (
    manualLogo
      ? state.pageParameters["branding"]?.["uploadedLogo"]
      : state.pageParameters["branding"]?.["customLogo"]
  ) as { assetId?: string; origin?: string } | undefined;
  const customBrand = useDashboardBrand(customLogo ?? {});
  const updateColor = (key: keyof BrandColors, value: string) =>
    dispatch(
      actions.setBrandTheme({
        ...theme,
        paletteId: "custom",
        [mode]: {
          ...colors,
          [key]: value,
          ...(key === "primary" ? { focus: value } : {}),
          ...(key === "buttonBackground" ? { onPrimary: readableBrandForeground(value) } : {}),
        },
      }),
    );
  const save = async (): Promise<boolean> => {
    const uid = currentUid.current;
    if (busy || pendingLogo) return false;
    if (!uid) {
      toast.error(t("Sign in to save your brand.", "سجّل الدخول لحفظ البراند."));
      return false;
    }
    setBusy("save");
    setError("");

    try {
      if (!manualLogo) await ensureBrandLogoSaved();
      await saveBrandDraft();
      if (currentUid.current !== uid) return false;
      toast.success(t("Your brand is saved to your account.", "تم حفظ البراند في حسابك."));
      return true;
    } catch (e) {
      if (currentUid.current === uid) toast.error(e instanceof Error ? e.message : aiError(e, ar));
      return false;
    } finally {
      if (currentUid.current === uid) setBusy(null);
    }
  };
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    onSaveActionChange?.({ run: () => saveRef.current(), disabled: Boolean(busy || pendingLogo) });
  }, [onSaveActionChange, busy, pendingLogo]);
  useEffect(() => () => onSaveActionChange?.(null), [onSaveActionChange]);
  const connectionRef = useRef(connection);
  connectionRef.current = connection;
  const generationFingerprint = () => {
    const current = store.getState().brand;
    const pages = serializeBrandPages(current);
    return brandGenerationFingerprint(
      pages.find((p) => p.pageId === "business_discovery")?.parameters,
      pages.find((p) => p.pageId === "branding")?.parameters,
      current.language,
      connectionRef.current?.revision,
    );
  };
  const generate = async () => {
    const uid = currentUid.current;
    if (!connection || !uid || busy) return;
    if (!getDiscoverySelection(state.pageParameters["business_discovery"]?.["nicheSelection"])) {
      setError(
        t(
          "Choose your niche and sub-niche in Business Discover before generating a brand.",
          "اختار المجال والتخصص الفرعي في Business Discover قبل توليد البراند.",
        ),
      );
      return;
    }
    const pages = serializeBrandPages(state);
    dispatch(
      actions.setBrandLanguage(
        resolveIdentityLanguage(
          pages.find((p) => p.pageId === "business_discovery")?.parameters,
          pages.find((p) => p.pageId === "branding")?.parameters,
        ),
      ),
    );
    dispatch(
      actions.setBrandLocks({
        ...state.brandLocks,
        ...effectiveBrandLocks({
          brandName: state.brandName,
          brandLocks: state.brandLocks,
          choices: state.pageParameters["branding"],
        }),
      }),
    );
    let fingerprint: string;
    try {
      fingerprint = generationFingerprint();
    } catch (error) {
      setError(aiError(error, ar));
      return;
    }
    if (activeRequest.current?.fingerprint !== fingerprint)
      activeRequest.current = { fingerprint, id: crypto.randomUUID() };
    const requestId = activeRequest.current.id;
    setBusy("generate");
    setError("");

    try {
      await saveBrandDraft();
      if (currentUid.current !== uid) return;
      if (generationFingerprint() !== fingerprint)
        throw new Error("Brand inputs changed while saving.");
      const result = await generateBrandIdentity(requestId, state.language, fingerprint);
      if (currentUid.current !== uid) return;
      if (generationFingerprint() !== fingerprint || result.inputFingerprint !== fingerprint) {
        activeRequest.current = null;
        setError(
          t(
            "Your inputs changed. Generate again using the latest Discovery answers.",
            "المدخلات اتغيّرت. ولّد الهوية مرة أخرى باستخدام إجابات Discovery الحالية.",
          ),
        );
        return;
      }
      try {
        for (const candidate of result.candidates)
          validateBrandLogoArtwork({
            ...candidate,
            palette: candidate.theme.paletteId,
            typography: candidate.theme.typography.heading,
            vibe: "AI DIRECTION",
          });
      } catch (designError) {
        activeRequest.current = null;
        throw designError;
      }
      dispatch(actions.appendBrandCandidates(result.candidates));
      await saveBrandDraft();
      toast.success(
        t(
          "Three complete identities are ready. Choose one to apply.",
          "٣ هويات كاملة جاهزة. اختار الهوية المناسبة لتطبيقها.",
        ),
      );
      activeRequest.current = null;
    } catch (e) {
      if (currentUid.current === uid) setError(aiError(e, ar));
    } finally {
      if (currentUid.current === uid) setBusy(null);
    }
  };
  const generateElement = async (
    element: BrandElement,
    answers: BrandElementAnswers,
  ): Promise<boolean> => {
    const uid = currentUid.current;
    if (!uid || !connection || busy) return false;
    if (
      !getDiscoverySelection(
        store.getState().brand.pageParameters["business_discovery"]?.["nicheSelection"],
      )
    ) {
      setError(
        t(
          "Choose your niche and specialization in Discovery first.",
          "اختار المجال والتخصص في Discovery أولًا.",
        ),
      );
      return false;
    }
    if (
      element === "logo" &&
      (!state.brandName.trim() ||
        /^(brand name|your brand|اسم البراند|اسم العلامة التجارية)$/i.test(state.brandName.trim()))
    ) {
      setError(
        t(
          "Choose your brand name before generating a logo.",
          "اختار اسم البراند قبل توليد اللوجو.",
        ),
      );
      return false;
    }
    if (element === "name") {
      const discoveryLanguage = resolveIdentityLanguage(
        { choices: store.getState().brand.pageParameters["business_discovery"] },
        { brandLanguage: state.brandLanguage, choices: {} },
      );
      dispatch(
        actions.setBrandLanguage(
          ["Arabic", "English"].includes(answers.preference)
            ? answers.preference
            : discoveryLanguage,
        ),
      );
    }
    const fingerprint = brandElementFingerprint(generationFingerprint(), element, answers);
    if (activeElementRequest.current?.fingerprint !== fingerprint)
      activeElementRequest.current = { fingerprint, id: crypto.randomUUID() };
    const requestId = activeElementRequest.current.id;
    setBusy("generate");
    setError("");
    try {
      await saveBrandDraft();
      if (currentUid.current !== uid) return false;
      if (brandElementFingerprint(generationFingerprint(), element, answers) !== fingerprint)
        throw new Error(
          t("Your inputs changed. Generate again.", "المدخلات اتغيرت. ولّد من جديد."),
        );
      const result = await generateBrandElement(
        element,
        answers,
        requestId,
        state.language,
        fingerprint,
      );
      if (currentUid.current !== uid) return false;
      if (
        brandElementFingerprint(generationFingerprint(), element, answers) !== fingerprint ||
        result.inputFingerprint !== fingerprint
      )
        throw new Error(
          t("Your inputs changed. Generate again.", "المدخلات اتغيرت. ولّد من جديد."),
        );
      if (element === "logo")
        for (const c of result.suggestions)
          validateBrandLogoArtwork({
            ...store.getState().brand.selectedBrandIdentity,
            name: state.brandName,
            tagline: state.tagline,
            typography: theme.typography.heading,
            mark: c.mark!,
            logo: c.logo!,
          });
      const existing = (store.getState().brand.pageParameters["branding"]?.["elementGenerations"] ||
        {}) as Partial<Record<BrandElement, BrandElementGeneration>>;
      const previousGeneration = existing[element];
      const newSuggestions = result.suggestions.filter(
        (candidate) => !previousGeneration?.suggestions.some((saved) => saved.id === candidate.id),
      );
      dispatch(
        actions.setPageParameter({
          pageId: "branding",
          key: "elementGenerations",
          value: {
            ...existing,
            [element]: {
              answers,
              suggestions: [...(previousGeneration?.suggestions ?? []), ...newSuggestions],
              batches: [
                ...(previousGeneration?.batches ??
                  (previousGeneration
                    ? [
                        {
                          answers: previousGeneration.answers,
                          suggestionIds: previousGeneration.suggestions.map((item) => item.id),
                          inputFingerprint: previousGeneration.inputFingerprint,
                          promptVersion: previousGeneration.promptVersion,
                          generatedAt: 0,
                        },
                      ]
                    : [])),
                {
                  answers,
                  suggestionIds: newSuggestions.map((item) => item.id),
                  inputFingerprint: fingerprint,
                  promptVersion: result.promptVersion,
                  generatedAt: Date.now(),
                },
              ],
              inputFingerprint: fingerprint,
              promptVersion: result.promptVersion,
            },
          },
        }),
      );
      await saveBrandDraft();
      if (currentUid.current !== uid) return false;
      activeElementRequest.current = null;
      return true;
    } catch (e) {
      if ((e as { diagnostic?: string })?.diagnostic === "brand-invalid-logo")
        activeElementRequest.current = null;
      if (currentUid.current === uid) setError(aiError(e, ar));
      return false;
    } finally {
      if (currentUid.current === uid) setBusy(null);
    }
  };
  const applyElement = (element: BrandElement, candidate: BrandElementCandidate): boolean => {
    if (busy || pendingLogo) return false;
    const current = store.getState().brand;
    const generation = (
      current.pageParameters["branding"]?.["elementGenerations"] as
        Partial<Record<BrandElement, BrandElementGeneration>> | undefined
    )?.[element];
    if (!generation || !generation.suggestions.some((c) => c.id === candidate.id)) {
      setError(
        t(
          "This suggestion is no longer available. Open the saved suggestions again.",
          "الاقتراح ده مش متاح حاليًا. افتح الاقتراحات المحفوظة مرة أخرى.",
        ),
      );
      return false;
    }
    if (element === "logo" && currentUid.current) beginLogoSelection(currentUid.current);
    const selectedElementCandidates =
      (current.pageParameters["branding"]?.["selectedElementCandidates"] as
        Partial<Record<BrandElement, string>> | undefined) ?? {};
    dispatch(
      actions.setPageParameter({
        pageId: "branding",
        key: "selectedElementCandidates",
        value: { ...selectedElementCandidates, [element]: candidate.id },
      }),
    );
    dispatch(actions.applyBrandElement({ element, candidate }));
    setError("");
    return true;
  };
  const upload = async (file?: File) => {
    if (!file || busy) return;
    const uid = currentUid.current;
    if (!uid) {
      setUploadError(t("Sign in before uploading your logo.", "سجّل الدخول قبل رفع اللوجو."));
      return;
    }
    const selection = beginLogoSelection(uid);
    setBusy("upload");
    setUploadError("");
    setUploadProgress(0);
    setUploadPhase("uploading");
    try {
      await prepareBrandImage(file);
      if (currentUid.current !== uid) return;
      setPendingLogo({ uid, file, url: URL.createObjectURL(file) });
      setAllConcepts(true);
      setGalleryOpen(true);
      const asset = await uploadBrandImage(file, "logo", {
        metadata: { origin: "uploaded_logo" },
        activate: () => currentUid.current === uid && logoSelectionVersion(uid) === selection,
        onProgress: (progress) => {
          if (currentUid.current === uid) setUploadProgress(progress);
        },
      });
      if (currentUid.current !== uid) return;
      if (!asset.activated) {
        setPendingLogo(null);
        setUploadPhase("idle");
        return;
      }
      dispatch(actions.setBuilderBrandLinked(true));
      const { url: _previewUrl, activated: _activated, ...customAsset } = asset;
      dispatch(
        actions.setPageParameter({ pageId: "branding", key: "customLogo", value: customAsset }),
      );
      setUploadPhase("saving");
      await saveBrandDraft();
      if (currentUid.current !== uid) return;
      setUploadPhase("saved");
      setPendingLogo(null);
    } catch (e) {
      if (currentUid.current === uid) {
        setUploadPhase("error");
        setUploadError(brandUploadError(e, ar));
      }
    } finally {
      if (currentUid.current === uid) setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };
  const downloadLogo = async (format: "png" | "svg" = "png") => {
    if (manualLogo && brand.logoUrl) {
      const response = await fetch(brand.logoUrl);
      if (!response.ok)
        throw new Error(
          t(
            "Unable to download your logo. Please try again.",
            "تعذّر تحميل اللوجو. حاول مرة أخرى.",
          ),
        );
      const blob = await response.blob();
      const extension = (
        {
          "image/png": "png",
          "image/jpeg": "jpg",
          "image/webp": "webp",
          "image/svg+xml": "svg",
        } as Record<string, string>
      )[blob.type];
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.brandName.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60) || "brand"}-logo${extension ? `.${extension}` : ""}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const identity = currentLogoIdentity();
    const raster = isRasterBrandLogo(identity);
    if (raster && format === "svg") throw new Error(t("This logo is an image. Download it as PNG.", "اللوجو ده صورة. حمّله بصيغة PNG."));
    const svg = raster ? "" : await prepareBrandLogoSvg(identity, theme.light.primary);
    const file =
      raster ? await rasterLogoPngFile(identity) : format === "svg"
        ? new File(
            [svg],
            `${state.brandName.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60) || "brand"}-logo.svg`,
            { type: "image/svg+xml" },
          )
        : await logoPngFile(svg, state.brandName);
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const appliedDirectionId = state.pageParameters["branding"]?.["selectedDirectionId"];
  const appliedDirection = state.brandCandidates.find(
    (candidate) => candidate.id === appliedDirectionId,
  );
  // The selected identity is canonical, including any deliberately protected logo.
  const logoIdentity = {
    ...state.selectedBrandIdentity,
    name: state.brandName || appliedDirection?.name || state.selectedBrandIdentity.name,
    tagline: state.tagline,
    palette: state.brandPalette,
    typography: theme.typography.heading,
  };
  const language = state.language;
  const showAdvanced = advanced,
    setShowAdvanced = setAdvanced;
  const showPreview = preview,
    setShowPreview = setPreview;
  const generating = busy === "generate";
  const logoConceptsRef = useRef<HTMLElement>(null);
  const [favoriteIdentities, setFavoriteIdentities] = usePageParameter<string[]>(
    "branding",
    "favoriteIdentities",
    [],
  );
  const [showFavorites, setShowFavorites] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [allConcepts, setAllConcepts] = useState(false);
  const [logoRetry, setLogoRetry] = useState(0);
  const [logoStatus, setLogoStatus] = useState<"saving" | "saved" | "error">("saving");
  const [logoError, setLogoError] = useState("");
  const reset = () => {
    if (busy || pendingLogo) return;
    activeRequest.current = null;
    if (currentUid.current) beginLogoSelection(currentUid.current);
    dispatch(actions.resetBrandStudio());
    setAdvanced(false);
    setPreview(false);
    setGalleryOpen(false);
    setAllConcepts(false);
    setShowFavorites(false);
    // setCustomKeyword("");
    setError("");
    setUploadProgress(0);
    setUploadPhase("idle");
    setUploadError("");
    setLogoError("");
    if (fileInput.current) fileInput.current.value = "";
  };
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => {
    onResetActionChange?.({ run: () => resetRef.current(), disabled: Boolean(busy || pendingLogo) });
  }, [onResetActionChange, busy, pendingLogo]);
  useEffect(() => () => onResetActionChange?.(null), [onResetActionChange]);
  const fingerprint = currentLogoFingerprint();
  const savedLogo = state.pageParameters["branding"]?.["uploadedLogo"];
  useEffect(() => {
    if (!state.userProfile?.uid || busy === "upload" || pendingLogo) return;
    let active = true;
    setLogoError("");
    if (manualLogo) {
      setLogoStatus("saved");
      return;
    }
    setLogoStatus("saving");
    const timer = window.setTimeout(async () => {
      try {
        await ensureBrandLogoSaved();
        if (!active) return;
        await saveBrandDraft();
        if (active) setLogoStatus("saved");
      } catch (e) {
        if (active) {
          setLogoStatus("error");
          setLogoError(e instanceof Error ? e.message : "Logo save failed.");
        }
      }
    }, 700);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fingerprint, manualLogo, savedLogo, state.userProfile?.uid, logoRetry, busy, pendingLogo]);
  const { logo: _generatedGeometry, ...templateIdentity } = logoIdentity;
  const directionLogoCandidate =
    appliedDirection ??
    state.brandCandidates.find((candidate) => candidate.id === state.selectedBrandIdentity.id);
  const appliedConcept: BrandIdentity | null = directionLogoCandidate
    ? {
        id: directionLogoCandidate.id,
        name: directionLogoCandidate.name,
        tagline: directionLogoCandidate.tagline,
        palette: directionLogoCandidate.theme.paletteId,
        typography: directionLogoCandidate.theme.typography.heading,
        mark: directionLogoCandidate.mark,
        vibe: "AI DIRECTION",
        ...(directionLogoCandidate.arabicName
          ? { arabicName: directionLogoCandidate.arabicName }
          : {}),
        ...(directionLogoCandidate.logo ? { logo: directionLogoCandidate.logo } : {}),
      }
    : null;
  const templateConcepts = createLogoTemplateIdentities(templateIdentity, ar,
    /\p{Script=Arabic}/u.test(state.brandName) ? theme.typography.arabic : theme.typography.heading);
  const elementGenerations = state.pageParameters["branding"]?.["elementGenerations"] as
    Partial<Record<BrandElement, BrandElementGeneration>> | undefined;
  const generatedLogoConcepts: BrandIdentity[] = (elementGenerations?.logo?.suggestions ?? [])
    .filter(
      (
        candidate,
      ): candidate is BrandElementCandidate & {
        mark: BrandIdentity["mark"];
        logo: NonNullable<BrandIdentity["logo"]>;
      } => Boolean(candidate.mark && candidate.logo),
    )
    .map((candidate) => ({
      ...templateIdentity,
      id: candidate.id,
      mark: candidate.mark,
      logo: candidate.logo,
      vibe: "AI LOGO",
    }));
  const concepts = [
    ...(appliedConcept ? [appliedConcept] : []),
    ...generatedLogoConcepts,
    ...templateConcepts,
  ];
  const favoriteConcepts = concepts.filter((c) => favoriteIdentities.includes(c.id));
  const galleryConcepts = [...concepts].sort(
    (a, b) =>
      Number(b.id === state.selectedBrandIdentity.id) -
      Number(a.id === state.selectedBrandIdentity.id),
  );
  const visibleConcepts = showFavorites
    ? favoriteConcepts
    : allConcepts
      ? concepts
      : galleryConcepts.slice(0, customLogo ? 2 : 3);
  const applyDirection = async (
    candidate: import("@/modules/brand-engine/data/brandTheme").BrandCandidate,
    parts: BrandDirectionParts,
  ) => {
    if (busy || pendingLogo || !Object.values(parts).some(Boolean)) return;
    const nameGeneration = (
      store.getState().brand.pageParameters["branding"]?.["elementGenerations"] as
        Partial<Record<BrandElement, BrandElementGeneration>> | undefined
    )?.name;
    const selectedNames = store.getState().brand.pageParameters["branding"]?.[
      "selectedElementCandidates"
    ] as Partial<Record<BrandElement, string>> | undefined;
    const nameCandidate =
      nameGeneration?.suggestions.find((item) => item.id === selectedNames?.name) ||
      nameGeneration?.suggestions[0];
    const direction =
      parts.name && nameCandidate?.name
        ? {
            ...candidate,
            name: nameCandidate.name,
            arabicName: nameCandidate.arabicName || candidate.arabicName,
          }
        : candidate;
    const uid = currentUid.current;
    if (parts.logo && uid) beginLogoSelection(uid);
    dispatch(actions.applyBrandCandidate({ candidate: direction, parts }));
    requestAnimationFrame(() =>
      document.getElementById("studio-summary-heading")?.focus({ preventScroll: true }),
    );
    dispatch(
      actions.setPageParameter({
        pageId: "branding",
        key: "selectedDirectionId",
        value: candidate.id,
      }),
    );
    if (!uid) return;
    setBusy("save");
    try {
      if (parts.logo || !manualLogo) await ensureBrandLogoSaved();
      if (currentUid.current !== uid) return;
      await saveBrandDraft();
      if (currentUid.current !== uid) return;
      toast.success(
        t(
          "Selected changes applied and saved. Your other choices were kept.",
          "تم تطبيق التغييرات المحددة وحفظها مع الحفاظ على باقي اختياراتك.",
        ),
      );
    } catch (error) {
      if (currentUid.current === uid)
        toast.error(
          t(
            "The direction is applied in this session, but could not be saved. Please try Save again.",
            "تم تطبيق الاتجاه في الجلسة الحالية، لكن تعذر حفظه. جرّب الحفظ مرة أخرى.",
          ),
        );
    } finally {
      if (currentUid.current === uid) setBusy(null);
    }
  };
  const chooseIdentity = (identity: BrandIdentity) => {
    if (busy) return;
    if (currentUid.current) beginLogoSelection(currentUid.current);
    setPendingLogo(null);
    setUploadPhase("idle");
    setUploadError("");
    if (manualLogo)
      dispatch(
        actions.setPageParameter({
          pageId: "branding",
          key: "customLogo",
          value: state.pageParameters["branding"]?.["uploadedLogo"],
        }),
      );
    dispatch(actions.setPageParameter({ pageId: "branding", key: "uploadedLogo", value: null }));
    dispatch(
      actions.setPageParameter({ pageId: "branding", key: "selectedDirectionId", value: null }),
    );
    dispatch(actions.selectBrandIdentity(identity));
  };
  const chooseCustomLogo = () => {
    if (busy || pendingLogo || !customLogo?.assetId) return;
    if (currentUid.current) beginLogoSelection(currentUid.current);
    setUploadPhase("idle");
    setUploadError("");
    dispatch(
      actions.setPageParameter({ pageId: "branding", key: "uploadedLogo", value: customLogo }),
    );
    dispatch(actions.setBuilderBrandLinked(true));
  };
  const downloadIdentity = async (identity: BrandIdentity, format: "png" | "svg") => {
    const raster = isRasterBrandLogo(identity);
    if (raster && format === "svg") throw new Error(t("This logo is an image. Download it as PNG.", "اللوجو ده صورة. حمّله بصيغة PNG."));
    const svg = raster ? "" : await prepareBrandLogoSvg(identity, theme.light.primary);
    const file =
      raster ? await rasterLogoPngFile(identity) : format === "svg"
        ? new File(
            [svg],
            `${identity.name.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60) || "brand"}-logo.svg`,
            { type: "image/svg+xml" },
          )
        : await logoPngFile(svg, identity.name);
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const renderLogoConcept = (identity: BrandIdentity, index: number) => {
    const isTemplate = templateConcepts.some(template => template.id === identity.id);
    const selected = !manualLogo && !pendingLogo && state.selectedBrandIdentity.id === identity.id &&
      (!isTemplate || JSON.stringify(state.selectedBrandIdentity.logo?.paths) === JSON.stringify(identity.logo?.paths));
    const displayed: BrandIdentity = {
      ...identity,
      name: appliedDirection?.name || state.brandName || identity.name,
      tagline: state.tagline || identity.tagline,
      palette: state.brandPalette,
      typography: state.fontPersonality,
    };
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        key={identity.id}
        className={`bs-concept-card${selected ? " selected" : ""}`}
      >
        {selected && (
          <span className="bs-concept-selected">
            <Check />
            {language === "ar" ? "محدد" : "Selected"}
          </span>
        )}
        <button
          type="button"
          className="bs-concept-favorite"
          aria-label={`${favoriteIdentities.includes(identity.id) ? "Unfavorite" : "Favorite"} ${displayed.name} ${identity.vibe}`}
          aria-pressed={favoriteIdentities.includes(identity.id)}
          onClick={() =>
            setFavoriteIdentities((current) =>
              current.includes(identity.id)
                ? current.filter((id) => id !== identity.id)
                : [...current, identity.id],
            )
          }
        >
          <Heart />
        </button>
        <button
          type="button"
          className={`bs-concept-art palette-${displayed.palette} bs-concept-${identity.mark}`}
          style={{ fontFamily: displayed.typography }}
          aria-label={`Select ${displayed.name} ${identity.vibe}`}
          aria-pressed={selected}
          onClick={() => chooseIdentity(identity)}
        >
          <BrandLogoImage
            className="bs-logo-image"
            identity={displayed}
            primary={theme.light.primary}
            layout="horizontal"
          />
        </button>
        <div className="bs-logo-caption">
          <span>
            {isTemplate ? identity.vibe :
              {
                prism: "Geometric",
                flow: "Fluid",
                serif: "Monogram",
                nodes: "Connected",
                bilingual: "Bilingual",
                burst: "Emblem",
              }[identity.mark]
            }
          </span>
          <span
            className="bs-logo-color"
            style={{ background: theme.light.primary }}
            aria-label={displayed.palette}
          />
        </div>
        <button
          type="button"
          className="bs-concept-download"
          disabled={Boolean(busy)}
          onClick={() => chooseIdentity(identity)}
        >
          {selected ? <Check size={14} /> : null}
          {selected ? t("Selected", "تم الاختيار") : t("Choose this logo", "اختيار هذا اللوجو")}
        </button>
        <LogoDownloadDialog
          concept
          logoUrl={logoDataUrl(createBrandLogoSvg(displayed, theme.light.primary))}
          brandName={displayed.name}
          ar={ar}
          original={false}
          raster={isRasterBrandLogo(displayed)}
          disabled={false}
          onDownload={(format) => downloadIdentity(displayed, format)}
        />
      </motion.div>
    );
  };
  return (
    <div
      className="bs-root studio-theme studio-workspace studio-guided-workspace studio-reference-workspace"
      dir={ar ? "rtl" : "ltr"}
    >
      {/* Toolbar */}
      <div className="bs-toolbar">
        <div className="studio-page-heading">
          <span className="studio-page-number" aria-hidden="true">
            02
          </span>
          <div>
            <h1>AI Brand Studio</h1>
            <p>
              {t(
                "Build your brand one choice at a time.",
                "أنشئ هوية متناسقة تناسب مجالك وجمهورك وطموحك.",
              )}
            </p>
          </div>
        </div>
        <div className="bs-toolbar-actions">
          {/*
          <button
            className={`bs-preview-toggle ${showPreview ? "open" : ""}`}
            onClick={() => setShowPreview(!showPreview)}
            title={t("Preview your brand", "معاينة البراند")}
            aria-label={t("Preview your brand", "معاينة البراند")}
            aria-pressed={showPreview}
            type="button"
          >
            <Eye size={20} />
            <span>{t("Preview", "معاينة")}</span>
          </button>
          */}
          {/*
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="bs-adv-btn"
            aria-expanded={showAdvanced}
            aria-controls="studio-advanced-settings"
          >
            <Settings />
            {t("Advanced", "تخصيص متقدم")}
          </Button>
          */}
        </div>
      </div>

      {error && (
        <p className="bs-logo-save-status error" role="alert">
          {error}
        </p>
      )}
      {
        <StudioElementGenerator
          key={`element-generator-${currentUid.current}`}
          element={elementToGenerate}
          busy={Boolean(busy)}
          connected={Boolean(connection && !connection.aiPaused)}
          error={error}
          requestId={elementToGenerate ? activeElementRequest.current?.id : undefined}
          onClose={() => {
            setElementToGenerate(null);
            if (currentUid.current)
              void saveBrandDraft().catch((error) => toast.error(aiError(error, ar)));
          }}
          onGenerate={generateElement}
          onApply={applyElement}
        />
      }
      {/* More Settings Drawer */}
      <Sheet open={showAdvanced} onOpenChange={setShowAdvanced}>
        <SheetContent
          id="studio-advanced-settings"
          side={ar ? "left" : "right"}
          className="bs-root studio-theme studio-advanced-sheet"
          dir={ar ? "rtl" : "ltr"}
        >
          <SheetHeader>
            <SheetTitle>{t("Advanced customization", "تخصيص متقدم")}</SheetTitle>
            <SheetDescription>
              {t(
                "Optional details. Your identity already works without changing these.",
                "تفاصيل اختيارية. هويتك جاهزة من غير ما تحتاج تعدّلها.",
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="studio-advanced-groups">
            <details>
              <summary>{t("Appearance & protected details", "المظهر والتفاصيل المحمية")}</summary>
              <div className="brand-studio bs-custom-settings">
                <div className="brand-studio-fields">
                  <label>
                    {t("Sub-niche", "التخصص الفرعي")}
                    <input value={state.subNiche} maxLength={160} readOnly />
                  </label>
                  {/*<label>
                    {t("Custom tagline", "شعار نصي مخصص")}
                    <input
                      value={state.tagline}
                      maxLength={220}
                      onChange={(e) => dispatch(actions.setTagline(e.target.value))}
                    />
                  </label>*/}
                  <label>
                    {t("Button style", "ستايل الأزرار")}
                    <select
                      value={theme.buttons.variant}
                      onChange={(e) =>
                        dispatch(
                          actions.setBrandTheme({
                            ...theme,
                            buttons: {
                              ...theme.buttons,
                              variant: e.target.value as "solid" | "outline",
                            },
                          }),
                        )
                      }
                    >
                      <option value="solid">{t("Solid", "ممتلئ")}</option>
                      <option value="outline">{t("Outline", "إطار")}</option>
                    </select>
                  </label>
                  <label>
                    {t("Button shape", "شكل الأزرار")}
                    <select
                      value={theme.buttons.shape}
                      onChange={(e) =>
                        dispatch(
                          actions.setBrandTheme({
                            ...theme,
                            buttons: {
                              ...theme.buttons,
                              shape: e.target.value as "square" | "rounded" | "pill",
                            },
                          }),
                        )
                      }
                    >
                      <option value="square">{t("Square", "مربع")}</option>
                      <option value="rounded">{t("Rounded", "دائري")}</option>
                      <option value="pill">{t("Pill", "كبسولة")}</option>
                    </select>
                  </label>
                  <label>
                    {t("Body font", "خط النصوص")}
                    <select
                      value={theme.typography.body}
                      onChange={(e) =>
                        dispatch(
                          actions.setBrandTheme({
                            ...theme,
                            typography: { ...theme.typography, body: e.target.value as BrandFont },
                          }),
                        )
                      }
                    >
                      {brandFonts.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("Arabic font", "الخط العربي")}
                    <select
                      value={theme.typography.arabic}
                      onChange={(e) =>
                        dispatch(
                          actions.setBrandTheme({
                            ...theme,
                            typography: {
                              ...theme.typography,
                              arabic: e.target.value as ArabicBrandFont,
                            },
                          }),
                        )
                      }
                    >
                      {arabicBrandFonts.map((font) => <option key={font}>{font}</option>)}
                    </select>
                  </label>
                  <label>
                    {t("Corner radius", "دوران الحواف")}
                    <input
                      type="number"
                      min={0}
                      max={32}
                      value={theme.appearance.radius}
                      onChange={(e) =>
                        dispatch(
                          actions.setBrandTheme({
                            ...theme,
                            appearance: { ...theme.appearance, radius: Number(e.target.value) },
                          }),
                        )
                      }
                    />
                  </label>
                  <label>
                    {t("Density", "كثافة العناصر")}
                    <select
                      value={theme.appearance.density}
                      onChange={(e) =>
                        dispatch(
                          actions.setBrandTheme({
                            ...theme,
                            appearance: {
                              ...theme.appearance,
                              density: e.target.value as "compact" | "comfortable",
                            },
                          }),
                        )
                      }
                    >
                      <option value="comfortable">{t("Comfortable", "مريحة")}</option>
                      <option value="compact">{t("Compact", "مضغوطة")}</option>
                    </select>
                  </label>
                  <label>
                    {t("Shadow", "الظل")}
                    <select
                      value={theme.appearance.shadow}
                      onChange={(e) =>
                        dispatch(
                          actions.setBrandTheme({
                            ...theme,
                            appearance: {
                              ...theme.appearance,
                              shadow: e.target.value as "none" | "soft",
                            },
                          }),
                        )
                      }
                    >
                      <option value="soft">{t("Soft", "خفيف")}</option>
                      <option value="none">{t("None", "بدون")}</option>
                    </select>
                  </label>
                </div>
                <details className="bs-color-details">
                  <summary>
                    {t(
                      `${mode === "dark" ? "Dark" : "Light"} mode colors`,
                      `ألوان الوضع ${mode === "dark" ? "الداكن" : "الفاتح"}`,
                    )}
                  </summary>
                  <div className="studio-color-groups">
                    {colorGroups.map((group) => (
                      <fieldset key={group.label[0]}>
                        <legend>{t(...group.label)}</legend>
                        <div className="brand-studio-fields">
                          {group.keys.map((key) => (
                            <label key={key}>
                              {t(...colorLabels[key])}
                              <span className="brand-color-entry">
                                <input
                                  type="color"
                                  aria-label={key}
                                  value={colors[key]}
                                  disabled={key === "onPrimary"}
                                  title={
                                    key === "onPrimary"
                                      ? t(
                                          "Text adjusts automatically to your button color",
                                          "لون النص يتكيّف تلقائيًا مع لون الزر",
                                        )
                                      : undefined
                                  }
                                  onChange={(e) => updateColor(key, e.target.value)}
                                />
                                <span>
                                  {colors[key]}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </details>
                {issues.length > 0 && (
                  <p role="status" className="brand-studio-alert">
                    {t(
                      `Improve contrast: ${issues.join(", ")}`,
                      `عدّل التباين: ${issues.join("، ")}`,
                    )}
                  </p>
                )}
                <fieldset className="studio-protected-details">
                  <legend>
                    <LockKeyhole size={16} aria-hidden="true" />
                    {t("Protect your brand details", "حافظ على تفاصيل هويتك")}
                  </legend>
                  <p className="studio-settings-description">
                    {t(
                      "Your chosen details stay protected. Review and select any replacements yourself.",
                      "اختياراتك تفضل محفوظة. راجع وحدد بنفسك أي عناصر تحب تستبدلها.",
                    )}
                  </p>
                  <div className="brand-locks">
                    {(Object.keys(state.brandLocks) as Array<keyof typeof state.brandLocks>)
                      .filter(() => true)
                      .map((key) => (
                        <label className="brand-lock studio-lock-option" key={key}>
                          <input
                            type="checkbox"
                            checked={state.brandLocks[key]}
                            onChange={(e) =>
                              dispatch(
                                actions.setBrandLocks({
                                  ...state.brandLocks,
                                  [key]: e.target.checked,
                                }),
                              )
                            }
                          />
                          {t(
                            {
                              name: "Name",
                              logo: "Logo",
                              typography: "Typography",
                              tagline: "Tagline",
                              colors: "Colors",
                            }[key],
                            {
                              name: "الاسم",
                              tagline: "الشعار النصي",
                              colors: "الألوان",
                              typography: "الخطوط",
                              logo: "اللوجو",
                            }[key],
                          )}
                        </label>
                      ))}
                  </div>
                </fieldset>
                <label className="brand-lock studio-builder-link">
                  <span className="studio-builder-icon">
                    <PanelsTopLeft size={19} aria-hidden="true" />
                  </span>
                  <span className="studio-builder-copy">
                    <strong>
                      {t("Use this identity in the Builder", "استخدم الهوية دي في البيلدر")}
                    </strong>
                    <span className="studio-settings-description">
                      {t(
                        "Keep your website aligned with your brand.",
                        "خلّي تصميم موقعك متناسق مع هويتك.",
                      )}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={t(
                      "Use this identity in the Builder",
                      "استخدم الهوية دي في البيلدر",
                    )}
                    className="studio-builder-switch"
                    checked={state.builderBrandLinked}
                    onChange={(e) => dispatch(actions.setBuilderBrandLinked(e.target.checked))}
                  />
                </label>
                <div className="brand-studio-actions studio-settings-actions">
                  <Button
                    type="button"
                    className="studio-settings-save"
                    disabled={Boolean(busy)}
                    onClick={async () => {
                      if (await save()) setShowAdvanced(false);
                    }}
                  >
                    {busy === "save" ? (
                      <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Save size={16} aria-hidden="true" />
                    )}
                    {busy === "save" ? t("Saving…", "جارٍ الحفظ…") : t("Save brand", "حفظ البراند")}
                  </Button>
                </div>
              </div>
            </details>
          </div>
        </SheetContent>
      </Sheet>

      <div className="bs-main-split studio-workspace-grid">
        <div className="studio-workspace-column studio-workspace-primary">
          <StudioGuidedChoices
            key={`guided-${state.userProfile?.uid}`}
            busy={Boolean(busy || pendingLogo)}
            connected={Boolean(connection && !connection.aiPaused)}
            onApply={applyElement}
            onGenerate={(element) => {
              setError("");
              setElementToGenerate(element);
            }}
          />
          {/* Current logo and optional alternatives */}
          <section
            aria-labelledby="studio-logo-heading"
            className={`bs-logos-section studio-logo-section${galleryOpen ? " gallery-open" : ""}`}
            ref={logoConceptsRef}
            style={{ scrollMarginTop: 24 }}
          >
            <div className="bs-card-heading studio-logo-heading">
              <span className="studio-section-number">4</span>
              <div className="studio-logo-heading-copy">
                <h2 id="studio-logo-heading" tabIndex={-1}>
                  {language === "ar" ? "تصميمات اللوجو" : "Logo concepts"}
                </h2>
                <small>
                  {language === "ar"
                    ? "اختر شعارك. يتم حفظ صورته وتفاصيله تلقائيًا."
                    : "Choose a vector concept or upload your logo. Your selection is saved automatically."}
                </small>
              </div>
              <div className="studio-logo-heading-actions">
                <button
                  type="button"
                  id="studio-generate-logo"
                  className="studio-element-generate studio-generate-logo"
                  disabled={Boolean(busy || pendingLogo)}
                  onClick={() => {
                    setError("");
                    setElementToGenerate("logo");
                  }}
                >
                  <AIGenerateMark size={14} />
                  {t("Generate Logo", "ولّد اللوجو")}
                </button>
                <button
                  type="button"
                  className="studio-text-button studio-gallery-toggle"
                  aria-expanded={galleryOpen}
                  onClick={() => {
                    setAllConcepts(true);
                    setGalleryOpen(!galleryOpen);
                  }}
                >
                  {galleryOpen
                    ? t("Hide alternatives", "إخفاء البدائل")
                    : t("Show alternatives", "عرض البدائل")}
                  <ChevronDown size={13} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="bs-logo-workspace">
              <div className={`bs-logo-preview ${pendingLogo ? "pending" : ""}`}>
                {pendingLogo ? (
                  <img
                    src={pendingLogo.url}
                    alt={t("Selected logo preview", "معاينة اللوجو المختار")}
                  />
                ) : manualLogo ? (
                  brand.logoUrl ? (
                    <img src={brand.logoUrl} alt={state.brandName} />
                  ) : (
                    <span>
                      {brand.logoError
                        ? t("Could not load your saved logo", "تعذّر تحميل اللوجو المحفوظ")
                        : t("Loading your logo…", "جارٍ تحميل اللوجو…")}
                    </span>
                  )
                ) : (
                  <img
                    src={logoDataUrl(createBrandLogoSvg(logoIdentity, theme.light.primary))}
                    alt={state.brandName}
                  />
                )}
              </div>
              <div className="bs-logo-manager">
                <div className="bs-logo-manager-heading">
                  <strong>{t("Your brand logo", "لوجو البراند الخاص بك")}</strong>
                  <span
                    className={`bs-asset-badge ${uploadPhase === "error" ? "error" : pendingLogo ? "pending" : manualLogo ? "saved" : "concept"}`}
                  >
                    {pendingLogo
                      ? t("Not saved yet", "لم يُحفظ بعد")
                      : manualLogo
                        ? t("Current logo", "اللوجو الحالي")
                        : isRasterBrandLogo(logoIdentity) ? t("Generated logo image", "صورة اللوجو المولّدة") : t("Vector concept", "قالب فيكتور")}
                  </span>
                </div>
                <p>
                  {t(
                    "Upload your own logo. Once saved, it appears on your landing page and dashboard.",
                    "ارفع اللوجو الخاص بك. بعد الحفظ هيظهر في صفحة الهبوط والداشبورد.",
                  )}
                </p>
                <input
                  ref={fileInput}
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
                <div className="bs-logo-tools">
                  <Button disabled={Boolean(busy)} onClick={() => fileInput.current?.click()}>
                    <Upload />
                    {manualLogo || pendingLogo
                      ? t("Replace logo", "استبدال اللوجو")
                      : t("Upload your logo", "رفع اللوجو")}
                  </Button>
                  {pendingLogo && uploadPhase === "error" && (
                    <Button
                      variant="outline"
                      disabled={Boolean(busy)}
                      onClick={() => void upload(pendingLogo.file)}
                    >
                      {t("Retry upload", "إعادة الرفع")}
                    </Button>
                  )}
                </div>
                <small>PNG, JPG, WebP, SVG · {t("Up to 5 MB", "حتى ٥ ميجابايت")}</small>
                {(uploadPhase === "uploading" || uploadPhase === "saving") && (
                  <div className="bs-upload-progress" role="status">
                    <progress max={100} value={uploadProgress} />
                    <span>
                      {uploadPhase === "saving"
                        ? t("Saving your selection…", "جارٍ حفظ اختيارك…")
                        : t(`Uploading ${uploadProgress}%`, `جارٍ الرفع ${uploadProgress}%`)}
                    </span>
                  </div>
                )}
                {uploadError && (
                  <p className="bs-upload-error" role="alert">
                    {uploadError}
                  </p>
                )}
                {uploadPhase === "saved" && (
                  <p className="bs-upload-success" role="status">
                    <Check size={14} />
                    {t("Logo saved to your account", "تم حفظ اللوجو في حسابك")}
                  </p>
                )}
                {!pendingLogo && !manualLogo && (
                  <div
                    className={`bs-logo-save-status ${logoStatus}`}
                    role={logoError ? "alert" : "status"}
                  >
                    {logoError ||
                      (logoStatus === "saving"
                        ? t("Saving your concept…", "جارٍ حفظ القالب…")
                        : logoStatus === "saved"
                          ? t("Concept saved", "تم حفظ القالب")
                          : "")}
                    {logoStatus === "error" && (
                      <button type="button" onClick={() => setLogoRetry((value) => value + 1)}>
                        {t("Retry", "إعادة المحاولة")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Dialog.Root open={galleryOpen} onOpenChange={setGalleryOpen}>
              <Dialog.Portal container={brandEnginePortalContainer()}>
                <Dialog.Overlay className="studio-dialog-overlay" />
                <Dialog.Content
                  className="bs-root studio-theme studio-logo-dialog"
                  dir={ar ? "rtl" : "ltr"}
                >
                  <Dialog.Title>{t("Logo alternatives", "بدائل اللوجو")}</Dialog.Title>
                  <Dialog.Description>
                    {t(
                      "Choose a ready-made vector logo, personalize it with your brand, or save a favorite.",
                      "اختار لوجو جاهز باسم براندك وألوانك، أو احفظ القوالب اللي عجبتك في المفضلة.",
                    )}
                  </Dialog.Description>
                  <Dialog.Close
                    className="studio-dialog-close"
                    aria-label={t("Close alternatives", "إغلاق البدائل")}
                  >
                    <X size={20} />
                  </Dialog.Close>
                  {!showFavorites && galleryOpen && (
                    <button
                      type="button"
                      className="studio-text-button studio-more-logos"
                      onClick={() => setAllConcepts(!allConcepts)}
                    >
                      {allConcepts
                        ? t("Fewer choices", "اختيارات أقل")
                        : t("Show more designs", "عرض تصميمات أخرى")}
                    </button>
                  )}
                  <div
                    className="bs-concept-filters"
                    role="group"
                    aria-label={language === "ar" ? "عرض الشعارات" : "Show logo concepts"}
                  >
                    <button
                      type="button"
                      aria-pressed={!showFavorites}
                      onClick={() => setShowFavorites(false)}
                    >
                      {language === "ar" ? "كل الشعارات" : "All Concepts"} (
                      {concepts.length + (customLogo || pendingLogo ? 1 : 0)})
                    </button>
                    <button
                      type="button"
                      aria-pressed={showFavorites}
                      onClick={() => setShowFavorites(true)}
                    >
                      <Heart />
                      {language === "ar" ? "العلامات المفضلة" : "Favorite Brands"} (
                      {favoriteConcepts.length})
                    </button>
                  </div>

                  {generating ? (
                    <div className="bs-generating" role="status">
                      <AIGenerateMark size={16} />
                      <strong>
                        {t(
                          "Creating three tailored directions…",
                          "جارٍ إنشاء ٣ اتجاهات مناسبة لبيزنسك…",
                        )}
                      </strong>
                      <span>
                        {t(
                          "Your existing brand stays saved while your provider responds.",
                          "هويتك الحالية محفوظة لحد ما المزوّد يرد.",
                        )}
                      </span>
                    </div>
                  ) : showFavorites && favoriteConcepts.length === 0 ? (
                    <p className="bs-concept-empty" role="status">
                      {language === "ar"
                        ? "لا توجد علامات مفضلة بعد. اضغط على القلب بجوار أي شعار لإضافته هنا."
                        : "No favorite brands yet. Heart a logo concept to find it here."}
                    </p>
                  ) : (
                    <div
                      className={`bs-concept-grid${!showFavorites && (customLogo || pendingLogo) ? " with-custom-logo" : ""}`}
                    >
                      {!showFavorites && (customLogo || pendingLogo) && (
                        <div
                          className={`bs-concept-card bs-custom-logo-card${manualLogo && !pendingLogo ? " selected" : ""}`}
                        >
                          {manualLogo && !pendingLogo && (
                            <span className="bs-concept-selected">
                              <Check />
                              {t("Selected", "محدد")}
                            </span>
                          )}
                          <button
                            type="button"
                            className="bs-concept-art bs-custom-logo-art"
                            aria-label={t("Select your custom logo", "اختيار اللوجو المخصص")}
                            aria-pressed={manualLogo && !pendingLogo}
                            disabled={Boolean(busy) || Boolean(pendingLogo) || !customBrand.logoUrl}
                            onClick={chooseCustomLogo}
                          >
                            {pendingLogo?.url || customBrand.logoUrl ? (
                              <img
                                className="bs-logo-image"
                                src={pendingLogo?.url || customBrand.logoUrl}
                                alt={t("Your custom logo", "اللوجو المخصص")}
                              />
                            ) : (
                              <span>
                                {customBrand.logoError
                                  ? t("Could not load logo", "تعذّر تحميل اللوجو")
                                  : t("Loading logo…", "جارٍ تحميل اللوجو…")}
                              </span>
                            )}
                          </button>
                          <div className="bs-logo-caption">
                            <span>{t("Custom logo", "لوجو مخصص")}</span>
                            {pendingLogo && <span>{t("Not saved yet", "لم يُحفظ بعد")}</span>}
                          </div>
                          <div className="bs-custom-logo-actions">
                            <button
                              type="button"
                              className="bs-concept-download"
                              disabled={
                                Boolean(busy) || Boolean(pendingLogo) || !customLogo?.assetId
                              }
                              onClick={chooseCustomLogo}
                            >
                              {manualLogo && !pendingLogo ? <Check /> : null}
                              {manualLogo && !pendingLogo
                                ? t("Selected", "محدد")
                                : t("Choose this logo", "اختيار هذا اللوجو")}
                            </button>
                            <LogoDownloadDialog
                              concept
                              logoUrl={customBrand.logoUrl || ""}
                              brandName={state.brandName}
                              ar={ar}
                              original={Boolean(manualLogo)}
                              disabled={
                                Boolean(busy) || Boolean(pendingLogo) || !customBrand.logoUrl
                              }
                              onDownload={downloadLogo}
                            />
                          </div>
                        </div>
                      )}
                      {visibleConcepts.map(renderLogoConcept)}
                    </div>
                  )}
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </section>
          <StudioOptionalDirections
            key={state.userProfile?.uid}
            busy={Boolean(busy || pendingLogo)}
            connected={Boolean(connection && !connection.aiPaused)}
            generating={generating && !elementToGenerate}
            requestId={!elementToGenerate ? activeRequest.current?.id : undefined}
            error={error}
            logoUrl={brand.logoUrl}
            onGenerate={() => void generate()}
            onGenerateName={() => {
              setError("");
              setElementToGenerate("name");
            }}
            onApply={(candidate, parts) => void applyDirection(candidate, parts)}
          />
        </div>
        <div className="studio-workspace-column studio-workspace-secondary">
          <section className="studio-preview-launch" aria-labelledby="studio-preview-heading">
            <div className="studio-section-heading">
              <div>
                <h2 id="studio-preview-heading">{t("Brand Preview", "معاينة البراند")}</h2>
                <p>
                  {t(
                    "See your identity on your landing page and dashboard.",
                    "شوف هويتك على صفحة الهبوط والداشبورد.",
                  )}
                </p>
              </div>
            </div>
            <StudioBrandPreview
              surface={previewSurface}
              device={previewDevice}
              onSurfaceChange={setPreviewSurface}
              onDeviceChange={setPreviewDevice}
              onExpand={() => setShowPreview(true)}
            />
          </section>
          <section className="studio-assets" aria-labelledby="studio-assets-heading">
            <div className="studio-section-heading">
              <div>
                <h2 id="studio-assets-heading">{t("Brand Assets", "أصول البراند")}</h2>
                <p>
                  {t(
                    "Your current logo, colors and typography.",
                    "اللوجو والألوان والخطوط الحالية.",
                  )}
                </p>
              </div>
            </div>
            <div className="studio-assets-grid">
              <article>
                <img
                  src={
                    brand.logoUrl ||
                    logoDataUrl(createBrandLogoSvg(logoIdentity, theme.light.primary))
                  }
                  alt={t("Current logo", "اللوجو الحالي")}
                />
                <strong>{t("Logo", "اللوجو")}</strong>
                <LogoDownloadDialog
                  logoUrl={
                    brand.logoUrl ||
                    logoDataUrl(createBrandLogoSvg(logoIdentity, theme.light.primary))
                  }
                  brandName={state.brandName}
                  ar={ar}
                  original={manualLogo}
                  raster={isRasterBrandLogo(logoIdentity)}
                  disabled={Boolean(busy) || (manualLogo && !brand.logoUrl) || Boolean(pendingLogo)}
                  onDownload={downloadLogo}
                />
              </article>
              <article>
                <div className="studio-asset-swatches">
                  {[theme.light.primary, theme.light.secondary, theme.light.buttonBackground].map(
                    (color, i) => (
                      <i key={i} style={{ background: color }} title={color} />
                    ),
                  )}
                </div>
                <strong>{t("Color palette", "ألوان البراند")}</strong>
                <small dir="ltr">{theme.light.primary}</small>
                <span>{t("Current colors", "الألوان الحالية")}</span>
              </article>
              <article>
                <div
                  className="studio-asset-type"
                  style={{ fontFamily: ar ? theme.typography.arabic : theme.typography.heading }}
                >
                  {ar ? "أب" : "Aa"}
                </div>
                <strong>{t("Typography", "الخطوط")}</strong>
                <small>{theme.typography.heading}</small>
                <span>{theme.typography.arabic}</span>
              </article>
            </div>
          </section>
        </div>
        <Dialog.Root open={showPreview} onOpenChange={setShowPreview}>
          <Dialog.Portal container={brandEnginePortalContainer()}>
            <Dialog.Overlay className="studio-dialog-overlay" />
            <Dialog.Content
              className="bs-root studio-theme studio-preview-dialog studio-preview-workbench"
              dir={ar ? "rtl" : "ltr"}
            >
              <Dialog.Title>{t("Your brand in action", "شوف هويتك على مشروعك")}</Dialog.Title>
              <Dialog.Description>
                {t(
                  "Your actual landing page and dashboard, using the current draft.",
                  "صفحة الهبوط والداشبورد الفعليين بالمسودة الحالية.",
                )}
              </Dialog.Description>
              <Dialog.Close
                className="studio-dialog-close"
                aria-label={t("Close preview", "إغلاق المعاينة")}
              >
                <X size={20} />
              </Dialog.Close>
              <StudioBrandPreview
                surface={previewSurface}
                device={previewDevice}
                onSurfaceChange={setPreviewSurface}
                onDeviceChange={setPreviewDevice}
                expanded
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}
