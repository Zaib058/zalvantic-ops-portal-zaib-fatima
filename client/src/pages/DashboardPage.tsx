import { useEffect, useState } from "react";
import { getMe, type User } from "../api/auth";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {});
  }, []);

  if (!user) {
    return <p className="muted">Loading...</p>;
  }

  return (
    <div className="card">
      <h1>Welcome, {user.name}</h1>
      <p>Logged in as {user.email}</p>
      <p>
        Role: <span className="chip">{user.role}</span>
      </p>
    </div>
  );
}
