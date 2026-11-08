import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Transaction,
} from "firebase/firestore";
import { auth, db } from "@/modules/brand-engine/firebase";
import { starterCatalog } from '../configuration/catalog';
import { isPlatformAdmin } from '../data/platformAccess';
import { validateDiscoveryCatalog, type DiscoveryCatalog } from "@/modules/brand-engine/data/discovery";

export type DiscoveryCatalogDraft = DiscoveryCatalog & { draftRevision: string };

function readCatalog(value: unknown, publishing = false): DiscoveryCatalog {
  const errors = validateDiscoveryCatalog(value, { publishing });
  if (errors.length) throw new Error(`The discovery catalog is invalid: ${errors[0]}`);
  return value as DiscoveryCatalog;
}

export function subscribeDiscoveryCatalog(
  onChange: (catalog: DiscoveryCatalog | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(db, "discoveryCatalog", "current"),
    (snapshot) => {
      try {
        onChange(readCatalog(snapshot.exists() ? snapshot.data() : starterCatalog, true));
      } catch (error) {
        onError(
          error instanceof Error ? error : new Error("Could not read the discovery catalog."),
        );
      }
    },
    onError,
  );
}

export function subscribeDiscoveryCatalogDraft(
  onChange: (catalog: DiscoveryCatalogDraft | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(db, "discoveryCatalogDrafts", "current"),
    (snapshot) => {
      try {
        if (!snapshot.exists()) {
          onChange(null);
          return;
        }
        const data = snapshot.data();
        const catalog = readCatalog(data);
        if (typeof data["draftRevision"] !== "string")
          throw new Error("The draft revision is missing.");
        onChange({ ...catalog, draftRevision: data["draftRevision"] });
      } catch (error) {
        onError(error instanceof Error ? error : new Error("Could not read the discovery draft."));
      }
    },
    onError,
  );
}

function catalogData(catalog: DiscoveryCatalog): DiscoveryCatalog {
  return JSON.parse(
    JSON.stringify({
      schemaVersion: catalog.schemaVersion,
      version: catalog.version,
      niches: catalog.niches,
      subNiches: catalog.subNiches,
      templates: catalog.templates,
      source: catalog.source,
    }),
  ) as DiscoveryCatalog;
}

function mutationError(code: string, message: string, errors?: string[]) {
  return Object.assign(new Error(message), { code, ...(errors ? { details: { errors } } : {}) });
}

function validatedCatalog(value: unknown, publishing = false): DiscoveryCatalog {
  const errors = validateDiscoveryCatalog(value, { publishing });
  if (errors.length)
    throw mutationError("invalid-argument", "The discovery catalog failed validation.", errors);
  return catalogData(value as DiscoveryCatalog);
}

function currentUid() {
  const uid = auth.currentUser?.uid;
  if (!uid)
    throw mutationError("unauthenticated", "Sign in with an authorized Superadmin account.");
  return uid;
}

async function assertAdmin(transaction: Transaction, uid: string) {
  const profile = await transaction.get(doc(db, "users", uid));
  if (auth.currentUser?.uid !== uid)
    throw mutationError("unauthenticated", "The signed-in account changed.");
  if (!isPlatformAdmin(profile.data()))
    throw mutationError("permission-denied", "Only an active platform administrator can manage the discovery catalog.");
}

function auditEntry(uid: string, action: string, version: string, draftRevision: string) {
  return { uid, action, version, draftRevision, createdAt: serverTimestamp() };
}

/** Restore the published draft, or provision the bundled source catalog in a new Phoenix project. */
export async function initializeDiscoveryCatalog(): Promise<{
  version: string;
  initialized: boolean;
  draftRevision: string;
}> {
  const uid = currentUid();
  const revision = crypto.randomUUID();
  const auditRef = doc(collection(db, "discoveryCatalogAudit"));
  const result = await runTransaction(db, async (transaction) => {
    await assertAdmin(transaction, uid);
    const [published, draft] = await Promise.all([
      transaction.get(doc(db, "discoveryCatalog", "current")),
      transaction.get(doc(db, "discoveryCatalogDrafts", "current")),
    ]);
    if (!published.exists() && draft.exists())
      throw mutationError(
        "failed-precondition",
        "A catalog draft already exists. Publish it before initializing a new catalog.",
      );
    const catalog = validatedCatalog(published.exists() ? published.data() : starterCatalog, true);
    if (draft.exists())
      return {
        version: catalog.version,
        initialized: false,
        draftRevision: String(draft.data()["draftRevision"]),
      };
    if (!published.exists()) {
      catalog.version = `discovery-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const releaseRef = doc(db, "discoveryCatalogVersions", catalog.version);
      const existingRelease = await transaction.get(releaseRef);
      if (existingRelease.exists())
        throw mutationError("already-exists", "This catalog release already exists. Retry initialization.");
      const release = { ...catalog, publishedAt: serverTimestamp(), publishedBy: uid };
      transaction.set(releaseRef, release);
      transaction.set(doc(db, "discoveryCatalog", "current"), release);
    }
    transaction.set(doc(db, "discoveryCatalogDrafts", "current"), {
      ...catalog,
      draftRevision: revision,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
    transaction.set(auditRef, auditEntry(uid, "initialize", catalog.version, revision));
    return { version: catalog.version, initialized: true, draftRevision: revision };
  });
  if (auth.currentUser?.uid !== uid)
    throw mutationError("unauthenticated", "The signed-in account changed.");
  return result;
}

export async function saveDiscoveryCatalogDraft(
  catalog: DiscoveryCatalog,
  expectedRevision: string | null,
): Promise<{ draftRevision: string; version: string }> {
  const uid = currentUid();
  const data = validatedCatalog(catalog);
  const draftRevision = crypto.randomUUID();
  const draftRef = doc(db, "discoveryCatalogDrafts", "current");
  const auditRef = doc(collection(db, "discoveryCatalogAudit"));
  await runTransaction(db, async (transaction) => {
    await assertAdmin(transaction, uid);
    const current = await transaction.get(draftRef);
    if ((current.data()?.["draftRevision"] ?? null) !== expectedRevision)
      throw mutationError("aborted", "The draft changed. Reload it before saving your edits.");
    transaction.set(draftRef, {
      ...data,
      draftRevision,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
    transaction.set(auditRef, auditEntry(uid, "save-draft", data.version, draftRevision));
  });
  if (auth.currentUser?.uid !== uid)
    throw mutationError("unauthenticated", "The signed-in account changed.");
  return { draftRevision, version: data.version };
}

function templateVersionErrors(
  catalog: DiscoveryCatalog,
  previous: DiscoveryCatalog | null,
): string[] {
  if (!previous) return [];
  const errors: string[] = [];
  const signature = (template: unknown) => {
    if (!template || typeof template !== "object") return null;
    const { id: _id, version: _version, ...content } = template as Record<string, unknown>;
    return JSON.stringify(content, (_key, item: unknown) =>
      item !== null && typeof item === "object" && !Array.isArray(item)
        ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
        : item,
    );
  };
  for (const sub of catalog.subNiches.filter((item) => item.status === "active")) {
    const old = previous.subNiches.find((item) => item.id === sub.id);
    if (!old) continue;
    if (sub.templateVersion < old.templateVersion)
      errors.push(`Sub-niche ${sub.id}: template versions cannot decrease.`);
    const oldFunnel = previous.templates.funnels.find((item) => item.id === old.funnelTemplateId);
    const funnel = catalog.templates.funnels.find((item) => item.id === sub.funnelTemplateId);
    const oldDashboard = previous.templates.dashboards.find(
      (item) => item.id === old.dashboardTemplateId,
    );
    const dashboard = catalog.templates.dashboards.find(
      (item) => item.id === sub.dashboardTemplateId,
    );
    if (
      (signature(funnel) !== signature(oldFunnel) ||
        signature(dashboard) !== signature(oldDashboard)) &&
      sub.templateVersion <= old.templateVersion
    )
      errors.push(
        `Sub-niche ${sub.id}: increase the template version after changing published template content.`,
      );
  }
  return errors;
}

export async function publishDiscoveryCatalog(
  expectedRevision: string,
): Promise<{ version: string; draftRevision: string }> {
  const uid = currentUid();
  const version = `discovery-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const draftRevision = crypto.randomUUID();
  const draftRef = doc(db, "discoveryCatalogDrafts", "current");
  const currentRef = doc(db, "discoveryCatalog", "current");
  const versionRef = doc(db, "discoveryCatalogVersions", version);
  const auditRef = doc(collection(db, "discoveryCatalogAudit"));
  await runTransaction(db, async (transaction) => {
    await assertAdmin(transaction, uid);
    const [draft, previous, existingVersion] = await Promise.all([
      transaction.get(draftRef),
      transaction.get(currentRef),
      transaction.get(versionRef),
    ]);
    if (!draft.exists())
      throw mutationError("failed-precondition", "Create or save the catalog draft first.");
    if (draft.data()["draftRevision"] !== expectedRevision)
      throw mutationError("aborted", "The draft changed. Reload it before publishing.");
    if (existingVersion.exists())
      throw mutationError(
        "already-exists",
        "This release already exists. Retry to publish a new release.",
      );
    const catalog = validatedCatalog(draft.data(), true);
    const old = previous.exists() ? validatedCatalog(previous.data(), true) : null;
    const errors = templateVersionErrors(catalog, old);
    if (errors.length)
      throw mutationError("invalid-argument", "Changed templates need a version increase.", errors);
    catalog.version = version;
    const niches = catalog.niches.filter((item) => item.status === "active");
    const subNiches = catalog.subNiches.filter((item) => item.status === "active");
    if (!niches.length || !subNiches.length)
      throw mutationError("invalid-argument", "Publish at least one active niche and sub-niche.");
    const funnelIds = new Set(subNiches.map((sub) => sub.funnelTemplateId));
    const dashboardIds = new Set(subNiches.map((sub) => sub.dashboardTemplateId));
    const activeCatalog: DiscoveryCatalog = {
      ...catalog,
      niches,
      subNiches,
      templates: {
        funnels: catalog.templates.funnels.filter((item) => funnelIds.has(item.id)),
        dashboards: catalog.templates.dashboards.filter((item) => dashboardIds.has(item.id)),
      },
    };
    validatedCatalog(activeCatalog, true);
    const release = { ...activeCatalog, publishedAt: serverTimestamp(), publishedBy: uid };
    transaction.set(versionRef, release);
    transaction.set(currentRef, release);
    transaction.set(draftRef, {
      ...catalog,
      draftRevision,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
    transaction.set(auditRef, auditEntry(uid, "publish", version, draftRevision));
  });
  if (auth.currentUser?.uid !== uid)
    throw mutationError("unauthenticated", "The signed-in account changed.");
  return { version, draftRevision };
}

export function discoveryCatalogError(error: unknown) {
  const code = String((error as { code?: string })?.code ?? "");
  const details = (error as { details?: { errors?: unknown } })?.details;
  if (Array.isArray(details?.errors) && details.errors.every((item) => typeof item === "string"))
    return details.errors.join("\n");
  if (code.includes("aborted"))
    return "Another administrator updated this draft. Reload the saved draft before saving again.";
  if (code.includes("permission-denied") || code.includes("unauthenticated"))
    return "This action requires an authorized Superadmin account.";
  if (code.includes("unavailable"))
    return "The catalog could not connect. Check your connection and retry; your published version is unchanged.";
  return error instanceof Error
    ? error.message
    : "Could not complete this catalog action. Please retry.";
}
