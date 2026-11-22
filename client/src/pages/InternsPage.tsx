import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getInterns, type InternPage } from "../api/interns";
import { getCohorts, type Cohort } from "../api/cohorts";

const STATUSES = ["active", "completed", "dropped"];

export default function InternsPage() {
  const [result, setResult] = useState<InternPage | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [search, setSearch] = useState("");
  const [cohort, setCohort] = useState("");
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // the cohorts are needed for the dropdowns
  useEffect(() => {
    getCohorts()
      .then(setCohorts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;

    // wait a little after typing, so we don't call the server on every key
    const timer = setTimeout(() => {
      setLoading(true);
      getInterns({ search, cohort, domain, status, page })
        .then((data) => {
          if (ignore) return;
          setResult(data);
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
  }, [search, cohort, domain, status, page, navigate]);

  // changing a filter always goes back to page 1
  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  // the domains of the chosen cohort, or of all cohorts
  const domains = [
    ...new Set(
      cohorts
        .filter((c) => !cohort || c._id === cohort)
        .flatMap((c) => c.domains),
    ),
  ];

  return (
    <div>
      <div className="row between">
        <h1>Interns</h1>
        <Link className="button" to="/interns/import">
          Import from CSV
        </Link>
      </div>

      <div className="filters">
        <input
          placeholder="Search by name, email or domain"
          value={search}
          onChange={(e) => changeFilter(setSearch, e.target.value)}
        />
        <select
          value={cohort}
          onChange={(e) => {
            changeFilter(setCohort, e.target.value);
            setDomain("");
          }}
        >
          <option value="">All cohorts</option>
          {cohorts.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={domain}
          onChange={(e) => changeFilter(setDomain, e.target.value)}
        >
          <option value="">All domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => changeFilter(setStatus, e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading...</p>}
      {!loading && !error && result && result.data.length === 0 && (
        <p>No interns found.</p>
      )}

      {!error && result && result.data.length > 0 && (
        <>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Cohort</th>
                <th>Domain</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((intern) => (
                <tr key={intern._id}>
                  <td>{intern.user ? intern.user.name : "(deleted user)"}</td>
                  <td>{intern.user ? intern.user.email : "-"}</td>
                  <td>{intern.cohort ? intern.cohort.name : "-"}</td>
                  <td>{intern.domain}</td>
                  <td>
                    <span className="chip">{intern.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pager">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>
              Page {result.page} of {result.totalPages} ({result.total} interns)
            </span>
            <button
              disabled={page >= result.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
