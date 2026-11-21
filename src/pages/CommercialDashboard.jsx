
import { useBarcode } from "../context/BarcodeContext";
import {
  PackageCheck,
  Weight,
  Bell,
  Factory,
  Clock,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import Navbar from "../components/Navbar";

export default function CommercialDashboard() {
  const { products, notifications, clearDemoData } = useBarcode();

  const totalWeight = products.reduce(
    (sum, p) => sum + p.weightKg,
    0
  );

  const clients = Object.values(
    products.reduce((acc, product) => {
      if (!acc[product.clientName]) {
        acc[product.clientName] = {
          clientName: product.clientName,
          productCount: 0,
          totalWeight: 0,
        };
      }

      acc[product.clientName].productCount++;
      acc[product.clientName].totalWeight += product.weightKg;

      return acc;
    }, {})
  );

  return (
     <>
    <Navbar />
    <main className="commercial-page">
      <header className="commercial-header">
        <div>
          <span className="eyebrow">MERION / COMMERCIAL</span>
          <h1>Commercial Overview</h1>
          <p>Monitor conforming products and available tonnage.</p>
        </div>

        <span className="connection-status connected">
          <span className="status-dot"/>
          Demo live updates
        </span>
      </header>

      {notifications.length > 0 && (
        <div className="live-notification">
          <div className="notification-icon">
            <Bell size={20}/>
          </div>

          <div>
            <strong>New conforming product!</strong>
            <p>{notifications[0].message}</p>
          </div>
        </div>
      )}

      <section className="commercial-stats">
        <article className="commercial-stat-card">
          <div className="commercial-stat-icon green">
            <PackageCheck size={24}/>
          </div>
          <span>Conforming products</span>
          <strong>{products.length.toLocaleString()}</strong>
          <small>Registered products</small>
        </article>

        <article className="commercial-stat-card">
          <div className="commercial-stat-icon blue">
            <Weight size={24}/>
          </div>
          <span>Available tonnage</span>
          <strong>{(totalWeight / 1000).toFixed(2)} t</strong>
          <small>Total conforming net weight</small>
        </article>

        <article className="commercial-stat-card">
          <div className="commercial-stat-icon green">
            <Factory size={24}/>
          </div>
          <span>Active clients</span>
          <strong>{clients.length}</strong>
          <small>Clients with scanned products</small>
        </article>
      </section>

      <section className="commercial-section">
        <div className="commercial-section-heading">
          <div>
            <span className="eyebrow">CLIENT BREAKDOWN</span>
            <h2>Conforming products by client</h2>
          </div>
        </div>

        <div className="commercial-table-wrapper">
          <table className="commercial-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Products</th>
                <th>Net weight</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {clients.map(client => (
                <tr key={client.clientName}>
                  <td><strong>{client.clientName}</strong></td>
                  <td>{client.productCount}</td>
                  <td>{(client.totalWeight / 1000).toFixed(2)} t</td>
                  <td>
                    <span className="conforme-badge">
                      <CheckCircle2 size={14}/> Conforme
                    </span>
                  </td>
                </tr>
              ))}

              {clients.length === 0 && (
                <tr>
                  <td colSpan="4" className="empty-state">
                    No scanned products yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="commercial-section">
        <div className="commercial-section-heading">
          <div>
            <span className="eyebrow">LIVE ACTIVITY</span>
            <h2>Latest barcode scans</h2>
          </div>
        </div>

        <div className="commercial-table-wrapper">
          <table className="commercial-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Client</th>
                <th>Machine</th>
                <th>Operator</th>
                <th>Weight</th>
                <th>Scanned at</th>
              </tr>
            </thead>

            <tbody>
              {products.map(product => (
                <tr key={product.productCode}>
                  <td><strong>{product.productCode}</strong></td>
                  <td>{product.clientName}</td>
                  <td>{product.machineName}</td>
                  <td>{product.operatorName}</td>
                  <td>{product.weightKg} kg</td>
                  <td>
                    <span className="scan-time">
                      <Clock size={13}/>
                      {new Date(product.scannedAt).toLocaleTimeString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div style={{display:"flex",justifyContent:"flex-end",marginTop:20}}>
        <button
          className="btn-secondary"
          onClick={() => {
            if (window.confirm("Clear all demo barcode data?")) {
              clearDemoData();
            }
          }}
        >
          <Trash2 size={16}/>
          Reset demo data
        </button>
      </div>
    </main>
    </>
  );
}
