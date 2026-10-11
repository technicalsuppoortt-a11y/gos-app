import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Activity,
  ArrowDownUp,
  ArrowRight,
  ChevronDown,
  BarChart3,
  BookOpen,
  Clock3,
  Download,
  LayoutGrid,
  List,
  Lightbulb,
  ListChecks,
  Plus,
  Search,
  Settings2,
  ListFilter,
  Upload,
  Users,
  Workflow,
} from "lucide-react";
import type { AppDispatch, RootState } from "../store";
import {
  deleteLeads,
  moveLead,
  savePipeline,
  updateLead,
} from "../store/slices/crmSlice";
import {
  activityTime,
  colors,
  displayStage,
  euro,
  exportCSV,
  owners,
  templateStages,
  templates,
} from "./crm/model";
import {
  AddLeadDialog,
  Dialog,
  ImportDialog,
  SettingsDialog,
} from "./crm/CRMDialogs";
import {
  CRMAvatar,
  SourceBadge,
  LeadCard,
  OptionsMenu,
  CustomSelect,
  CustomDatePicker,
} from "./crm/CRMPrimitives";
export { CRMAvatar, SourceBadge } from "./crm/CRMPrimitives";
import {
  localDateKey,
  taskStatus,
  matchesTask,
  followUpStatus,
} from "./crm/taskModel";
import { TemplateDialog } from "./crm/TemplateDialog";
import { loadCustomTemplates } from "./crm/templateStorage";
import "./crm-leads.css";
import "./crm/crm-workspace.css";
import "./crm/crm-pipeline.css";

const tabs = [
  { path: "pipeline", label: "Pipeline", icon: LayoutGrid },
  { path: "contacts", label: "Contacts", icon: Users },
  { path: "activities", label: "Activities", icon: Lightbulb },
  { path: "tasks", label: "Tasks", icon: ListChecks },
  { path: "overview", label: "Overview", icon: BarChart3 },
  { path: "templates", label: "Templates / Pipeline Presets", icon: BookOpen },
];

export function CRMLeads({ notify }: { notify: (message: string) => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { leads, pipelines } = useSelector((s: RootState) => s.crm);
  const pipeline =
    pipelines.find((p) => p.id === params.get("pipeline")) ?? pipelines[0];
  const tab =
    params.get("tab") ||
    (location.pathname.split("/").at(-1) === "crm"
      ? "pipeline"
      : location.pathname.split("/").at(-1)!) ||
    "pipeline";
  const base = location.pathname.startsWith("/dashboard")
    ? "/dashboard/crm"
    : "/crm";
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filtersOpen) return;
    const outside = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node))
        setFiltersOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFiltersOpen(false);
        filterRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [filtersOpen]);
  const [filters, setFilters] = useState({
    source: "",
    tag: "",
    owner: "",
    status: "",
    stage: "",
  });
  const [sort, setSort] = useState("recent");
  const [listView, setListView] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [dialog, setDialog] = useState<
    "add" | "settings" | "import" | "bulk" | "delete" | "template" | null
  >(null);
  const [addStage, setAddStage] = useState(pipeline.stages[0].id);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("tag");
  const [bulkValue, setBulkValue] = useState("");
  const [contactPagination, setContactPagination] = useState({
    page: 1,
    scope: "",
  });
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [taskQuery, setTaskQuery] = useState("");
  const [customTemplates, setCustomTemplates] = useState(loadCustomTemplates);
  const [presetPage, setPresetPage] = useState(1);
  const presetList = [...templates, ...customTemplates];
  const [compactPresets, setCompactPresets] = useState(
    () => window.innerWidth < 1100 || window.innerHeight < 700,
  );
  useEffect(() => {
    const resize = () =>
      setCompactPresets(window.innerWidth < 1100 || window.innerHeight < 700);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const presetSize = compactPresets ? 2 : 6;
  const presetPages = Math.max(1, Math.ceil(presetList.length / presetSize));
  const currentPresetPage = Math.min(presetPage, presetPages);
  const contactScope = JSON.stringify([
    query,
    filters,
    sort,
    pipeline.id,
    rowsPerPage,
  ]);
  const contactPage =
    contactPagination.scope === contactScope ? contactPagination.page : 1;
  const setContactPage = (page: number) =>
    setContactPagination({ page, scope: contactScope });
  const [today, setToday] = useState(localDateKey);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(localDateKey()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskLead, setTaskLead] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskFilter, setTaskFilter] = useState<
    "all" | "today" | "upcoming" | "overdue" | "completed"
  >("all");
  useEffect(() => {
    const id = params.get("leadId");
    if (id)
      navigate(`${base}/contacts/${encodeURIComponent(id)}`, { replace: true });
  }, [params, base, navigate]);
  const pipelineLeads = leads.filter(
    (l) => (l.pipelineId ?? "main") === pipeline.id,
  );
  const active = pipelineLeads.filter((l) => !l.archived);
  const visible = pipelineLeads
    .filter((lead) => {
      const q = query.trim().toLowerCase();
      return (
        (!q ||
          [
            lead.name,
            lead.email,
            lead.phone ?? "",
            lead.company,
            ...(lead.tags || []),
          ].some((v) => v.toLowerCase().includes(q))) &&
        (filters.status === "archived" ? lead.archived : !lead.archived) &&
        (!filters.source || lead.source === filters.source) &&
        (!filters.tag || lead.tags.includes(filters.tag)) &&
        (!filters.owner || lead.owner === filters.owner) &&
        (!filters.stage || displayStage(lead, pipeline) === filters.stage) &&
        (filters.status !== "followup" || Boolean(lead.nextFollowUp)) &&
        (filters.status !== "qualified" ||
          lead.qualificationStatus === "Qualified")
      );
    })
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "value"
          ? b.value - a.value
          : activityTime(b.lastActivity) - activityTime(a.lastActivity),
    );
  const contactPages = Math.max(1, Math.ceil(visible.length / rowsPerPage));
  const currentContactPage = Math.min(contactPage, contactPages);
  const contactStart = (currentContactPage - 1) * rowsPerPage;
  const pageContacts = visible.slice(contactStart, contactStart + rowsPerPage);
  const filterCount = Object.values(filters).filter(Boolean).length;
  const chosen = selected.filter((id) => visible.some((l) => l.id === id));
  const close = () => setDialog(null);
  const openLead = (id: string) =>
    navigate(`${base}/contacts/${encodeURIComponent(id)}`);
  const newLead = (stage = pipeline.stages[0].id) => {
    setAddStage(stage);
    setDialog("add");
  };
  const resetFilters = () => {
    setFilters({ source: "", tag: "", owner: "", stage: "", status: "" });
    setQuery("");
  };
  const toggleSelected = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  const goTab = (t: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", t);
    setParams(next);
  };
  const runBulk = () => {
    for (const id of chosen) {
      const lead = leads.find((l) => l.id === id)!;
      if (bulkAction === "stage")
        dispatch(
          moveLead({
            id,
            stage: pipeline.stages.find((s) => s.id === bulkValue)!.id,
          }),
        );
      else
        dispatch(
          updateLead({
            id,
            changes:
              bulkAction === "tag"
                ? { tags: [...new Set([...lead.tags, bulkValue.trim()])] }
                : { owner: bulkValue },
          }),
        );
    }
    notify(`${chosen.length} contacts updated.`);
    setSelected([]);
    close();
  };
  const allTasks = active.flatMap((l) =>
    (l.tasks ?? []).map((t) => ({ ...t, lead: l })),
  );
  const filteredTasks = allTasks.filter((t) =>
    matchesTask(
      t.title,
      t.lead.name,
      taskStatus(t.done, t.due, today),
      taskQuery,
      taskFilter,
    ),
  );
  const filteredFollowUps = active.filter(
    (l) =>
      l.nextFollowUp &&
      matchesTask(
        "Follow up with " + l.name,
        l.name,
        followUpStatus(l.nextFollowUp, l.nextFollowUpAt, today),
        taskQuery,
        taskFilter,
      ),
  );
  const filterPanel = (
    <div className="crm-filter-bar">
      {(["source", "tag", "owner", "status", "stage"] as const).map((field) => (
        <label key={field}>
          {field}
          <CustomSelect
            aria-label={`Filter by ${field}`}
            value={filters[field]}
            onChange={(val) => setFilters({ ...filters, [field]: val })}
            options={[
              {
                value: "",
                label: `All ${field === "status" ? "active contacts" : field + "s"}`,
              },
              ...(field === "stage"
                ? pipeline.stages.map((s) => ({ value: s.id, label: s.label }))
                : field === "status"
                  ? [
                      { value: "followup", label: "Needs follow-up" },
                      { value: "qualified", label: "Qualified" },
                      { value: "archived", label: "Archived" },
                    ]
                  : [
                      ...new Set(
                        pipelineLeads.flatMap((l) =>
                          field === "tag" ? l.tags : [l[field]],
                        ),
                      ),
                    ]
                      .sort()
                      .map((val) => ({
                        value: val as string,
                        label: val as string,
                      }))),
            ]}
          />
        </label>
      ))}
      <button className="crm2-btn-secondary" onClick={resetFilters}>
        Clear filters
      </button>
    </div>
  );
  return (
    <div className="flex flex-col overflow-hidden crm2-page crm-workspace crm-pipeline-workspace">
      <header className="crm2-header">
        <div className="crm2-header-left">
          <span className="crm2-header-icon">
            <BarChart3 size={20} />
          </span>
          <div>
            <h1 className="crm2-header-title">CRM &amp; Leads</h1>
            <p className="crm2-header-sub">
              Manage your leads, conversations and turn them into customers
            </p>
          </div>
        </div>
        <div className="crm2-header-right">
          <CustomSelect
            className="w-[195px]"
            aria-label="Pipeline selector"
            value={pipeline.id}
            onChange={(val) => {
              setParams({ pipeline: val });
              resetFilters();
              setSelected([]);
            }}
            options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
          />
          <button
            className="crm2-btn-secondary"
            onClick={() => setDialog("settings")}
          >
            <Settings2 size={14} />
            Pipeline Settings
          </button>
          <button className="crm2-btn-primary" onClick={() => newLead()}>
            <Plus size={15} />
            Add Lead
          </button>
        </div>
      </header>
      <nav className="crm2-subnav" aria-label="CRM navigation">
        {tabs.map((t) => (
          <button
            key={t.path}
            onClick={() => goTab(t.path)}
            className={`crm2-subnav-btn ${tab === t.path ? "active" : ""}`}
            aria-current={tab === t.path ? "page" : undefined}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </nav>
      {(tab === "pipeline" || tab === "contacts") && (
        <>
          <div className="crm-toolbar">
            <label className="crm-search w-64 md:w-80 min-w-[250px]">
              <Search size={16} />
              <input
                aria-label="Search contacts"
                placeholder="Search leads, name, company..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="crm-filter-anchor" ref={filterRef}>
              <button
                className="crm-toolbar-control"
                onClick={() => setFiltersOpen(!filtersOpen)}
                aria-expanded={filtersOpen}
              >
                <ListFilter size={16} />
                Filters {filterCount > 0 && <span>{filterCount}</span>}
                <ChevronDown size={13} />
              </button>
              {filtersOpen && filterPanel}
            </div>
            <CustomSelect
              className="w-[155px]"
              aria-label="Sort leads"
              icon={ArrowDownUp}
              value={sort}
              onChange={(val) => setSort(val)}
              options={[
                { value: "recent", label: "Recent activity" },
                { value: "name", label: "Name A–Z" },
                { value: "value", label: "Highest value" },
              ]}
            />
            <div className="crm-toolbar-right">
              {tab === "pipeline" ? (
                <>
                  <div className="crm-view-switch">
                    <button
                      onClick={() => setListView(false)}
                      className={!listView ? "active" : ""}
                      aria-pressed={!listView}
                    >
                      <LayoutGrid size={15} />
                      Kanban
                    </button>
                    <button
                      onClick={() => setListView(true)}
                      className={listView ? "active" : ""}
                      aria-pressed={listView}
                    >
                      <List size={15} />
                      List
                    </button>
                  </div>
                  <OptionsMenu
                    label="Pipeline options"
                    actions={[
                      {
                        label: "Export visible leads",
                        onSelect: () => exportCSV(visible),
                      },
                      {
                        label: "Pipeline settings",
                        onSelect: () => setDialog("settings"),
                      },
                      {
                        label: "Pipeline presets",
                        onSelect: () => goTab("templates"),
                      },
                    ]}
                  />
                </>
              ) : (
                <>
                  <button
                    className="crm2-btn-secondary"
                    onClick={() => exportCSV(visible)}
                  >
                    <Download size={13} />
                    Export
                  </button>
                  <button
                    className="crm2-btn-secondary"
                    onClick={() => setDialog("import")}
                  >
                    <Upload size={13} />
                    Import
                  </button>
                </>
              )}
            </div>
          </div>

          {tab === "pipeline" && !listView ? (
            <div
              className="crm-kanban"
              aria-label="CRM pipeline board"
              style={{
                gridTemplateColumns: `repeat(${pipeline.stages.length}, minmax(155px, 1fr))`,
              }}
            >
              {pipeline.stages.map((stage) => {
                const cards = visible.filter(
                  (l) => displayStage(l, pipeline) === stage.id,
                );
                return (
                  <section
                    key={stage.id}
                    className={`crm-kanban-column ${over === stage.id ? "crm-drop-active" : ""}`}
                    aria-label={`${stage.label} stage`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setOver(stage.id);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node))
                        setOver(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id =
                        e.dataTransfer.getData("text/plain") || dragged;
                      if (id && active.some((l) => l.id === id)) {
                        dispatch(moveLead({ id, stage: stage.id }));
                        notify(`Lead moved to ${stage.label}.`);
                      }
                      setDragged(null);
                      setOver(null);
                    }}
                  >
                    <div className="crm-stage-head">
                      <div>
                        <i style={{ background: stage.color }} />
                        <b>{stage.label}</b>
                        <span>{cards.length}</span>
                        <OptionsMenu
                          label={`Options for ${stage.label} stage`}
                          actions={[
                            {
                              label: "Edit stage settings",
                              onSelect: () => setDialog("settings"),
                            },
                            {
                              label: "Add lead to stage",
                              onSelect: () => newLead(stage.id),
                            },
                          ]}
                        />
                      </div>
                      <small>
                        {euro(cards.reduce((s, l) => s + l.value, 0))}
                      </small>
                      <button
                        className="crm-stage-add"
                        aria-label={`Add lead to ${stage.label}`}
                        onClick={() => newLead(stage.id)}
                      >
                        <Plus size={12} />
                        Add Lead
                      </button>
                    </div>
                    <div className="min-h-0 overflow-y-auto crm-stage-cards">
                      {cards.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          pipeline={pipeline}
                          base={base}
                          dragging={dragged === lead.id}
                          onDragStart={setDragged}
                          onDragEnd={() => {
                            setDragged(null);
                            setOver(null);
                          }}
                          onMove={(id, stage) => {
                            dispatch(moveLead({ id, stage }));
                            notify("Lead stage updated.");
                          }}
                        />
                      ))}
                      {cards.length === 0 && (
                        <div className="crm-empty-stage">
                          <Users size={20} />
                          <span>No leads yet</span>
                          <small>Drop a lead or add one above</small>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <>
              <div className="crm-bulk-bar">
                <label>
                  <input
                    type="checkbox"
                    aria-label="Select all visible contacts"
                    checked={
                      visible.length > 0 && chosen.length === visible.length
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? visible.map((l) => l.id) : [],
                      )
                    }
                  />
                  {chosen.length
                    ? `${chosen.length} selected`
                    : "Select contacts for bulk actions"}
                </label>
                {chosen.length > 0 && (
                  <>
                    <button
                      onClick={() => {
                        setBulkAction("tag");
                        setBulkValue("");
                        setDialog("bulk");
                      }}
                    >
                      Tag
                    </button>
                    <button
                      onClick={() => {
                        setBulkAction("owner");
                        setBulkValue(owners[0]);
                        setDialog("bulk");
                      }}
                    >
                      Assign owner
                    </button>
                    <button
                      onClick={() => {
                        setBulkAction("stage");
                        setBulkValue(pipeline.stages[0].id);
                        setDialog("bulk");
                      }}
                    >
                      Move stage
                    </button>
                    <button
                      onClick={() =>
                        exportCSV(visible.filter((l) => chosen.includes(l.id)))
                      }
                    >
                      Export
                    </button>
                    <button
                      onClick={() => {
                        chosen.forEach((id) =>
                          dispatch(
                            updateLead({
                              id,
                              changes: {
                                archived: filters.status !== "archived",
                              },
                            }),
                          ),
                        );
                        setSelected([]);
                        notify(
                          filters.status === "archived"
                            ? "Contacts restored."
                            : "Contacts archived.",
                        );
                      }}
                    >
                      {filters.status === "archived" ? "Restore" : "Archive"}
                    </button>
                    <button
                      className="crm-danger"
                      onClick={() => setDialog("delete")}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
              <div className="crm-contacts-table">
                <table>
                  <thead>
                    <tr>
                      <th />
                      <th>Name</th>
                      <th>Contact Info</th>
                      <th>Company</th>
                      <th>Source</th>
                      <th>Stage</th>
                      <th>Owner</th>
                      <th>Last Activity</th>
                      <th>Created Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageContacts.map((lead) => (
                      <tr key={lead.id} onClick={() => openLead(lead.id)}>
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${lead.name}`}
                            checked={chosen.includes(lead.id)}
                            onChange={() => toggleSelected(lead.id)}
                          />
                        </td>
                        <td>
                          <Link
                            to={`${base}/contacts/${lead.id}`}
                            className="crm-table-person"
                          >
                            <CRMAvatar lead={lead} />
                            <b>{lead.name}</b>
                          </Link>
                        </td>
                        <td>
                          <span>{lead.email}</span>
                          <small>{lead.phone || "No phone added"}</small>
                        </td>
                        <td>{lead.company || "—"}</td>
                        <td>
                          <SourceBadge source={lead.source} />
                        </td>
                        <td>
                          <span
                            className="crm-stage-pill"
                            style={{
                              color: pipeline.stages.find(
                                (s) => s.id === displayStage(lead, pipeline),
                              )!.color,
                            }}
                          >
                            {
                              pipeline.stages.find(
                                (s) => s.id === displayStage(lead, pipeline),
                              )!.label
                            }
                          </span>
                        </td>
                        <td>{lead.owner}</td>
                        <td>{lead.lastActivity}</td>
                        <td>
                          {lead.createdAt
                            ? new Date(lead.createdAt).toLocaleDateString()
                            : "Not recorded"}
                        </td>
                        <td>
                          <button
                            aria-label={`Open ${lead.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openLead(lead.id);
                            }}
                          >
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!visible.length && (
                  <div className="crm-empty">
                    <Search size={28} />
                    <h3>No matching contacts</h3>
                    <p>Try another search or clear your filters.</p>
                    <button
                      className="crm2-btn-secondary"
                      onClick={resetFilters}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
              <footer
                className="crm-pagination"
                aria-label="Contacts pagination"
              >
                <label>
                  Rows per page
                  <CustomSelect
                    className="crm-page-size"
                    aria-label="Contacts rows per page"
                    value={String(rowsPerPage)}
                    onChange={(val) => setRowsPerPage(Number(val))}
                    options={[10, 25, 50, 100].map((n) => ({
                      value: String(n),
                      label: String(n),
                    }))}
                  />
                </label>
                <span role="status">
                  Showing {visible.length ? contactStart + 1 : 0}–
                  {Math.min(contactStart + rowsPerPage, visible.length)} of{" "}
                  {visible.length} contacts
                </span>
                <div>
                  <button
                    className="crm2-btn-secondary"
                    disabled={currentContactPage === 1}
                    onClick={() => setContactPage(currentContactPage - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {currentContactPage} of {contactPages}
                  </span>
                  <button
                    className="crm2-btn-secondary"
                    disabled={currentContactPage === contactPages}
                    onClick={() => setContactPage(currentContactPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </footer>
            </>
          )}
        </>
      )}
      {tab === "templates" && (
        <div className="crm-presets-viewport">
          <div className="crm-section-heading">
            <div>
              <h2>A pipeline for every kind of business</h2>
              <p>Choose a preset or create a template with your own stages.</p>
            </div>
            <button
              className="crm2-btn-primary"
              onClick={() => setDialog("template")}
            >
              <Plus size={14} />
              New template
            </button>
          </div>
          <div className="crm-presets">
            {presetList
              .slice(
                (currentPresetPage - 1) * presetSize,
                currentPresetPage * presetSize,
              )
              .map((template, index) => (
                <article key={template.name}>
                  <span
                    className="crm-preset-icon"
                    style={{
                      color: colors[index % colors.length],
                      background: colors[index % colors.length] + "15",
                    }}
                  >
                    <Workflow size={18} />
                  </span>
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <div className="crm-preset-stages">
                    {template.stages.map((s, i) => (
                      <span key={i}>{s}</span>
                    ))}
                  </div>
                  <button
                    className="crm2-btn-primary"
                    onClick={() => {
                      const id = crypto.randomUUID();
                      dispatch(
                        savePipeline({
                          id,
                          name: template.name,
                          stages: templateStages(template.stages),
                        }),
                      );
                      navigate(base + "/pipeline?pipeline=" + id);
                      notify(
                        template.name +
                          " installed. Add contacts or customize its stages.",
                      );
                    }}
                  >
                    <Plus size={13} />
                    Use this pipeline
                  </button>
                </article>
              ))}
          </div>
          <footer className="crm-pagination">
            <span>
              {presetList.length} templates · {pipelines.length} saved pipelines
            </span>
            <div>
              <button
                className="crm2-btn-secondary"
                disabled={currentPresetPage === 1}
                onClick={() => setPresetPage(currentPresetPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPresetPage} of {presetPages}
              </span>
              <button
                className="crm2-btn-secondary"
                disabled={currentPresetPage === presetPages}
                onClick={() => setPresetPage(currentPresetPage + 1)}
              >
                Next
              </button>
            </div>
          </footer>
        </div>
      )}
      {tab === "activities" && (
        <div className="crm-scroll-content">
          <div className="crm-section-heading">
            <div>
              <h2>Activity feed</h2>
              <p>Conversations, stage changes and notes in {pipeline.name}.</p>
            </div>
          </div>
          {active
            .flatMap((l) => l.activities.map((a) => ({ ...a, lead: l })))
            .sort((a, b) => activityTime(b.at) - activityTime(a.at))
            .map((a) => (
              <Link
                to={`${base}/contacts/${a.lead.id}`}
                className="crm-feed-item"
                key={`${a.lead.id}-${a.id}`}
              >
                <span className="crm-feed-icon">
                  <Activity size={16} />
                </span>
                <div>
                  <b>{a.title}</b>
                  <p>
                    {a.lead.name} · {a.detail}
                  </p>
                </div>
                <small>
                  {a.at.includes("T") ? new Date(a.at).toLocaleString() : a.at}
                </small>
                <ArrowRight size={14} />
              </Link>
            ))}
          {!active.some((l) => l.activities.length) && (
            <div className="crm-empty">
              No activities yet. Add a lead to get started.
            </div>
          )}
        </div>
      )}
      {tab === "tasks" && (
        <div className="crm-scroll-content">
          <div className="crm-section-heading">
            <div>
              <h2>Tasks &amp; follow-ups</h2>
              <p>Keep the next step clear for every contact.</p>
            </div>
          </div>
          <form
            className="crm-task-form crm-task-quick-add"
            onSubmit={(e) => {
              e.preventDefault();
              const lead = active.find((l) => l.id === taskLead)!;
              dispatch(
                updateLead({
                  id: lead.id,
                  changes: {
                    tasks: [
                      ...(lead.tasks ?? []),
                      {
                        id: crypto.randomUUID(),
                        title: taskTitle.trim(),
                        due: taskDue,
                        done: false,
                      },
                    ],
                  },
                }),
              );
              setTaskTitle("");
              notify("Task created.");
            }}
          >
            <CustomSelect
              className="w-[180px]"
              aria-label="Task contact"
              value={taskLead}
              onChange={(val) => setTaskLead(val)}
              options={[
                { value: "", label: "Choose contact" },
                ...active.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
            <CustomDatePicker
              className="w-[130px]"
              aria-label="Task due date"
              value={taskDue}
              onChange={(val) => setTaskDue(val)}
              placeholder="Due date"
            />
            <button
              className="crm2-btn-primary"
              disabled={
                !taskTitle.trim() ||
                !active.some((l) => l.id === taskLead) ||
                !taskDue
              }
            >
              <Plus size={14} />
              Add task
            </button>
          </form>
          <label className="crm-search crm-task-search">
            <Search size={16} />
            <input
              aria-label="Search tasks"
              placeholder="Search task title, contact or status…"
              value={taskQuery}
              onChange={(e) => setTaskQuery(e.target.value)}
            />
          </label>
          <div className="crm-task-filters">
            {(
              ["all", "today", "upcoming", "overdue", "completed"] as const
            ).map((f) => (
              <button
                key={f}
                className={`crm-task-pill ${taskFilter === f ? "active" : ""}`}
                onClick={() => setTaskFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="crm-task-list">
            {filteredTasks.map((task) => {
              const status = taskStatus(task.done, task.due, today);
              return (
                <div
                  className={`crm-task-card ${task.done ? "done" : ""}`}
                  key={task.id}
                >
                  <label className="crm-task-checkbox">
                    <input
                      type="checkbox"
                      aria-label={`Complete ${task.title}`}
                      checked={task.done}
                      onChange={() =>
                        dispatch(
                          updateLead({
                            id: task.lead.id,
                            changes: {
                              tasks: task.lead.tasks!.map((t) =>
                                t.id === task.id ? { ...t, done: !t.done } : t,
                              ),
                            },
                          }),
                        )
                      }
                    />
                    <span className="crm-checkmark"></span>
                  </label>
                  <div className="crm-task-content">
                    <b>{task.title}</b>
                    <div className="crm-task-meta">
                      <Link
                        to={`${base}/contacts/${task.lead.id}`}
                        className="crm-task-contact-badge"
                      >
                        <CRMAvatar lead={task.lead} />
                        {task.lead.name}
                      </Link>
                      <span className={`crm-task-due-pill ${status}`}>
                        {task.due}
                      </span>
                    </div>
                  </div>
                  <div className="crm-task-actions">
                    <button
                      className="crm2-btn-secondary"
                      onClick={() =>
                        dispatch(
                          updateLead({
                            id: task.lead.id,
                            changes: {
                              tasks: task.lead.tasks!.filter(
                                (t) => t.id !== task.id,
                              ),
                            },
                          }),
                        )
                      }
                    >
                      Delete
                    </button>
                    <Link
                      className="crm2-btn-primary"
                      to={`${base}/contacts/${task.lead.id}`}
                    >
                      <ArrowRight size={14} /> Go to Contact
                    </Link>
                  </div>
                </div>
              );
            })}
            {filteredFollowUps.map((l) => (
              <div className="crm-task-card" key={l.id}>
                <div className="crm-task-icon">
                  <Clock3 size={18} />
                </div>
                <div className="crm-task-content">
                  <b>Follow up with {l.name}</b>
                  <div className="crm-task-meta">
                    <Link
                      to={`${base}/contacts/${l.id}`}
                      className="crm-task-contact-badge"
                    >
                      <CRMAvatar lead={l} />
                      {l.name}
                    </Link>
                    <span
                      className={`crm-task-due-pill ${followUpStatus(l.nextFollowUp, l.nextFollowUpAt, today)}`}
                    >
                      {l.nextFollowUp}
                    </span>
                  </div>
                </div>
                <div className="crm-task-actions">
                  <Link
                    className="crm2-btn-primary"
                    to={`${base}/contacts/${l.id}`}
                  >
                    <ArrowRight size={14} /> Go to Contact
                  </Link>
                </div>
              </div>
            ))}
            {!filteredTasks.length && !filteredFollowUps.length && (
              <div className="crm-empty">
                <Search size={24} />
                <h3>No matching tasks</h3>
                <p>Try another search or status, or create a task above.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {tab === "overview" && (
        <div className="crm-scroll-content">
          <div className="crm-section-heading">
            <div>
              <h2>Your pipeline at a glance</h2>
              <p>Stage distribution and value from your current CRM records.</p>
            </div>
          </div>
          <div className="crm-overview-grid">
            {pipeline.stages.map((stage) => {
              const records = active.filter(
                (l) => displayStage(l, pipeline) === stage.id,
              );
              return (
                <article key={stage.id}>
                  <h3>
                    <i style={{ background: stage.color }} />
                    {stage.label}
                  </h3>
                  <b>
                    {records.length}
                    <small> contacts</small>
                  </b>
                  <p>
                    {euro(records.reduce((s, l) => s + l.value, 0))} in stage
                  </p>
                  <div className="crm-progress">
                    <span
                      style={{
                        width: `${active.length ? (records.length / active.length) * 100 : 0}%`,
                        background: stage.color,
                      }}
                    />
                  </div>
                  <button
                    className="crm-link-button"
                    onClick={() => goTab("pipeline")}
                  >
                    View pipeline <ArrowRight size={12} />
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}
      {dialog === "template" && (
        <TemplateDialog
          existingNames={presetList.map((t) => t.name)}
          close={close}
          created={(template) => {
            setCustomTemplates([...customTemplates, template]);
            setPresetPage(Math.ceil((presetList.length + 1) / presetSize));
            close();
            notify("Custom template saved.");
          }}
        />
      )}
      {dialog === "add" && (
        <AddLeadDialog
          pipeline={pipeline}
          initialStage={addStage}
          close={close}
          created={(id) => {
            close();
            notify("Lead created.");
            openLead(id);
          }}
        />
      )}
      {dialog === "settings" && (
        <SettingsDialog pipeline={pipeline} close={close} notify={notify} />
      )}
      {dialog === "import" && (
        <ImportDialog pipeline={pipeline} close={close} notify={notify} />
      )}
      {dialog === "bulk" && (
        <Dialog
          title={`${bulkAction === "tag" ? "Tag" : bulkAction === "owner" ? "Assign owner to" : "Move"} ${chosen.length} contacts`}
          close={close}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runBulk();
            }}
          >
            <div className="crm-dialog-content">
              <label className="crm-field">
                {bulkAction === "tag"
                  ? "Tag name"
                  : bulkAction === "owner"
                    ? "Owner"
                    : "Stage"}
                {bulkAction === "tag" ? (
                  <input
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                    required
                  />
                ) : (
                  <CustomSelect
                    value={bulkValue}
                    onChange={(val) => setBulkValue(val)}
                    options={
                      bulkAction === "owner"
                        ? [
                            ...new Set([
                              ...owners,
                              ...leads.map((l) => l.owner),
                            ]),
                          ].map((o) => ({ value: o, label: o }))
                        : pipeline.stages.map((s) => ({
                            value: s.id,
                            label: s.label,
                          }))
                    }
                  />
                )}
              </label>
            </div>
            <div className="crm-dialog-footer">
              <button className="crm2-btn-primary" disabled={!bulkValue.trim()}>
                Apply changes
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {dialog === "delete" && (
        <Dialog title="Delete selected contacts?" close={close}>
          <div className="crm-dialog-content">
            <p>
              This permanently deletes {chosen.length} contacts and their
              activities, notes and tasks.
            </p>
          </div>
          <div className="crm-dialog-footer">
            <button className="crm2-btn-secondary" onClick={close}>
              Cancel
            </button>
            <button
              className="crm-delete-button"
              onClick={() => {
                dispatch(deleteLeads(chosen));
                setSelected([]);
                close();
                notify("Contacts deleted.");
              }}
            >
              Delete contacts
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
