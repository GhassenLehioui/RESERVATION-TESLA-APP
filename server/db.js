const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_FILE = path.join(__dirname, 'tesla.db');
const CARS_JSON = path.join(__dirname, 'cars.json');
const RES_JSON = path.join(__dirname, 'reservations.json');

function init() {
  const db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');

  db.prepare(`
    CREATE TABLE IF NOT EXISTS cars (
      vin TEXT PRIMARY KEY,
      plate TEXT,
      email TEXT,
      otp TEXT,
      otp_expires INTEGER
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      vin TEXT,
      email TEXT,
      centerId INTEGER,
      centerName TEXT,
      centerAddress TEXT,
      centerLat TEXT,
      centerLng TEXT,
      date TEXT,
      time TEXT,
      dateFormated TEXT,
      status TEXT,
      createdAt TEXT,
      mapsLink TEXT
    )
  `).run();

  // Migrate JSON data if DB is empty
  try {
    const carCount = db.prepare('SELECT COUNT(*) AS c FROM cars').get().c;
    if (carCount === 0 && fs.existsSync(CARS_JSON)) {
      const cars = JSON.parse(fs.readFileSync(CARS_JSON, 'utf-8')) || [];
      const insert = db.prepare('INSERT OR REPLACE INTO cars (vin, plate, email, otp, otp_expires) VALUES (@vin,@plate,@email,@otp,@otp_expires)');
      const insertMany = db.transaction((rows) => {
        for (const r of rows) {
          insert.run({
            vin: r.vin,
            plate: r.plate,
            email: r.email,
            otp: r.otpStore ? r.otpStore.otp : null,
            otp_expires: r.otpStore ? r.otpStore.expires : null,
          });
        }
      });
      insertMany(cars);
    }
  } catch (e) {
    console.error('[DB] Erreur migration cars.json', e.message);
  }

  try {
    const resCount = db.prepare('SELECT COUNT(*) AS c FROM reservations').get().c;
    if (resCount === 0 && fs.existsSync(RES_JSON)) {
      const reservations = JSON.parse(fs.readFileSync(RES_JSON, 'utf-8')) || [];
      const insert = db.prepare(`INSERT OR REPLACE INTO reservations (id,vin,email,centerId,centerName,centerAddress,centerLat,centerLng,date,time,dateFormated,status,createdAt,mapsLink) VALUES (@id,@vin,@email,@centerId,@centerName,@centerAddress,@centerLat,@centerLng,@date,@time,@dateFormated,@status,@createdAt,@mapsLink)`);
      const insertMany = db.transaction((rows) => {
        for (const r of rows) {
          insert.run({
            id: r.id,
            vin: r.vin,
            email: r.email,
            centerId: r.centerId,
            centerName: r.centerName,
            centerAddress: r.centerAddress,
            centerLat: r.centerLat,
            centerLng: r.centerLng,
            date: r.date,
            time: r.time,
            dateFormated: r.dateFormated,
            status: r.status,
            createdAt: r.createdAt,
            mapsLink: r.mapsLink
          });
        }
      });
      insertMany(reservations);
    }
  } catch (e) {
    console.error('[DB] Erreur migration reservations.json', e.message);
  }

  return db;
}

const db = init();

module.exports = {
  getAllCars: () => db.prepare('SELECT vin, plate, email FROM cars').all(),
  findCarByVin: (vin) => db.prepare('SELECT * FROM cars WHERE vin = ?').get(vin),
  findCarByVinAndPlate: (vin, plate) => db.prepare('SELECT * FROM cars WHERE vin = ? AND plate = ?').get(vin, plate),
  findCarByPlate: (plate) => db.prepare('SELECT * FROM cars WHERE plate = ?').get(plate),
  addCar: (car) => db.prepare('INSERT INTO cars (vin,plate,email,otp,otp_expires) VALUES (?,?,?,?,?)').run(car.vin, car.plate, car.email, car.otp || null, car.otp_expires || null),
  updateCarOTP: (vin, otp, expires) => db.prepare('UPDATE cars SET otp = ?, otp_expires = ? WHERE vin = ?').run(otp, expires, vin),
  clearCarOTP: (vin) => db.prepare('UPDATE cars SET otp = NULL, otp_expires = NULL WHERE vin = ?').run(vin),

  // Reservations
  getAllReservations: () => db.prepare('SELECT * FROM reservations ORDER BY createdAt DESC').all(),
  getReservationsByVin: (vin) => db.prepare('SELECT * FROM reservations WHERE vin = ? ORDER BY createdAt DESC').all(vin),
  getReservationsByCenter: (centerId) => db.prepare('SELECT * FROM reservations WHERE centerId = ? ORDER BY createdAt DESC').all(centerId),
  isSlotReserved: (centerId, date, time) => {
    const r = db.prepare('SELECT COUNT(*) AS c FROM reservations WHERE centerId = ? AND date = ? AND time = ?').get(centerId, date, time);
    return r.c > 0;
  },
  addReservation: (reservation) => db.prepare('INSERT INTO reservations (id,vin,email,centerId,centerName,centerAddress,centerLat,centerLng,date,time,dateFormated,status,createdAt,mapsLink) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    reservation.id,
    reservation.vin,
    reservation.email,
    reservation.centerId,
    reservation.centerName,
    reservation.centerAddress,
    reservation.centerLat,
    reservation.centerLng,
    reservation.date,
    reservation.time,
    reservation.dateFormated,
    reservation.status,
    reservation.createdAt,
    reservation.mapsLink
  )
};
