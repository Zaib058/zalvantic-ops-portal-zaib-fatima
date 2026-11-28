import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InternsPage from "./pages/InternsPage";
import ImportPage from "./pages/ImportPage";
import CohortsPage from "./pages/CohortsPage";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import TasksPage from "./pages/TasksPage";
import MyTasksPage from "./pages/MyTasksPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/interns" element={<InternsPage />} />
        <Route path="/interns/import" element={<ImportPage />} />
        <Route path="/cohorts" element={<CohortsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/my-tasks" element={<MyTasksPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
