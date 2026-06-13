import { useState } from "react";
import VoitureEtr from "./VoitureEtr";
import EtrLogin from "./EtrLogin";

export default function CarLogin({ onSuccess }) {
  const [immat1, setImmat1] = useState("");
  const [immat2, setImmat2] = useState("");
  const [vin, setVin] = useState("");
  const [page, setPage] = useState("tun"); // "tun" | "etr" | "etr-login"

  async function handleSubmit(e) {
    e.preventDefault();

    const plate = `${immat1} TUN ${immat2}`;

    try {
      const res = await fetch("https://reservation-tesla-app.onrender.com/api/cars/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin, plate }),
      });

      const data = await res.json();

      if (data.exists) {
        alert("Vérifiez votre email pour le code OTP");
        onSuccess(vin);
      } else {
        alert("Véhicule introuvable, vérifiez les informations");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur serveur");
    }
  }

  // Page : enregistrer une voiture étrangère
  if (page === "etr") {
    return (
      <VoitureEtr
        onBack={() => setPage("tun")}
        onSuccess={onSuccess}
      />
    );
  }

  // Page : se connecter avec une voiture étrangère déjà enregistrée
  if (page === "etr-login") {
    return (
      <EtrLogin
        onBack={() => setPage("tun")}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <div className="glass-panel">
      <h2>Authentification</h2>

      <p
        style={{
          textAlign: "center",
          color: "var(--text-secondary)",
          marginBottom: "10px",
          fontSize: "0.9rem",
        }}
      >
        Connectez-vous à votre véhicule
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {/* Immatriculation TUN */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            className="modern-input"
            placeholder="123"
            value={immat1}
            onChange={(e) => setImmat1(e.target.value.replace(/\D/g, ""))}
            style={{ textAlign: "center", flex: 1 }}
            maxLength={3}
            required
          />
          <span style={{ fontWeight: "bold", color: "var(--text-secondary)" }}>
            TUN
          </span>
          <input
            className="modern-input"
            placeholder="4567"
            value={immat2}
            onChange={(e) => setImmat2(e.target.value.replace(/\D/g, ""))}
            style={{ textAlign: "center", flex: 2 }}
            maxLength={4}
            required
          />
        </div>

        {/* VIN */}
        <input
          className="modern-input"
          placeholder="Numéro de châssis (VIN)"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          required
        />

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary"
          style={{ marginTop: "10px" }}
        >
          Suivant
        </button>
      </form>

      {/* Divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          margin: "10px 0",
        }}
      >
        <div style={{ flex: 1, height: "1px", backgroundColor: "var(--input-border)" }} />
        <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>ou</span>
        <div style={{ flex: 1, height: "1px", backgroundColor: "var(--input-border)" }} />
      </div>

      {/* Connexion véhicule étranger déjà enregistré */}
      <button onClick={() => setPage("etr-login")} className="btn-secondary">
        🌍 Connexion véhicule étranger
      </button>

      {/* Divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          margin: "10px 0",
        }}
      >
        <div style={{ flex: 1, height: "1px", backgroundColor: "var(--input-border)" }} />
        <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>ou</span>
        <div style={{ flex: 1, height: "1px", backgroundColor: "var(--input-border)" }} />
      </div>

      {/* Enregistrer un nouveau véhicule étranger */}
      <button onClick={() => setPage("etr")} className="btn-secondary">
        ➕ Enregistrer véhicule étranger
      </button>

    </div>
  );
}
