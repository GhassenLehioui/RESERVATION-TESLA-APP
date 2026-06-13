import { useState } from "react";

export default function OtpVerify({ vin, onSuccess }) {
  const [message, setMessage] = useState("");
  const [otp, setotp] = useState("");

  async function verif(e) {
    e.preventDefault();
    const msg = { vin, otp };
    try {
      const res = await fetch("https://reservation-tesla-app.onrender.com/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg)
      });

      const { valid, message } = await res.json();
      setMessage(message);
      if (valid) {
        onSuccess(); 
      } 
    } catch (err) {
      console.error(err);
      setMessage("Erreur serveur lors de la vérification");
    }
  }

  return (
    <div className="glass-panel">
      <h2>Vérification OTP</h2>
      <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "10px", fontSize: "0.9rem" }}>
        Veuillez entrer le code reçu par email
      </p>

      <form onSubmit={verif} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input
          className="modern-input"
          placeholder="Code à 6 chiffres"
          value={otp}
          onChange={(e) => setotp(e.target.value)}
          maxLength="6"
          required
          style={{ textAlign: "center", letterSpacing: "4px", fontSize: "1.2rem", fontWeight: "bold" }}
        />

        <button type="submit" className="btn-primary" style={{ marginTop: "10px" }}>
          Valider
        </button>
      </form>

      {message && <p className="error-msg">{message}</p>}
    </div>
  );
}