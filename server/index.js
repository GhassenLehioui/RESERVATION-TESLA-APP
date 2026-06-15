// ═══════════════════════════════════════════════════════════════
//  Tesla App — Backend API
//  Port : 3003
// ═══════════════════════════════════════════════════════════════

const express    = require("express");
const cors       = require("cors");
const fs         = require("fs");
const path       = require("path");
const db         = require('./realtime');
// Use Resend for transactional emails (reads key from process.env.RESEND_API_KEY)
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
const corsOrigin ="*";
app.use(cors({
  origin: corsOrigin,
}));
app.use(express.json());

// ───────────────────────────────────────────────────────────────
//  Configuration
// ───────────────────────────────────────────────────────────────
const CHARGING_FILE     = path.join(__dirname, "charging-centers.json");
const OTP_EXPIRY_MS     = 2 * 60 * 1000; // 2 minutes
const EMAIL_SENDER      = process.env.EMAIL_SENDER || "onboarding@resend.dev";

// ───────────────────────────────────────────────────────────────
//  Mailer (Resend)
//  Uses `process.env.RESEND_API_KEY`. If not set, OTPs are logged for testing.
// ───────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────
//  Helpers — lecture de fichier JSON statique
// ───────────────────────────────────────────────────────────────

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

// ───────────────────────────────────────────────────────────────
//  Helpers — normalisation plaque
//  "88tun209" | "88 TUN 209" | "88  tun  209" → "88 TUN 209"
// ───────────────────────────────────────────────────────────────

function normalizePlate(plate) {
  if (!plate || typeof plate !== "string") return "";
  return plate.toUpperCase().replace(/\s+/g, " ").trim();
}

function platesMatch(a, b) {
  return normalizePlate(a) === normalizePlate(b);
}

// ───────────────────────────────────────────────────────────────
//  Helpers — OTP
// ───────────────────────────────────────────────────────────────

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(toEmail, otp) {
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #E31937; text-align: center;">Tesla App</h2>
        <h3 style="color: #333;">Code de vérification</h3>
        <p>Bonjour,</p>
        <p>Voici votre code OTP pour vous connecter :</p>
        <div style="
          background: #f5f5f5;
          border-left: 4px solid #E31937;
          padding: 20px;
          text-align: center;
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          margin: 24px 0;
          border-radius: 4px;
        ">
          ${otp}
        </div>
        <p style="color: #888; font-size: 13px;">
          Ce code expire dans <strong>2 minutes</strong>. Ne le partagez avec personne.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          L'équipe Tesla App
        </p>
      </div>
    `;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[OTP] RESEND_API_KEY not set — OTP for ${toEmail}: ${otp}`);
    return;
  }

  try {
    await resend.emails.send({
      from: EMAIL_SENDER,
      to: toEmail,
      subject: "Votre code OTP — Tesla App",
      html,
    });
    console.log(`[OTP] Envoyé à ${toEmail} via Resend`);
  } catch (err) {
    console.error("[OTP] Erreur envoi email via Resend:", err && err.message ? err.message : err);
    throw err;
  }
}

// ───────────────────────────────────────────────────────────────
//  Route — Santé du serveur
// ───────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Tesla App API opérationnelle" });
});

// ───────────────────────────────────────────────────────────────
//  Route — GET /api/cars
//  Retourne la liste de toutes les voitures
// ───────────────────────────────────────────────────────────────

app.get("/api/cars", async (req, res) => {
  const cars = await db.getAllCars();
  res.json(cars);
});

// ───────────────────────────────────────────────────────────────
//  Route — POST /api/cars/add
//  Enregistre une nouvelle voiture
//  Body : { vin, plate, email }
// ───────────────────────────────────────────────────────────────

app.post("/api/cars/add", async (req, res) => {
  const { vin, plate, email } = req.body;

  // Validation des champs
  if (!vin || !plate || !email) {
    return res.status(400).json({
      success: false,
      message: "Données manquantes (vin, plate, email requis)",
    });
  }

  const normalizedPlate = normalizePlate(plate);
  // Vérifier doublon par VIN ou par plaque
  const existingByVin = await db.findCarByVin(vin);
  const existingByPlate = await db.findCarByPlate(normalizedPlate);

  const duplicate = existingByVin || existingByPlate;

  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: "Cette voiture est déjà enregistrée",
    });
  }

  // Générer l'OTP immédiatement
  const otp     = generateOTP();
  const expires = Date.now() + OTP_EXPIRY_MS;

  const newCar = {
    vin,
    plate: normalizedPlate,
    email,
    otpStore: { otp, expires },
  };

  await db.addCar({ vin, plate: normalizedPlate, email, otp, otp_expires: expires });

  console.log(`[ADD] Voiture ajoutée — VIN: ${vin} | Plaque: ${normalizedPlate}`);
  
  // Envoyer l'OTP par email en tâche de fond (ne pas bloquer la réponse)
  sendOTPEmail(email, otp)
    .then(() => console.log(`[ADD] OTP envoyé à ${email} pour VIN: ${vin}`))
    .catch((err) => console.error("[ADD] Erreur envoi email:", err && err.message ? err.message : err));

  // Répondre immédiatement pour que le client puisse saisir l'OTP sans délai
  res.status(201).json({
    success: true,
    message: "Voiture ajoutée — OTP envoyé (en cours)",
  });
  // (envoi d'email en arrière-plan géré ci-dessus)
});

// ───────────────────────────────────────────────────────────────
//  Route — POST /api/cars/check-etr
//  Vérifie l'existence d'une voiture étrangère (plaque libre + vin)
//  et envoie un OTP par email
//  Body : { vin, plate }
// ───────────────────────────────────────────────────────────────

app.post("/api/cars/check-etr", async (req, res) => {
  const { vin, plate } = req.body;

  if (!vin || !plate) {
    return res.status(400).json({
      exists: false,
      message: "Données manquantes (vin, plate requis)",
    });
  }

  // Recherche par VIN + plaque (exacte)
  const car = await db.findCarByVinAndPlate(vin, plate);

  if (!car) {
    console.log(`[CHECK-ETR] Véhicule étranger introuvable — VIN: ${vin} | Plaque: ${plate}`);
    return res.json({
      exists: false,
      message: "Véhicule introuvable, vérifiez vos informations ou enregistrez-vous d'abord",
    });
  }

  // Générer l'OTP et mettre à jour le fichier
  const otp     = generateOTP();
  const expires = Date.now() + OTP_EXPIRY_MS;

  await db.updateCarOTP(vin, otp, expires);
  // Envoyer l'email en tâche de fond et répondre immédiatement
  sendOTPEmail(car.email, otp)
    .then(() => console.log(`[CHECK-ETR] OTP envoyé à ${car.email} pour VIN: ${vin}`))
    .catch((err) => console.error("[CHECK-ETR] Erreur envoi email:", err && err.message ? err.message : err));

  res.json({ exists: true, message: "OTP généré — envoi en cours" });
});

// ───────────────────────────────────────────────────────────────
//  Route — POST /api/cars/check
//  Vérifie si la voiture tunisienne existe et envoie un OTP
//  Body : { vin, plate }
// ───────────────────────────────────────────────────────────────

app.post("/api/cars/check", async (req, res) => {
  const { vin, plate } = req.body;

  // Validation des champs
  if (!vin || !plate) {
    return res.status(400).json({
      exists: false,
      message: "Données manquantes (vin, plate requis)",
    });
  }

  const normalizedPlate = normalizePlate(plate);
  const car = await db.findCarByVinAndPlate(vin, normalizedPlate);

  if (!car) {
    console.log(`[CHECK] Véhicule introuvable — VIN: ${vin} | Plaque: ${normalizedPlate}`);
    return res.json({ exists: false, message: "Véhicule introuvable" });
  }

  // Générer l'OTP et mettre à jour le fichier
  const otp     = generateOTP();
  const expires = Date.now() + OTP_EXPIRY_MS;

  await db.updateCarOTP(vin, otp, expires);

  // Répondre immédiatement, puis envoyer l'email en arrière-plan.
  res.json({ exists: true, message: "OTP envoyé par email" });
  sendOTPEmail(car.email, otp)
    .then(() => console.log(`[CHECK] OTP généré pour VIN: ${vin}`))
    .catch((err) => console.error("[CHECK] Erreur envoi email:", err.message));
});

// ───────────────────────────────────────────────────────────────
//  Route — POST /api/otp/verify
//  Vérifie le code OTP saisi par l'utilisateur
//  Body : { vin, otp }
// ───────────────────────────────────────────────────────────────

app.post("/api/otp/verify", async (req, res) => {
  const { vin, otp } = req.body;

  // Validation des champs
  if (!vin || !otp) {
    return res.status(400).json({
      valid: false,
      message: "Données manquantes (vin, otp requis)",
    });
  }

  const car  = await db.findCarByVin(vin);

  if (!car) {
    return res.status(404).json({ valid: false, message: "Voiture introuvable" });
  }

  const record = car && car.otp;

  if (!record) {
    return res.status(400).json({
      valid: false,
      message: "Aucun OTP demandé pour ce véhicule",
    });
  }
  if (Date.now() > car.otp_expires) {
    return res.status(400).json({
      valid: false,
      message: "OTP expiré, veuillez recommencer",
    });
  }
  if (record !== otp) {
    return res.status(400).json({ valid: false, message: "OTP incorrect" });
  }
  // OTP valide — effacer le otp pour éviter la réutilisation
  await db.clearCarOTP(vin);

  console.log(`[OTP] Vérification réussie pour VIN: ${vin}`);
  res.json({ valid: true, message: "Authentification réussie" });
});

// ───────────────────────────────────────────────────────────────
//  Route — GET /api/charging-centers
//  Retourne la liste des centres de recharge
// ───────────────────────────────────────────────────────────────

app.get("/api/charging-centers", (req, res) => {
  const centers = readJSON(CHARGING_FILE);
  res.json(centers);
});

// ───────────────────────────────────────────────────────────────
//  Route — POST /api/available-hours
//  Retourne les horaires disponibles pour un centre et une date donnés
//  Body : { centerId, date (YYYY-MM-DD) }
// ───────────────────────────────────────────────────────────────

app.post("/api/available-hours", async (req, res) => {
  const { centerId, date } = req.body;

  if (!centerId || !date) {
    return res.status(400).json({
      success: false,
      message: "Données manquantes (centerId, date requis)",
    });
  }

  const centerIdNumber = Number(centerId);
  if (Number.isNaN(centerIdNumber)) {
    return res.status(400).json({
      success: false,
      message: "centerId invalide",
    });
  }

  // Horaires disponibles par défaut (simulation d'une base de données)
  // En production, vous récupéreriez cela d'une BD réelle
  const allHours = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  // Simulation : certains horaires sont indisponibles selon le jour/centre
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay(); // 0 = dimanche, 1 = lundi, etc.
  
  let availableHours = allHours;

  // Exemple : le dimanche, certains horaires ferment
  if (dayOfWeek === 0) {
    availableHours = availableHours.filter(h => !['08:00', '09:00'].includes(h));
  }

  // Exemple : pour le centre ID 4, les heures tardives sont fermées
  if (centerIdNumber === 4) {
    availableHours = availableHours.filter(h => !['19:00', '20:00'].includes(h));
  }

  const reservations = await db.getReservationsByCenter(centerIdNumber);
  const reservedTimes = reservations.filter(r => r.date === date).map(r => r.time);

  availableHours = availableHours.filter(hour => !reservedTimes.includes(hour));

  console.log(`[AVAILABLE-HOURS] Centre: ${centerIdNumber}, Date: ${date}, Horaires: ${availableHours.length}`);
  
  res.json({
    success: true,
    centerId: centerIdNumber,
    date,
    hours: availableHours,
    totalAvailable: availableHours.length
  });
});

// ───────────────────────────────────────────────────────────────
//  Route — POST /api/reservation/confirm
//  Confirme une réservation et envoie un email de confirmation
//  Body : { vin, centerId, centerName, centerLat, centerLng, centerAddress, 
//           date, time, dateFormated }
// ───────────────────────────────────────────────────────────────

app.post("/api/reservation/confirm", async (req, res) => {
  const { vin, centerId, centerName, centerLat, centerLng, centerAddress, date, time, dateFormated } = req.body;

  // Validation des champs
  if (!vin || !centerId || !centerName || !date || !time) {
    return res.status(400).json({
      success: false,
      message: "Données manquantes (vin, centerId, centerName, date, time requis)",
    });
  }

  // Récupérer l'email du client à partir du VIN
  const car = await db.findCarByVin(vin);

  if (!car || !car.email) {
    return res.status(404).json({
      success: false,
      message: "Voiture ou email non trouvé",
    });
  }

  const userEmail = car.email;

  // Générer le lien Google Maps
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${centerLat},${centerLng}`;

  // Créer le contenu de l'email
  const emailSubject = `Confirmation de réservation - ${centerName}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #E31937 0%, #a01129 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Tesla App</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Confirmation de Réservation</p>
      </div>

      <div style="background: #f9f9f9; padding: 30px; border-bottom: 1px solid #ddd;">
        <p style="margin: 0 0 20px 0; color: #333;">Bonjour,</p>
        <p style="margin: 0 0 25px 0; color: #555;">Votre réservation a été confirmée avec succès.</p>

        <!-- Détails de la réservation -->
        <div style="background: white; border-left: 4px solid #E31937; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <h2 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Détails de votre réservation</h2>
          
          <div style="margin-bottom: 15px;">
            <p style="margin: 0 0 5px 0; color: #888; font-size: 12px; text-transform: uppercase; font-weight: bold;">Centre de Charge</p>
            <p style="margin: 0; color: #333; font-size: 16px; font-weight: bold;">${centerName}</p>
          </div>

          <div style="margin-bottom: 15px;">
            <p style="margin: 0 0 5px 0; color: #888; font-size: 12px; text-transform: uppercase; font-weight: bold;">Adresse</p>
            <p style="margin: 0; color: #333; font-size: 14px;">${centerAddress}</p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
              <p style="margin: 0 0 5px 0; color: #888; font-size: 12px; text-transform: uppercase; font-weight: bold;">Date</p>
              <p style="margin: 0; color: #333; font-size: 16px; font-weight: bold;">${dateFormated}</p>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; color: #888; font-size: 12px; text-transform: uppercase; font-weight: bold;">Heure</p>
              <p style="margin: 0; color: #333; font-size: 16px; font-weight: bold;">${time}</p>
            </div>
          </div>
        </div>

        <!-- Bouton Google Maps -->
        <div style="text-align: center; margin: 25px 0;">
          <a href="${mapsLink}" style="
            display: inline-block;
            background: #E31937;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 14px;
            transition: background 0.3s ease;
          " onmouseover="this.style.background='#d41730'" onmouseout="this.style.background='#E31937'">
            📍 Voir sur Google Maps
          </a>
        </div>

        <p style="margin: 20px 0 0 0; color: #666; font-size: 13px; text-align: center;">
          Assurez-vous d'arriver 10 minutes avant l'heure prévue.
        </p>
      </div>

      <div style="background: #f0f0f0; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
        <p style="margin: 0; color: #888; font-size: 12px;">
          © 2026 Tesla App. Tous droits réservés.
        </p>
        <p style="margin: 5px 0 0 0; color: #aaa; font-size: 11px;">
          Cet email a été généré automatiquement. Veuillez ne pas répondre à cet email.
        </p>
      </div>
    </div>
  `;

  try {
    const centerIdNumber = Number(centerId);
  if (Number.isNaN(centerIdNumber)) {
    return res.status(400).json({
      success: false,
      message: "centerId invalide",
    });
  }

  // Vérifier les créneaux déjà réservés pour ce centre/date/heure
  const conflict = await db.isSlotReserved(centerIdNumber, date, time);

  if (conflict) {
    return res.status(409).json({
      success: false,
      message: "Ce créneau est déjà réservé pour ce centre.",
    });
  }

  // Créer l'objet de réservation
  const reservation = {
    id: Date.now().toString(),
    vin: vin,
    email: userEmail,
    centerId: centerIdNumber,
    centerName: centerName,
    centerAddress: centerAddress,
    centerLat: centerLat,
    centerLng: centerLng,
    date: date,
    time: time,
    dateFormated: dateFormated,
    status: "confirmed",
    createdAt: new Date().toISOString(),
    mapsLink: mapsLink
  };

  // Sauvegarder la réservation dans la base de données
  await db.addReservation(reservation);

  // Envoyer l'email de confirmation via Resend
  await resend.emails.send({
    from: EMAIL_SENDER,
    to: userEmail,
    subject: emailSubject,
    html: emailHtml,
  });

  console.log(`[RESERVATION] Email de confirmation envoyé à ${userEmail} via Resend`);
  console.log(`[RESERVATION] VIN: ${vin} | Centre: ${centerName} | Date: ${date} | Heure: ${time}`);

    res.json({
      success: true,
      message: "Réservation confirmée et email envoyé avec succès",
      reservationDetails: {
        id: reservation.id,
        vin: vin,
        center: centerName,
        date: date,
        time: time,
        email: userEmail,
        mapsLink: mapsLink
      }
    });
  } catch (error) {
    console.error("[RESERVATION] Erreur lors de l'envoi de l'email:", error.message);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi de l'email de confirmation: " + error.message
    });
  }
});

// ───────────────────────────────────────────────────────────────
//  Route — GET /api/reservations
//  Retourne toutes les réservations (admin)
// ───────────────────────────────────────────────────────────────

app.get("/api/reservations", async (req, res) => {
  const reservations = await db.getAllReservations();
  res.json({
    success: true,
    total: reservations.length,
    reservations: reservations
  });
});

// ───────────────────────────────────────────────────────────────
//  Route — GET /api/reservations/vin/:vin
//  Retourne les réservations d'une voiture spécifique
// ───────────────────────────────────────────────────────────────

app.get("/api/reservations/vin/:vin", async (req, res) => {
  const { vin } = req.params;
  const userReservations = await db.getReservationsByVin(vin);

  res.json({
    success: true,
    vin: vin,
    total: userReservations.length,
    reservations: userReservations
  });
});

// ───────────────────────────────────────────────────────────────
//  Route — GET /api/reservations/center/:centerId
//  Retourne les réservations d'un centre spécifique
// ───────────────────────────────────────────────────────────────

app.get("/api/reservations/center/:centerId", async (req, res) => {
  const { centerId } = req.params;
  const centerReservations = await db.getReservationsByCenter(centerId);
  
  res.json({
    success: true,
    centerId: centerId,
    total: centerReservations.length,
    reservations: centerReservations
  });
});

// ───────────────────────────────────────────────────────────────
//  Démarrage du serveur
// ───────────────────────────────────────────────────────────────

app.listen(3003, () => {
  console.log(`\n Tesla App API démarrée sur port 3003\n`);
});
