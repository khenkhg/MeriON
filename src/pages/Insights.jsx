import { RefreshCw } from "lucide-react";
import Navbar from "../components/Navbar";
import DashboardCharts from "../components/DashboardCharts";
import { useAuth } from "../context/AuthContext";
import { getAtelierNumber } from "../data/ateliers";
import { seedDemoData } from "../data/demoData";

export default function Insights() {
  const { user } = useAuth();
  const atelier = getAtelierNumber(user.role);

  const reload = () => {
    if (window.confirm("Replace all current demo data (products, alerts, stock, orders) with a fresh 6-month history?")) {
      seedDemoData();
      window.location.reload();
    }
  };

  return (
    <>
      <Navbar />
      <main className="commercial-page">
        <header className="commercial-header">
          <div>
            <span className="eyebrow">{user.role.toUpperCase()} / INSIGHTS</span>
            <h1>Insights</h1>
            <p>
              {atelier
                ? `How Atelier ${atelier} performs, and how it compares to the other workshops.`
                : "Production, machines, alerts and stock, over time."}
            </p>
          </div>
          <button className="btn-secondary" onClick={reload}>
            <RefreshCw size={16} /> Reload demo history
          </button>
        </header>

        <DashboardCharts role={user.role} atelier={atelier} />
      </main>
    </>
  );
}
