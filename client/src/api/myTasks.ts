import { request } from "./request";

export type MyTask = {
  _id: string;
  weekNumber: number;
  title: string;
  brief: string;
  domain: string;
  releaseAt: string;
  dueAt: string;
  status: "open" | "late" | "closed";
  submission: {
    links: string[];
    note: string;
    late: boolean;
    submittedAt: string;
  } | null;
};

export function getMyTasks() {
  return request<MyTask[]>("/api/my-tasks");
}

export function submitToTask(taskId: string, links: string[], note: string) {
  return request<unknown>("/api/my-tasks/" + taskId + "/submission", {
    method: "POST",
    body: JSON.stringify({ links, note }),
  });
}
