import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getMe, clearToken, type User } from "../api/auth";

export default function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {
        // token is missing, expired or fake
        clearToken();
        navigate("/login");
      });
  }, [navigate]);

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div>
      <nav className="nav">
        <strong>Internship Portal</strong>
        <NavLink to="/" end>
          Dashboard
        </NavLink>
        {user?.role === "admin" && (
          <>
            <NavLink to="/interns">Interns</NavLink>
            <NavLink to="/cohorts">Cohorts</NavLink>
          </>
        )}
        <button className="link" onClick={handleLogout}>
          Log out
        </button>
      </nav>

      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
