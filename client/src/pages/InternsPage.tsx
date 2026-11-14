import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getInterns, type Intern } from "../api/interns";

const cell = {
  padding: "8px",
  borderBottom: "1px solid #ddd",
  textAlign: "left" as const,
};

export default function InternsPage() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;

    // wait a little after typing, so we don't call the server on every key
    const timer = setTimeout(() => {
      setLoading(true);
      getInterns(search)
        .then((data) => {
          if (ignore) return;
          setInterns(data);
          setError("");
        })
        .catch((err) => {
          if (ignore) return;
          if (err.message === "not logged in") {
            navigate("/login");
            return;
          }
          setError(err.message);
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [search, navigate]);

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 16px" }}>
      <p>
        <Link to="/">Back to dashboard</Link>
      </p>
      <h1>Interns</h1>

      <input
        placeholder="Search by name, email or domain"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
          marginBottom: 16,
          boxSizing: "border-box",
        }}
      />

      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading && <p>Loading...</p>}
      {!loading && !error && interns.length === 0 && <p>No interns found.</p>}

      {!error && interns.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={cell}>Name</th>
              <th style={cell}>Email</th>
              <th style={cell}>Domain</th>
              <th style={cell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {interns.map((intern) => (
              <tr key={intern._id}>
                <td style={cell}>
                  {intern.user ? intern.user.name : "(deleted user)"}
                </td>
                <td style={cell}>{intern.user ? intern.user.email : "-"}</td>
                <td style={cell}>{intern.domain}</td>
                <td style={cell}>{intern.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
