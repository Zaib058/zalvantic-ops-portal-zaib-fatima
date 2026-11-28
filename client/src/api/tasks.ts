import { request } from "./request";

export type Task = {
  _id: string;
  weekNumber: number;
  domain: string;
  title: string;
  brief: string;
  releaseAt: string;
  dueAt: string;
  cohort: { _id: string; name: string } | null;
};

export type SubmissionItem = {
  _id: string;
  links: string[];
  note: string;
  late: boolean;
  submittedAt: string;
  // these can be null if the intern or the user was deleted
  intern: {
    domain: string;
    user: { name: string; email: string } | null;
  } | null;
};

export function getTasks() {
  return request<Task[]>("/api/tasks");
}

export function createTask(body: {
  cohortId: string;
  domain: string;
  weekNumber: number;
  title: string;
  brief: string;
  releaseAt: string;
  dueAt: string;
}) {
  return request<Task>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteTask(id: string) {
  return request<void>("/api/tasks/" + id, { method: "DELETE" });
}

export function getSubmissions(taskId: string) {
  return request<SubmissionItem[]>("/api/tasks/" + taskId + "/submissions");
}
