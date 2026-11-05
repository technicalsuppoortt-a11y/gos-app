import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import {
  ArrowRightLeft,
  BookOpen,
  Building2,
  Check,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  FolderKanban,
  Globe2,
  Image as ImageIcon,
  Layers3,
  LayoutGrid,
  LayoutTemplate,
  List,
  Palette,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { auth, backendError, callBackend, db, primaryDb, storage } from '../../backend/firebase';
import { decodeFirestoreValue } from '../../backend/firestoreCodec';
import { switchToUser } from '../../backend/impersonation';
import { uploadBrandFile } from '../../backend/workspacePreferences';
import { AGENCY_LANDING_PREFIX } from '../agency-landing-asset';
import { assetSubtype } from './live-model';
import { AdminSitePreview, type SitePreview } from './AdminSitePreview';
import { LiveDialog, StatusPill } from './AdminLiveUI';
import { useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import type { RootState } from '../../store';
import type { Invite } from '../onboarding/onboarding-store';
import './business-assets.css';

export type BrandResourceCategory = 'Brand asset' | 'Media kit' | 'Knowledge resource';

export interface SharedBrandAsset {
  id: string;
  workspaceId: string;
  name: string;
  category: BrandResourceCategory | string;
  url: string;
  path?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface WorkspaceDigitalAsset {
  id: string;
  workspaceId: string;
  name: string;
  subtype: 'Landing Page' | 'Websites' | 'Funnels' | 'Forms';
  isRootLanding: boolean;
  status: string;
  image: string;
  description: string;
  domain: string;
  pagesCount: number;
  updated: string;
  raw: Record<string, any>;
}

interface WorkspaceDirectoryEntry {
  workspaceId: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  accountType: 'agency' | 'team' | 'admin';
  userRecord?: Invite;
}

interface WorkspaceMetadata {
  accountType?: 'agency';
  ownerId?: string;
  ownerUid?: string;
  ownerName?: string;
  name?: string;
  agencyLandingSeeded?: boolean;
}

type CategoryFilter =
  | 'all'
  | 'websites'
  | 'funnels'
  | 'Brand asset'
  | 'Media kit'
  | 'Knowledge resource';

type ScopeFilter = 'all' | 'agency' | 'team' | 'admin';

function isImageUrl(url: string, path?: string): boolean {
  const target = `${url} ${path ?? ''}`.toLowerCase();
  return (
    /\.(png|jpe?g|webp|svg|gif|avif)(\?|#|$)/i.test(target) ||
    target.startsWith('data:image/') ||
    (target.includes('firebasestorage.googleapis.com') &&
      !/\.(pdf|txt)(\?|#|$)/i.test(target))
  );
}

function formatTimestamp(value: unknown, ar: boolean): string {
  if (!value) return '';
  let date: Date | null = null;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  } else if (typeof value === 'object' && value !== null) {
    const seconds = (value as { seconds?: number; _seconds?: number }).seconds ??
      (value as { _seconds?: number })._seconds;
    if (typeof seconds === 'number') date = new Date(seconds * 1000);
  }
  if (!date) return '';
  return date.toLocaleDateString(ar ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(label: string): string {
  const clean = (label || 'WS').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export function BusinessAssets({ tenantId }: { tenantId: string }) {
  const navigate = useNavigate();
  const ar = useUILanguage().startsWith('ar');
  const t = (en: string, arabic: string) => (ar ? arabic : en);

  const authState = useSelector((s: RootState) => s.auth);
  const isAdminView =
    !authState.impersonation &&
    (authState.role === 'ADMIN' || authState.role === 'SUPER_ADMIN');
  const activeFirestore = isAdminView ? primaryDb : db;

  const fileInput = useRef<HTMLInputElement>(null);

  // Directory state (for Admin multi-workspace & Agency user sync)
  const [tenantsMap, setTenantsMap] = useState<Record<string, WorkspaceMetadata>>({});
  const [usersMap, setUsersMap] = useState<Record<string, Invite>>({});
  const [sharedAssetsMap, setSharedAssetsMap] = useState<Record<string, SharedBrandAsset[]>>({});
  const [digitalAssetsMap, setDigitalAssetsMap] = useState<Record<string, WorkspaceDigitalAsset[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Upload / Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [targetWorkspace, setTargetWorkspace] = useState(tenantId);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<BrandResourceCategory>('Brand asset');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(null);

  // Explorer filters & modals
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sitePreview, setSitePreview] = useState<SitePreview | null>(null);
  const [resourcePreview, setResourcePreview] = useState<SharedBrandAsset | null>(null);

  useEffect(() => {
    setTargetWorkspace(selectedWorkspaceId || tenantId);
  }, [selectedWorkspaceId, tenantId]);

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl('');
      return;
    }
    if (file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file);
      setFilePreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setFilePreviewUrl('');
  }, [file]);

  // Real-time listeners for workspaces, Agency user accounts, digital assets, and brand files
  useEffect(() => {
    setLoading(true);
    setError('');
    setTenantsMap({});
    setUsersMap({});
    setSharedAssetsMap({});
    setDigitalAssetsMap({});

    if (!isAdminView) {
      // Single-workspace mode (User / Agency user dashboard)
      const unsubTenant = onSnapshot(
        doc(db, 'tenants', tenantId),
        snap => {
          const data = snap.data() ?? {};
          setTenantsMap({ [tenantId]: data });
        },
        () => {}
      );

      const unsubBusiness = onSnapshot(
        collection(db, 'tenants', tenantId, 'businessAssets'),
        snap => {
          setSharedAssetsMap({
            [tenantId]: snap.docs.map(d => ({
              id: d.id,
              workspaceId: tenantId,
              name: String(d.data().name ?? d.id),
              category: String(d.data().category ?? 'Brand asset'),
              url: String(d.data().url ?? ''),
              path: d.data().path,
              createdAt: formatTimestamp(d.data().createdAt, ar),
              createdBy: d.data().createdBy,
            })),
          });
          setLoading(false);
        },
        e => {
          setError(backendError(e));
          setLoading(false);
        }
      );

      const unsubDigital = onSnapshot(
        collection(db, 'tenants', tenantId, 'assets'),
        snap => {
          setDigitalAssetsMap({
            [tenantId]: snap.docs.map(d => {
              const data = decodeFirestoreValue(d.data()) as Record<string, any>;
              const isRootLanding = d.id.startsWith(AGENCY_LANDING_PREFIX);
              const baseSubtype = assetSubtype(data);
              return {
                id: d.id,
                workspaceId: tenantId,
                name: String(data.name || d.id),
                subtype: isRootLanding ? 'Landing Page' : baseSubtype,
                isRootLanding,
                status: String(data.document?.funnel?.status ?? data.status ?? 'Draft'),
                image: String(data.image || '/dashboard/hero-landscape.png'),
                description: String(data.description || ''),
                domain: String(data.publishedUrl || data.domain || ''),
                pagesCount: Array.isArray(data.document?.pages) ? data.document.pages.length : 1,
                updated: formatTimestamp(data.updated || data.createdAt, ar),
                raw: data,
              };
            }),
          });
        },
        () => {}
      );

      return () => {
        unsubTenant();
        unsubBusiness();
        unsubDigital();
      };
    }

    // Admin multi-workspace mode: watch all tenants + users + each tenant's businessAssets & digital assets
    const perTenantUnsubs = new Map<string, () => void>();
    const preparing = new Set<string>();

    const attachWorkspaceListeners = (wid: string) => {
      if (!wid || perTenantUnsubs.has(wid)) return;
      const unsubBiz = onSnapshot(
        collection(primaryDb, 'tenants', wid, 'businessAssets'),
        snap => {
          setSharedAssetsMap(prev => ({
            ...prev,
            [wid]: snap.docs.map(d => ({
              id: d.id,
              workspaceId: wid,
              name: String(d.data().name ?? d.id),
              category: String(d.data().category ?? 'Brand asset'),
              url: String(d.data().url ?? ''),
              path: d.data().path,
              createdAt: formatTimestamp(d.data().createdAt, ar),
              createdBy: d.data().createdBy,
            })),
          }));
        },
        () => {}
      );

      const unsubDig = onSnapshot(
        collection(primaryDb, 'tenants', wid, 'assets'),
        snap => {
          setDigitalAssetsMap(prev => ({
            ...prev,
            [wid]: snap.docs.map(d => {
              const data = decodeFirestoreValue(d.data()) as Record<string, any>;
              const isRootLanding = d.id.startsWith(AGENCY_LANDING_PREFIX);
              const baseSubtype = assetSubtype(data);
              return {
                id: d.id,
                workspaceId: wid,
                name: String(data.name || d.id),
                subtype: isRootLanding ? 'Landing Page' : baseSubtype,
                isRootLanding,
                status: String(data.document?.funnel?.status ?? data.status ?? 'Draft'),
                image: String(data.image || '/dashboard/hero-landscape.png'),
                description: String(data.description || ''),
                domain: String(data.publishedUrl || data.domain || ''),
                pagesCount: Array.isArray(data.document?.pages) ? data.document.pages.length : 1,
                updated: formatTimestamp(data.updated || data.createdAt, ar),
                raw: data,
              };
            }),
          }));
        },
        () => {}
      );

      perTenantUnsubs.set(wid, () => {
        unsubBiz();
        unsubDig();
      });
    };

    attachWorkspaceListeners(tenantId);

    const unsubUsers = onSnapshot(
      query(collection(primaryDb, 'users'), where('role', '==', 'USER')),
      snap => {
        const nextUsers: Record<string, Invite> = {};
        snap.docs.forEach(item => {
          const data = item.data();
          if (data.activatedUid) return;
          const invite = { ...data, id: item.id } as Invite;
          nextUsers[item.id] = invite;
          if (invite.tenantId) {
            attachWorkspaceListeners(invite.tenantId);
          }
        });
        setUsersMap(nextUsers);
      },
      () => {}
    );

    const unsubTenants = onSnapshot(
      collection(primaryDb, 'tenants'),
      { includeMetadataChanges: true },
      snap => {
        const nextTenants: Record<string, WorkspaceMetadata> = {};
        snap.docs.forEach(item => {
          const data: WorkspaceMetadata = item.data();
          nextTenants[item.id] = data;
          attachWorkspaceListeners(item.id);
          if (!snap.metadata.fromCache && data.accountType === 'agency' && !data.agencyLandingSeeded && data.ownerId && !preparing.has(item.id)) {
            preparing.add(item.id);
            void callBackend('prepareAgencyWorkspace', { id: data.ownerId, language: ar ? 'ar' : 'en' }).catch(error => {
              console.warn('Could not prepare the Agency user workspace.', error);
            });
          }
        });
        setTenantsMap(nextTenants);
        setLoading(false);
      },
      e => {
        setError(backendError(e));
        setLoading(false);
      }
    );

    return () => {
      unsubUsers();
      unsubTenants();
      perTenantUnsubs.forEach(fn => fn());
      perTenantUnsubs.clear();
    };
  }, [tenantId, isAdminView, ar]);

  // Build normalized directory of workspaces (Admin, Agency users, Team Members)
  const workspaces = useMemo<WorkspaceDirectoryEntry[]>(() => {
    const entries = new Map<string, WorkspaceDirectoryEntry>();

    // Ensure current tenant is always represented
    entries.set(tenantId, {
      workspaceId: tenantId,
      name: isAdminView
        ? t('Admin Main Workspace', 'مساحة عمل المسؤول الرئيسية')
        : authState.tenant?.name || t('My Workspace', 'مساحة عملي'),
      ownerId: authState.user?.id || '',
      ownerName: authState.user?.name || (isAdminView ? 'Admin' : 'Workspace Owner'),
      ownerEmail: authState.user?.email || '',
      accountType:
        tenantsMap[tenantId]?.accountType === 'agency'
          ? 'agency'
          : isAdminView
          ? 'admin'
          : 'team',
    });

    Object.entries(tenantsMap).forEach(([wid, tData]) => {
      const ownerId = String(tData.ownerId || tData.ownerUid || '');
      const ownerUser = usersMap[ownerId];
      const isAgency =
        tData.accountType === 'agency' || ownerUser?.accountType === 'agency';
      const isMainAdmin = wid === tenantId && isAdminView && !ownerUser;
      entries.set(wid, {
        workspaceId: wid,
        name: String(
          tData.name ||
            (ownerUser?.name ? `${ownerUser.name}'s workspace` : wid)
        ),
        ownerId,
        ownerName: String(
          ownerUser?.name ||
            tData.ownerName ||
            (isMainAdmin ? authState.user?.name || 'Admin' : wid)
        ),
        ownerEmail: String(ownerUser?.email || ''),
        accountType: isAgency ? 'agency' : isMainAdmin ? 'admin' : 'team',
        userRecord: ownerUser,
      });
    });

    Object.values(usersMap).forEach(u => {
      const wid = u.tenantId || `workspace-${u.id}`;
      const existing = entries.get(wid);
      const isAgency =
        u.accountType === 'agency' || existing?.accountType === 'agency';
      entries.set(wid, {
        workspaceId: wid,
        name: existing?.name || `${u.name || u.email.split('@')[0]}'s workspace`,
        ownerId: u.id,
        ownerName: u.name || u.email.split('@')[0],
        ownerEmail: u.email,
        accountType: isAgency ? 'agency' : 'team',
        userRecord: u,
      });
    });

    return [...entries.values()].sort((a, b) => {
      const rank = { agency: 0, admin: 1, team: 2 };
      if (rank[a.accountType] !== rank[b.accountType]) {
        return rank[a.accountType] - rank[b.accountType];
      }
      return a.ownerName.localeCompare(b.ownerName);
    });
  }, [tenantsMap, usersMap, tenantId, isAdminView, authState.tenant?.name, authState.user]);

  const workspaceById = useMemo(() => {
    const map: Record<string, WorkspaceDirectoryEntry> = {};
    workspaces.forEach(w => {
      map[w.workspaceId] = w;
    });
    return map;
  }, [workspaces]);

  const agencyWorkspaces = useMemo(
    () => workspaces.filter(w => w.accountType === 'agency'),
    [workspaces]
  );

  // Scoped workspace IDs based on scopeFilter & selectedWorkspaceId
  const activeWorkspaceIds = useMemo(() => {
    if (!isAdminView) return new Set([tenantId]);
    return new Set(
      workspaces
        .filter(w => {
          if (selectedWorkspaceId && w.workspaceId !== selectedWorkspaceId) return false;
          if (scopeFilter === 'agency') return w.accountType === 'agency';
          if (scopeFilter === 'team') return w.accountType === 'team';
          if (scopeFilter === 'admin') return w.accountType === 'admin';
          return true;
        })
        .map(w => w.workspaceId)
    );
  }, [isAdminView, tenantId, workspaces, selectedWorkspaceId, scopeFilter]);

  const scopedSharedAssets = useMemo(() => {
    const list: SharedBrandAsset[] = [];
    Object.entries(sharedAssetsMap).forEach(([wid, items]) => {
      if (activeWorkspaceIds.has(wid)) list.push(...items);
    });
    return list;
  }, [sharedAssetsMap, activeWorkspaceIds]);

  const scopedDigitalAssets = useMemo(() => {
    const list: WorkspaceDigitalAsset[] = [];
    Object.entries(digitalAssetsMap).forEach(([wid, items]) => {
      if (activeWorkspaceIds.has(wid)) list.push(...items);
    });
    return list.sort((a, b) => (a.isRootLanding === b.isRootLanding ? 0 : a.isRootLanding ? -1 : 1));
  }, [digitalAssetsMap, activeWorkspaceIds]);

  // Combined items for explorer
  const filteredDigital = useMemo(() => {
    if (
      categoryFilter === 'Brand asset' ||
      categoryFilter === 'Media kit' ||
      categoryFilter === 'Knowledge resource'
    ) {
      return [];
    }
    const q = search.trim().toLowerCase();
    return scopedDigitalAssets.filter(item => {
      if (
        categoryFilter === 'websites' &&
        item.subtype !== 'Landing Page' &&
        item.subtype !== 'Websites'
      ) {
        return false;
      }
      if (
        categoryFilter === 'funnels' &&
        item.subtype !== 'Funnels' &&
        item.subtype !== 'Forms'
      ) {
        return false;
      }
      if (!q) return true;
      const ws = workspaceById[item.workspaceId];
      const hay = `${item.name} ${item.subtype} ${item.description} ${ws?.ownerName ?? ''} ${ws?.ownerEmail ?? ''} ${ws?.name ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [scopedDigitalAssets, categoryFilter, search, workspaceById]);

  const filteredShared = useMemo(() => {
    if (categoryFilter === 'websites' || categoryFilter === 'funnels') {
      return [];
    }
    const q = search.trim().toLowerCase();
    return scopedSharedAssets.filter(item => {
      if (
        (categoryFilter === 'Brand asset' ||
          categoryFilter === 'Media kit' ||
          categoryFilter === 'Knowledge resource') &&
        item.category !== categoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      const ws = workspaceById[item.workspaceId];
      const hay = `${item.name} ${item.category} ${item.url} ${ws?.ownerName ?? ''} ${ws?.ownerEmail ?? ''} ${ws?.name ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [scopedSharedAssets, categoryFilter, search, workspaceById]);

  const totalAssetsCount = scopedDigitalAssets.length + scopedSharedAssets.length;
  const websitesCount = scopedDigitalAssets.filter(
    a => a.subtype === 'Landing Page' || a.subtype === 'Websites'
  ).length;
  const funnelsCount = scopedDigitalAssets.filter(
    a => a.subtype === 'Funnels' || a.subtype === 'Forms'
  ).length;
  const brandCount = scopedSharedAssets.filter(a => a.category === 'Brand asset').length;
  const mediaCount = scopedSharedAssets.filter(a => a.category === 'Media kit').length;
  const knowledgeCount = scopedSharedAssets.filter(a => a.category === 'Knowledge resource').length;

  const currentWorkspaceMeta = workspaceById[selectedWorkspaceId || tenantId];
  const isCurrentUserAgency = currentWorkspaceMeta?.accountType === 'agency';

  const handleFileChange = (selected: File | null) => {
    setFile(selected);
    if (selected && !name.trim()) {
      const baseName = selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
      setName(baseName.slice(0, 120));
    }
  };

  const handleSwitchToWorkspace = async (ws: WorkspaceDirectoryEntry, targetPath = '/dashboard/websites') => {
    if (!ws.userRecord) {
      showToast.info(t('Select an Agency user or Sub-Account to switch into.', 'اختر مستخدم وكالة أو حساباً فرعياً للتبديل إليه.'));
      return;
    }
    setSwitchingWorkspaceId(ws.workspaceId);
    try {
      await switchToUser(ws.userRecord.id, ws.userRecord.tenantId, ws.accountType === 'agency' ? ws.userRecord : undefined);
      showToast.success(
        t(
          `Switched to ${ws.ownerName} (${ws.accountType === 'agency' ? 'Agency user' : 'Sub-Account'})`,
          `تم التبديل إلى ${ws.ownerName}`
        )
      );
      navigate(targetPath);
    } catch (e) {
      showToast.error(backendError(e));
    } finally {
      setSwitchingWorkspaceId(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    let uploaded: { url: string; path: string } | undefined;
    const destTenantId = isAdminView ? targetWorkspace || tenantId : tenantId;
    try {
      if (!name.trim()) throw new Error(t('Enter an asset name.', 'أدخل اسم الأصل.'));
      if (!file && !/^https:\/\//.test(url.trim())) {
        throw new Error(t('Upload a resource or enter an HTTPS URL.', 'ارفع ملفاً أو أدخل رابط HTTPS.'));
      }
      uploaded = file ? await uploadBrandFile(destTenantId, file) : undefined;
      await addDoc(collection(activeFirestore, 'tenants', destTenantId, 'businessAssets'), {
        name: name.trim(),
        category,
        url: uploaded?.url ?? url.trim(),
        ...(uploaded ? { path: uploaded.path } : {}),
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid,
      });
      setName('');
      setUrl('');
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setComposerOpen(false);
      showToast.success(t('Business asset added successfully.', 'تمت إضافة أصل الأعمال بنجاح.'));
    } catch (e) {
      if (uploaded) await deleteObject(ref(storage, uploaded.path)).catch(() => {});
      setError(backendError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveSharedAsset = async (asset: SharedBrandAsset) => {
    setBusy(true);
    setError('');
    try {
      if (asset.path) {
        await deleteObject(ref(storage, asset.path)).catch(err => {
          if (err.code !== 'storage/object-not-found') throw err;
        });
      }
      await deleteDoc(doc(activeFirestore, 'tenants', asset.workspaceId, 'businessAssets', asset.id));
      showToast.success(t('Asset removed.', 'تم حذف الأصل.'));
    } catch (e) {
      setError(backendError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveDigitalAsset = async (asset: WorkspaceDigitalAsset) => {
    setBusy(true);
    setError('');
    try {
      await deleteDoc(doc(activeFirestore, 'tenants', asset.workspaceId, 'assets', asset.id));
      showToast.success(t('Website / Funnel removed from workspace.', 'تم حذف الموقع / القمع من مساحة العمل.'));
    } catch (e) {
      setError(backendError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ba-hub">
      {/* Hero Banner */}
      <div className="ba-hero">
        <div className="ba-hero-copy">
          <span className="ba-eyebrow">
            <Sparkles size={13} />
            {isAdminView
              ? t('PLATFORM & AGENCY USER ASSET HUB', 'مركز أصول المنصة ومستخدمي الوكالات')
              : isCurrentUserAgency
              ? t('AGENCY USER ISOLATED WORKSPACE', 'مساحة عمل مستخدم الوكالة المستقلة')
              : t('WORKSPACE BRAND & DIGITAL ASSETS', 'أصول الهوية والمواقع لمساحة العمل')}
          </span>
          <h1>{t('Business Assets', 'أصول الأعمال')}</h1>
          <p>
            {isAdminView
              ? t(
                  'Control shared brand files, media kits, knowledge resources, and isolated Agency user websites & landing pages (/) from one command center.',
                  'تحكم في ملفات الهوية والمواد الإعلامية والموارد المشتركة، بالإضافة إلى مواقع وصفحات هبوط حسابات Agency user المستقلة من مكان واحد.'
                )
              : isCurrentUserAgency
              ? t(
                  'Your Agency user workspace includes your independent copy of the main Landing Page (/) plus all websites, funnels, and brand kits you create — isolated from other accounts.',
                  'تتضمن مساحة Agency user الخاصة بك نسخة مستقلة وقابلة للتعديل من صفحة الهبوط الرئيسية (/) وكل المواقع والملفات التي تنشئها بمعزل تام عن أي حساب آخر.'
                )
              : t(
                  'Manage brand files, media kits, shared knowledge resources, and workspace websites in one place.',
                  'أدر ملفات الهوية والمواد الإعلامية والموارد المشتركة ومواقع مساحة العمل في مكان واحد.'
                )}
          </p>
        </div>

        <div className="ba-hero-actions">
          {!isAdminView && (
            <Link to="/dashboard/websites" className="ba-btn">
              <Globe2 size={15} />
              {t('My Websites & Landing Page', 'مواقعي وصفحة الهبوط')}
            </Link>
          )}
          {isAdminView && (
            <Link to="/admin/users" className="ba-btn">
              <Users size={15} />
              {t('Manage Agency users', 'إدارة حسابات Agency user')}
            </Link>
          )}
          <button
            type="button"
            className="ba-btn primary"
            onClick={() => setComposerOpen(prev => !prev)}
          >
            {composerOpen ? <X size={16} /> : <Plus size={16} />}
            {composerOpen
              ? t('Close Uploader', 'إغلاق نافذة الرفع')
              : t('Add Brand / Media Asset', 'إضافة أصل أو ملف هوية')}
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="ba-kpi-grid">
        <div className="ba-kpi-card">
          <span className="ba-kpi-icon">
            <FolderKanban size={22} />
          </span>
          <div className="ba-kpi-meta">
            <span>{t('Total Business Assets', 'إجمالي أصول الأعمال')}</span>
            <strong>{loading ? '—' : totalAssetsCount}</strong>
            <small>
              {t(
                `${scopedDigitalAssets.length} sites/funnels · ${scopedSharedAssets.length} brand files`,
                `${scopedDigitalAssets.length} مواقع وأقماع · ${scopedSharedAssets.length} ملفات هوية`
              )}
            </small>
          </div>
        </div>

        <div className="ba-kpi-card">
          <span className="ba-kpi-icon emerald">
            <Building2 size={22} />
          </span>
          <div className="ba-kpi-meta">
            <span>
              {isAdminView
                ? t('Agency user workspaces', 'مساحات Agency user')
                : t('Workspace Isolation', 'استقلالية المساحة')}
            </span>
            <strong>
              {isAdminView
                ? agencyWorkspaces.length
                : isCurrentUserAgency
                ? t('Agency user', 'مستخدم وكالة')
                : t('Isolated', 'مستقلة')}
            </strong>
            <small>
              {isAdminView
                ? t(
                    'Independent accounts with Root Landing (/)',
                    'حسابات مستقلة مع صفحة الهبوط (/)'
                  )
                : t(
                    '100% isolated from other team members',
                    'معزولة بالكامل عن باقي الأعضاء'
                  )}
            </small>
          </div>
        </div>

        <div className="ba-kpi-card">
          <span className="ba-kpi-icon blue">
            <Globe2 size={22} />
          </span>
          <div className="ba-kpi-meta">
            <span>{t('Websites & Landing Pages', 'المواقع وصفحات الهبوط')}</span>
            <strong>{loading ? '—' : websitesCount + funnelsCount}</strong>
            <small>
              {t(
                `${websitesCount} websites/landing · ${funnelsCount} funnels/forms`,
                `${websitesCount} مواقع وهبوط · ${funnelsCount} أقماع ونماذج`
              )}
            </small>
          </div>
        </div>

        <div className="ba-kpi-card">
          <span className="ba-kpi-icon amber">
            <Palette size={22} />
          </span>
          <div className="ba-kpi-meta">
            <span>{t('Brand, Media & Knowledge', 'الهوية والوسائط والمعرفة')}</span>
            <strong>{loading ? '—' : scopedSharedAssets.length}</strong>
            <small>
              {t(
                `${brandCount} brand · ${mediaCount} media · ${knowledgeCount} docs`,
                `${brandCount} هوية · ${mediaCount} وسائط · ${knowledgeCount} معرفة`
              )}
            </small>
          </div>
        </div>
      </div>

      {/* Admin Scope & Agency user Switcher Strip */}
      {isAdminView && (
        <div className="ba-agency-bar">
          <div className="ba-agency-bar-top">
            <div className="ba-scope-pills" role="tablist" aria-label={t('Workspace scope', 'نطاق مساحات العمل')}>
              {(
                [
                  { id: 'all', label: t('All Workspaces', 'كل المساحات'), count: workspaces.length },
                  { id: 'agency', label: t('Agency user', 'مستخدم وكالة (Agency user)'), count: agencyWorkspaces.length },
                  {
                    id: 'team',
                    label: t('Team Members', 'أعضاء الفريق'),
                    count: workspaces.filter(w => w.accountType === 'team').length,
                  },
                  {
                    id: 'admin',
                    label: t('Admin Workspace', 'مساحة الأدمن'),
                    count: workspaces.filter(w => w.accountType === 'admin').length,
                  },
                ] as const
              ).map(pill => (
                <button
                  key={pill.id}
                  type="button"
                  role="tab"
                  aria-selected={scopeFilter === pill.id}
                  className={`ba-scope-pill${scopeFilter === pill.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setScopeFilter(pill.id);
                    setSelectedWorkspaceId('');
                  }}
                >
                  <span>{pill.label}</span>
                  <span className="ba-scope-count">{pill.count}</span>
                </button>
              ))}
            </div>

            <div className="ba-workspace-picker">
              <select
                className="ba-select"
                aria-label={t('Filter by workspace', 'تصفية حسب مساحة العمل')}
                value={selectedWorkspaceId}
                onChange={e => setSelectedWorkspaceId(e.target.value)}
              >
                <option value="">
                  {t('All Workspaces in Scope', 'جميع مساحات العمل في النطاق')}
                </option>
                {workspaces.map(ws => (
                  <option key={ws.workspaceId} value={ws.workspaceId}>
                    {ws.ownerName} ({ws.accountType === 'agency' ? 'Agency user' : ws.accountType === 'admin' ? 'Admin' : 'Team Member'})
                  </option>
                ))}
              </select>
              {selectedWorkspaceId && (
                <button
                  type="button"
                  className="ba-btn sm subtle"
                  onClick={() => setSelectedWorkspaceId('')}
                >
                  <X size={13} />
                  {t('Reset Workspace', 'إلغاء التحديد')}
                </button>
              )}
            </div>
          </div>

          {/* Agency user Quick Directory Cards */}
          {agencyWorkspaces.length > 0 ? (
            <div className="ba-agency-strip">
              {agencyWorkspaces.map(ws => {
                const wsDigital = digitalAssetsMap[ws.workspaceId] ?? [];
                const wsShared = sharedAssetsMap[ws.workspaceId] ?? [];
                const hasRootLanding = wsDigital.some(a => a.isRootLanding);
                const sites = wsDigital.filter(a => a.subtype !== 'Forms').length;
                const forms = wsDigital.length - sites;
                const isSelected = selectedWorkspaceId === ws.workspaceId;
                return (
                  <div key={ws.workspaceId} className={`ba-agency-card${isSelected ? ' is-selected' : ''}`}>
                    <button
                      type="button"
                      className="ba-agency-card-head"
                      aria-pressed={isSelected}
                      aria-label={t(`Filter assets for ${ws.ownerName}`, `تصفية أصول ${ws.ownerName}`)}
                      onClick={() => {
                        setScopeFilter('agency');
                        setSelectedWorkspaceId(isSelected ? '' : ws.workspaceId);
                      }}
                    >
                      <span className="ba-avatar">{getInitials(ws.ownerName)}</span>
                      <span className="ba-agency-card-info">
                        <span className="ba-agency-card-title">
                          <strong>{ws.ownerName}</strong>
                          <span className="ba-role-badge agency">
                            <Sparkles size={10} />
                            {t('Agency user', 'مستخدم وكالة')}
                          </span>
                        </span>
                        <small dir="ltr">{ws.ownerEmail || ws.workspaceId}</small>
                      </span>
                    </button>

                    <div className="ba-agency-card-foot">
                      <div className="ba-agency-stats">
                        <span>
                          <Globe2 size={12} />
                          {sites} {t('Sites/Funnels', 'مواقع ومسارات')}
                        </span>
                        {forms > 0 && <span><FileText size={12}/>{forms} {t('Forms', 'نماذج')}</span>}
                        <span>
                          <Palette size={12} />
                          {wsShared.length} {t('Files', 'ملفات')}
                        </span>
                        {hasRootLanding && (
                          <span style={{ color: '#6d28d9' }}>
                            <Check size={12} />
                            {t('Landing (/)', 'صفحة (/)')}
                          </span>
                        )}
                      </div>

                      {ws.userRecord && (
                        <button
                          type="button"
                          className="ba-btn sm"
                          disabled={switchingWorkspaceId === ws.workspaceId}
                          onClick={e => {
                            e.stopPropagation();
                            void handleSwitchToWorkspace(ws, '/dashboard/websites');
                          }}
                          title={t('Open this Agency user dashboard', 'فتح لوحة تحكم مستخدم الوكالة')}
                        >
                          <ArrowRightLeft size={12} />
                          {switchingWorkspaceId === ws.workspaceId
                            ? t('Switching…', 'جارٍ التبديل…')
                            : t('Open workspace', 'فتح مساحة العمل')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(124, 58, 237, 0.05)',
                border: '1px dashed rgba(124, 58, 237, 0.3)',
                fontSize: 12.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={16} style={{ color: '#6d28d9', flexShrink: 0 }} />
                <span>
                  {t(
                    'Need an isolated Agency user account with its own editable copy of the main Landing Page (/)? Create one in Sub Accounts.',
                    'هل تريد إنشاء حساب Agency user مستقل مع نسخة قابلة للتعديل من صفحة الهبوط الرئيسية (/)؟ يمكنك إنشاؤه من قسم الحسابات الفرعية.'
                  )}
                </span>
              </div>
              <Link to="/admin/users" className="ba-btn sm primary">
                <Plus size={13} />
                {t('Create Agency user', 'إنشاء Agency user')}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Upload & Resource Studio (Collapsible or Always Accessible) */}
      {(composerOpen || (!loading && scopedSharedAssets.length === 0 && scopedDigitalAssets.length === 0)) && (
        <section className="ba-composer" aria-label={t('Add Business Asset', 'إضافة أصل أعمال')}>
          <div className="ba-composer-head">
            <div>
              <h2>{t('Add Shared Brand, Media or Knowledge Asset', 'إضافة ملف هوية أو وسائط أو مورد معرفي')}</h2>
              <p>
                {t(
                  'Upload PNG, JPEG, WebP, PDF, or TXT files (up to 10 MB) or link an external HTTPS resource.',
                  'ارفع ملفات PNG أو JPEG أو WebP أو PDF أو TXT (حتى 10 ميجابايت) أو أضف رابط HTTPS مباشر.'
                )}
              </p>
            </div>
            {composerOpen && (
              <button
                type="button"
                className="ba-btn sm subtle"
                onClick={() => setComposerOpen(false)}
              >
                <X size={14} />
                {t('Close', 'إغلاق')}
              </button>
            )}
          </div>

          <form onSubmit={handleUploadSubmit} className="ba-composer-grid">
            <div className="ba-composer-fields">
              {isAdminView && (
                <label className="ba-field">
                  <span>{t('Target Workspace / Agency user', 'مساحة العمل المستهدفة / Agency user')}</span>
                  <select
                    value={targetWorkspace}
                    onChange={e => setTargetWorkspace(e.target.value)}
                  >
                    {workspaces.map(ws => (
                      <option key={ws.workspaceId} value={ws.workspaceId}>
                        {ws.ownerName} — {ws.accountType === 'agency' ? 'Agency user' : ws.accountType === 'admin' ? 'Admin Workspace' : 'Team Member'} ({ws.name})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="ba-field">
                <span>{t('Name', 'اسم الأصل')}</span>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={180}
                  placeholder={t('e.g. Official Brand Guidelines 2026', 'مثال: دليل الهوية البصرية الرسمي')}
                />
              </label>

              {/* Visual Category Picker + Accessible Select for Compatibility */}
              <div className="ba-field">
                <span>{t('Category', 'التصنيف')}</span>
                <div className="ba-cat-grid" role="radiogroup" aria-label={t('Category', 'التصنيف')}>
                  {(
                    [
                      {
                        value: 'Brand asset' as const,
                        title: t('Brand asset', 'أصل هوية (Brand asset)'),
                        desc: t('Logos, palettes & brand marks', 'الشعارات والألوان والهوية'),
                        Icon: Palette,
                      },
                      {
                        value: 'Media kit' as const,
                        title: t('Media kit', 'حقيبة إعلامية (Media kit)'),
                        desc: t('Banners, social & press visuals', 'البنرات والصور الترويجية'),
                        Icon: ImageIcon,
                      },
                      {
                        value: 'Knowledge resource' as const,
                        title: t('Knowledge resource', 'مورد معرفي (Knowledge)'),
                        desc: t('Playbooks, PDFs & reference docs', 'الأدلة وملفات PDF والمراجع'),
                        Icon: BookOpen,
                      },
                    ]
                  ).map(({ value, title, desc, Icon }) => {
                    const active = category === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`ba-cat-card${active ? ' is-selected' : ''}`}
                        onClick={() => setCategory(value)}
                      >
                        <Icon size={17} style={{ color: active ? '#6d28d9' : '#64748b' }} />
                        <b>{title}</b>
                        <small>{desc}</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="ba-field">
                <span>{t('Resource URL (HTTPS)', 'رابط المورد (HTTPS)')}</span>
                <input
                  type="url"
                  dir="ltr"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://assets.yourbrand.com/media-kit.pdf"
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
                <button type="submit" className="ba-btn primary" disabled={busy || loading}>
                  <UploadCloud size={16} />
                  {busy ? t('Uploading & Saving…', 'جارٍ الرفع والحفظ…') : t('Add asset', 'إضافة الأصل')}
                </button>
                {(name || url || file) && (
                  <button
                    type="button"
                    className="ba-btn subtle"
                    onClick={() => {
                      setName('');
                      setUrl('');
                      setFile(null);
                      if (fileInput.current) fileInput.current.value = '';
                    }}
                  >
                    {t('Reset', 'إعادة ضبط')}
                  </button>
                )}
              </div>
            </div>

            {/* Drag & Drop File Box with Live Preview */}
            <div className="ba-field">
              <span>{t('Or upload file (up to 10 MB)', 'أو ارفع ملفاً (حتى 10 ميجابايت)')}</span>
              <div
                className={`ba-dropzone${isDragging ? ' is-dragging' : ''}`}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragging(false);
                  const dropped = e.dataTransfer.files?.[0] ?? null;
                  if (dropped) handleFileChange(dropped);
                }}
                onClick={() => fileInput.current?.click()}
              >
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
                  style={{ display: 'none' }}
                  onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div className="ba-dropzone-preview" onClick={e => e.stopPropagation()}>
                    {filePreviewUrl ? (
                      <img src={filePreviewUrl} alt={file.name} />
                    ) : (
                      <span className="ba-dropzone-orb">
                        <FileText size={24} />
                      </span>
                    )}
                    <div>
                      <strong style={{ display: 'block', fontSize: 13 }}>{file.name}</strong>
                      <small style={{ color: '#64748b', fontSize: 11.5 }}>
                        {(file.size / 1024).toFixed(1)} KB · {file.type || 'Document'}
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="ba-btn sm"
                        onClick={() => fileInput.current?.click()}
                      >
                        {t('Replace file', 'استبدال الملف')}
                      </button>
                      <button
                        type="button"
                        className="ba-btn sm danger"
                        onClick={() => {
                          setFile(null);
                          if (fileInput.current) fileInput.current.value = '';
                        }}
                      >
                        {t('Remove', 'إزالة')}
                      </button>
                    </div>
                  </div>
                ) : url && isImageUrl(url) ? (
                  <div className="ba-dropzone-preview">
                    <img src={url} alt={name || 'Preview'} />
                    <small style={{ color: '#64748b', fontSize: 11.5 }}>
                      {t('Live URL Image Preview · Click to upload a local file instead', 'معاينة مباشرة للرابط · انقر لرفع ملف محلي بدلاً منه')}
                    </small>
                  </div>
                ) : (
                  <>
                    <span className="ba-dropzone-orb">
                      <UploadCloud size={24} />
                    </span>
                    <div>
                      <strong style={{ display: 'block', fontSize: 13.5, color: 'var(--adm-ink, #0f172a)' }}>
                        {t('Drag & drop your file here, or click to browse', 'اسحب الملف وأفلته هنا، أو انقر للاختيار')}
                      </strong>
                      <small style={{ color: '#64748b', fontSize: 12 }}>
                        {t('Supports PNG, JPG, WebP, PDF, and TXT up to 10 MB', 'يدعم PNG و JPG و WebP و PDF و TXT حتى 10 ميجابايت')}
                      </small>
                    </div>
                    <span className="ba-btn sm subtle" style={{ pointerEvents: 'none' }}>
                      {t('Choose File', 'اختر ملفاً')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </form>
        </section>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {/* Unified Asset Explorer */}
      <section className="ba-explorer" aria-label={t('Business Assets Library', 'مكتبة أصول الأعمال')}>
        <div className="ba-toolbar">
          <div className="ba-cat-tabs" role="tablist" aria-label={t('Asset categories', 'فئات الأصول')}>
            {(
              [
                { id: 'all', label: t('All Assets', 'كل الأصول'), count: totalAssetsCount },
                { id: 'websites', label: t('Websites & Landing (/)', 'المواقع وصفحة الهبوط (/)'), count: websitesCount },
                { id: 'funnels', label: t('Funnels & Forms', 'الأقماع والنماذج'), count: funnelsCount },
                { id: 'Brand asset', label: t('Brand Assets', 'أصول الهوية'), count: brandCount },
                { id: 'Media kit', label: t('Media Kits', 'الحقائب الإعلامية'), count: mediaCount },
                { id: 'Knowledge resource', label: t('Knowledge', 'الموارد المعرفية'), count: knowledgeCount },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={categoryFilter === tab.id}
                className={`ba-cat-tab${categoryFilter === tab.id ? ' is-active' : ''}`}
                onClick={() => setCategoryFilter(tab.id)}
              >
                {tab.label}
                <span>{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="ba-toolbar-right">
            <label className="ba-search" aria-label={t('Search assets', 'بحث في الأصول')}>
              <Search size={15} style={{ color: '#64748b', flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('Search assets, workspace, or owner…', 'ابحث بالاسم أو المساحة أو المالك…')}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: 2 }}
                  aria-label={t('Clear search', 'مسح البحث')}
                >
                  <X size={14} />
                </button>
              )}
            </label>

            <div className="ba-view-toggle" role="group" aria-label={t('View mode', 'طريقة العرض')}>
              <button
                type="button"
                className={viewMode === 'grid' ? 'is-active' : ''}
                onClick={() => setViewMode('grid')}
                title={t('Grid view', 'عرض شبكي')}
                aria-label={t('Grid view', 'عرض شبكي')}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                className={viewMode === 'table' ? 'is-active' : ''}
                onClick={() => setViewMode('table')}
                title={t('Table view', 'عرض جدولي')}
                aria-label={t('Table view', 'عرض جدولي')}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="ba-empty" role="status">
            <span className="ba-empty-icon">
              <Layers3 size={24} />
            </span>
            <h3>{t('Loading business assets…', 'جارٍ تحميل أصول الأعمال…')}</h3>
            <p>{t('Syncing workspace brand files and Agency user digital experiences.', 'جارٍ مزامنة ملفات الهوية ومواقع مستخدمي الوكالات.')}</p>
          </div>
        ) : filteredDigital.length === 0 && filteredShared.length === 0 ? (
          <div className="ba-empty">
            <span className="ba-empty-icon">
              <FolderKanban size={26} />
            </span>
            <h3>{t('No matching business assets found', 'لا توجد أصول أعمال مطابقة')}</h3>
            <p>
              {search || categoryFilter !== 'all' || selectedWorkspaceId || scopeFilter !== 'all'
                ? t(
                    'Try clearing your search or switching the workspace/category filter.',
                    'جرّب مسح البحث أو تغيير فلتر مساحة العمل أو الفئة.'
                  )
                : t(
                    'Upload a brand asset, media kit, or knowledge resource, or create an Agency user to seed an editable landing page.',
                    'ارفع أول ملف هوية أو حقيبة إعلامية من الأعلى، أو أنشئ حساب Agency user لتجهيز صفحة الهبوط (/) تلقائياً.'
                  )}
            </p>
            {(search || categoryFilter !== 'all' || selectedWorkspaceId || scopeFilter !== 'all') && (
              <button
                type="button"
                className="ba-btn sm"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('all');
                  setSelectedWorkspaceId('');
                  setScopeFilter('all');
                }}
              >
                {t('Reset all filters', 'إعادة ضبط جميع الفلاتر')}
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="ba-asset-grid">
            {/* Digital Assets (Agency user Landing Pages, Websites, Funnels, Forms) */}
            {filteredDigital.map(asset => {
              const ws = workspaceById[asset.workspaceId];
              const isAgencyOwner = ws?.accountType === 'agency';
              const isPublished = /^(published|active|live)$/i.test(asset.status);
              return (
                <article key={`dig-${asset.workspaceId}-${asset.id}`} className="ba-asset-card">
                  <div className="ba-asset-thumb">
                    {asset.image ? (
                      <img src={asset.image} alt={asset.name} />
                    ) : (
                      <div className="ba-asset-thumb-placeholder">
                        <Globe2 size={32} />
                      </div>
                    )}
                    <div className="ba-asset-thumb-badges">
                      <span className={`ba-pill${asset.isRootLanding ? ' landing' : ''}`}>
                        {asset.isRootLanding ? (
                          <>
                            <Sparkles size={11} />
                            {t('Root Landing (/)', 'صفحة الهبوط (/)')}
                          </>
                        ) : (
                          asset.subtype
                        )}
                      </span>
                      <span className={`ba-pill ${isPublished ? 'published' : 'draft'}`}>
                        {asset.status}
                      </span>
                    </div>
                  </div>

                  <div className="ba-asset-body">
                    <div className="ba-asset-title-row">
                      <h3>{asset.name}</h3>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {asset.pagesCount} {asset.pagesCount === 1 ? t('Page', 'صفحة') : t('Pages', 'صفحات')}
                      </span>
                    </div>

                    <p className="ba-asset-desc">
                      {asset.description ||
                        (asset.isRootLanding
                          ? t(
                              'Editable copy of the main platform landing page (/) isolated to this Agency user workspace.',
                              'نسخة قابلة للتعديل من صفحة الهبوط الرئيسية (/) مخصصة ومستقلة لهذه الوكالة.'
                            )
                          : t('Workspace digital experience managed in Website & Funnel Builder.', 'تجربة رقمية مُدارة عبر منشئ المواقع والأقماع.'))}
                    </p>

                    {ws && (
                      <div className="ba-asset-owner">
                        <div className="ba-asset-owner-left">
                          <span
                            className={`ba-avatar${
                              ws.accountType === 'team' ? ' team' : ws.accountType === 'admin' ? ' admin' : ''
                            }`}
                            style={{ width: 28, height: 28, borderRadius: 8, fontSize: 11 }}
                          >
                            {getInitials(ws.ownerName)}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <strong>{ws.ownerName}</strong>
                            <small>{ws.name}</small>
                          </div>
                        </div>
                        <span
                          className={`ba-role-badge ${
                            isAgencyOwner ? 'agency' : ws.accountType === 'admin' ? 'admin' : 'team'
                          }`}
                        >
                          {isAgencyOwner
                            ? 'Agency user'
                            : ws.accountType === 'admin'
                            ? 'Admin'
                            : 'Team Member'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="ba-asset-actions">
                    <div className="ba-asset-actions-group">
                      {asset.raw.document?.pages?.length > 0 && (
                        <button
                          type="button"
                          className="ba-btn sm"
                          onClick={() =>
                            setSitePreview({
                              document: asset.raw.document,
                              name: asset.name,
                              kind: asset.raw.kind,
                              domain: asset.domain,
                              image: asset.image,
                              settings: asset.raw.settings,
                            })
                          }
                        >
                          <Eye size={13} />
                          {t('Preview', 'معاينة')}
                        </button>
                      )}

                      {!isAdminView ? (
                        <Link
                          to={
                            asset.subtype === 'Funnels'
                              ? '/dashboard/funnels'
                              : asset.subtype === 'Forms'
                              ? '/dashboard/forms'
                              : '/dashboard/websites'
                          }
                          className="ba-btn sm primary"
                        >
                          <LayoutTemplate size={13} />
                          {t('Edit in Builder', 'تعديل في المنشئ')}
                        </Link>
                      ) : ws?.userRecord ? (
                        <button
                          type="button"
                          className="ba-btn sm"
                          disabled={switchingWorkspaceId === ws.workspaceId}
                          onClick={() =>
                            void handleSwitchToWorkspace(
                              ws,
                              asset.subtype === 'Funnels'
                                ? '/dashboard/funnels'
                                : asset.subtype === 'Forms'
                                ? '/dashboard/forms'
                                : '/dashboard/websites'
                            )
                          }
                        >
                          <ArrowRightLeft size={13} />
                          {t('Edit in Agency', 'تعديل في الحساب')}
                        </button>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className="ba-btn sm danger"
                      disabled={busy}
                      onClick={() => void handleRemoveDigitalAsset(asset)}
                      title={t('Remove', 'حذف')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </article>
              );
            })}

            {/* Shared Brand, Media & Knowledge Assets */}
            {filteredShared.map(asset => {
              const ws = workspaceById[asset.workspaceId];
              const isAgencyOwner = ws?.accountType === 'agency';
              const showImg = isImageUrl(asset.url, asset.path);
              return (
                <article key={`shr-${asset.workspaceId}-${asset.id}`} className="ba-asset-card">
                  <div className={`ba-asset-thumb${showImg ? ' is-contain' : ''}`}>
                    {showImg ? (
                      <img src={asset.url} alt={asset.name} />
                    ) : (
                      <div className="ba-asset-thumb-placeholder">
                        {asset.category === 'Brand asset' ? (
                          <Palette size={34} />
                        ) : asset.category === 'Media kit' ? (
                          <ImageIcon size={34} />
                        ) : (
                          <BookOpen size={34} />
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{asset.category}</span>
                      </div>
                    )}
                    <div className="ba-asset-thumb-badges">
                      <span className="ba-pill">{asset.category}</span>
                      {asset.createdAt && <span className="ba-pill draft">{asset.createdAt}</span>}
                    </div>
                  </div>

                  <div className="ba-asset-body">
                    <div className="ba-asset-title-row">
                      <h3>{asset.name}</h3>
                    </div>
                    <p className="ba-asset-desc" dir="ltr">
                      {asset.url}
                    </p>

                    {ws && (
                      <div className="ba-asset-owner">
                        <div className="ba-asset-owner-left">
                          <span
                            className={`ba-avatar${
                              ws.accountType === 'team' ? ' team' : ws.accountType === 'admin' ? ' admin' : ''
                            }`}
                            style={{ width: 28, height: 28, borderRadius: 8, fontSize: 11 }}
                          >
                            {getInitials(ws.ownerName)}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <strong>{ws.ownerName}</strong>
                            <small>{ws.name}</small>
                          </div>
                        </div>
                        <span
                          className={`ba-role-badge ${
                            isAgencyOwner ? 'agency' : ws.accountType === 'admin' ? 'admin' : 'team'
                          }`}
                        >
                          {isAgencyOwner
                            ? 'Agency user'
                            : ws.accountType === 'admin'
                            ? 'Admin'
                            : 'Team Member'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="ba-asset-actions">
                    <div className="ba-asset-actions-group">
                      <button
                        type="button"
                        className="ba-btn sm"
                        onClick={() => setResourcePreview(asset)}
                      >
                        <Eye size={13} />
                        {t('Preview', 'معاينة')}
                      </button>

                      {/^https:\/\//.test(asset.url) && (
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ba-btn sm"
                        >
                          <ExternalLink size={13} />
                          {t('Open', 'فتح')}
                        </a>
                      )}

                      <button
                        type="button"
                        className="ba-btn sm subtle"
                        onClick={() => {
                          void navigator.clipboard?.writeText(asset.url);
                          showToast.success(t('Asset link copied!', 'تم نسخ رابط الأصل!'));
                        }}
                        title={t('Copy URL', 'نسخ الرابط')}
                      >
                        <Copy size={13} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="ba-btn sm danger"
                      disabled={busy}
                      onClick={() => void handleRemoveSharedAsset(asset)}
                    >
                      <Trash2 size={13} />
                      {t('Remove', 'حذف')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* Enterprise Table View */
          <div className="adm-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Name', 'الاسم')}</th>
                  <th>{t('Category / Type', 'الفئة / النوع')}</th>
                  <th>{t('Workspace & Account Type', 'مساحة العمل ونوع الحساب')}</th>
                  <th>{t('Status', 'الحالة')}</th>
                  <th>{t('Actions', 'الإجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDigital.map(asset => {
                  const ws = workspaceById[asset.workspaceId];
                  const isAgencyOwner = ws?.accountType === 'agency';
                  return (
                    <tr key={`tbl-dig-${asset.workspaceId}-${asset.id}`}>
                      <td>
                        <strong>{asset.name}</strong>
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>
                          {asset.isRootLanding
                            ? t('Root Landing Page (/) · Isolated Copy', 'صفحة الهبوط الرئيسية (/) · نسخة مستقلة')
                            : `${asset.pagesCount} ${t('pages', 'صفحات')}`}
                        </div>
                      </td>
                      <td>
                        <span className="ba-role-badge agency">
                          {asset.isRootLanding ? 'Landing Page (/)' : asset.subtype}
                        </span>
                      </td>
                      <td>
                        {ws ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong>{ws.ownerName}</strong>
                            <span
                              className={`ba-role-badge ${
                                isAgencyOwner ? 'agency' : ws.accountType === 'admin' ? 'admin' : 'team'
                              }`}
                            >
                              {isAgencyOwner
                                ? 'Agency user'
                                : ws.accountType === 'admin'
                                ? 'Admin'
                                : 'Team Member'}
                            </span>
                          </div>
                        ) : (
                          asset.workspaceId
                        )}
                      </td>
                      <td>
                        <StatusPill value={asset.status} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {asset.raw.document?.pages?.length > 0 && (
                            <button
                              type="button"
                              className="ba-btn sm"
                              onClick={() =>
                                setSitePreview({
                                  document: asset.raw.document,
                                  name: asset.name,
                                  kind: asset.raw.kind,
                                  domain: asset.domain,
                                  image: asset.image,
                                  settings: asset.raw.settings,
                                })
                              }
                            >
                              <Eye size={13} />
                              {t('Preview', 'معاينة')}
                            </button>
                          )}
                          <button
                            type="button"
                            className="ba-btn sm danger"
                            disabled={busy}
                            onClick={() => void handleRemoveDigitalAsset(asset)}
                          >
                            {t('Remove', 'حذف')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredShared.map(asset => {
                  const ws = workspaceById[asset.workspaceId];
                  const isAgencyOwner = ws?.accountType === 'agency';
                  return (
                    <tr key={`tbl-shr-${asset.workspaceId}-${asset.id}`}>
                      <td>
                        <strong>{asset.name}</strong>
                      </td>
                      <td>{asset.category}</td>
                      <td>
                        {ws ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong>{ws.ownerName}</strong>
                            <span
                              className={`ba-role-badge ${
                                isAgencyOwner ? 'agency' : ws.accountType === 'admin' ? 'admin' : 'team'
                              }`}
                            >
                              {isAgencyOwner
                                ? 'Agency user'
                                : ws.accountType === 'admin'
                                ? 'Admin'
                                : 'Team Member'}
                            </span>
                          </div>
                        ) : (
                          asset.workspaceId
                        )}
                      </td>
                      <td>
                        <StatusPill value="Active" />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {/^https:\/\//.test(asset.url) && (
                            <a
                              href={asset.url}
                              target="_blank"
                              rel="noreferrer"
                              className="ba-btn sm"
                            >
                              {t('Open', 'فتح')}
                            </a>
                          )}
                          <button
                            type="button"
                            className="ba-btn sm danger"
                            disabled={busy}
                            onClick={() => void handleRemoveSharedAsset(asset)}
                          >
                            {t('Remove', 'حذف')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Interactive Website / Landing Page Preview Modal */}
      {sitePreview && (
        <AdminSitePreview value={sitePreview} close={() => setSitePreview(null)} />
      )}

      {/* Brand / Media Resource Lightbox Modal */}
      {resourcePreview && (
        <LiveDialog
          title={resourcePreview.name}
          subtitle={resourcePreview.category}
          close={() => setResourcePreview(null)}
          footer={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="ba-btn sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(resourcePreview.url);
                  showToast.success(t('Link copied to clipboard', 'تم نسخ الرابط'));
                }}
              >
                <Copy size={13} />
                {t('Copy URL', 'نسخ الرابط')}
              </button>
              {/^https:\/\//.test(resourcePreview.url) && (
                <a
                  href={resourcePreview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ba-btn sm primary"
                >
                  <ExternalLink size={13} />
                  {t('Open Resource', 'فتح المورد')}
                </a>
              )}
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', padding: '12px 0' }}>
            {isImageUrl(resourcePreview.url, resourcePreview.path) ? (
              <img
                src={resourcePreview.url}
                alt={resourcePreview.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: 420,
                  borderRadius: 12,
                  objectFit: 'contain',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  padding: 12,
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: 32,
                  borderRadius: 14,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  width: '100%',
                }}
              >
                <FileText size={40} style={{ color: '#6d28d9' }} />
                <strong>{resourcePreview.name}</strong>
                <small dir="ltr" style={{ color: '#64748b', wordBreak: 'break-all' }}>
                  {resourcePreview.url}
                </small>
              </div>
            )}
          </div>
        </LiveDialog>
      )}
    </div>
  );
}
