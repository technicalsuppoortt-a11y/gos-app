import { useCurrency } from '../../context/CurrencyContext';
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  CreditCard,
  Grid2X2,
  RefreshCw,
  ShieldCheck,
  Users,
  MessagesSquare,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import { useAdminManagement } from "../../backend/adminManagement";
import {
  useDashboardHealth,
  type DashboardHealthItem,
} from "../../backend/adminDashboard";
import { useUILanguage } from "../../i18n/display";
import { aggregateOperations, dateValue, resourceOf } from "./operations-model";
import "./admin-dashboard.css";
const resources = [
  "transactions",
  "integrations",
  "messages",
  "bookings",
  "events",
  "auditLogs",
] as const;
const healthy = (status: unknown) =>
  /^(connected|active|healthy|operational)$/i.test(String(status));
export function AdminDashboard() {
  const { formatPrice } = useCurrency();
  const ar = useUILanguage().startsWith("ar");
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const [reload, setReload] = useState(0),
    [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) setReload((n) => n + 1);
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const data = useAdminManagement(resources, false, true, reload);
  const health = useDashboardHealth(reload);
  const ready = online && !data.loading && !data.error;
  const healthReady =
    online && !!health.data && !health.loading && !health.error;
  const scoped = (name: string) =>
    data.records.filter((r) => resourceOf(r) === name);
  const revenue = aggregateOperations(data.records).revenue;
  const healthItems = healthReady
    ? [...health.data!.services, ...health.data!.gateways]
    : [];
  const failed = healthItems.filter((item) =>
    ["error", "unreachable"].includes(item.status),
  );
  const unverified = healthItems.filter((item) => item.status === "unverified");
  const status = !online
    ? t("Offline", "غير متصل")
    : health.error
      ? t("Check failed", "تعذر الفحص")
      : !healthReady
        ? t("Checking…", "جار الفحص…")
        : failed.length
          ? t("Needs attention", "تحتاج متابعة")
          : unverified.length
            ? t("Verification needed", "تحتاج تحقق")
            : t("Checks passed", "نجحت الفحوصات");
  const checks = healthItems.filter((item) => item.status !== "disabled");
  const activeUsers = Object.values(data.users).filter((user) =>
    /^active$/i.test(String(user.status)),
  ).length;
  const waitingMessages = scoped("messages").filter((r) =>
    /^(queued|pending)$/i.test(String(r.data.status)),
  ).length;
  const failedMessages = scoped("messages").filter((r) =>
    /^(failed|undelivered)$/i.test(String(r.data.status)),
  ).length;
  const integrations = scoped("integrations");
  const events = [...scoped("events"), ...scoped("auditLogs")]
    .sort((a, b) =>
      dateValue(b.data.createdAt).localeCompare(dateValue(a.data.createdAt)),
    )
    .slice(0, 8);
  const metrics = [
    {
      label: t("Registered workspaces", "مساحات العمل المسجلة"),
      value: String(Object.keys(data.tenants).length),
      icon: Building2,
    },
    {
      label: t("Recorded revenue", "الإيرادات المسجلة"),
      value: revenue.length
        ? revenue
            .map(
              ([currency, amount]) =>
                formatPrice(amount, currency),
            )
            .join(" · ")
        : t("No completed payments", "لا توجد مدفوعات مكتملة"),
      icon: CreditCard,
    },
    {
      label: t("Active sub accounts", "الحسابات الفرعية النشطة"),
      value: String(activeUsers),
      icon: Users,
    },
  ];
  const shortcuts = [
    {
      to: "/admin/tools",
      icon: Grid2X2,
      title: t("Platform Tools", "أدوات المنصة"),
      detail: t("Manage tools & maintenance", "إدارة الأدوات والصيانة"),
    },
    {
      to: "/admin/users",
      icon: Users,
      title: t("Sub Accounts", "الحسابات الفرعية"),
      detail: ready
        ? `${Object.keys(data.users).length} ${t("accounts", "حساب")}`
        : "—",
    },
    {
      to: "/admin/conversations",
      icon: MessagesSquare,
      title: t("Conversations", "المحادثات"),
      detail: ready
        ? `${waitingMessages} ${t("queued messages", "رسالة في الانتظار")}`
        : "—",
    },
    {
      to: "/admin/payments-gateways",
      icon: CreditCard,
      title: t("Payment Gateways", "بوابات الدفع"),
      detail: healthReady
        ? `${health.data!.gateways.filter((item) => item.status === "healthy").length} ${t("verified connections", "اتصال تم التحقق منه")}`
        : "—",
    },
    {
      to: "/admin/booking",
      icon: CalendarDays,
      title: t("Booking & Calendar", "الحجوزات والتقويم"),
      detail: ready
        ? `${scoped("bookings").length} ${t("bookings", "حجز")}`
        : "—",
    },
    {
      to: "/admin/analytics",
      icon: BarChart3,
      title: t("Operational Analytics", "تحليلات العمليات"),
      detail: t(
        "Revenue, consumption & event logs",
        "الإيرادات والاستهلاك وسجل الأحداث",
      ),
    },
  ];
  function renderHealth(item: DashboardHealthItem) {
    const tone =
      item.status === "healthy"
        ? "success"
        : ["error", "unreachable"].includes(item.status)
          ? "danger"
          : item.status === "disabled"
            ? "neutral"
            : "warning";
    const label =
      item.status === "healthy"
        ? t("Verified", "تم التحقق")
        : item.status === "unverified"
          ? t("Unverified", "غير متحقق")
          : item.status === "disabled"
            ? t("Disabled", "معطل")
            : t("Failed", "فشل");
    return (
      <div className="adm-health-row" key={item.id}>
        <div className="adm-health-row-main">
          <div>
            <strong>{item.name}</strong>
            <small>
              {item.kind} · {item.mode}
            </small>
            <small>{item.detail}</small>
          </div>
        </div>
        <div className="adm-health-row-meta">
          <span className="adm-health-ping">
            {item.latencyMs === null ? "—" : `${item.latencyMs} ms`}
          </span>
          <span className={`adm-badge ${tone}`}>{label}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="adm-workspace adm-live-dashboard" data-live-dashboard>
      <div className="adm-page-head">
        <div>
          <span className="adm-eyebrow">
            {t("PLATFORM OPERATIONS", "عمليات المنصة")}
          </span>
          <h1>{t("Dashboard", "لوحة التحكم")}</h1>
          <p>
            {t(
              "Live workspace operations and backend connection checks.",
              "عمليات مساحات العمل وفحوصات اتصال الخدمات الحية.",
            )}
          </p>
        </div>
      </div>
      <div className="adm-overview-tools">
        <span role="status">
          {!online
            ? t(
                "Offline · Live data unavailable",
                "غير متصل · البيانات الحية غير متاحة",
              )
            : ready
              ? t("", "")
              : data.error
                ? t("Live records unavailable", "السجلات الحية غير متاحة")
                : t("Waiting for server data…", "بانتظار بيانات الخادم…")}
        </span>
        <button
          className="adm-btn-refresh"
          onClick={() => setReload((n) => n + 1)}
          disabled={!online || health.loading}
          aria-label={t("Check Status", "فحص الحالة")}
        >
          <RefreshCw size={14} className={health.loading ? "adm-spin" : ""} />
          {t("Check Status", "فحص الحالة")}
        </button>
      </div>
      {data.error && <p role="alert">{data.error}</p>}
      <div className="adm-metrics">
        {metrics.map((metric) => (
          <article className="adm-metric" key={metric.label}>
            <div>
              <span>{metric.label}</span>
              <i>
                <metric.icon size={19} />
              </i>
            </div>
            <strong>{ready ? metric.value : "—"}</strong>
          </article>
        ))}
        <article className="adm-metric">
          <div>
            <span>{t("System Status", "حالة النظام")}</span>
            <i>
              <ShieldCheck size={19} />
            </i>
          </div>
          <strong>{status}</strong>
          <small>
            {healthReady
              ? `${checks.filter((item) => item.status === "healthy").length} / ${checks.length} ${t("checks verified", "فحص تم التحقق منه")}`
              : "—"}
          </small>
        </article>
      </div>
      <div className="adm-dashboard-grid">
        <section className="adm-panel adm-dashboard-health">
          <div className="adm-panel-heading">
            <div>
              <h2>
                {t("System & Gateway Health", "صحة النظام وبوابات الدفع")}
              </h2>
              <p>
                {t(
                  "Backend probes refresh every minute. Missing verification is never treated as healthy.",
                  "تحدث فحوصات الخدمات كل دقيقة. لا تعد الاتصالات غير المتحققة سليمة.",
                )}
              </p>
            </div>
            <span
              className={`adm-badge ${healthReady && !failed.length && !unverified.length ? "success" : "warning"}`}
            >
              {status}
            </span>
          </div>
          {health.loading && online && (
            <p role="status" className="adm-live-note">
              {t("Checking backend connections…", "جار فحص اتصالات الخدمات…")}
            </p>
          )}
          {health.error && (
            <p role="alert" className="adm-live-note">
              {health.error}
            </p>
          )}
          <div className="adm-health-list">{healthItems.map(renderHealth)}</div>
          {healthReady && !health.data!.gateways.length && (
            <p className="adm-live-note">
              {t("No payment gateways configured.", "لم تضبط بوابات دفع.")}
            </p>
          )}
          <div className="adm-widget-footer">
            <span className="adm-live-note">
              {t("Checked", "وقت الفحص")}:{" "}
              {healthReady ? dateValue(health.data!.checkedAt) || "—" : "—"}
            </span>
            <Link className="adm-link" to="/admin/payments-gateways">
              {t("Manage payment gateways", "إدارة بوابات الدفع")}
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
        <section className="adm-panel adm-dashboard-shortcuts">
          <div className="adm-panel-heading">
            <div>
              <h2>{t("Operations Shortcuts", "اختصارات العمليات")}</h2>
              <p>
                {t(
                  "Open operational modules and current records.",
                  "الوصول إلى الوحدات التشغيلية والسجلات الحالية.",
                )}
              </p>
            </div>
          </div>
          <div className="adm-shortcuts-list">
            {shortcuts.map((item) => (
              <Link key={item.to} className="adm-shortcut-card" to={item.to}>
                <div className="adm-shortcut-icon">
                  <item.icon size={18} />
                </div>
                <div className="adm-shortcut-text">
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      </div>
      <section className="adm-panel">
        <div className="adm-panel-heading">
          <h2>{t("Real-time Status Monitors", "مراقبة الحالة المباشرة")}</h2>
        </div>
        <div className="adm-live-monitors">
          <p>
            {t("Queued messages", "الرسائل المنتظرة")}:{" "}
            <b>{ready ? waitingMessages : "—"}</b>
          </p>
          <p>
            {t("Failed deliveries", "الرسائل التي تعذر تسليمها")}:{" "}
            <b>{ready ? failedMessages : "—"}</b>
          </p>
          <p>
            {t(
              "Reported connected integrations",
              "التكاملات المتصلة حسب سجلاتها",
            )}
            :{" "}
            <b>
              {ready
                ? integrations.filter((r) => healthy(r.data.status)).length
                : "—"}
            </b>{" "}
            / {ready ? integrations.length : "—"}
          </p>
        </div>
      </section>
      <section className="adm-panel">
        <div className="adm-panel-heading">
          <h2>{t("Recent Operational Events", "آخر الأحداث التشغيلية")}</h2>
        </div>
        <div className="adm-table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  t("Workspace", "مساحة العمل"),
                  t("Event", "الحدث"),
                  t("Actor", "المنفذ"),
                  t("Date", "التاريخ"),
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ready &&
                events.map((event) => (
                  <tr key={event.path}>
                    <td>
                      {String(
                        data.tenants[event.workspaceId]?.name ??
                          event.workspaceId,
                      )}
                    </td>
                    <td>
                      {String(
                        event.data.description ?? event.data.type ?? event.id,
                      )}
                    </td>
                    <td>{String(event.data.actorId ?? "—")}</td>
                    <td>{dateValue(event.data.createdAt) || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {ready && !events.length && (
          <p className="adm-live-note">
            {t(
              "No operational events recorded.",
              "لا توجد أحداث تشغيلية مسجلة.",
            )}
          </p>
        )}
      </section>
    </div>
  );
}
