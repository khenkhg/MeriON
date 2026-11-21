import { createContext, useContext, useEffect, useState } from "react";
import { ATELIER_MACHINES } from "../data/ateliers";

const BarcodeContext = createContext(null);

const initialProducts = [
  {
    productCode: "P-0001",
    clientName: "Client A",
    machineName: "Extrusion E1",
    operatorName: "Ahmed",
    weightKg: 250,
    scannedAt: new Date().toISOString(),
    status: "CONFORME",
  },
  {
    productCode: "P-0002",
    clientName: "Client B",
    machineName: "Printing I2",
    operatorName: "Yacine",
    weightKg: 180,
    scannedAt: new Date().toISOString(),
    status: "CONFORME",
  },
];

const load = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

// "1>2>4" -> [1,2,4]  (null if invalid: needs 2+ ateliers, 1-5, strictly increasing)
function parseRoute(str) {
  if (!str) return null;
  const route = str.split(">").map((n) => Number(n.trim()));
  const valid =
    route.length >= 2 &&
    route.every((n, i) => Number.isInteger(n) && n >= 1 && n <= 5 && (i === 0 || n > route[i - 1]));
  return valid ? route : null;
}

const reject = (message) => ({ success: false, message });

export function BarcodeProvider({ children }) {
  // COMPLETED products only (seen by Production Manager + Commercial)
  const [products, setProducts] = useState(() => load("merion_products", initialProducts));
  // SEMI-FINI products still moving between ateliers (hidden from managers)
  const [semiFiniProducts, setSemiFiniProducts] = useState(() => load("merion_semi_fini", []));
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    localStorage.setItem("merion_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("merion_semi_fini", JSON.stringify(semiFiniProducts));
  }, [semiFiniProducts]);

  const completeProduct = (data, history = []) => {
    const product = {
      ...data,
      status: "CONFORME",
      scannedAt: new Date().toISOString(),
      history,
    };

    setProducts((prev) => [product, ...prev]);
    setNotifications((prev) => [
      {
        id: Date.now(),
        message: `New conforming product: ${data.productCode}`,
        clientName: data.clientName,
        weightKg: data.weightKg,
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);

    return {
      success: true,
      kind: "completed",
      message: "Production completed! Product registered.",
      product,
    };
  };

  /**
   * Label formats
   *  - Semi-fini (has a route):  MERION|P-574|Client A|Extrusion E1|Ahmed|250|CONFORME|1>2>4
   *  - Completed (no route):     MERION|P-574|Client A|Sacherie S1|Ahmed|240|CONFORME
   *
   * atelier = 1..5 for atelier accounts, null for the Production Manager.
   */
  const scanBarcode = (barcode, atelier = null) => {
    const parts = barcode.trim().split("|");

    if ((parts.length !== 7 && parts.length !== 8) || parts[0] !== "MERION") {
      return reject("Invalid barcode format.");
    }

    const [, productCode, clientName, machineName, operatorName, weight, status, routeStr] = parts;
    const weightKg = Number(weight);

    if (
      !productCode || !clientName || !machineName || !operatorName ||
      !Number.isFinite(weightKg) || weightKg <= 0 || status !== "CONFORME"
    ) {
      return reject("Invalid product information or non-conforming product.");
    }

    let route = null;
    if (parts.length === 8) {
      route = parseRoute(routeStr);
      if (!route) return reject("Invalid route on the label.");
    }

    if (products.some((p) => p.productCode === productCode)) {
      return reject("This product has already been completed.");
    }

    const pending = semiFiniProducts.find((p) => p.productCode === productCode);
    const base = { productCode, clientName, machineName, operatorName, weightKg };

    // ---- Production Manager: completed labels only
    if (atelier === null) {
      if (route) {
        return reject("Semi-fini labels are scanned by ateliers, not by the Production Manager.");
      }
      if (pending) {
        return reject(`Product is still in production (waiting at Atelier ${pending.nextAtelier}).`);
      }
      return completeProduct(base);
    }

    const step = { atelier, machineName, operatorName, weightKg, at: new Date().toISOString() };

    // ---- Atelier scans a SEMI-FINI label (with route)
    if (route) {
      const last = route[route.length - 1];

      if (!route.includes(atelier)) {
        return reject(`Atelier ${atelier} is not part of this product's route.`);
      }
      if (atelier === last) {
        return reject("The last atelier must scan a completed label (without route).");
      }
      if (pending) {
        if (pending.nextAtelier !== atelier) {
          return reject(`This product is waiting at Atelier ${pending.nextAtelier}, not Atelier ${atelier}.`);
        }
        if (pending.route.join(">") !== route.join(">")) {
          return reject("Route does not match the one registered for this product.");
        }
      } else if (atelier !== route[0]) {
        return reject(`Atelier ${route[0]} must register this product first.`);
      }

      const nextAtelier = route[route.indexOf(atelier) + 1];
      const record = {
        ...base,
        route,
        nextAtelier,
        scannedAt: new Date().toISOString(),
        history: [...(pending?.history || []), step],
      };

      setSemiFiniProducts((prev) => [record, ...prev.filter((p) => p.productCode !== productCode)]);

      return {
        success: true,
        kind: "semi",
        message: `Semi-fini product sent to Atelier ${nextAtelier}.`,
        product: record,
      };
    }

    // ---- Atelier scans a COMPLETED label (no route)
    if (pending) {
      const last = pending.route[pending.route.length - 1];
      if (atelier !== last || pending.nextAtelier !== atelier) {
        return reject(
          `Only Atelier ${last} can complete this product (currently waiting at Atelier ${pending.nextAtelier}).`
        );
      }
      setSemiFiniProducts((prev) => prev.filter((p) => p.productCode !== productCode));
      return completeProduct(base, [...pending.history, step]);
    }

    // Product that only goes through a single atelier
    return completeProduct(base, [step]);
  };

  // Button: atelier sends a waiting semi-fini product to the next atelier of its route
  const sendToNextAtelier = (productCode, atelier, operatorName) => {
    const pending = semiFiniProducts.find((p) => p.productCode === productCode);

    if (!pending || pending.nextAtelier !== atelier) {
      return reject("This product is not waiting at your atelier.");
    }

    const next = pending.route[pending.route.indexOf(atelier) + 1];
    if (!next) {
      return reject("This is the last atelier of the route. Mark the product as finished.");
    }

    const record = {
      ...pending,
      nextAtelier: next,
      scannedAt: new Date().toISOString(),
      history: [
        ...pending.history,
        {
          atelier,
          machineName: ATELIER_MACHINES[atelier],
          operatorName,
          weightKg: pending.weightKg,
          at: new Date().toISOString(),
        },
      ],
    };

    setSemiFiniProducts((prev) =>
      prev.map((p) => (p.productCode === productCode ? record : p))
    );

    return {
      success: true,
      kind: "semi",
      message: `Semi-fini product sent to Atelier ${next}.`,
      product: record,
    };
  };

  // Button: atelier marks a waiting semi-fini product as finished -> visible to managers
  const markAsFinished = (productCode, atelier, operatorName) => {
    const pending = semiFiniProducts.find((p) => p.productCode === productCode);

    if (!pending || pending.nextAtelier !== atelier) {
      return reject("This product is not waiting at your atelier.");
    }

    const machineName = ATELIER_MACHINES[atelier];

    setSemiFiniProducts((prev) => prev.filter((p) => p.productCode !== productCode));

    return completeProduct(
      {
        productCode: pending.productCode,
        clientName: pending.clientName,
        machineName,
        operatorName,
        weightKg: pending.weightKg,
      },
      [
        ...pending.history,
        { atelier, machineName, operatorName, weightKg: pending.weightKg, at: new Date().toISOString() },
      ]
    );
  };

  const clearDemoData = () => {
    setProducts([]);
    setSemiFiniProducts([]);
    setNotifications([]);
  };

  return (
    <BarcodeContext.Provider
      value={{
        products,
        semiFiniProducts,
        notifications,
        scanBarcode,
        sendToNextAtelier,
        markAsFinished,
        clearDemoData,
      }}
    >
      {children}
    </BarcodeContext.Provider>
  );
}

export function useBarcode() {
  return useContext(BarcodeContext);
}
