import { useRef, useState } from "react";
import { Loader2, Upload, ImagePlus } from "lucide-react";

const API_URL="https://reservation-tesla-app.onrender.com/carteGrise/";

export function CardScanner({ open, onOpenChange, onScanned }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file) {
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(API_URL, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
      const data = await res.json();

      onScanned({
        matricule1: String(data.matricule1 ?? ""),
        matricule2: String(data.matricule2 ?? ""),
        sachi: String(data.sachi ?? ""),
      });

      onOpenChange(false);
    } catch (e) {
      setError(e.message || "Échec du scan");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-scaleIn">

        {/* Header */}
        <h2 className="text-2xl font-semibold text-center mb-2">
          Scanner carte grise
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Prenez une photo ou importez une image
        </p>

        {/* Input hidden */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`cursor-pointer border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition 
          ${
            dragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 hover:border-blue-400"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
              <p className="text-sm text-gray-500">Analyse en cours…</p>
            </>
          ) : (
            <>
              <ImagePlus className="w-10 h-10 text-gray-400" />
              <p className="text-sm text-gray-600 text-center">
                Glissez une image ici ou cliquez pour choisir
              </p>
              <span className="text-xs text-gray-400">
                JPG, PNG — caméra autorisée 📸
              </span>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={() => onOpenChange(false)}
            className="text-sm text-gray-400 hover:text-gray-600 transition"
          >
            Annuler
          </button>

          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <Upload size={16} />
            Choisir
          </button>
        </div>
      </div>
    </div>
  );
}