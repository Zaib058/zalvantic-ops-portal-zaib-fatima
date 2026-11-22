import { request } from "./request";

export type Intern = {
  _id: string;
  domain: string;
  status: string;
  // these can be null if the user or the cohort was deleted
  user: { _id: string; name: string; email: string; role: string } | null;
  cohort: { _id: string; name: string } | null;
};

export type InternPage = {
  data: Intern[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Filters = {
  search: string;
  cohort: string;
  domain: string;
  status: string;
  page: number;
};

export function getInterns(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.cohort) params.set("cohort", filters.cohort);
  if (filters.domain) params.set("domain", filters.domain);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(filters.page));

  return request<InternPage>("/api/interns?" + params.toString());
}

export type ImportResult = {
  total: number;
  imported: number;
  failed: number;
  errors: { row: number; email: string; message: string }[];
};

export function importInterns(cohortId: string, file: File) {
  const form = new FormData();
  form.append("cohortId", cohortId);
  form.append("file", file);

  return request<ImportResult>("/api/interns/import", {
    method: "POST",
    body: form,
  });
}
