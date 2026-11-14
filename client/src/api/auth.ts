const TOKEN_KEY = "accessToken";

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token: string) =>
  localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function login(email: string, password: string): Promise<User> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "login failed");
  }

  saveToken(data.accessToken);
  return data.user;
}

export async function getMe(): Promise<User> {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: "Bearer " + getToken() },
  });

  if (!res.ok) {
    throw new Error("not logged in");
  }
  return res.json();
}
