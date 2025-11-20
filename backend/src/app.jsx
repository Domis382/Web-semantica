import { useEffect, useState } from "react";
import { checkHealth } from "./api";

function App() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    checkHealth()
      .then(data => setStatus(data))
      .catch(err => setStatus({ ok: false, message: err.message }));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <div className="p-8 rounded-2xl shadow-lg bg-slate-800 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Proyecto Web Semántica
        </h1>
        {status ? (
          <div className="space-y-2">
            <p className="font-semibold">Estado backend:</p>
            <pre className="bg-slate-900 rounded-lg p-3 text-sm overflow-x-auto">
              {JSON.stringify(status, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="animate-pulse text-center">Conectando con el backend…</p>
        )}
      </div>
    </div>
  );
}

export default App;
x   