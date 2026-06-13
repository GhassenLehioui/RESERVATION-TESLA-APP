import { useState } from "react";

export default function VoitureEtr({ onBack, onSuccess }) {
  const [plate, setPlate] = useState("");
  const [vin, setVin] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function add(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("https://reservation-tesla-app.onrender.com/api/cars/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin: vin.trim(),
          plate: plate.trim(),
          email: email.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Voiture ajoutée + OTP envoyé → naviguer vers OtpVerify
        alert("✅ Voiture enregistrée ! Vérifiez votre email pour le code OTP.");
        onSuccess(vin.trim());
      } else {
        alert("⚠️ " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Erreur serveur, vérifiez votre connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-panel">
      <h2>Véhicule Étranger</h2>
      <p
        style={{
          textAlign: "center",
          color: "var(--text-secondary)",
          marginBottom: "10px",
          fontSize: "0.9rem",
        }}
      >
        Enregistrez votre véhicule étranger
      </p>

      <form
        onSubmit={add}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <input
          className="modern-input"
          placeholder="Numéro d'immatriculation (ex: AB-123-CD)"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          required
        />

        <input
          className="modern-input"
          placeholder="Numéro de châssis (VIN)"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          required
        />

        <input
          className="modern-input"
          type="email"
          placeholder="Adresse e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button
          type="submit"
          className="btn-primary"
          style={{ marginTop: "10px" }}
          disabled={loading}
        >
          {loading ? "Enregistrement…" : "S'inscrire"}
        </button>
      </form>

      <button
        onClick={onBack}
        className="btn-secondary"
        style={{ marginTop: "10px" }}
      >
        Retour
      </button>
    </div>
  );
}
