import { useState } from "react";
import CarLogin from "./components/CarLogin";
import OtpVerify from "./components/OtpVerify";
import ChargingCentersList from "./components/ChargingCentersList";
import DateTimeSelector from "./components/DateTimeSelector";
import Logo from "./components/Logo";

export default function App() {
  const [step, setStep] = useState("login");
  const [selectedVin, setSelectedVin] = useState("");
  const [selectedCenter, setSelectedCenter] = useState(null);

  const handleLoginSuccess = (vin) => {
    setSelectedVin(vin);
    setStep("otp");
  };

  const handleOtpSuccess = () => {
    setStep("map");
  };

  const handleSelectCenter = (center) => {
    setSelectedCenter(center);
    setStep("datetime");
  };

  const handleSelectDateTime = (reservation) => {
    alert(`Réservation confirmée :\n${reservation.center.name}\n${reservation.date.toLocaleDateString('fr-FR')}\n${reservation.time}`);
    // Ici, vous pouvez envoyer la réservation au backend
  };

  const handleBackFromDateTime = () => {
    setStep("map");
    setSelectedCenter(null);
  };

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      backgroundImage: "url('/tesla-bg.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed"
    }}>
      <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(11, 11, 11, 0.75)",
        zIndex: 0
      }}></div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "40px", paddingBottom: "40px" }}>
        <Logo />
        <div style={{ marginTop: "30px", width: "100%", display: "flex", justifyContent: "center", padding: "0 20px" }}>
          {step === "login" && <CarLogin onSuccess={handleLoginSuccess} />}
          {step === "otp" && <OtpVerify vin={selectedVin} onSuccess={handleOtpSuccess} />}
          {step === "map" && <ChargingCentersList onSelectCenter={handleSelectCenter} />}
          {step === "datetime" && selectedCenter && (
            <DateTimeSelector
              vin={selectedVin}
              center={selectedCenter}
              onSelectDateTime={handleSelectDateTime}
              onBack={handleBackFromDateTime}
            />
          )}
        </div>
      </div>
    </div>
  );
}