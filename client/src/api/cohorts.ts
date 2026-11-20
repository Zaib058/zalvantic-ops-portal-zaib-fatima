import { request } from "./request";

export type Cohort = {
  _id: string;
  name: string;
  startDate: string;
  domains: string[];
};

export function getCohorts() {
  return request<Cohort[]>("/api/cohorts");
}

export function createCohort(body: {
  name: string;
  startDate: string;
  domains: string[];
}) {
  return request<Cohort>("/api/cohorts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCohort(id: string, body: { domains: string[] }) {
  return request<Cohort>("/api/cohorts/" + id, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteCohort(id: string) {
  return request<void>("/api/cohorts/" + id, { method: "DELETE" });
}
