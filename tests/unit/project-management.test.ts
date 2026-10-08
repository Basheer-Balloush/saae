import { describe, expect, it } from "vitest";
import {
  addTaskComment,
  allowedTaskTransitions,
  createSeedState,
  createTask,
  dashboardNumbers,
  markNotificationsRead,
  scopedTasks,
  transitionTask,
} from "@/features/project-management/model";
import { assistantPlacement } from "@/features/chat/lib/assistant-placement";

const now = new Date("2026-10-08T10:00:00.000Z");

function fixture() {
  const state = createSeedState(now);
  return {
    state,
    admin: state.users.find((user) => user.id === "admin-1")!,
    mentor: state.users.find((user) => user.id === "mentor-2")!,
    intern: state.users.find((user) => user.id === "intern-1")!,
  };
}

describe("project management permissions and workflow", () => {
  it("keeps the public-site chat launcher out of the private workspace", () => {
    expect(assistantPlacement("/project-management")).toEqual({
      mounted: false,
      launcher: false,
    });
  });

  it("scopes work to the active role", () => {
    const { state, admin, mentor, intern } = fixture();

    expect(scopedTasks(state, admin)).toHaveLength(state.tasks.length);
    expect(scopedTasks(state, mentor).every((task) => task.mentorId === mentor.id)).toBe(true);
    expect(scopedTasks(state, intern).every((task) => task.assigneeId === intern.id)).toBe(true);
  });

  it("allows mentors to assign a task in their project and notifies the intern", () => {
    const { state, mentor } = fixture();
    const next = createTask(
      state,
      mentor,
      {
        projectId: "project-1",
        title: "Document the component API",
        description: "Write usage guidance and examples for the shared components.",
        assigneeId: "intern-2",
        priority: "high",
        dueDate: "2026-10-14",
        estimateHours: 7,
        tags: ["Docs"],
        acceptanceCriteria: ["Every public prop is documented"],
      },
      now,
    );

    expect(next.tasks).toHaveLength(state.tasks.length + 1);
    expect(next.tasks[0]).toMatchObject({ status: "todo", mentorId: mentor.id, progress: 0 });
    expect(next.notifications[0]).toMatchObject({ userId: "intern-2", taskId: next.tasks[0].id });
  });

  it("rejects intern task creation and cross-project mentor assignment", () => {
    const { state, mentor, intern } = fixture();
    const input = {
      projectId: "project-2",
      title: "Restricted assignment",
      description: "This should not be created.",
      assigneeId: "intern-1",
      priority: "medium" as const,
      dueDate: "2026-10-14",
      estimateHours: 3,
      tags: [],
      acceptanceCriteria: [],
    };

    expect(() => createTask(state, intern, input, now)).toThrow(/Only mentors/);
    expect(() => createTask(state, mentor, input, now)).toThrow(/their projects/);
  });

  it("enforces the intern lifecycle and requires blocker context", () => {
    const { state, intern } = fixture();
    const task = state.tasks.find((item) => item.id === "task-1")!;

    expect(allowedTaskTransitions(intern, task)).toEqual(["blocked", "in_review"]);
    expect(() => transitionTask(state, intern, task.id, "blocked", "", now)).toThrow(
      /reason is required/,
    );

    const blocked = transitionTask(
      state,
      intern,
      task.id,
      "blocked",
      "Waiting for design access",
      now,
    );
    const updated = blocked.tasks.find((item) => item.id === task.id)!;
    expect(updated.status).toBe("blocked");
    expect(updated.comments.at(-1)?.body).toBe("Waiting for design access");
    expect(blocked.notifications[0].userId).toBe(task.mentorId);
  });

  it("supports submission, mentor approval, comments, and notification read state", () => {
    const { state, intern } = fixture();
    const task = state.tasks.find((item) => item.id === "task-1")!;
    const mentor = state.users.find((user) => user.id === task.mentorId)!;

    const submitted = transitionTask(state, intern, task.id, "in_review", "Ready for review", now);
    expect(submitted.tasks.find((item) => item.id === task.id)).toMatchObject({
      status: "in_review",
      progress: 90,
    });

    const approved = transitionTask(submitted, mentor, task.id, "done", "Approved", now);
    expect(approved.tasks.find((item) => item.id === task.id)).toMatchObject({
      status: "done",
      progress: 100,
    });

    const commented = addTaskComment(approved, intern, task.id, "Thank you", now);
    expect(commented.tasks.find((item) => item.id === task.id)?.comments.at(-1)?.body).toBe(
      "Thank you",
    );
    const read = markNotificationsRead(commented, intern.id);
    expect(
      read.notifications.filter((item) => item.userId === intern.id).every((item) => item.read),
    ).toBe(true);
  });

  it("calculates role-specific dashboard numbers", () => {
    const { state, intern } = fixture();
    const numbers = dashboardNumbers(state, intern, now);

    expect(numbers.active).toBe(2);
    expect(numbers.done).toBe(0);
    expect(numbers.completion).toBe(33);
  });
});
