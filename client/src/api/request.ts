import { getToken, clearToken } from "./auth";

// one place for the fetch calls: it adds the token and turns errors into messages
export async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: "Bearer " + getToken(),
  };

  // a file upload (FormData) sets its own content type
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    throw new Error("not logged in");
  }
  if (res.status === 403) {
    throw new Error("Only admins can see this page");
  }
  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();
  if (!res.ok) {
    const details = Array.isArray(data.errors)
      ? ": " + data.errors.map((e: { message: string }) => e.message).join(", ")
      : "";
    throw new Error((data.message || "Something went wrong") + details);
  }
  return data;
}
