import { getToken, clearToken } from "./auth";

export type Intern = {
  _id: string;
  domain: string;
  status: string;
  // can be null if the user was deleted
  user: { _id: string; name: string; email: string; role: string } | null;
};

export async function getInterns(search: string): Promise<Intern[]> {
  const query = search ? "?search=" + encodeURIComponent(search) : "";

  const res = await fetch("/api/interns" + query, {
    headers: { Authorization: "Bearer " + getToken() },
  });

  if (res.status === 401) {
    clearToken();
    throw new Error("not logged in");
  }
  if (res.status === 403) {
    throw new Error("Only admins can see this page");
  }
  if (!res.ok) {
    throw new Error("Could not load interns");
  }
  return res.json();
}
