export type PmRole = "intern" | "mentor" | "admin";

export type TaskStatus =
  "todo" | "in_progress" | "blocked" | "in_review" | "revision_required" | "done" | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type PmUser = {
  id: string;
  name: string;
  email: string;
  role: PmRole;
  title: string;
  initials: string;
  color: string;
  active: boolean;
  mentorId?: string;
};

export type PmProject = {
  id: string;
  name: string;
  code: string;
  description: string;
  status: "active" | "on_hold" | "completed";
  mentorId: string;
  memberIds: string[];
  dueDate: string;
  color: string;
};

export type PmComment = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  kind: "comment" | "submission" | "review" | "system";
};

export type PmTask = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId: string;
  mentorId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  estimateHours: number;
  progress: number;
  tags: string[];
  acceptanceCriteria: string[];
  comments: PmComment[];
  createdAt: string;
  updatedAt: string;
};

export type PmNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  taskId?: string;
  createdAt: string;
  read: boolean;
};

export type PmActivity = {
  id: string;
  actorId: string;
  taskId?: string;
  action: string;
  detail: string;
  createdAt: string;
};

export type PmState = {
  version: 2;
  users: PmUser[];
  projects: PmProject[];
  tasks: PmTask[];
  notifications: PmNotification[];
  activities: PmActivity[];
};

export type CreateTaskInput = Pick<
  PmTask,
  | "projectId"
  | "title"
  | "description"
  | "assigneeId"
  | "priority"
  | "dueDate"
  | "estimateHours"
  | "tags"
  | "acceptanceCriteria"
>;

export const PM_STORAGE_KEY = "saae-project-management-v2";

export const STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "in_review",
  "revision_required",
  "done",
];

export const BOARD_STATUSES: TaskStatus[] = ["todo", "in_progress", "in_review", "done"];

const DAY = 86_400_000;

export function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isoDay(offset: number, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function isoTime(offsetDays: number, hour: number, now = new Date()) {
  const d = new Date(now.getTime() + offsetDays * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function createEmptyState(): PmState {
  return {
    version: 2,
    users: [
      {
        id: "admin-1",
        name: "Administrator",
        email: "admin@saae.org",
        role: "admin",
        title: "Workspace administrator",
        initials: "AD",
        color: "#048090",
        active: true,
      },
      {
        id: "mentor-2",
        name: "Mentor",
        email: "mentor@saae.org",
        role: "mentor",
        title: "Program mentor",
        initials: "ME",
        color: "#698f3f",
        active: true,
      },
      {
        id: "intern-1",
        name: "Intern",
        email: "intern@saae.org",
        role: "intern",
        title: "Program intern",
        initials: "IN",
        color: "#c77a12",
        active: true,
        mentorId: "mentor-2",
      },
    ],
    projects: [],
    tasks: [],
    notifications: [],
    activities: [],
  };
}

export function createSeedState(now = new Date()): PmState {
  const users: PmUser[] = [
    {
      id: "admin-1",
      name: "Lina Haddad",
      email: "lina@saae.org",
      role: "admin",
      title: "Program administrator",
      initials: "LH",
      color: "#048090",
      active: true,
    },
    {
      id: "mentor-1",
      name: "Omar Khalil",
      email: "omar@saae.org",
      role: "mentor",
      title: "Product mentor",
      initials: "OK",
      color: "#698f3f",
      active: true,
    },
    {
      id: "mentor-2",
      name: "Maya Darwish",
      email: "maya@saae.org",
      role: "mentor",
      title: "Engineering mentor",
      initials: "MD",
      color: "#2f7b87",
      active: true,
    },
    {
      id: "intern-1",
      name: "Yazan Saleh",
      email: "yazan@example.com",
      role: "intern",
      title: "Product design intern",
      initials: "YS",
      color: "#c77a12",
      active: true,
      mentorId: "mentor-1",
    },
    {
      id: "intern-2",
      name: "Nour Hassan",
      email: "nour@example.com",
      role: "intern",
      title: "Frontend intern",
      initials: "NH",
      color: "#7a62b3",
      active: true,
      mentorId: "mentor-2",
    },
    {
      id: "intern-3",
      name: "Tareq Mansour",
      email: "tareq@example.com",
      role: "intern",
      title: "Data intern",
      initials: "TM",
      color: "#ad5a5a",
      active: true,
      mentorId: "mentor-2",
    },
    {
      id: "intern-4",
      name: "Rama Ibrahim",
      email: "rama@example.com",
      role: "intern",
      title: "Content intern",
      initials: "RI",
      color: "#348a75",
      active: true,
      mentorId: "mentor-1",
    },
  ];

  const projects: PmProject[] = [
    {
      id: "project-1",
      name: "AI Learning Portal",
      code: "ALP",
      description: "Improve the learning experience and course discovery flows.",
      status: "active",
      mentorId: "mentor-2",
      memberIds: ["intern-1", "intern-2", "intern-3"],
      dueDate: isoDay(24, now),
      color: "#048090",
    },
    {
      id: "project-2",
      name: "Community Growth",
      code: "CG",
      description: "Plan and measure the next community engagement cycle.",
      status: "active",
      mentorId: "mentor-1",
      memberIds: ["intern-1", "intern-4"],
      dueDate: isoDay(35, now),
      color: "#698f3f",
    },
    {
      id: "project-3",
      name: "Impact Dashboard",
      code: "ID",
      description: "Create a clear reporting view for program outcomes.",
      status: "active",
      mentorId: "mentor-2",
      memberIds: ["intern-2", "intern-3"],
      dueDate: isoDay(18, now),
      color: "#b26a18",
    },
  ];

  const tasks: PmTask[] = [
    {
      id: "task-1",
      projectId: "project-1",
      title: "Map the learner onboarding journey",
      description:
        "Review the current sign-up and first-course experience, then document friction points and proposed improvements.",
      assigneeId: "intern-1",
      mentorId: "mentor-1",
      status: "in_progress",
      priority: "high",
      dueDate: isoDay(3, now),
      estimateHours: 10,
      progress: 65,
      tags: ["Research", "UX"],
      acceptanceCriteria: [
        "Journey map covers sign-up through first lesson",
        "At least five friction points are supported by evidence",
        "Recommendations are prioritized by impact and effort",
      ],
      comments: [
        {
          id: "comment-1",
          authorId: "mentor-1",
          body: "Start with mobile because most new learners arrive there.",
          createdAt: isoTime(-2, 10, now),
          kind: "comment",
        },
        {
          id: "comment-2",
          authorId: "intern-1",
          body: "I finished the first five interviews and added the main patterns to the journey map.",
          createdAt: isoTime(-1, 15, now),
          kind: "comment",
        },
      ],
      createdAt: isoTime(-8, 9, now),
      updatedAt: isoTime(-1, 15, now),
    },
    {
      id: "task-2",
      projectId: "project-1",
      title: "Build the course card responsive states",
      description: "Implement the approved course-card states for desktop, tablet, and mobile.",
      assigneeId: "intern-2",
      mentorId: "mentor-2",
      status: "in_review",
      priority: "urgent",
      dueDate: isoDay(1, now),
      estimateHours: 8,
      progress: 95,
      tags: ["Frontend", "Responsive"],
      acceptanceCriteria: [
        "Matches the approved design at all breakpoints",
        "Keyboard focus is visible",
        "Unit and visual tests pass",
      ],
      comments: [
        {
          id: "comment-3",
          authorId: "intern-2",
          body: "Ready for review. I included screenshots for the three supported breakpoints.",
          createdAt: isoTime(0, 9, now),
          kind: "submission",
        },
      ],
      createdAt: isoTime(-6, 9, now),
      updatedAt: isoTime(0, 9, now),
    },
    {
      id: "task-3",
      projectId: "project-3",
      title: "Validate the impact metric definitions",
      description: "Confirm the calculation rules and data sources for the six headline metrics.",
      assigneeId: "intern-3",
      mentorId: "mentor-2",
      status: "blocked",
      priority: "high",
      dueDate: isoDay(-1, now),
      estimateHours: 12,
      progress: 40,
      tags: ["Data", "Analytics"],
      acceptanceCriteria: [
        "Every metric names its source table",
        "Calculation rules include edge cases",
        "Program owner signs off the definitions",
      ],
      comments: [
        {
          id: "comment-4",
          authorId: "intern-3",
          body: "Blocked while waiting for access to the historical attendance export.",
          createdAt: isoTime(-1, 11, now),
          kind: "comment",
        },
      ],
      createdAt: isoTime(-9, 9, now),
      updatedAt: isoTime(-1, 11, now),
    },
    {
      id: "task-4",
      projectId: "project-2",
      title: "Draft the October community update",
      description: "Prepare the bilingual community update with program highlights and next steps.",
      assigneeId: "intern-4",
      mentorId: "mentor-1",
      status: "revision_required",
      priority: "medium",
      dueDate: isoDay(2, now),
      estimateHours: 5,
      progress: 75,
      tags: ["Content", "Arabic"],
      acceptanceCriteria: [
        "Arabic and English versions are complete",
        "All figures link to a source",
      ],
      comments: [
        {
          id: "comment-5",
          authorId: "mentor-1",
          body: "Please simplify the impact section and add the source for the participation figure.",
          createdAt: isoTime(-1, 16, now),
          kind: "review",
        },
      ],
      createdAt: isoTime(-5, 12, now),
      updatedAt: isoTime(-1, 16, now),
    },
    {
      id: "task-5",
      projectId: "project-1",
      title: "Audit empty states across the LMS",
      description:
        "Find and document empty states that do not give the learner a useful next action.",
      assigneeId: "intern-1",
      mentorId: "mentor-1",
      status: "todo",
      priority: "medium",
      dueDate: isoDay(7, now),
      estimateHours: 6,
      progress: 0,
      tags: ["UX", "Audit"],
      acceptanceCriteria: ["All learner routes are covered", "Each issue includes a screenshot"],
      comments: [],
      createdAt: isoTime(-1, 10, now),
      updatedAt: isoTime(-1, 10, now),
    },
    {
      id: "task-6",
      projectId: "project-3",
      title: "Create the dashboard query layer",
      description: "Implement typed queries for the project impact summary.",
      assigneeId: "intern-2",
      mentorId: "mentor-2",
      status: "done",
      priority: "high",
      dueDate: isoDay(-2, now),
      estimateHours: 9,
      progress: 100,
      tags: ["Frontend", "Data"],
      acceptanceCriteria: ["Queries are typed", "Loading and error states are covered"],
      comments: [
        {
          id: "comment-6",
          authorId: "mentor-2",
          body: "Approved. The error-state coverage is especially clear.",
          createdAt: isoTime(-2, 17, now),
          kind: "review",
        },
      ],
      createdAt: isoTime(-12, 8, now),
      updatedAt: isoTime(-2, 17, now),
    },
    {
      id: "task-7",
      projectId: "project-2",
      title: "Segment mentor feedback themes",
      description: "Group the latest mentor feedback into actionable themes for the next cohort.",
      assigneeId: "intern-3",
      mentorId: "mentor-2",
      status: "todo",
      priority: "low",
      dueDate: isoDay(10, now),
      estimateHours: 4,
      progress: 0,
      tags: ["Research"],
      acceptanceCriteria: ["Themes include counts", "Outliers remain visible"],
      comments: [],
      createdAt: isoTime(-2, 13, now),
      updatedAt: isoTime(-2, 13, now),
    },
    {
      id: "task-8",
      projectId: "project-2",
      title: "Prepare community event checklist",
      description: "Turn the previous event retrospective into a reusable execution checklist.",
      assigneeId: "intern-4",
      mentorId: "mentor-1",
      status: "done",
      priority: "medium",
      dueDate: isoDay(-4, now),
      estimateHours: 4,
      progress: 100,
      tags: ["Operations"],
      acceptanceCriteria: ["Checklist has owners and timing", "Template is reusable"],
      comments: [],
      createdAt: isoTime(-14, 9, now),
      updatedAt: isoTime(-4, 15, now),
    },
  ];

  return {
    version: 2,
    users,
    projects,
    tasks,
    notifications: [
      {
        id: "notification-1",
        userId: "mentor-2",
        title: "Task ready for review",
        body: "Nour submitted the course card responsive states.",
        taskId: "task-2",
        createdAt: isoTime(0, 9, now),
        read: false,
      },
      {
        id: "notification-2",
        userId: "intern-3",
        title: "Task is overdue",
        body: "Validate the impact metric definitions is past its due date.",
        taskId: "task-3",
        createdAt: isoTime(0, 8, now),
        read: false,
      },
      {
        id: "notification-3",
        userId: "intern-4",
        title: "Revision requested",
        body: "Omar requested changes to the October community update.",
        taskId: "task-4",
        createdAt: isoTime(-1, 16, now),
        read: false,
      },
      {
        id: "notification-4",
        userId: "admin-1",
        title: "One task is blocked",
        body: "The Impact Dashboard project has a blocked task.",
        taskId: "task-3",
        createdAt: isoTime(-1, 12, now),
        read: true,
      },
    ],
    activities: [
      {
        id: "activity-1",
        actorId: "intern-2",
        taskId: "task-2",
        action: "submitted",
        detail: "Submitted course card responsive states for review",
        createdAt: isoTime(0, 9, now),
      },
      {
        id: "activity-2",
        actorId: "mentor-1",
        taskId: "task-4",
        action: "revision_requested",
        detail: "Requested a clearer impact section and source",
        createdAt: isoTime(-1, 16, now),
      },
      {
        id: "activity-3",
        actorId: "intern-3",
        taskId: "task-3",
        action: "blocked",
        detail: "Waiting for access to the historical attendance export",
        createdAt: isoTime(-1, 11, now),
      },
      {
        id: "activity-4",
        actorId: "mentor-2",
        taskId: "task-6",
        action: "approved",
        detail: "Approved the dashboard query layer",
        createdAt: isoTime(-2, 17, now),
      },
    ],
  };
}

export function loadPmState(): PmState {
  if (typeof window === "undefined") return createEmptyState();
  try {
    const raw = window.localStorage.getItem(PM_STORAGE_KEY);
    if (!raw) return createEmptyState();
    const parsed = JSON.parse(raw) as Partial<PmState>;
    if (
      parsed.version !== 2 ||
      !Array.isArray(parsed.users) ||
      !Array.isArray(parsed.projects) ||
      !Array.isArray(parsed.tasks)
    ) {
      return createEmptyState();
    }
    return parsed as PmState;
  } catch {
    return createEmptyState();
  }
}

export function savePmState(state: PmState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PM_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The full application remains usable in memory when storage is unavailable.
  }
}

export function taskIsOverdue(task: PmTask, now = new Date()) {
  if (task.status === "done" || task.status === "cancelled") return false;
  const due = new Date(`${task.dueDate}T23:59:59`);
  return due.getTime() < now.getTime();
}

export function scopedTasks(state: PmState, actor: PmUser) {
  if (actor.role === "admin") return state.tasks;
  if (actor.role === "mentor") return state.tasks.filter((task) => task.mentorId === actor.id);
  return state.tasks.filter((task) => task.assigneeId === actor.id);
}

export function canCreateTask(actor: PmUser) {
  return actor.role === "admin" || actor.role === "mentor";
}

export function canManageTask(actor: PmUser, task: PmTask) {
  return actor.role === "admin" || (actor.role === "mentor" && task.mentorId === actor.id);
}

export function canWorkTask(actor: PmUser, task: PmTask) {
  return actor.role === "intern" && task.assigneeId === actor.id;
}

export function allowedTaskTransitions(actor: PmUser, task: PmTask): TaskStatus[] {
  if (canManageTask(actor, task)) {
    if (task.status === "in_review") return ["revision_required", "done"];
    if (task.status === "done" || task.status === "cancelled") return ["in_progress"];
    return [
      "todo",
      "in_progress",
      "blocked",
      "in_review",
      "revision_required",
      "done",
      "cancelled",
    ].filter((status) => status !== task.status) as TaskStatus[];
  }
  if (!canWorkTask(actor, task)) return [];
  const internTransitions: Partial<Record<TaskStatus, TaskStatus[]>> = {
    todo: ["in_progress"],
    in_progress: ["blocked", "in_review"],
    blocked: ["in_progress"],
    revision_required: ["in_progress", "in_review"],
  };
  return internTransitions[task.status] ?? [];
}

export function createTask(
  state: PmState,
  actor: PmUser,
  input: CreateTaskInput,
  now = new Date(),
): PmState {
  if (!canCreateTask(actor)) throw new Error("Only mentors and administrators can create tasks.");
  const project = state.projects.find((item) => item.id === input.projectId);
  const assignee = state.users.find(
    (user) => user.id === input.assigneeId && user.role === "intern",
  );
  if (!project || !assignee) throw new Error("Project and intern are required.");
  if (actor.role === "mentor" && project.mentorId !== actor.id) {
    throw new Error("Mentors can assign tasks only inside their projects.");
  }
  const mentorId = actor.role === "mentor" ? actor.id : assignee.mentorId || project.mentorId;
  const timestamp = now.toISOString();
  const task: PmTask = {
    id: uid("task"),
    ...input,
    mentorId,
    status: "todo",
    progress: 0,
    comments: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return {
    ...state,
    tasks: [task, ...state.tasks],
    notifications: [
      {
        id: uid("notification"),
        userId: assignee.id,
        title: "New task assigned",
        body: task.title,
        taskId: task.id,
        createdAt: timestamp,
        read: false,
      },
      ...state.notifications,
    ],
    activities: [
      {
        id: uid("activity"),
        actorId: actor.id,
        taskId: task.id,
        action: "created",
        detail: `Created and assigned ${task.title} to ${assignee.name}`,
        createdAt: timestamp,
      },
      ...state.activities,
    ],
  };
}

function transitionProgress(status: TaskStatus, previous: number) {
  if (status === "todo") return 0;
  if (status === "in_progress") return Math.max(previous, 20);
  if (status === "blocked") return previous;
  if (status === "in_review") return Math.max(previous, 90);
  if (status === "revision_required") return Math.min(Math.max(previous, 75), 95);
  if (status === "done") return 100;
  return previous;
}

export function transitionTask(
  state: PmState,
  actor: PmUser,
  taskId: string,
  nextStatus: TaskStatus,
  note = "",
  now = new Date(),
): PmState {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("Task not found.");
  if (!allowedTaskTransitions(actor, task).includes(nextStatus)) {
    throw new Error("This role cannot make that task transition.");
  }
  if ((nextStatus === "blocked" || nextStatus === "revision_required") && !note.trim()) {
    throw new Error("A reason is required for this status.");
  }
  const timestamp = now.toISOString();
  const commentKind: PmComment["kind"] =
    nextStatus === "in_review"
      ? "submission"
      : nextStatus === "done" || nextStatus === "revision_required"
        ? "review"
        : "system";
  const statusComment: PmComment | null = note.trim()
    ? {
        id: uid("comment"),
        authorId: actor.id,
        body: note.trim(),
        createdAt: timestamp,
        kind: commentKind,
      }
    : null;
  const updatedTask: PmTask = {
    ...task,
    status: nextStatus,
    progress: transitionProgress(nextStatus, task.progress),
    updatedAt: timestamp,
    comments: statusComment ? [...task.comments, statusComment] : task.comments,
  };
  const recipientId = actor.role === "intern" ? task.mentorId : task.assigneeId;
  return {
    ...state,
    tasks: state.tasks.map((item) => (item.id === task.id ? updatedTask : item)),
    notifications: [
      {
        id: uid("notification"),
        userId: recipientId,
        title:
          nextStatus === "in_review"
            ? "Task ready for review"
            : nextStatus === "done"
              ? "Task approved"
              : nextStatus === "revision_required"
                ? "Revision requested"
                : "Task status updated",
        body: task.title,
        taskId: task.id,
        createdAt: timestamp,
        read: false,
      },
      ...state.notifications,
    ],
    activities: [
      {
        id: uid("activity"),
        actorId: actor.id,
        taskId: task.id,
        action: nextStatus,
        detail: note.trim() || `Moved ${task.title} to ${nextStatus.replaceAll("_", " ")}`,
        createdAt: timestamp,
      },
      ...state.activities,
    ],
  };
}

export function addTaskComment(
  state: PmState,
  actor: PmUser,
  taskId: string,
  body: string,
  now = new Date(),
): PmState {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !body.trim()) return state;
  const visible = scopedTasks(state, actor).some((item) => item.id === task.id);
  if (!visible) throw new Error("This user cannot comment on that task.");
  const timestamp = now.toISOString();
  const comment: PmComment = {
    id: uid("comment"),
    authorId: actor.id,
    body: body.trim(),
    createdAt: timestamp,
    kind: "comment",
  };
  const recipientId = actor.role === "intern" ? task.mentorId : task.assigneeId;
  return {
    ...state,
    tasks: state.tasks.map((item) =>
      item.id === task.id
        ? { ...item, comments: [...item.comments, comment], updatedAt: timestamp }
        : item,
    ),
    notifications: [
      {
        id: uid("notification"),
        userId: recipientId,
        title: "New task comment",
        body: task.title,
        taskId: task.id,
        createdAt: timestamp,
        read: false,
      },
      ...state.notifications,
    ],
    activities: [
      {
        id: uid("activity"),
        actorId: actor.id,
        taskId: task.id,
        action: "commented",
        detail: `Commented on ${task.title}`,
        createdAt: timestamp,
      },
      ...state.activities,
    ],
  };
}

export function updateTaskProgress(
  state: PmState,
  actor: PmUser,
  taskId: string,
  progress: number,
  now = new Date(),
): PmState {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || (!canWorkTask(actor, task) && !canManageTask(actor, task))) {
    throw new Error("This user cannot update the task progress.");
  }
  const next = Math.max(0, Math.min(100, Math.round(progress)));
  const timestamp = now.toISOString();
  return {
    ...state,
    tasks: state.tasks.map((item) =>
      item.id === taskId ? { ...item, progress: next, updatedAt: timestamp } : item,
    ),
  };
}

export function markNotificationsRead(state: PmState, userId: string): PmState {
  return {
    ...state,
    notifications: state.notifications.map((item) =>
      item.userId === userId ? { ...item, read: true } : item,
    ),
  };
}

export function dashboardNumbers(state: PmState, actor: PmUser, now = new Date()) {
  const tasks = scopedTasks(state, actor);
  return {
    active: tasks.filter((task) => !["done", "cancelled"].includes(task.status)).length,
    review: tasks.filter((task) => task.status === "in_review").length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
    overdue: tasks.filter((task) => taskIsOverdue(task, now)).length,
    done: tasks.filter((task) => task.status === "done").length,
    completion: tasks.length
      ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length)
      : 0,
  };
}
