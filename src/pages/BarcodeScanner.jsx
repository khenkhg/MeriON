import { useState, useRef, useEffect } from "react";
import {
  ScanBarcode,
  CheckCircle2,
  XCircle,
  Package,
  Weight,
  Factory,
  User,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { useBarcode } from "../context/BarcodeContext";
import { useAuth } from "../context/AuthContext";
import { useMaterial } from "../context/MaterialContext";
import { getAtelierNumber, ATELIER_NAMES, ATELIER_MACHINES } from "../data/ateliers";
import { CATALOG } from "../data/catalog";
import Navbar from "../components/Navbar";

export default function BarcodeScanner() {
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const { scanBarcode, semiFiniProducts, sendToNextAtelier, markAsFinished } = useBarcode();
  const { user } = useAuth();
  const { recordProduction } = useMaterial();

  const atelier = getAtelierNumber(user?.role); // null for Production Manager

  // Every successful scan / hand-off by an atelier = 1 product made + raw material used
  const track = (res) => {
    if (atelier && res?.success) recordProduction(atelier, res.product.weightKg);
    return res;
  };

  // Semi-fini products waiting for THIS atelier
  const incoming = atelier
    ? semiFiniProducts.filter((p) => p.nextAtelier === atelier)
    : [];
  const incomingWeight = incoming.reduce((sum, p) => sum + p.weightKg, 0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = (e) => {
    e.preventDefault();
    if (!barcode.trim() || loading) return;

    setLoading(true);
    const response = track(scanBarcode(barcode, atelier));
    setResult(response);
    setBarcode("");
    setLoading(false);
    inputRef.current?.focus();
  };

  const nextOf = (p) => p.route[p.route.indexOf(atelier) + 1] || null;

  const handleSend = (p) => {
    setResult(track(sendToNextAtelier(p.productCode, atelier, user.name)));
  };

  const handleFinish = (p) => {
    const next = nextOf(p);
    if (
      next &&
      !window.confirm(
        `Atelier ${next} is still in this product's route. Mark ${p.productCode} as finished anyway?`
      )
    ) {
      return;
    }
    setResult(track(markAsFinished(p.productCode, atelier, user.name)));
  };

  const simulateScan = () => {
    const operator = "Ahmed";
    const lot = () => String(Math.floor(Math.random() * 90) + 10);
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    let label;

    if (!atelier) {
      const p = pick(CATALOG);
      label = `MERION|${p.ref}-${lot()}|Client A|Extrusion E1|${operator}|250|CONFORME`;
    } else if (incoming.length > 0) {
      // Finish a product that arrived from the previous atelier
      const p = incoming[0];
      const isLast = p.route[p.route.length - 1] === atelier;
      label =
        `MERION|${p.productCode}|${p.clientName}|${ATELIER_MACHINES[atelier]}|${operator}|${p.weightKg}|CONFORME` +
        (isLast ? "" : `|${p.route.join(">")}`);
    } else {
      // Start a catalog product whose route begins at this atelier
      const starters = CATALOG.filter((p) => p.route[0] === atelier);
      if (starters.length > 0) {
        const p = pick(starters);
        label =
          `MERION|${p.ref}-${lot()}|Client A|${ATELIER_MACHINES[atelier]}|${operator}|250|CONFORME` +
          (p.route.length > 1 ? `|${p.route.join(">")}` : "");
      } else {
        const later = [1, 2, 3, 4, 5].filter((n) => n > atelier && Math.random() > 0.4);
        if (later.length === 0 && atelier < 5) later.push(atelier + 1);
        const route = [atelier, ...later];
        label =
          `MERION|P-${Math.floor(Math.random() * 900) + 100}|Client A|${ATELIER_MACHINES[atelier]}|${operator}|250|CONFORME` +
          (route.length > 1 ? `|${route.join(">")}` : "");
      }
    }

    setBarcode(label);
    setResult(null);
    inputRef.current?.focus();
  };

  return (
    <>
      <Navbar />
      <main className="scanner-page">
        <div className="scanner-container">
          <div className="scanner-heading">
            <span className="eyebrow">
              {atelier ? `ATELIER ${atelier} / BARCODE` : "PRODUCTION / BARCODE"}
            </span>
            <h1>
              {atelier
                ? `Atelier ${atelier} · ${ATELIER_NAMES[atelier]}`
                : "Product Barcode Scanner"}
            </h1>
            <p>
              {atelier
                ? "A label with a route sends the product to the next atelier. A label without a route completes it."
                : "Scan green labels to register conforming products."}
            </p>
          </div>

          {atelier && (
            <section className="incoming-panel">
              <div className="incoming-header">
                <Inbox size={20} />
                <div>
                  <strong>Incoming semi-fini products</strong>
                  <span>
                    {incoming.length} product{incoming.length !== 1 && "s"} ·{" "}
                    {(incomingWeight / 1000).toFixed(2)} t waiting for Atelier {atelier}
                  </span>
                </div>
              </div>

              {incoming.length === 0 ? (
                <p className="incoming-empty">Nothing waiting for this atelier.</p>
              ) : (
                <ul className="incoming-list">
                  {incoming.map((p) => (
                    <li key={p.productCode}>
                      <strong>{p.productCode}</strong>
                      <span>{p.clientName}</span>
                      <span>{p.weightKg} kg</span>
                      <span className="incoming-from">
                        from Atelier {p.history[p.history.length - 1]?.atelier}
                      </span>

                      <div className="incoming-actions">
                        {nextOf(p) && (
                          <button
                            type="button"
                            className="btn-primary incoming-btn"
                            onClick={() => handleSend(p)}
                          >
                            <ArrowRight size={15} />
                            Send to Atelier {nextOf(p)}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-secondary incoming-btn"
                          onClick={() => handleFinish(p)}
                        >
                          <CheckCircle2 size={15} />
                          Mark as finished
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="scanner-card">
            <div className="scanner-icon">
              <ScanBarcode size={42} />
            </div>

            <h2>Ready to scan</h2>

            <p className="scanner-description">
              Use a barcode reader or enter the barcode manually.
            </p>

            <form onSubmit={handleScan}>
              <label htmlFor="barcode-input">Product barcode</label>

              <div className="scanner-input">
                <ScanBarcode size={22} />
                <input
                  ref={inputRef}
                  id="barcode-input"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan barcode here..."
                  autoComplete="off"
                />
              </div>

              <button className="btn-primary scanner-submit" disabled={!barcode.trim()}>
                {loading ? "Processing..." : "Register Product"}
              </button>
            </form>

            <button type="button" className="btn-secondary scanner-submit" onClick={simulateScan}>
              <ScanBarcode size={17} />
              Simulate barcode scan
            </button>

            {result && (
              <div className={`scan-result ${result.success ? "scan-success" : "scan-error"}`}>
                {result.success ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                <div>
                  <strong>
                    {!result.success
                      ? "Scan rejected"
                      : result.kind === "semi"
                      ? "Semi-fini registered!"
                      : "Product registered!"}
                  </strong>
                  <p>{result.message}</p>
                </div>
              </div>
            )}

            {result?.success && (
              <div className="scanned-product">
                <div>
                  <Package size={17} />
                  <span>Product</span>
                  <strong>{result.product.productCode}</strong>
                </div>
                <div>
                  <Factory size={17} />
                  <span>Machine</span>
                  <strong>{result.product.machineName}</strong>
                </div>
                <div>
                  <User size={17} />
                  <span>Operator</span>
                  <strong>{result.product.operatorName}</strong>
                </div>
                <div>
                  <Weight size={17} />
                  <span>Net weight</span>
                  <strong>{result.product.weightKg} kg</strong>
                </div>
                {result.kind === "semi" && (
                  <div>
                    <ArrowRight size={17} />
                    <span>Route</span>
                    <strong>
                      {result.product.route.map((n) => `A${n}`).join(" → ")}
                      {" · next: A"}
                      {result.product.nextAtelier}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="scanner-footer">
            <CheckCircle2 size={16} />
            {atelier
              ? "Semi-fini products stay hidden from the Production Manager until the last atelier completes them."
              : "Only completed conforming products are counted."}
          </div>
        </div>
      </main>
    </>
  );
}
