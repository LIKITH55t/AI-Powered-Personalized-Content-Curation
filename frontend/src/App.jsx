import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import AppShell from "./pages/AppShell";
import Feed from "./pages/Feed";
import Goals from "./pages/Goals";
import Insights from "./pages/Insights";
import Platforms from "./pages/Platforms";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/start" element={<Onboarding />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Navigate to="feed" replace />} />
        <Route path="feed" element={<Feed />} />
        <Route path="goals" element={<Goals />} />
        <Route path="insights" element={<Insights />} />
        <Route path="platforms" element={<Platforms />} />
      </Route>
    </Routes>
  );
}
