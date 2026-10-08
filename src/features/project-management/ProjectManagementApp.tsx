import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowUpRight,
  BarChart3,
  Bell,
  Blocks,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDot,
  Clock3,
  Columns3,
  FileCheck2,
  Filter,
  Gauge,
  Languages,
  LayoutDashboard,
  ListTodo,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Target,
  UserRoundCheck,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConsoleAmbient, useConsoleRoot } from "@/components/console/ConsoleShell";
import "@/components/console/console.css";
import "./project-management.css";
import {
  BOARD_STATUSES,
  PM_STORAGE_KEY,
  addTaskComment,
  allowedTaskTransitions,
  canCreateTask,
  canManageTask,
  canWorkTask,
  createSeedState,
  createTask,
  dashboardNumbers,
  loadPmState,
  markNotificationsRead,
  savePmState,
  scopedTasks,
  taskIsOverdue,
  transitionTask,
  updateTaskProgress,
  type CreateTaskInput,
  type PmActivity,
  type PmProject,
  type PmRole,
  type PmState,
  type PmTask,
  type PmUser,
  type TaskPriority,
  type TaskStatus,
} from "./model";

type View = "overview" | "board" | "tasks" | "team" | "reports";

const ROLE_DEFAULTS: Record<PmRole, string> = {
  admin: "admin-1",
  mentor: "mentor-2",
  intern: "intern-1",
};

const STATUS_META: Record<TaskStatus, { en: string; ar: string; tone: string; icon: LucideIcon }> =
  {
    todo: { en: "To do", ar: "للبدء", tone: "gray", icon: Circle },
    in_progress: { en: "In progress", ar: "قيد التنفيذ", tone: "teal", icon: CircleDot },
    blocked: { en: "Blocked", ar: "متوقفة", tone: "red", icon: AlertCircle },
    in_review: { en: "In review", ar: "قيد المراجعة", tone: "orange", icon: Clock3 },
    revision_required: {
      en: "Revision required",
      ar: "تحتاج تعديلاً",
      tone: "orange",
      icon: RotateCcw,
    },
    done: { en: "Done", ar: "مكتملة", tone: "green", icon: CheckCircle2 },
    cancelled: { en: "Cancelled", ar: "ملغاة", tone: "gray", icon: XCircle },
  };

const PRIORITY_META: Record<TaskPriority, { en: string; ar: string; className: string }> = {
  low: { en: "Low", ar: "منخفضة", className: "pm-priority-low" },
  medium: { en: "Medium", ar: "متوسطة", className: "pm-priority-medium" },
  high: { en: "High", ar: "عالية", className: "pm-priority-high" },
  urgent: { en: "Urgent", ar: "عاجلة", className: "pm-priority-urgent" },
};

function roleName(role: PmRole, ar: boolean) {
  const labels: Record<PmRole, [string, string]> = {
    admin: ["Administrator", "مدير النظام"],
    mentor: ["Mentor", "مرشد"],
    intern: ["Intern", "متدرب"],
  };
  return ar ? labels[role][1] : labels[role][0];
}

function dateLabel(date: string, lang: "ar" | "en", options?: Intl.DateTimeFormatOptions) {
  const d = new Date(date.length === 10 ? `${date}T12:00:00` : date);
  return d.toLocaleDateString(lang === "ar" ? "ar-SY" : "en-GB", {
    day: "numeric",
    month: "short",
    ...(options ?? {}),
  });
}

function relativeDate(date: string, lang: "ar" | "en") {
  const target = new Date(date.length === 10 ? `${date}T23:59:59` : date);
  const days = Math.ceil((target.getTime() - Date.now()) / 86_400_000);
  if (lang === "ar") {
    if (days === 0) return "اليوم";
    if (days === 1) return "غداً";
    if (days === -1) return "أمس";
    return days > 0 ? `خلال ${days} أيام` : `متأخرة ${Math.abs(days)} أيام`;
  }
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${Math.abs(days)} days late`;
}

function userById(state: PmState, id: string) {
  return state.users.find((user) => user.id === id);
}

function projectById(state: PmState, id: string) {
  return state.projects.find((project) => project.id === id);
}

export function ProjectManagementApp() {
  useConsoleRoot();
  const { lang, dir, toggle } = useLang();
  const ar = lang === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const [state, setState] = useState<PmState>(() => loadPmState());
  const [actorId, setActorId] = useState(ROLE_DEFAULTS.admin);
  const [view, setView] = useState<View>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [projectFilter, setProjectFilter] = useState("all");

  useEffect(() => savePmState(state), [state]);

  const actor = state.users.find((user) => user.id === actorId) ?? state.users[0];
  const role = actor.role;
  const tasks = useMemo(() => scopedTasks(state, actor), [state, actor]);
  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (projectFilter !== "all" && task.projectId !== projectFilter) return false;
      if (!query) return true;
      const project = projectById(state, task.projectId);
      const assignee = userById(state, task.assigneeId);
      return [task.title, task.description, project?.name, assignee?.name, ...task.tags]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [tasks, search, statusFilter, projectFilter, state]);
  const numbers = useMemo(() => dashboardNumbers(state, actor), [state, actor]);
  const selectedTask = state.tasks.find((task) => task.id === selectedTaskId) ?? null;
  const notifications = state.notifications
    .filter((item) => item.userId === actor.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = notifications.filter((item) => !item.read).length;

  const switchRole = (nextRole: PmRole) => {
    const id = ROLE_DEFAULTS[nextRole];
    setActorId(id);
    setSelectedTaskId(null);
    setNotificationsOpen(false);
    setView("overview");
    toast.success(
      t(`Previewing as ${roleName(nextRole, false)}`, `العرض بدور ${roleName(nextRole, true)}`),
    );
  };

  const resetDemo = () => {
    const next = createSeedState();
    setState(next);
    try {
      localStorage.removeItem(PM_STORAGE_KEY);
    } catch {
      // Optional browser storage.
    }
    setSelectedTaskId(null);
    toast.success(t("Demo data restored", "تمت استعادة البيانات التجريبية"));
  };

  const openNotification = (taskId?: string) => {
    setState((current) => markNotificationsRead(current, actor.id));
    setNotificationsOpen(false);
    if (taskId) setSelectedTaskId(taskId);
  };

  const navItems: { id: View; icon: LucideIcon; en: string; ar: string; count?: number }[] = [
    { id: "overview", icon: LayoutDashboard, en: "Overview", ar: "نظرة عامة" },
    { id: "board", icon: Columns3, en: "Board", ar: "لوحة المهام" },
    { id: "tasks", icon: ListTodo, en: "All tasks", ar: "كل المهام", count: tasks.length },
    { id: "team", icon: Users, en: role === "intern" ? "My team" : "Team", ar: "الفريق" },
    { id: "reports", icon: BarChart3, en: "Reports", ar: "التقارير" },
  ];

  return (
    <div className="cx pm" dir={dir} data-nav-open={menuOpen}>
      <ConsoleAmbient />
      <aside
        className="pm-side"
        aria-label={t("Project management navigation", "التنقل في إدارة المشاريع")}
      >
        <button className="pm-brand" onClick={() => setView("overview")} type="button">
          <span className="cx-brand-tree" aria-hidden="true" />
          <span>
            <span className="cx-brand-name">SAAE</span>
            <span className="cx-brand-sub">{t("Project management", "إدارة المشاريع")}</span>
          </span>
        </button>

        <div className="pm-role-card">
          <div className="pm-role-head">
            <Avatar user={actor} size="md" />
            <div className="min-w-0">
              <strong className="block truncate text-[13.5px] text-white">{actor.name}</strong>
              <span className="block truncate text-[11.5px] text-[var(--cx-side-muted)]">
                {roleName(role, ar)}
              </span>
            </div>
          </div>
          <div className="pm-role-switch" aria-label={t("Preview role", "تجربة الأدوار")}>
            {(["admin", "mentor", "intern"] as PmRole[]).map((item) => (
              <button
                key={item}
                type="button"
                data-active={role === item}
                onClick={() => switchRole(item)}
                title={roleName(item, ar)}
              >
                {item === "admin" ? "A" : item === "mentor" ? "M" : "I"}
              </button>
            ))}
          </div>
        </div>

        <nav className="pm-nav">
          <div className="pm-nav-label">{t("Workspace", "مساحة العمل")}</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                data-active={view === item.id}
                onClick={() => {
                  setView(item.id);
                  setMenuOpen(false);
                }}
              >
                <Icon />
                <span>{ar ? item.ar : item.en}</span>
                {item.count ? <b>{item.count}</b> : null}
              </button>
            );
          })}
        </nav>

        <div className="pm-side-bottom">
          <div className="pm-progress-card">
            <div className="flex items-center justify-between gap-3 text-[12px]">
              <span className="text-[var(--cx-side-muted)]">
                {t("Overall progress", "التقدم العام")}
              </span>
              <strong className="text-white">{numbers.completion}%</strong>
            </div>
            <Progress value={numbers.completion} />
          </div>
          <div className="pm-side-actions">
            <button type="button" onClick={toggle} title={ar ? "English" : "العربية"}>
              <Languages />
              {ar ? "EN" : "ع"}
            </button>
            <button type="button" onClick={resetDemo} title={t("Reset demo", "إعادة البيانات")}>
              <RotateCcw />
              {t("Reset", "إعادة")}
            </button>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className="pm-scrim"
        aria-label={t("Close menu", "إغلاق القائمة")}
        onClick={() => setMenuOpen(false)}
      />

      <div className="pm-main">
        <header className="pm-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="pm-mobile-menu"
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={t("Open menu", "فتح القائمة")}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold text-[var(--cx-ink)]">
                {t("Internship program", "برنامج التدريب")}
              </div>
              <div className="truncate text-[11px] text-[var(--cx-muted)]">
                {t("October 2026 cohort", "دفعة تشرين الأول 2026")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className="pm-icon-button"
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-label={t("Notifications", "الإشعارات")}
                aria-expanded={notificationsOpen}
              >
                <Bell />
                {unread > 0 && <span className="pm-notification-count">{unread}</span>}
              </button>
              {notificationsOpen && (
                <NotificationPanel
                  notifications={notifications}
                  state={state}
                  lang={lang}
                  onOpen={openNotification}
                  onReadAll={() => setState((current) => markNotificationsRead(current, actor.id))}
                />
              )}
            </div>
            {canCreateTask(actor) && (
              <Button className="pm-primary-button" onClick={() => setCreateOpen(true)}>
                <Plus />
                <span className="hidden sm:inline">{t("New task", "مهمة جديدة")}</span>
              </Button>
            )}
            <Avatar user={actor} size="sm" />
          </div>
        </header>

        <main className="pm-content">
          {view === "overview" && (
            <Overview
              state={state}
              actor={actor}
              tasks={tasks}
              lang={lang}
              numbers={numbers}
              onOpenTask={setSelectedTaskId}
              onViewAll={() => setView("tasks")}
              onCreate={() => setCreateOpen(true)}
            />
          )}
          {view === "board" && (
            <Board
              state={state}
              actor={actor}
              tasks={filteredTasks}
              lang={lang}
              search={search}
              onSearch={setSearch}
              projectFilter={projectFilter}
              onProjectFilter={setProjectFilter}
              onOpenTask={setSelectedTaskId}
            />
          )}
          {view === "tasks" && (
            <TaskList
              state={state}
              tasks={filteredTasks}
              lang={lang}
              search={search}
              onSearch={setSearch}
              statusFilter={statusFilter}
              onStatusFilter={setStatusFilter}
              projectFilter={projectFilter}
              onProjectFilter={setProjectFilter}
              onOpenTask={setSelectedTaskId}
            />
          )}
          {view === "team" && <Team state={state} actor={actor} lang={lang} />}
          {view === "reports" && <Reports state={state} actor={actor} lang={lang} />}
        </main>
      </div>

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        state={state}
        actor={actor}
        lang={lang}
        onCreate={(input) => {
          try {
            setState((current) => createTask(current, actor, input));
            setCreateOpen(false);
            toast.success(t("Task created and assigned", "تم إنشاء المهمة وإسنادها"));
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : t("Could not create task", "تعذر إنشاء المهمة"),
            );
          }
        }}
      />

      <TaskDialog
        task={selectedTask}
        state={state}
        actor={actor}
        lang={lang}
        onClose={() => setSelectedTaskId(null)}
        onTransition={(status, note) => {
          if (!selectedTask) return;
          try {
            setState((current) => transitionTask(current, actor, selectedTask.id, status, note));
            toast.success(t("Task updated", "تم تحديث المهمة"));
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : t("Could not update task", "تعذر تحديث المهمة"),
            );
          }
        }}
        onComment={(body) => {
          if (!selectedTask) return;
          setState((current) => addTaskComment(current, actor, selectedTask.id, body));
          toast.success(t("Comment added", "تمت إضافة التعليق"));
        }}
        onProgress={(progress) => {
          if (!selectedTask) return;
          setState((current) => updateTaskProgress(current, actor, selectedTask.id, progress));
        }}
      />
    </div>
  );
}

function Overview({
  state,
  actor,
  tasks,
  lang,
  numbers,
  onOpenTask,
  onViewAll,
  onCreate,
}: {
  state: PmState;
  actor: PmUser;
  tasks: PmTask[];
  lang: "ar" | "en";
  numbers: ReturnType<typeof dashboardNumbers>;
  onOpenTask: (id: string) => void;
  onViewAll: () => void;
  onCreate: () => void;
}) {
  const ar = lang === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const focusTasks = [...tasks]
    .filter((task) => task.status !== "done" && task.status !== "cancelled")
    .sort((a, b) => {
      const review = Number(b.status === "in_review") - Number(a.status === "in_review");
      return review || a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 5);
  const activity = state.activities
    .filter((item) => {
      const task = item.taskId
        ? state.tasks.find((candidate) => candidate.id === item.taskId)
        : null;
      return (
        actor.role === "admin" ||
        item.actorId === actor.id ||
        (task && scopedTasks(state, actor).some((t) => t.id === task.id))
      );
    })
    .slice(0, 5);
  const today = new Date();
  const greeting =
    today.getHours() < 12 ? t("Good morning", "صباح الخير") : t("Good afternoon", "مرحباً");

  const cards =
    actor.role === "intern"
      ? [
          {
            icon: ListTodo,
            label: t("Active tasks", "المهام النشطة"),
            value: numbers.active,
            tone: "teal",
          },
          {
            icon: Clock3,
            label: t("Awaiting review", "بانتظار المراجعة"),
            value: numbers.review,
            tone: "orange",
          },
          {
            icon: AlertCircle,
            label: t("Blocked", "المهام المتوقفة"),
            value: numbers.blocked,
            tone: "red",
          },
          {
            icon: Target,
            label: t("Overall progress", "التقدم العام"),
            value: `${numbers.completion}%`,
            tone: "green",
          },
        ]
      : [
          {
            icon: FileCheck2,
            label: t("Review queue", "قائمة المراجعة"),
            value: numbers.review,
            tone: "orange",
          },
          {
            icon: AlertCircle,
            label: t("Blocked work", "المهام المتوقفة"),
            value: numbers.blocked,
            tone: "red",
          },
          {
            icon: CalendarDays,
            label: t("Overdue", "المهام المتأخرة"),
            value: numbers.overdue,
            tone: "orange",
          },
          {
            icon: CheckCircle2,
            label: t("Completed", "المهام المكتملة"),
            value: numbers.done,
            tone: "green",
          },
        ];

  return (
    <div>
      <section className="pm-hero">
        <div>
          <div className="cx-eyebrow">{t("Project management", "إدارة المشاريع")}</div>
          <h1 className="cx-h1 mt-1">
            {greeting}, {actor.name.split(" ")[0]}
          </h1>
          <p className="cx-sub mt-2 max-w-2xl">
            {actor.role === "intern"
              ? t(
                  "Your priorities, feedback, and progress are together in one place.",
                  "أولوياتك وملاحظات مرشدك وتقدمك في مكان واحد.",
                )
              : actor.role === "mentor"
                ? t(
                    "Review the work that needs your attention and keep every intern moving.",
                    "راجع العمل الذي يحتاج إلى اهتمامك وساعد كل متدرب على التقدم.",
                  )
                : t(
                    "Monitor program health, workloads, and delivery across the internship cohort.",
                    "تابع صحة البرنامج والأعباء والتسليم ضمن دفعة المتدربين.",
                  )}
          </p>
        </div>
        {canCreateTask(actor) && (
          <Button className="pm-primary-button" onClick={onCreate}>
            <Plus /> {t("Assign a task", "إسناد مهمة")}
          </Button>
        )}
      </section>

      <div className="pm-stat-grid">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="pm-dashboard-grid">
        <Panel
          title={t(
            actor.role === "intern" ? "My focus" : "Needs attention",
            actor.role === "intern" ? "أولوياتي" : "تحتاج إلى اهتمام",
          )}
          description={t(
            "Work ordered by urgency and review state",
            "المهام مرتبة حسب الأولوية وحالة المراجعة",
          )}
          action={
            <button className="pm-link" type="button" onClick={onViewAll}>
              {t("View all", "عرض الكل")} <ArrowUpRight />
            </button>
          }
        >
          <div className="pm-focus-list">
            {focusTasks.map((task) => (
              <FocusTask key={task.id} task={task} state={state} lang={lang} onOpen={onOpenTask} />
            ))}
          </div>
        </Panel>

        <Panel
          title={t("Recent activity", "النشاط الأخير")}
          description={t("The latest work across your scope", "أحدث التغييرات ضمن نطاقك")}
        >
          <div className="pm-activity-list">
            {activity.map((item) => (
              <ActivityRow key={item.id} item={item} state={state} lang={lang} />
            ))}
          </div>
        </Panel>
      </div>

      <ProjectSnapshot state={state} actor={actor} lang={lang} />
    </div>
  );
}

function Board({
  state,
  actor,
  tasks,
  lang,
  search,
  onSearch,
  projectFilter,
  onProjectFilter,
  onOpenTask,
}: {
  state: PmState;
  actor: PmUser;
  tasks: PmTask[];
  lang: "ar" | "en";
  search: string;
  onSearch: (value: string) => void;
  projectFilter: string;
  onProjectFilter: (value: string) => void;
  onOpenTask: (id: string) => void;
}) {
  const ar = lang === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  return (
    <div>
      <PageTitle
        eyebrow={t("Visual workflow", "سير العمل المرئي")}
        title={t("Task board", "لوحة المهام")}
        description={t(
          "Track every assignment from planning through approval.",
          "تابع كل مهمة من التخطيط حتى الاعتماد.",
        )}
      />
      <Filters
        state={state}
        lang={lang}
        search={search}
        onSearch={onSearch}
        projectFilter={projectFilter}
        onProjectFilter={onProjectFilter}
      />
      <div className="pm-board" aria-label={t("Task board", "لوحة المهام")}>
        {BOARD_STATUSES.map((status) => {
          const meta = STATUS_META[status];
          const columnTasks = tasks.filter((task) =>
            status === "in_progress"
              ? task.status === "in_progress" || task.status === "revision_required"
              : task.status === status,
          );
          return (
            <section key={status} className="pm-board-column">
              <header>
                <div className="flex items-center gap-2">
                  <span className="pm-status-dot" data-tone={meta.tone} />
                  <strong>{ar ? meta.ar : meta.en}</strong>
                  <span>{columnTasks.length}</span>
                </div>
                <MoreHorizontal />
              </header>
              <div className="pm-board-stack">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    state={state}
                    lang={lang}
                    onOpen={onOpenTask}
                  />
                ))}
                {columnTasks.length === 0 && (
                  <div className="pm-column-empty">{t("No tasks here", "لا توجد مهام هنا")}</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-[var(--cx-muted)]">
        {actor.role === "intern"
          ? t(
              "Open a task to update progress, report a blocker, or submit work for review.",
              "افتح المهمة لتحديث التقدم أو الإبلاغ عن عائق أو إرسال العمل للمراجعة.",
            )
          : t(
              "Open a task to review evidence, request changes, or approve completion.",
              "افتح المهمة لمراجعة الأدلة أو طلب التعديلات أو اعتماد الإنجاز.",
            )}
      </p>
    </div>
  );
}

function TaskList({
  state,
  tasks,
  lang,
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  projectFilter,
  onProjectFilter,
  onOpenTask,
}: {
  state: PmState;
  tasks: PmTask[];
  lang: "ar" | "en";
  search: string;
  onSearch: (value: string) => void;
  statusFilter: TaskStatus | "all";
  onStatusFilter: (value: TaskStatus | "all") => void;
  projectFilter: string;
  onProjectFilter: (value: string) => void;
  onOpenTask: (id: string) => void;
}) {
  const ar = lang === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  return (
    <div>
      <PageTitle
        eyebrow={t("Delivery", "التسليم")}
        title={t("All tasks", "كل المهام")}
        description={t(
          `${tasks.length} tasks match the current filters.`,
          `${tasks.length} مهمة تطابق عوامل التصفية الحالية.`,
        )}
      />
      <Filters
        state={state}
        lang={lang}
        search={search}
        onSearch={onSearch}
        projectFilter={projectFilter}
        onProjectFilter={onProjectFilter}
        statusFilter={statusFilter}
        onStatusFilter={onStatusFilter}
      />
      <div className="cx-card overflow-hidden">
        <div className="pm-table-scroll">
          <table className="pm-table">
            <thead>
              <tr>
                <th>{t("Task", "المهمة")}</th>
                <th>{t("Assignee", "المسند إليه")}</th>
                <th>{t("Status", "الحالة")}</th>
                <th>{t("Priority", "الأولوية")}</th>
                <th>{t("Due date", "موعد التسليم")}</th>
                <th>{t("Progress", "التقدم")}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const assignee = userById(state, task.assigneeId)!;
                const project = projectById(state, task.projectId)!;
                return (
                  <tr key={task.id} onClick={() => onOpenTask(task.id)} tabIndex={0}>
                    <td>
                      <strong>{task.title}</strong>
                      <span>{project.name}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar user={assignee} size="xs" />
                        <span>{assignee.name}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={task.status} ar={ar} />
                    </td>
                    <td>
                      <PriorityBadge priority={task.priority} ar={ar} />
                    </td>
                    <td className={taskIsOverdue(task) ? "pm-overdue" : ""}>
                      {dateLabel(task.dueDate, lang)}
                    </td>
                    <td>
                      <div className="flex min-w-[110px] items-center gap-2">
                        <Progress value={task.progress} />
                        <span className="text-[11px] tabular-nums text-[var(--cx-muted)]">
                          {task.progress}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {tasks.length === 0 && <EmptyState title={t("No matching tasks", "لا توجد مهام مطابقة")} />}
      </div>
    </div>
  );
}

function Team({ state, actor, lang }: { state: PmState; actor: PmUser; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const members = state.users.filter((user) => {
    if (!user.active || user.role === "admin")
      return actor.role === "admin" && user.role === "admin";
    if (actor.role === "admin") return true;
    if (actor.role === "mentor") return user.id === actor.id || user.mentorId === actor.id;
    const projectIds = state.projects
      .filter((project) => project.memberIds.includes(actor.id))
      .map((project) => project.id);
    const relatedIds = new Set(
      state.projects
        .filter((project) => projectIds.includes(project.id))
        .flatMap((project) => [project.mentorId, ...project.memberIds]),
    );
    return relatedIds.has(user.id);
  });
  return (
    <div>
      <PageTitle
        eyebrow={t("People", "الأشخاص")}
        title={t(
          actor.role === "intern" ? "My team" : "Team workload",
          actor.role === "intern" ? "فريقي" : "أعباء الفريق",
        )}
        description={t(
          "See ownership, workload, and current delivery health.",
          "اطلع على المسؤوليات والأعباء وحالة التسليم الحالية.",
        )}
      />
      <div className="pm-team-grid">
        {members.map((member) => {
          const memberTasks = state.tasks.filter(
            (task) => task.assigneeId === member.id && task.status !== "cancelled",
          );
          const active = memberTasks.filter((task) => task.status !== "done").length;
          const done = memberTasks.filter((task) => task.status === "done").length;
          const workload = memberTasks.reduce(
            (sum, task) => sum + (task.status === "done" ? 0 : task.estimateHours),
            0,
          );
          return (
            <article key={member.id} className="cx-card pm-member-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar user={member} size="lg" />
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-extrabold text-[var(--cx-ink)]">
                      {member.name}
                    </h2>
                    <p className="truncate text-[12px] text-[var(--cx-muted)]">{member.title}</p>
                  </div>
                </div>
                <span className="pm-role-pill">{roleName(member.role, ar)}</span>
              </div>
              <div className="pm-member-stats">
                <div>
                  <strong>{active}</strong>
                  <span>{t("Active", "نشطة")}</span>
                </div>
                <div>
                  <strong>{done}</strong>
                  <span>{t("Done", "مكتملة")}</span>
                </div>
                <div>
                  <strong>{workload}h</strong>
                  <span>{t("Planned", "مخططة")}</span>
                </div>
              </div>
              {member.role === "intern" && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--cx-muted)]">
                    <span>{t("Average progress", "متوسط التقدم")}</span>
                    <strong className="text-[var(--cx-ink-2)]">
                      {memberTasks.length
                        ? Math.round(
                            memberTasks.reduce((sum, task) => sum + task.progress, 0) /
                              memberTasks.length,
                          )
                        : 0}
                      %
                    </strong>
                  </div>
                  <Progress
                    value={
                      memberTasks.length
                        ? memberTasks.reduce((sum, task) => sum + task.progress, 0) /
                          memberTasks.length
                        : 0
                    }
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Reports({ state, actor, lang }: { state: PmState; actor: PmUser; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const tasks = scopedTasks(state, actor);
  const total = tasks.length || 1;
  const completion = Math.round(
    (tasks.filter((task) => task.status === "done").length / total) * 100,
  );
  const onTime = tasks.filter((task) => task.status === "done" || !taskIsOverdue(task)).length;
  const onTimeRate = Math.round((onTime / total) * 100);
  const projectRows = state.projects
    .map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id);
      return {
        project,
        tasks: projectTasks.length,
        progress: projectTasks.length
          ? Math.round(
              projectTasks.reduce((sum, task) => sum + task.progress, 0) / projectTasks.length,
            )
          : 0,
        blocked: projectTasks.filter((task) => task.status === "blocked").length,
      };
    })
    .filter((row) => row.tasks > 0);
  const statusRows = (Object.keys(STATUS_META) as TaskStatus[])
    .map((status) => ({ status, count: tasks.filter((task) => task.status === status).length }))
    .filter((row) => row.count > 0);
  return (
    <div>
      <PageTitle
        eyebrow={t("Insights", "التحليلات")}
        title={t("Delivery reports", "تقارير التسليم")}
        description={t(
          "A clear view of progress, timing, and program risk.",
          "صورة واضحة عن التقدم والتوقيت ومخاطر البرنامج.",
        )}
      />
      <div className="pm-stat-grid pm-report-stats">
        <StatCard
          icon={Gauge}
          label={t("Average progress", "متوسط التقدم")}
          value={`${dashboardNumbers(state, actor).completion}%`}
          tone="teal"
        />
        <StatCard
          icon={CheckCircle2}
          label={t("Completion rate", "نسبة الإنجاز")}
          value={`${completion}%`}
          tone="green"
        />
        <StatCard
          icon={Clock3}
          label={t("On-time rate", "نسبة الالتزام")}
          value={`${onTimeRate}%`}
          tone="orange"
        />
        <StatCard
          icon={AlertCircle}
          label={t("At risk", "معرضة للخطر")}
          value={tasks.filter((task) => taskIsOverdue(task) || task.status === "blocked").length}
          tone="red"
        />
      </div>
      <div className="pm-dashboard-grid">
        <Panel
          title={t("Project health", "صحة المشاريع")}
          description={t("Average progress across visible work", "متوسط التقدم ضمن العمل المرئي")}
        >
          <div className="pm-report-list">
            {projectRows.map((row) => (
              <div key={row.project.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <strong>{row.project.name}</strong>
                    <span>
                      {row.tasks} {t("tasks", "مهام")} · {row.blocked} {t("blocked", "متوقفة")}
                    </span>
                  </div>
                  <b>{row.progress}%</b>
                </div>
                <Progress value={row.progress} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title={t("Work by status", "العمل حسب الحالة")}
          description={t("Distribution of the current scope", "توزيع نطاق العمل الحالي")}
        >
          <div className="pm-status-report">
            {statusRows.map((row) => {
              const meta = STATUS_META[row.status];
              return (
                <div key={row.status}>
                  <span className="pm-status-dot" data-tone={meta.tone} />
                  <span>{ar ? meta.ar : meta.en}</span>
                  <div>
                    <i style={{ width: `${Math.max(8, (row.count / total) * 100)}%` }} />
                  </div>
                  <strong>{row.count}</strong>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Filters({
  state,
  lang,
  search,
  onSearch,
  projectFilter,
  onProjectFilter,
  statusFilter,
  onStatusFilter,
}: {
  state: PmState;
  lang: "ar" | "en";
  search: string;
  onSearch: (value: string) => void;
  projectFilter: string;
  onProjectFilter: (value: string) => void;
  statusFilter?: TaskStatus | "all";
  onStatusFilter?: (value: TaskStatus | "all") => void;
}) {
  const ar = lang === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  return (
    <div className="pm-filters">
      <label className="pm-search">
        <Search />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={t("Search tasks, people, or tags", "ابحث في المهام أو الأشخاص أو الوسوم")}
        />
      </label>
      <label className="pm-select">
        <Blocks />
        <select value={projectFilter} onChange={(event) => onProjectFilter(event.target.value)}>
          <option value="all">{t("All projects", "كل المشاريع")}</option>
          {state.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <ChevronDown />
      </label>
      {statusFilter !== undefined && onStatusFilter && (
        <label className="pm-select">
          <Filter />
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilter(event.target.value as TaskStatus | "all")}
          >
            <option value="all">{t("All statuses", "كل الحالات")}</option>
            {(Object.keys(STATUS_META) as TaskStatus[]).map((status) => (
              <option key={status} value={status}>
                {ar ? STATUS_META[status].ar : STATUS_META[status].en}
              </option>
            ))}
          </select>
          <ChevronDown />
        </label>
      )}
    </div>
  );
}

function CreateTaskDialog({
  open,
  onOpenChange,
  state,
  actor,
  lang,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: PmState;
  actor: PmUser;
  lang: "ar" | "en";
  onCreate: (input: CreateTaskInput) => void;
}) {
  const ar = lang === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const projects = useMemo(
    () =>
      state.projects.filter((project) => actor.role === "admin" || project.mentorId === actor.id),
    [state.projects, actor.id, actor.role],
  );
  const interns = state.users.filter((user) => user.role === "intern" && user.active);
  const tomorrow = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: "",
    description: "",
    projectId: projects[0]?.id ?? "",
    assigneeId: interns[0]?.id ?? "",
    priority: "medium" as TaskPriority,
    dueDate: tomorrow,
    estimateHours: 6,
    tags: "",
    criteria: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm((current) => {
      if (projects.some((project) => project.id === current.projectId)) return current;
      return { ...current, projectId: projects[0]?.id ?? "" };
    });
  }, [open, projects]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.projectId || !form.assigneeId)
      return;
    onCreate({
      projectId: form.projectId,
      title: form.title.trim(),
      description: form.description.trim(),
      assigneeId: form.assigneeId,
      priority: form.priority,
      dueDate: form.dueDate,
      estimateHours: Number(form.estimateHours),
      tags: form.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      acceptanceCriteria: form.criteria
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    setForm((current) => ({ ...current, title: "", description: "", tags: "", criteria: "" }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pm-dialog max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Assign a new task", "إسناد مهمة جديدة")}</DialogTitle>
          <DialogDescription>
            {t(
              "Give the intern clear instructions, a due date, and acceptance criteria.",
              "قدّم للمتدرب تعليمات واضحة وموعداً ومعايير قبول.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="pm-form">
          <Field label={t("Task title", "عنوان المهمة")}>
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder={t(
                "Example: Map the learner onboarding journey",
                "مثال: توثيق رحلة انضمام المتعلم",
              )}
              required
            />
          </Field>
          <Field label={t("Description", "الوصف")}>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Project", "المشروع")}>
              <select
                className="pm-field"
                value={form.projectId}
                onChange={(event) => setForm({ ...form, projectId: event.target.value })}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("Assign to", "إسناد إلى")}>
              <select
                className="pm-field"
                value={form.assigneeId}
                onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}
              >
                {interns.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("Priority", "الأولوية")}>
              <select
                className="pm-field"
                value={form.priority}
                onChange={(event) =>
                  setForm({ ...form, priority: event.target.value as TaskPriority })
                }
              >
                {(Object.keys(PRIORITY_META) as TaskPriority[]).map((priority) => (
                  <option key={priority} value={priority}>
                    {ar ? PRIORITY_META[priority].ar : PRIORITY_META[priority].en}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("Due date", "موعد التسليم")}>
              <Input
                type="date"
                dir="ltr"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                required
              />
            </Field>
            <Field label={t("Estimated hours", "الساعات المقدرة")}>
              <Input
                type="number"
                min={1}
                max={200}
                value={form.estimateHours}
                onChange={(event) =>
                  setForm({ ...form, estimateHours: Number(event.target.value) })
                }
              />
            </Field>
            <Field label={t("Tags", "الوسوم")}>
              <Input
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
                placeholder={t("UX, Research", "تجربة المستخدم، بحث")}
              />
            </Field>
          </div>
          <Field
            label={t("Acceptance criteria", "معايير القبول")}
            hint={t("One criterion per line", "معيار واحد في كل سطر")}
          >
            <Textarea
              rows={4}
              value={form.criteria}
              onChange={(event) => setForm({ ...form, criteria: event.target.value })}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button type="submit" className="pm-primary-button">
              <Plus /> {t("Create task", "إنشاء المهمة")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({
  task,
  state,
  actor,
  lang,
  onClose,
  onTransition,
  onComment,
  onProgress,
}: {
  task: PmTask | null;
  state: PmState;
  actor: PmUser;
  lang: "ar" | "en";
  onClose: () => void;
  onTransition: (status: TaskStatus, note: string) => void;
  onComment: (body: string) => void;
  onProgress: (progress: number) => void;
}) {
  const ar = lang === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [progress, setProgress] = useState(task?.progress ?? 0);

  useEffect(() => {
    setNote("");
    setComment("");
    setProgress(task?.progress ?? 0);
  }, [task?.id, task?.progress]);
  if (!task) return null;
  const project = projectById(state, task.projectId)!;
  const assignee = userById(state, task.assigneeId)!;
  const mentor = userById(state, task.mentorId)!;
  const transitions = allowedTaskTransitions(actor, task);
  const submitTransition = (status: TaskStatus) => {
    onTransition(status, note);
    setNote("");
  };
  return (
    <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="pm-dialog pm-task-dialog max-h-[94vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} ar={ar} />
            <PriorityBadge priority={task.priority} ar={ar} />
            <span
              className="pm-project-chip"
              style={{ "--project-color": project.color } as CSSProperties}
            >
              {project.code}
            </span>
          </div>
          <DialogTitle className="pe-8 text-[22px] leading-snug">{task.title}</DialogTitle>
          <DialogDescription>{task.description}</DialogDescription>
        </DialogHeader>
        <div className="pm-task-layout">
          <div className="space-y-5">
            <section>
              <h3 className="pm-section-title">
                <Target /> {t("Acceptance criteria", "معايير القبول")}
              </h3>
              <div className="pm-criteria">
                {task.acceptanceCriteria.map((criterion, index) => (
                  <div key={criterion}>
                    <span>{task.status === "done" ? <Check /> : index + 1}</span>
                    <p>{criterion}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="pm-section-title">
                <MessageSquare /> {t("Discussion", "المناقشة")}
              </h3>
              <div className="pm-comments">
                {task.comments.length === 0 && (
                  <p className="text-[13px] text-[var(--cx-muted)]">
                    {t("No comments yet.", "لا توجد تعليقات بعد.")}
                  </p>
                )}
                {task.comments.map((item) => {
                  const author = userById(state, item.authorId)!;
                  return (
                    <div key={item.id} className="pm-comment" data-kind={item.kind}>
                      <Avatar user={author} size="xs" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{author.name}</strong>
                          <span>
                            {dateLabel(item.createdAt, lang, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {item.kind !== "comment" && <b>{item.kind.replace("_", " ")}</b>}
                        </div>
                        <p>{item.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form
                className="pm-comment-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!comment.trim()) return;
                  onComment(comment);
                  setComment("");
                }}
              >
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={2}
                  placeholder={t("Add a progress update or question", "أضف تحديثاً أو سؤالاً")}
                />
                <Button type="submit" size="sm" disabled={!comment.trim()}>
                  <Send /> {t("Comment", "تعليق")}
                </Button>
              </form>
            </section>
          </div>

          <aside className="pm-task-aside">
            <MetaRow label={t("Assignee", "المسند إليه")}>
              <Avatar user={assignee} size="xs" />
              <span>{assignee.name}</span>
            </MetaRow>
            <MetaRow label={t("Mentor", "المرشد")}>
              <Avatar user={mentor} size="xs" />
              <span>{mentor.name}</span>
            </MetaRow>
            <MetaRow label={t("Due date", "موعد التسليم")}>
              <CalendarDays />
              <span className={taskIsOverdue(task) ? "pm-overdue" : ""}>
                {dateLabel(task.dueDate, lang)} · {relativeDate(task.dueDate, lang)}
              </span>
            </MetaRow>
            <MetaRow label={t("Estimate", "التقدير")}>
              <Clock3 />
              <span>
                {task.estimateHours} {t("hours", "ساعات")}
              </span>
            </MetaRow>
            <MetaRow label={t("Tags", "الوسوم")}>
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <span className="pm-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </MetaRow>

            {(canWorkTask(actor, task) || canManageTask(actor, task)) && task.status !== "done" && (
              <div className="pm-progress-editor">
                <div className="mb-2 flex items-center justify-between text-[12px]">
                  <strong>{t("Progress", "التقدم")}</strong>
                  <span>{progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progress}
                  onChange={(event) => setProgress(Number(event.target.value))}
                  onMouseUp={() => onProgress(progress)}
                  onTouchEnd={() => onProgress(progress)}
                />
              </div>
            )}

            {transitions.length > 0 && (
              <div className="pm-actions-box">
                <label>{t("Update note", "ملاحظة التحديث")}</label>
                <Textarea
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t("Add context for the next person", "أضف توضيحاً للشخص التالي")}
                />
                <div className="grid gap-2">
                  {actor.role === "intern" && task.status === "todo" && (
                    <Button onClick={() => submitTransition("in_progress")}>
                      <CircleDot /> {t("Start work", "بدء العمل")}
                    </Button>
                  )}
                  {actor.role === "intern" &&
                    ["in_progress", "revision_required"].includes(task.status) && (
                      <Button onClick={() => submitTransition("in_review")}>
                        <Send /> {t("Submit for review", "إرسال للمراجعة")}
                      </Button>
                    )}
                  {actor.role === "intern" && task.status === "in_progress" && (
                    <Button
                      variant="destructive"
                      disabled={!note.trim()}
                      onClick={() => submitTransition("blocked")}
                    >
                      <AlertCircle /> {t("Report blocker", "الإبلاغ عن عائق")}
                    </Button>
                  )}
                  {actor.role === "intern" && task.status === "blocked" && (
                    <Button onClick={() => submitTransition("in_progress")}>
                      <RotateCcw /> {t("Resume work", "استئناف العمل")}
                    </Button>
                  )}
                  {canManageTask(actor, task) && task.status === "in_review" && (
                    <>
                      <Button onClick={() => submitTransition("done")}>
                        <CheckCircle2 /> {t("Approve task", "اعتماد المهمة")}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!note.trim()}
                        onClick={() => submitTransition("revision_required")}
                      >
                        <RotateCcw /> {t("Request changes", "طلب تعديلات")}
                      </Button>
                    </>
                  )}
                  {canManageTask(actor, task) &&
                    !["in_review", "done", "cancelled"].includes(task.status) && (
                      <Button variant="outline" onClick={() => submitTransition("in_progress")}>
                        <CircleDot /> {t("Set in progress", "وضع قيد التنفيذ")}
                      </Button>
                    )}
                  {canManageTask(actor, task) && task.status === "done" && (
                    <Button variant="outline" onClick={() => submitTransition("in_progress")}>
                      <RotateCcw /> {t("Reopen task", "إعادة فتح المهمة")}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NotificationPanel({
  notifications,
  state,
  lang,
  onOpen,
  onReadAll,
}: {
  notifications: PmState["notifications"];
  state: PmState;
  lang: "ar" | "en";
  onOpen: (taskId?: string) => void;
  onReadAll: () => void;
}) {
  const ar = lang === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  return (
    <div className="pm-notifications">
      <header>
        <strong>{t("Notifications", "الإشعارات")}</strong>
        <button type="button" onClick={onReadAll}>
          {t("Mark all read", "تحديد الكل كمقروء")}
        </button>
      </header>
      <div>
        {notifications.length === 0 && (
          <EmptyState title={t("You are all caught up", "لا توجد إشعارات جديدة")} />
        )}
        {notifications.slice(0, 6).map((item) => {
          const task = item.taskId
            ? state.tasks.find((candidate) => candidate.id === item.taskId)
            : null;
          return (
            <button
              type="button"
              key={item.id}
              data-read={item.read}
              onClick={() => onOpen(item.taskId)}
            >
              <span className="pm-notification-icon">
                <Bell />
              </span>
              <span>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <small>
                  {dateLabel(item.createdAt, lang, { hour: "2-digit", minute: "2-digit" })}
                  {task ? ` · ${projectById(state, task.projectId)?.code}` : ""}
                </small>
              </span>
              {!item.read && <i />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProjectSnapshot({
  state,
  actor,
  lang,
}: {
  state: PmState;
  actor: PmUser;
  lang: "ar" | "en";
}) {
  const ar = lang === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const visible = state.projects.filter(
    (project) =>
      actor.role === "admin" ||
      project.mentorId === actor.id ||
      project.memberIds.includes(actor.id),
  );
  return (
    <Panel
      title={t("Project snapshot", "ملخص المشاريع")}
      description={t("Progress and delivery risk by project", "التقدم ومخاطر التسليم حسب المشروع")}
    >
      <div className="pm-project-grid">
        {visible.map((project) => {
          const tasks = state.tasks.filter((task) => task.projectId === project.id);
          const progress = tasks.length
            ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length)
            : 0;
          const atRisk = tasks.filter(
            (task) => task.status === "blocked" || taskIsOverdue(task),
          ).length;
          return (
            <article key={project.id}>
              <div className="pm-project-mark" style={{ background: project.color }}>
                {project.code}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong>{project.name}</strong>
                    <span>{project.description}</span>
                  </div>
                  <b>{progress}%</b>
                </div>
                <Progress value={progress} />
                <footer>
                  <span>
                    {tasks.length} {t("tasks", "مهام")}
                  </span>
                  <span className={atRisk ? "pm-overdue" : ""}>
                    {atRisk} {t("at risk", "معرضة للخطر")}
                  </span>
                  <span>{dateLabel(project.dueDate, lang)}</span>
                </footer>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function FocusTask({
  task,
  state,
  lang,
  onOpen,
}: {
  task: PmTask;
  state: PmState;
  lang: "ar" | "en";
  onOpen: (id: string) => void;
}) {
  const ar = lang === "ar";
  const assignee = userById(state, task.assigneeId)!;
  return (
    <button type="button" onClick={() => onOpen(task.id)}>
      <span className="pm-task-check" data-done={task.status === "done"}>
        {task.status === "done" ? <Check /> : <Circle />}
      </span>
      <span className="min-w-0 flex-1">
        <strong>{task.title}</strong>
        <small>{projectById(state, task.projectId)?.name}</small>
      </span>
      <StatusBadge status={task.status} ar={ar} />
      <span className={taskIsOverdue(task) ? "pm-due pm-overdue" : "pm-due"}>
        <CalendarDays /> {relativeDate(task.dueDate, lang)}
      </span>
      <Avatar user={assignee} size="xs" />
    </button>
  );
}

function ActivityRow({
  item,
  state,
  lang,
}: {
  item: PmActivity;
  state: PmState;
  lang: "ar" | "en";
}) {
  const actor = userById(state, item.actorId)!;
  return (
    <div>
      <Avatar user={actor} size="xs" />
      <div>
        <p>
          <strong>{actor.name}</strong> {item.detail}
        </p>
        <span>{dateLabel(item.createdAt, lang, { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  state,
  lang,
  onOpen,
}: {
  task: PmTask;
  state: PmState;
  lang: "ar" | "en";
  onOpen: (id: string) => void;
}) {
  const ar = lang === "ar";
  const assignee = userById(state, task.assigneeId)!;
  const project = projectById(state, task.projectId)!;
  return (
    <button className="pm-task-card" type="button" onClick={() => onOpen(task.id)}>
      <div className="flex items-center justify-between gap-3">
        <span className="pm-project-code" style={{ color: project.color }}>
          {project.code}
        </span>
        <PriorityBadge priority={task.priority} ar={ar} />
      </div>
      <h3>{task.title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {task.tags.slice(0, 2).map((tag) => (
          <span className="pm-tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <Progress value={task.progress} />
      <footer>
        <span className={taskIsOverdue(task) ? "pm-overdue" : ""}>
          <CalendarDays /> {dateLabel(task.dueDate, lang)}
        </span>
        <span>
          <MessageSquare /> {task.comments.length}
        </span>
        <Avatar user={assignee} size="xs" />
      </footer>
    </button>
  );
}

function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6">
      <div className="cx-eyebrow">{eyebrow}</div>
      <h1 className="cx-h1 mt-1">{title}</h1>
      <p className="cx-sub mt-1.5">{description}</p>
    </header>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="cx-card pm-panel">
      <header>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </header>
      <div className="pm-panel-body">{children}</div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  tone: string;
}) {
  return (
    <article className="cx-card pm-stat">
      <span data-tone={tone}>
        <Icon />
      </span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </article>
  );
}

function Avatar({ user, size }: { user: PmUser; size: "xs" | "sm" | "md" | "lg" }) {
  return (
    <span
      className="pm-avatar"
      data-size={size}
      style={{ "--avatar": user.color } as CSSProperties}
      title={user.name}
    >
      {user.initials}
    </span>
  );
}

function StatusBadge({ status, ar }: { status: TaskStatus; ar: boolean }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className="pm-status" data-tone={meta.tone}>
      <Icon /> {ar ? meta.ar : meta.en}
    </span>
  );
}

function PriorityBadge({ priority, ar }: { priority: TaskPriority; ar: boolean }) {
  const meta = PRIORITY_META[priority];
  return <span className={`pm-priority ${meta.className}`}>{ar ? meta.ar : meta.en}</span>;
}

function Progress({ value }: { value: number }) {
  return (
    <span className="pm-progress" aria-label={`${Math.round(value)}%`}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="pm-form-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pm-meta-row">
      <strong>{label}</strong>
      <div>{children}</div>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="pm-empty">
      <Archive />
      <strong>{title}</strong>
    </div>
  );
}
