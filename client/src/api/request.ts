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
    const data = await res.json().catch(() => ({}));
    // a wrong role keeps the old text, other 403 messages (like "not released yet") come from the server
    if (data.message === "you do not have permission") {
      throw new Error("Only admins can see this page");
    }
    throw new Error(data.message || "You are not allowed to do this");
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
