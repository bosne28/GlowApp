const express = require("express");
const mysql = require("mysql2");
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const cron = require('node-cron');
const { Resend } = require('resend');
const resend = new Resend('re_e2unv9c2_BtbY1BWKJ2b95JYiAhahzMHh'); 
const { Expo } = require('expo-server-sdk');
const expo = new Expo();
const app = express();
app.use(cors());
const port = 3000;


// Configurare conexiune baza de date
const db = mysql.createConnection({
  host: 'localhost',
  user: 'api_user',
  password: 'GlowAppAwolG',
  database: 'GlowAppSQL',
});

// Middleware pentru parsarea JSON
app.use(bodyParser.json());

// Ruta de baza - verificare functionalitate API
app.get("/", (req, res) => {
  res.send("API-ul este functional");

});



// Endpoint pentru obtinerea logo-ului unui partener

// Configurare upload logo cu multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const token = req.headers.token;

    if (!token) {
      return cb(new Error("Token lipsa"), false);
    }

    // Verifica token si obtine partenerID
    db.query('SELECT partenerID FROM Utilizatori WHERE token = ?', [token], (err, results) => {
      if (err) return cb(new Error("Eroare baza de date"), false);
      if (!results || results.length === 0) return cb(new Error("Token invalid"), false);

      const partenerID = results[0].partenerID;
      if (!partenerID) return cb(new Error("Utilizator fara salon"), false);

      const directoryPath = path.join('/srv/data', partenerID, 'media');

      // Creeaza director si sterge logo-uri existente
      fs.mkdir(directoryPath, { recursive: true }, (mkdirErr) => {
        if (mkdirErr) return cb(new Error("Eroare creare director"), false);
      
        // Sterge logo-uri vechi in mod sincron
        ['.png', '.jpg', '.jpeg'].forEach(ext => {
          const logoPath = path.join(directoryPath, `logo${ext}`);
          if (fs.existsSync(logoPath)) {
            try {
              fs.unlinkSync(logoPath);
            } catch (unlinkErr) {
              console.error(`Eroare la ștergerea fișierului vechi: ${logoPath}`, unlinkErr);
            }
          }
        });
      
        cb(null, directoryPath);
      });
    });
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      cb(null, `logo${ext}`);
    } else {
      cb(new Error('Fisierul trebuie sa fie PNG sau JPG'), false);
    }
  }
});
// Rulează la fiecare 5 minute
cron.schedule('*/5 * * * *', () => {
  const sql = `
    UPDATE Programari
    SET status = 'anulata'
    WHERE status = 'in_asteptare'
      AND (
        data < CURDATE() OR
        (data = CURDATE() AND ora < CURTIME())
      )
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error('Eroare la actualizarea automată a programărilor:', err);
    } else {
      console.log(`Actualizare automată: ${result.affectedRows} programări anulate.`);
    }
  });
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    mimetype && extname ? cb(null, true) : cb(new Error('Doar fisiere JPEG/PNG'));
  }
});
app.get('/programariclient', (req, res) => {
  const token = req.headers.token;

  if (!token) return res.status(400).json({ error: 'Token lipsă' });

  db.query('SELECT ID FROM Utilizatori WHERE token = ?', [token], (err, userResults) => {
    if (err) return res.status(500).json({ error: 'Eroare căutare utilizator' });
    if (userResults.length === 0) return res.status(404).json({ error: 'Utilizator negăsit' });

    const clientID = userResults[0].ID;

    const sql = `
      SELECT 
        P.ID AS programareID,
        P.data,
        P.ora,
        P.durata_totala,
        P.status,
        Pa.denumire AS salon,
        S.denumire AS serviciu
      FROM Programari P
      JOIN ProgramariServicii PS ON P.ID = PS.programareID
      JOIN Servicii S ON S.ID = PS.serviciuID
      JOIN Parteneri Pa ON P.partenerID = Pa.CUI
      WHERE P.clientID = ? AND (P.data > CURDATE() OR (P.data = CURDATE() AND P.ora >= CURTIME()))
      ORDER BY P.data ASC, P.ora ASC
    `;

    db.query(sql, [clientID], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Eroare interogare programări' });

      // Grupăm serviciile per programare
      const map = new Map();
      rows.forEach(row => {
        const id = row.programareID;
        if (!map.has(id)) {
          map.set(id, {
            id,
            data: row.data,
            ora: row.ora,
            durata_totala: row.durata_totala,
            status: row.status,
            salon: row.salon,
            servicii: []
          });
        }
        map.get(id).servicii.push(row.serviciu);
      });

      res.json({ success: true, programari: Array.from(map.values()) });
    });
  });
});
app.delete('/programare/:id', async (req, res) => {
  const programareID = req.params.id;

  if (!/^\d+$/.test(programareID)) {
    return res.status(400).json({ success: false, message: 'ID invalid' });
  }

  const connection = db.promise();

  try {
    await connection.query('START TRANSACTION');

    // 🔍 Obține detalii înainte de ștergere
    const [[detalii]] = await connection.query(`
      SELECT 
        P.clientID,
        P.partenerID,
        P.data,
        P.ora,
        U.nume AS client_nume,
        U.telefon,
        Pa.denumire AS salon_nume,
        Pa.email AS salon_email
      FROM Programari P
      JOIN Utilizatori U ON P.clientID = U.ID
      JOIN Parteneri Pa ON P.partenerID = Pa.CUI
      WHERE P.ID = ?
    `, [programareID]);

    if (!detalii) {
      return res.status(404).json({ success: false, message: 'Programarea nu a fost găsită' });
    }

    const { client_nume, telefon, data, ora, salon_nume, salon_email, partenerID } = detalii;

    // 🧹 Șterge serviciile asociate
    await connection.query(
      'DELETE FROM ProgramariServicii WHERE programareID = ?',
      [programareID]
    );

    // 🧹 Șterge programarea
    const [deleteResult] = await connection.query(
      'DELETE FROM Programari WHERE ID = ?',
      [programareID]
    );

    await connection.query('COMMIT');

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Programarea nu a fost găsită' });
    }

    // 📅 Formatăm data/ora
    const formattedDate = new Intl.DateTimeFormat('ro-RO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(data));
    const formattedOra = ora.slice(0, 5);

    // 📧 Trimite email către salon
    if (salon_email) {
      const mesaj = `
        <h2>Programare anulată</h2>
        <p>Clientul <strong>${client_nume}</strong> (tel: ${telefon}) a anulat programarea de pe <strong>${formattedDate}</strong> la ora <strong>${formattedOra}</strong>.</p>
      `;
      await resend.emails.send({
        from: `GlowApp <anulari@glowapp.ro>`,
        to: [salon_email],
        subject: `❌ Programare anulată la ${salon_nume}`,
        html: mesaj
      });
    }

    // 🔔 Notificare push către salon
    const [[pushRow]] = await connection.query(`
      SELECT expoToken FROM Utilizatori WHERE partenerID = ? LIMIT 1
    `, [partenerID]);

    const expoToken = pushRow?.expoToken;
    if (expoToken && expoToken.startsWith('ExponentPushToken')) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: expoToken,
          title: '❌ Programare anulată',
          body: `Clientul ${client_nume} a anulat programarea din ${formattedDate}, ora ${formattedOra}.`,
        }),
      });
    }

    return res.json({ success: true, message: 'Programarea a fost anulată și salonul notificat.' });
  } catch (err) {
    await connection.query('ROLLBACK');
    console.error('Eroare la anularea programării:', err);
    res.status(500).json({ success: false, message: 'Eroare la anularea programării' });
  }
});


app.get('/programarisalon', (req, res) => {
  const token = req.headers.token;

  if (!token) return res.status(400).json({ error: 'Token lipsă' });

  db.query('SELECT partenerID FROM Utilizatori WHERE token = ?', [token], (err, results) => {
    if (err) return res.status(500).json({ error: 'Eroare căutare utilizator' });
    if (results.length === 0 || !results[0].partenerID)
      return res.status(403).json({ error: 'Token invalid sau utilizator fără salon' });

    const partenerID = results[0].partenerID;

    const sql = `
      SELECT 
        P.ID AS programareID,
        P.data,
        P.ora,
        P.durata_totala,
        P.status,
         U.ID AS clientID,
         Pa.denumire AS salon,
        U.nume AS client,
        U.telefon,
        S.denumire AS serviciu,
        S.pret AS pret_serviciu,
        D.denumire AS departament
      FROM Programari P
      JOIN Utilizatori U ON P.clientID = U.ID
      JOIN ProgramariServicii PS ON P.ID = PS.programareID
      JOIN Servicii S ON PS.serviciuID = S.ID
      JOIN Departamente D ON S.departamentID = D.ID
      JOIN Parteneri Pa ON P.partenerID = Pa.CUI
      WHERE P.partenerID = ?
      ORDER BY P.data DESC, P.ora DESC
    `;

    db.query(sql, [partenerID], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Eroare interogare programări' });

      const map = new Map();

      rows.forEach(row => {
        const id = row.programareID;

        if (!map.has(id)) {
          map.set(id, {
            id,
            data: row.data,
            ora: row.ora,
            durata_totala: row.durata_totala,
            clientID: row.clientID,
            client: row.client,
            telefon: row.telefon,
            status: row.status,
            salon: row.salon,
            departament: row.departament,
            servicii: []
          });
        }

        map.get(id).servicii.push({
          nume: row.serviciu,
          pret: row.pret_serviciu
        });
      });

      res.json({ success: true, programari: Array.from(map.values()) });
    });
  });
});


app.put('/programaristatus/:id', async (req, res) => {
  const programareID = req.params.id;
  const { status } = req.body;

  if (!programareID || !status) {
    return res.status(400).json({ success: false, message: 'ID sau status lipsă' });
  }

  const statusuriValide = ['anulata', 'in_asteptare', 'confirmata'];
  if (!statusuriValide.includes(status)) {
    return res.status(400).json({ success: false, message: 'Status invalid' });
  }

  const connection = db.promise();

  try {
    // Verificăm statusul curent
    const [existingRows] = await connection.query(
      'SELECT status FROM Programari WHERE ID = ?',
      [programareID]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Programare inexistentă' });
    }

    const currentStatus = existingRows[0].status;
    if (currentStatus === status) {
      return res.status(200).json({ success: true, message: `Statusul este deja "${status}"` });
    }

    // Facem update
    await connection.query(
      'UPDATE Programari SET status = ? WHERE ID = ?',
      [status, programareID]
    );

    // Obținem detalii programare + client + salon
    const [rows] = await connection.query(
      `SELECT 
        U.email,
        U.nume AS client_nume,
        Pa.denumire AS salon_nume,
        P.data,
        P.ora,
        P.partenerID
      FROM Programari P
      JOIN Utilizatori U ON P.clientID = U.ID
      JOIN Parteneri Pa ON P.partenerID = Pa.CUI
      WHERE P.ID = ?`,
      [programareID]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Date client/programare lipsă' });
    }

    const { email, client_nume, salon_nume, data, ora, partenerID } = rows[0];

    // Obținem serviciile + tarife
    const [serviciiRows] = await connection.query(
      `SELECT S.denumire, S.pret 
       FROM ProgramariServicii PS
       JOIN Servicii S ON S.ID = PS.serviciuID
       WHERE PS.programareID = ?`,
      [programareID]
    );

    const listaServiciiHTML = serviciiRows.map(s => {
      const pret = parseFloat(s.pret) || 0;
      return `<li>${s.denumire} – ${pret.toFixed(2)} RON</li>`;
    }).join('');

    const totalPret = serviciiRows.reduce((acc, s) => acc + (parseFloat(s.pret) || 0), 0).toFixed(2);

    // Căutăm logo
    const mediaDir = path.join('/srv/data', partenerID, 'media');
    let logoUrl = null;
    const extensions = ['.png', '.jpg', '.jpeg'];

    for (const ext of extensions) {
      const logoPath = path.join(mediaDir, `logo${ext}`);
      if (fs.existsSync(logoPath)) {
        logoUrl = `https://api.glowapp.ro/${partenerID}/logo`;
        break;
      }
    }

    // Formatăm data și ora
    let formattedDate;
    try {
      const dataObj = new Date(data);
      if (isNaN(dataObj.getTime())) throw new Error('Data invalidă');
      formattedDate = new Intl.DateTimeFormat('ro-RO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(dataObj);
    } catch (e) {
      console.error('Eroare la formatarea datei:', e);
      formattedDate = data; // fallback
    }

    const formattedOra = ora.slice(0, 5);

    // Construim emailul
    let subject = '';
    let message = '';

    if (status === 'confirmata') {
      subject = `Programare confirmată la ${salon_nume}`;
      message = `
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width:200px;margin-top:15px;" />` : ''}
        <h2>Salut, ${client_nume}!</h2>
        <p>Programarea ta la <strong>${salon_nume}</strong> a fost <strong>confirmată</strong>.</p>
        <p><strong>Data:</strong> ${formattedDate}<br/>
        <strong>Ora:</strong> ${formattedOra}</p>
        <p><strong>Servicii:</strong></p>
        <ul>${listaServiciiHTML}</ul>
        <p><strong>Total:</strong> ${totalPret} RON</p>
      `;
    } else if (status === 'anulata') {
      subject = `Programare anulată la ${salon_nume}`;
      message = `
        <h2>Salut, ${client_nume}!</h2>
        <p>Din păcate, programarea ta la <strong>${salon_nume}</strong> a fost <strong>anulată</strong>.</p>
        <p><strong>Data:</strong> ${formattedDate}<br/>
        <strong>Ora:</strong> ${formattedOra}</p>
        <p><strong>Servicii:</strong></p>
        <ul>${listaServiciiHTML}</ul>
        <p><strong>Total:</strong> ${totalPret} RON</p>
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width:200px;margin-top:15px;" />` : ''}
      `;
    } else {
      return res.json({ success: true, message: 'Status actualizat (fără trimitere email)' });
    }

// Trimitem emailul
await resend.emails.send({
  from: `GlowApp - ${salon_nume} <confirmari@glowapp.ro>`,
  to: [email],
  subject,
  html: message
});

// 🔔 Obține expoToken-ul utilizatorului
const [tokenRows] = await connection.query(
  `SELECT expoToken FROM Utilizatori WHERE email = ?`,
  [email]
);
const expoToken = tokenRows[0]?.expoToken;

// Trimitem notificarea dacă tokenul există
if (expoToken && expoToken.startsWith('ExponentPushToken')) {
  const pushTitle = status === 'confirmata'
    ? `✅ Programare confirmată`
    : `❌ Programare anulată`;

  const pushBody = status === 'confirmata'
    ? `Ne vedem la ${salon_nume} pe ${formattedDate} la ora ${formattedOra}.`
    : `Programarea ta la ${salon_nume} a fost anulată.`;

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: expoToken,
      title: pushTitle,
      body: pushBody,
    }),
  });
}

return res.json({ success: true, message: 'Status actualizat, email și notificare trimise' });


  } catch (err) {
    console.error('Eroare la actualizare/trimitere email:', err);
    res.status(500).json({ success: false, message: 'Eroare server' });
  }
});







// Endpoint pentru upload logo
app.post('/salonlogochange', upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Nu a fost primit niciun fisier' });
  }
  res.status(200).json({
    success: true,
    message: 'Logo incarcat cu succes!',
    file: req.file
  });
});

const salonPhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const token = req.headers.token;
    if (!token) {
      return cb(new Error("Token lipsa"), false);
    }

    // Verifica token si obtine partenerID
    db.query('SELECT partenerID FROM Utilizatori WHERE token = ?', [token], (err, results) => {
      if (err) return cb(new Error("Eroare baza de date"), false);
      if (!results || results.length === 0) return cb(new Error("Token invalid"), false);

      const partenerID = results[0].partenerID;
      if (!partenerID) return cb(new Error("Utilizator fara salon"), false);

      const directoryPath = path.join('/srv/data', partenerID, 'media');

      // Creeaza director daca nu exista
      fs.mkdir(directoryPath, { recursive: true }, (mkdirErr) => {
        if (mkdirErr) return cb(new Error("Eroare creare director"), false);
        cb(null, directoryPath);
      });
    });
  },
  filename: function (req, file, cb) {
    const token = req.headers.token;
    const ext = path.extname(file.originalname).toLowerCase();

    if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
      return cb(new Error('Fisierul trebuie sa fie PNG sau JPG'), false);
    }

    // Obtine partenerID si determina ultimul index folosit
    db.query('SELECT partenerID FROM Utilizatori WHERE token = ?', [token], (err, results) => {
      if (err) return cb(err, false);
      if (!results || results.length === 0) return cb(new Error("Token invalid"), false);

      const partenerID = results[0].partenerID;
      const directoryPath = path.join('/srv/data', partenerID, 'media');

      // Citeste directorul pentru a gasi ultimul index
      fs.readdir(directoryPath, (err, files) => {
        if (err && err.code !== 'ENOENT') return cb(err, false);

        let maxIndex = 0;
        if (files && files.length > 0) {
          // Gaseste cel mai mare index existent
          files.forEach(file => {
            const match = file.match(/^(\d+)\./);
            if (match) {
              const currentIndex = parseInt(match[1]);
              if (currentIndex > maxIndex) {
                maxIndex = currentIndex;
              }
            }
          });
        }

        // Numele noului fisier va fi urmatorul index
        const newIndex = maxIndex + 1;
        cb(null, `${newIndex}${ext}`);
      });
    });
  }
});

const uploadSalonPhoto = multer({
  storage: salonPhotoStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    mimetype && extname ? cb(null, true) : cb(new Error('Doar fisiere JPEG/PNG'));
  }
});

// Endpoint pentru upload poze salon
app.post('/newsalonphoto', uploadSalonPhoto.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nu a fost primit niciun fisier'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Poza a fost incarcata cu succes!',
      filename: req.file.filename,
      path: req.file.path
    });
  } catch (err) {
    console.error('Eroare la incarcare poza salon:', err);
    res.status(500).json({
      success: false,
      message: 'Eroare server la procesarea pozei',
      error: err.message
    });
  }
});

// 2. ENDPOINT-URI PENTRU AUTENTIFICARE

// Functie generare token
function generateToken(mail, length = 32) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = mail.split('@')[0] + '_' + Date.now().toString(36) + '_';

  for (let i = 0; i < length; i++) {
    token += characters[Math.floor(Math.random() * characters.length)];
  }
  return token;
}
app.get('/saloane', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const sqlSaloane = `
    SELECT CUI AS partenerID, denumire, adresa, telefon, email, firma, google_rating
    FROM Parteneri
    ORDER BY denumire
    LIMIT ? OFFSET ?
  `;

  try {
    const [saloaneRows] = await db.promise().query(sqlSaloane, [limit, offset]);

    const saloane = await Promise.all(saloaneRows.map(async salon => {
      const mediaPath = path.join('/srv/data', salon.partenerID.toString(), 'media');
      let poze = [];

      try {
        if (fs.existsSync(mediaPath)) {
          poze = fs.readdirSync(mediaPath)
            .filter(file => /^\d+\.(jpg|jpeg|png)$/i.test(file))
            .sort((a, b) => {
              const aNum = parseInt(a.split('.')[0]);
              const bNum = parseInt(b.split('.')[0]);
              return aNum - bNum;
            });
        }
      } catch (e) {
        console.warn(`Eroare la citire poze pentru salon ${salon.partenerID}:`, e);
      }

      // 🔍 Obține departamentele
      let departamente = [];
      try {
        const [deps] = await db.promise().query(
          'SELECT denumire FROM Departamente WHERE partenerID = ? ORDER BY denumire',
          [salon.partenerID]
        );
        departamente = deps.map(d => d.denumire);
      } catch (e) {
        console.warn(`Eroare la departamente pentru ${salon.partenerID}:`, e);
      }

      // 🔍 Obține serviciile
      let servicii = [];
      try {
        const [serviciiRows] = await db.promise().query(
          'SELECT denumire FROM Servicii WHERE partenerID = ? ORDER BY denumire',
          [salon.partenerID]
        );
        servicii = serviciiRows.map(s => s.denumire);
      } catch (e) {
        console.warn(`Eroare la servicii pentru ${salon.partenerID}:`, e);
      }

      return {
        ...salon,
        thumbnail: poze.length > 0 ? `/${salon.partenerID}/${poze[0]}` : null,
        departamente,
        servicii
      };
    }));

    return res.status(200).json(saloane);

  } catch (err) {
    console.error('Eroare la interogare saloane:', err);
    return res.status(500).json({ error: 'Eroare server' });
  }
});

app.post('/programareext', async (req, res) => {
  const { partenerID, data, ora, durata, servicii, numeClient, telefonClient } = req.body;

  if (!partenerID || !data || !ora || !durata || !Array.isArray(servicii) || servicii.length === 0 || !numeClient || !telefonClient) {
    return res.status(400).json({ success: false, message: "Date lipsă sau invalide" });
  }

  const connection = db.promise();
  try {
    await connection.query('START TRANSACTION');

    // 1. Creăm client temporar
    const [insertClient] = await connection.query(`
      INSERT INTO Utilizatori (nume, telefon)
      VALUES (?, ?)
    `, [numeClient, telefonClient]);

    const clientID = insertClient.insertId;

    // 2. Inserăm programarea
    const [insertProgramare] = await connection.query(`
      INSERT INTO Programari (clientID, partenerID, data, ora, durata_totala)
      VALUES (?, ?, ?, ?, ?)
    `, [clientID, partenerID, data, ora, durata]);

    const programareID = insertProgramare.insertId;

    // 3. Legăm serviciile de programare
    const values = servicii.map(serviciuID => [programareID, serviciuID]);
    await connection.query(`
      INSERT INTO ProgramariServicii (programareID, serviciuID)
      VALUES ?
    `, [values]);

    await connection.query('COMMIT');
    res.json({ success: true });

  } catch (err) {
    await connection.query('ROLLBACK');
    console.error('Eroare la /programareext:', err);
    res.status(500).json({ success: false, message: "Eroare la salvarea programării externe" });
  }
});
app.post('/vouchere', async (req, res) => {
  const token = req.headers.token;
  const { clientID, valoare, cod, data_expirare } = req.body;

  if (!token || !clientID || !valoare || !data_expirare) {
    return res.status(400).json({ success: false, message: 'Date lipsă sau invalide' });
  }

  try {
    // 1. Obține partenerID pe baza tokenului
    const [userRows] = await db.promise().query(
      'SELECT partenerID FROM Utilizatori WHERE token = ?',
      [token]
    );

    if (userRows.length === 0 || !userRows[0].partenerID) {
      return res.status(403).json({ success: false, message: 'Token invalid sau utilizator fără salon asociat' });
    }

    const partenerID = userRows[0].partenerID;

    // 2. Generează cod dacă nu a fost furnizat
    let codFinal = cod;
    if (!codFinal) {
      codFinal = 'VCH' + Date.now().toString(36).toUpperCase().slice(-5);
    }

    // 3. Verifică dacă codul este unic
    const [existing] = await db.promise().query(
      'SELECT ID FROM Vouchere WHERE cod = ?',
      [codFinal]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Codul este deja folosit' });
    }

    // 4. Inserare în tabelă
    await db.promise().query(
      'INSERT INTO Vouchere (clientID, partenerID, cod, valoare, data_expirare) VALUES (?, ?, ?, ?, ?)',
      [clientID, partenerID, codFinal, valoare, data_expirare]
    );

    // 5. Răspuns de succes
    return res.status(200).json({
      success: true,
      message: 'Voucher acordat cu succes',
      cod: codFinal,
      partenerID
    });

  } catch (err) {
    console.error('Eroare la /vouchere:', err);
    return res.status(500).json({ success: false, message: 'Eroare server' });
  }
});


app.get('/loialitate', async (req, res) => {
  const token = req.headers.token;
  if (!token) return res.status(400).json({ success: false, message: "Token lipsă" });

  try {
    const [userResult] = await db.promise().query(
      'SELECT ID FROM Utilizatori WHERE token = ?',
      [token]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ success: false, message: "Utilizator negăsit" });
    }

    const clientID = userResult[0].ID;
    const azi = new Date().toISOString().split('T')[0];

    // Suma duratelor din programări confirmate din trecut
    const [durataResult] = await db.promise().query(`
      SELECT SUM(durata_totala) AS totalMinute
      FROM Programari
      WHERE clientID = ? AND data < ? AND status = 'confirmata'
    `, [clientID, azi]);

    const totalMinute = durataResult[0].totalMinute || 0;

    // Conversie în puncte (1 punct per 30 minute)
    const puncte = 10*Math.floor(totalMinute / 30);

    // Nivelul cardului
    let card = 'silver';
    if (puncte >= 500) card = 'diamond';
    else if (puncte >= 200) card = 'gold';

    // Obținem voucherele
    const [vouchere] = await db.promise().query(`
      SELECT V.ID, V.cod, V.valoare, V.data_expirare, P.denumire AS salon
FROM Vouchere V
JOIN Parteneri P ON V.partenerID = P.CUI
WHERE V.clientID = ?
ORDER BY V.data_expirare ASC

    `, [clientID]);

    res.json({
      success: true,
      puncte,
      card,
      vouchere
    });

  } catch (err) {
    console.error("Eroare la /loialitate:", err);
    res.status(500).json({ success: false, message: "Eroare server" });
  }
});
app.get('/istoricclient', (req, res) => {
  const token = req.headers.token;

  if (!token) return res.status(400).json({ error: 'Token lipsă' });

  db.query('SELECT ID FROM Utilizatori WHERE token = ?', [token], (err, userResults) => {
    if (err) return res.status(500).json({ error: 'Eroare căutare utilizator' });
    if (userResults.length === 0) return res.status(404).json({ error: 'Utilizator negăsit' });

    const clientID = userResults[0].ID;

    const sql = `
      SELECT 
        P.ID AS programareID,
        P.data,
        P.ora,
        P.durata_totala,
        P.status,
        Pa.denumire AS salon,
          Pa.google_maps_link,

        S.denumire AS serviciu
      FROM Programari P
      JOIN ProgramariServicii PS ON P.ID = PS.programareID
      JOIN Servicii S ON S.ID = PS.serviciuID
      JOIN Parteneri Pa ON P.partenerID = Pa.CUI
      WHERE P.clientID = ?
      ORDER BY P.data DESC, P.ora DESC
    `;

    db.query(sql, [clientID], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Eroare interogare programări' });

      const map = new Map();
      rows.forEach(row => {
        const id = row.programareID;
        if (!map.has(id)) {
          map.set(id, {
  id,
  data: row.data,
  ora: row.ora,
  durata_totala: row.durata_totala,
  status: row.status,
  salon: row.salon,
  google_maps_link: row.google_maps_link,
  servicii: []
});

        }
        map.get(id).servicii.push(row.serviciu);
      });

      res.json({ success: true, istoric: Array.from(map.values()) });
    });
  });
});

// Endpoint logare
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Completati email si parola' });
  }

  db.query('SELECT * FROM Utilizatori WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ error: 'Eroare la interogare' });
    if (results.length === 0) return res.status(400).json({ error: 'Email sau parola incorecta' });

    const user = results[0];
    if (user.password !== password) return res.status(400).json({ error: 'Email sau parola incorecta' });

    const token = generateToken(email);
    db.query('UPDATE Utilizatori SET token = ? WHERE email = ?', [token, email], (err) => {
      if (err) return res.status(500).json({ error: 'Eroare actualizare token' });
      res.status(200).json({ message: 'Logare reusita', token, nume: user.nume });
    });
  });
});

// Endpoint inregistrare
app.post('/register', (req, res) => {
  const { email, telefon, password } = req.body;
  if (!email || !telefon || !password) {
    return res.status(400).json({ error: 'Completati toate campurile' });
  }

  db.query('SELECT * FROM Utilizatori WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ error: 'Eroare la interogare' });
    if (results.length > 0) return res.status(400).json({ error: 'Email deja folosit' });

    db.query('INSERT INTO Utilizatori (email, telefon, password) VALUES (?, ?, ?)',
      [email, telefon, password], (err) => {
        if (err) return res.status(500).json({ error: 'Eroare la inregistrare' });
        res.status(200).json({ message: 'Utilizator inregistrat' });
      });
  });
});

// 3. ENDPOINT-URI PENTRU UTILIZATORI

// Endpoint verificare token
app.post('/token', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token lipsa' });

  db.query('SELECT * FROM Utilizatori WHERE token = ?', [token], (err, results) => {
    if (err) return res.status(500).json({ error: 'Eroare verificare token' });
    if (results.length === 0) return res.status(400).json({ error: 'Token invalid' });
    res.status(200).json({ nume: results[0].nume });
  });
});

// Endpoint obtinere date utilizator
app.get('/user', (req, res) => {
  const token = req.headers.token;
  if (!token) return res.status(400).json({ error: 'Token lipsa' });

  db.query(`
    SELECT 
      Utilizatori.*,
      Parteneri.denumire AS partener_denumire,
      Parteneri.adresa AS partener_adresa,
      Parteneri.telefon AS partener_telefon,
      Parteneri.email AS partener_email,
      Parteneri.firma AS partener_firma
    FROM Utilizatori 
    LEFT JOIN Parteneri ON Utilizatori.partenerID = Parteneri.CUI 
    WHERE Utilizatori.token = ?`,
    [token],
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Eroare obtinere date' });
      }
      if (results.length === 0) return res.status(404).json({ error: 'Utilizator negasit' });

      const user = results[0];
      res.status(200).json({
        user: {
          id: user.ID,
          nume: user.nume,
          email: user.email,
          telefon: user.telefon,
        },
        partener: user.partenerID ? {
          firma: user.partener_firma,
          partenerID: user.partenerID,
          denumire: user.partener_denumire,
          adresa: user.partener_adresa,
          telefon: user.partener_telefon,
          email: user.partener_email
        } : null
      });
    }
  );
});
//Endpoint actualizare date partener
app.put('/partenerUpdate', (req, res) => {
  const token = req.headers.token;
  const { numePartener, firma, telefon, email, adresa, cui } = req.body;

  if (!token) return res.status(400).json({ error: 'Token lipsă' });
  if (!numePartener || !firma || !email || !telefon || !adresa || !cui)
    return res.status(400).json({ error: 'Eroare integritate date' });

  db.query('SELECT * FROM Utilizatori WHERE token = ?', [token], (err, userResults) => {
    if (err) return res.status(500).json({ error: 'Eroare verificare utilizator' });
    if (userResults.length === 0) return res.status(400).json({ error: 'Utilizator negăsit' });

    const partenerCUI = userResults[0].partenerID;

    if (cui !== partenerCUI) {
      db.query('SELECT * FROM Parteneri WHERE CUI = ?', [cui], (err, cuiResults) => {
        if (err) return res.status(500).json({ error: 'Eroare verificare CUI nou' });
        if (cuiResults.length > 0)
          return res.status(400).json({ error: 'CUI deja folosit de alt salon' });

        actualizeazaPartenerSiUtilizator();
      });
    } else {
      actualizeazaPartenerSiUtilizator();
    }

    function actualizeazaPartenerSiUtilizator() {
      db.query(
        'UPDATE Parteneri SET firma = ?, denumire = ?, adresa = ?, telefon = ?, email = ?, CUI = ? WHERE CUI = ?',
        [firma, numePartener, adresa, telefon, email, cui, partenerCUI],
        (err) => {
          if (err) return res.status(500).json({ error: 'Eroare actualizare salon' });

          // dacă s-a schimbat CUI-ul, redenumim folderul și actualizăm și Utilizatorul
          if (cui !== partenerCUI) {
            const oldPath = path.join('/srv/data', partenerCUI.toString());
            const newPath = path.join('/srv/data', cui.toString());

            fs.rename(oldPath, newPath, (err) => {
              if (err && err.code !== 'ENOENT') {
                return res.status(500).json({ error: 'Eroare redenumire folder local' });
              }

              db.query(
                'UPDATE Utilizatori SET partenerID = ? WHERE token = ?',
                [cui, token],
                (err) => {
                  if (err) return res.status(500).json({ error: 'Eroare actualizare utilizator' });
                  return res.status(200).json({ message: 'Salon și utilizator actualizați cu succes (CUI modificat)' });
                }
              );
            });
          } else {
            return res.status(200).json({ message: 'Salon actualizat cu succes' });
          }
        }
      );
    }
  });
});


// Endpoint actualizare date utilizator
app.put('/userUpdate', (req, res) => {
  const token = req.headers.token;
  const { name, email, telefon } = req.body;

  if (!token) return res.status(400).json({ error: 'Token lipsa' });
  if (!name || !email || !telefon) return res.status(400).json({ error: 'Toate campurile sunt necesare' });

  db.query('UPDATE Utilizatori SET nume = ?, email = ?, telefon = ? WHERE token = ?',
    [name, email, telefon, token], (err) => {
      if (err) return res.status(500).json({ error: 'Eroare actualizare date' });
      res.status(200).json({ message: 'Date actualizate' });
    });
    
});

// 4. ENDPOINT-URI PENTRU PARTENERI (SALOANE)

// Endpoint creare partener nou
app.put('/newpartener', (req, res) => {
  const token = req.headers.token;
  const { CUI, firma, denumire, adresa, telefon, email } = req.body;

  if (!token) return res.status(400).json({ error: 'Token lipsa' });
  if (!CUI || !firma || !denumire || !adresa || !telefon || !email) {
    return res.status(400).json({ error: 'Toate campurile sunt obligatorii' });
  }

  db.query('SELECT * FROM Utilizatori WHERE token = ?', [token], (err, results) => {
    if (err) return res.status(500).json({ error: 'Eroare verificare utilizator' });
    if (results.length === 0) return res.status(400).json({ error: 'Utilizator negasit' });

    db.query('SELECT * FROM Parteneri WHERE CUI = ?', [CUI], (err, existing) => {
      if (err) return res.status(500).json({ error: 'Eroare verificare CUI' });
      if (existing.length > 0) return res.status(400).json({ error: 'CUI deja folosit' });

      db.query('INSERT INTO Parteneri (CUI, firma, denumire, adresa, telefon, email) VALUES (?, ?, ?, ?, ?, ?)',
        [CUI, firma, denumire, adresa, telefon, email], (err) => {
          if (err) return res.status(500).json({ error: 'Eroare creare partener' });

          // ⬇️ Inserăm cele 7 zile default în ProgramSalon
          const zile = ['Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata', 'Duminica'];
          const valori = zile.map(zi => [CUI, zi, null, null, 1]); // inchis = 1

          db.query(
            'INSERT INTO ProgramSalon (partenerID, zi, ora_start, ora_end, inchis) VALUES ?',
            [valori],
            (err) => {
              if (err) {
                console.error('Eroare la inserare program implicit:', err);
                return res.status(500).json({ error: 'Partener creat, dar eroare la inițializarea programului' });
              }

              db.query('UPDATE Utilizatori SET partenerID = ? WHERE token = ?', [CUI, token], (err) => {
                if (err) return res.status(500).json({ error: 'Eroare asociere partener' });
                res.status(200).json({ message: 'Partener și program create cu succes', partenerID: CUI });
              });
            });
        });
    });
  });
});


// Endpoint stergere salon
app.delete('/salon', (req, res) => {
  const token = req.headers.token;
  if (!token) return res.status(400).json({ error: 'Token lipsa' });

  db.query('SELECT partenerID FROM Utilizatori WHERE token = ?', [token], (err, userResults) => {
    if (err) return res.status(500).json({ error: 'Eroare verificare utilizator' });
    if (userResults.length === 0) return res.status(400).json({ error: 'Utilizator negasit' });

    const partenerID = userResults[0].partenerID;
    if (!partenerID) return res.status(403).json({ error: 'Nu aveti salon asociat' });

    db.query('DELETE FROM Parteneri WHERE CUI = ?', [partenerID], (err, deleteResults) => {
      if (err) return res.status(500).json({ error: 'Eroare stergere salon' });
      if (deleteResults.affectedRows === 0) return res.status(400).json({ error: 'Salon negasit' });

      db.query('UPDATE Utilizatori SET partenerID = NULL WHERE token = ?', [token], (err) => {
        if (err) return res.status(500).json({ error: 'Eroare actualizare utilizator' });
        res.status(200).json({ message: 'Salon sters' });
      });
    });
  });
});

// ========================
// GET /departamente
// ========================
app.get('/departamente', (req, res) => {
  const token = req.headers.token;
  if (!token) return res.status(400).json({ error: 'Token lipsă' });

  const sqlUser = 'SELECT partenerID FROM Utilizatori WHERE token = ?';
  db.query(sqlUser, [token], (err, results) => {
    if (err) return res.status(500).json({ error: 'Eroare server' });
    if (results.length === 0) return res.status(404).json({ error: 'Utilizator negăsit' });

    const partenerID = results[0].partenerID;
    if (!partenerID) return res.status(400).json({ error: 'Utilizatorul nu este partener' });

    const sqlDep = 'SELECT ID, denumire FROM Departamente WHERE partenerID = ?';
    db.query(sqlDep, [partenerID], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Eroare departamente' });
      res.json(rows);
    });
  });
});

app.get('/salondata', async (req, res) => {
  const partenerID = req.query.id;

  if (!partenerID) {
    return res.status(400).json({ success: false, message: "Missing id parameter" });
  }

  try {
    // 1. Date salon + rating + recenzii + link
    let denumireSalon = '';
    let google_rating = null;
    let google_reviews = [];
    let google_maps_link = null;

    const [partenerRows] = await db.promise().query(
      'SELECT denumire, google_rating, google_reviews, google_maps_link FROM Parteneri WHERE CUI = ?',
      [partenerID]
    );

    if (partenerRows.length > 0) {
      const partener = partenerRows[0];
      denumireSalon = partener.denumire;
      google_rating = partener.google_rating;
      google_maps_link = partener.google_maps_link;

      try {
        if (typeof partener.google_reviews === 'string') {
          google_reviews = JSON.parse(partener.google_reviews);
        } else if (Array.isArray(partener.google_reviews)) {
          google_reviews = partener.google_reviews;
        }
      } catch (e) {
        console.warn(`⚠️ Eroare la parsarea recenziilor pentru ${partenerID}:`, e.message);
        google_reviews = [];
      }
    }

    // 2. Imagini salon
    const mediaDir = path.join('/srv/data', partenerID, 'media');
    let images = [];

    try {
      const files = await fs.promises.readdir(mediaDir);
      images = files
        .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
        .sort((a, b) => {
          const aNum = parseInt(a);
          const bNum = parseInt(b);
          return isNaN(aNum) || isNaN(bNum) ? a.localeCompare(b, undefined, { numeric: true }) : aNum - bNum;
        });
    } catch (err) {
      console.warn(`Directorul media nu există sau e gol pentru ${partenerID}`);
    }

    // 3. Program salon
    const zile = ['Luni','Marti','Miercuri','Joi','Vineri','Sambata','Duminica'];
    let program = zile.map(zi => ({ zi, deschidere: "", inchidere: "" }));

    const [programRows] = await db.promise().query(
      `SELECT zi, ora_start, ora_end, inchis 
       FROM ProgramSalon 
       WHERE partenerID = ?
       ORDER BY FIELD(zi, "Luni","Marti","Miercuri","Joi","Vineri","Sambata","Duminica")`,
      [partenerID]
    );

    programRows.forEach(row => {
      const ziIndex = zile.indexOf(row.zi);
      if (ziIndex >= 0) {
        program[ziIndex].deschidere = row.inchis || !row.ora_start ? '' : row.ora_start.slice(0, 5);
        program[ziIndex].inchidere = row.inchis || !row.ora_end ? '' : row.ora_end.slice(0, 5);
      }
    });

    // 4. Servicii pe departamente
    const [serviceRows] = await db.promise().query(
      `SELECT D.denumire AS departament, S.ID, S.denumire, S.pret, S.durata
       FROM Servicii S
       JOIN Departamente D ON S.departamentID = D.ID
       WHERE D.partenerID = ?
       ORDER BY D.denumire`,
      [partenerID]
    );

    const servicii = [];
    let currentDept = null;
    let currentList = null;

    for (const serv of serviceRows) {
      if (serv.departament !== currentDept) {
        currentDept = serv.departament;
        currentList = [];
        servicii.push({ departament: currentDept, servicii: currentList });
      }
      currentList.push({
        id: serv.ID,
        denumire: serv.denumire,
        pret: serv.pret,
        durata: serv.durata
      });
    }

    // ✅ Return complet
    return res.json({
      success: true,
      denumire: denumireSalon,
      images,
      program,
      servicii,
      google_rating,
      google_reviews,
      google_maps_link
    });

  } catch (err) {
    console.error("Eroare la /salondata:", err);
    return res.status(500).json({
      success: false,
      message: "Eroare internă la procesarea datelor",
      error: err.message
    });
  }
});



// ========================
// GET /servicii/:departamentID
// ========================
app.get('/servicii/:departamentID', (req, res) => {
  const { departamentID } = req.params;
  db.query(
    'SELECT ID, denumire, pret, durata FROM Servicii WHERE departamentID = ?',
    [departamentID],
    (err, rows) => {
      if (err) {
        console.error('Eroare la interogare:', err); // <- ADĂUGĂ ASTA
        return res.status(500).json({ error: 'Eroare server' });
      }
      res.json(rows);
    }
  );
});

// ========================
// POST /servicii
// ========================
app.post('/servicii', (req, res) => {
  const { departamentID, denumire, pret, durata } = req.body;

  if (!departamentID || !denumire || pret == null || durata == null) {
    return res.status(400).json({ error: 'Date lipsă' });
  }

  db.query(
    'INSERT INTO Servicii (departamentID, denumire, pret, durata) VALUES (?, ?, ?, ?)',
    [departamentID, denumire, pret, durata],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Eroare inserare' });
      res.status(201).json({ message: 'Serviciu adăugat', ID: result.insertId });
    }
  );
});

// ========================
// PUT /servicii/:id
// ========================
app.put('/servicii/:id', (req, res) => {
  const { id } = req.params;
  const { denumire, pret, durata } = req.body;

  if (!denumire || pret == null || durata == null) {
    return res.status(400).json({ error: 'Date lipsă' });
  }

  db.query(
    'UPDATE Servicii SET denumire = ?, pret = ?, durata = ? WHERE ID = ?',
    [denumire, pret, durata, id],
    (err) => {
      if (err) return res.status(500).json({ error: 'Eroare actualizare' });
      res.json({ message: 'Serviciu actualizat' });
    }
  );
});

// ========================
// DELETE /servicii/:id
// ========================
app.delete('/servicii/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM Servicii WHERE ID = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'Eroare la ștergere' });
    res.json({ message: 'Serviciu șters' });
  });
});


// 5. GESTIONARE EROARI

// Middleware gestionare erori
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'Eroare upload fisier',
      error: err.code === 'LIMIT_FILE_SIZE' ? 'Fisier prea mare (max 15MB)' : err.message
    });
  }
  res.status(500).json({ success: false, message: 'Eroare server', error: err.message });
});

// Pornire server
db.connect((err) => {
  if (err) {
    console.error('Eroare conectare baza de date', err);
    return;
  }
  console.log('Conectare reusita la baza de date');

  app.listen(port, () => {
    console.log(`Serverul ruleaza la: http://localhost:${port}`);
  });
});
app.post('/departamente', (req, res) => {
  const token = req.headers.token;
  const { denumire } = req.body;

  if (!token) return res.status(400).json({ error: 'Token lipsă' });
  if (!denumire) return res.status(400).json({ error: 'Denumire lipsă' });

  // Obținem partenerID-ul asociat utilizatorului
  const getUserSQL = `
    SELECT partenerID FROM Utilizatori WHERE token = ?
  `;

  db.query(getUserSQL, [token], (err, results) => {
    if (err) {
      console.error('Eroare la căutarea utilizatorului:', err);
      return res.status(500).json({ error: 'Eroare server' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Utilizator negăsit' });
    }

    const partenerID = results[0].partenerID;

    if (!partenerID) {
      return res.status(400).json({ error: 'Utilizatorul nu este partener' });
    }

    // Inserăm noul departament
    const insertSQL = `
      INSERT INTO Departamente (partenerID, denumire) VALUES (?, ?)
    `;

    db.query(insertSQL, [partenerID, denumire], (err, result) => {
      if (err) {
        console.error('Eroare la inserare departament:', err);
        return res.status(500).json({ error: 'Eroare inserare' });
      }

      res.status(201).json({ message: 'Departament adăugat cu succes', departamentID: result.insertId });
    });
  });
});
app.get('/:partenerID/logo', (req, res) => {
  const { partenerID } = req.params;
  const mediaPath = path.join('/srv/data', partenerID, 'media');

  // Cauta logo in formatele suportate
  const logoExtensions = ['.png', '.jpg', '.jpeg'];
  let foundLogo = null;

  for (const ext of logoExtensions) {
    const filePath = path.join(mediaPath, `logo${ext}`);
    if (fs.existsSync(filePath)) {
      foundLogo = filePath;
      break;
    }
  }

  if (foundLogo) {
    res.sendFile(foundLogo);
  } else {
    res.status(404).json({
      success: false,
      message: 'Logo-ul nu a fost gasit'
    });
  }
});
// Endpoint nou pentru imagini numerotate
app.get('/:partenerID/:imageNumber', (req, res) => {
  const { partenerID, imageNumber } = req.params;

  // Verifică dacă numărul imaginii este valid
  if (!/^\d+$/.test(imageNumber)) {
    return res.status(400).json({
      success: false,
      message: 'Numărul imaginii trebuie să fie un număr întreg pozitiv'
    });
  }

  const mediaPath = path.join('/srv/data', partenerID, 'media');
  const imageExtensions = ['.png', '.jpg', '.jpeg'];
  let foundImage = null;

  // Caută imaginea în toate formatele suportate
  for (const ext of imageExtensions) {
    const filePath = path.join(mediaPath, `${imageNumber}${ext}`);
    if (fs.existsSync(filePath)) {
      foundImage = filePath;
      break;
    }
  }

  if (foundImage) {
    res.sendFile(foundImage);
  } else {
    res.status(404).json({
      success: false,
      message: `Imaginea ${imageNumber} nu a fost găsită`
    });
  }
});
app.put('/program', (req, res) => {
  const token = req.headers.token;
  const zile = req.body; // array: [{ zi, deschidere, inchidere }]

  if (!token || !Array.isArray(zile)) {
    return res.status(400).json({ error: 'Token sau date lipsă' });
  }

  db.query('SELECT partenerID FROM Utilizatori WHERE token = ?', [token], (err, results) => {
    if (err || results.length === 0 || !results[0].partenerID) {
      return res.status(403).json({ error: 'Token invalid sau utilizator fără salon asociat' });
    }

    const partenerID = results[0].partenerID;

    db.query('DELETE FROM ProgramSalon WHERE partenerID = ?', [partenerID], (deleteErr) => {
      if (deleteErr) {
        console.error('Eroare la ștergere program:', deleteErr);
        return res.status(500).json({ error: 'Eroare la resetarea programului' });
      }

      // Transformăm fiecare zi în formatul cerut de tabelă
      const values = zile.map(({ zi, deschidere, inchidere }) => [
        partenerID,
        zi,
        deschidere || null,
        inchidere || null,
        !deschidere || !inchidere ? 1 : 0
      ]);

      if (values.length === 0) {
        return res.status(200).json({ message: 'Program actualizat cu succes (fără ore)' });
      }

      db.query(
        'INSERT INTO ProgramSalon (partenerID, zi, ora_start, ora_end, inchis) VALUES ?',
        [values],
        (insertErr) => {
          if (insertErr) {
            console.error('Eroare inserare program:', insertErr);
            return res.status(500).json({ error: 'Eroare la salvarea programului' });
          }

          res.status(200).json({ message: 'Program actualizat cu succes' });
        }
      );
    });
  });
});
app.post('/programare', async (req, res) => {
  const { partenerID, user, data, ora, durata, servicii } = req.body;

  if (!partenerID || !user || !data || !ora || !durata || !Array.isArray(servicii) || servicii.length === 0) {
    return res.status(400).json({ success: false, message: "Date lipsă sau invalide" });
  }

  const connection = db.promise();

  try {
    await connection.query('START TRANSACTION');

    // 1. Inserăm programarea
    const [result] = await connection.query(`
      INSERT INTO Programari (clientID, partenerID, data, ora, durata_totala)
      VALUES (?, ?, ?, ?, ?)`,
      [user, partenerID, data, ora, durata]
    );

    const programareID = result.insertId;

    // 2. Legăm serviciile de programare
    const values = servicii.map(serviciuID => [programareID, serviciuID]);
    await connection.query(`
      INSERT INTO ProgramariServicii (programareID, serviciuID)
      VALUES ?`, [values]
    );

    await connection.query('COMMIT');

    // 3. 🔍 Obținem datele clientului
    const [[client]] = await connection.query(`
      SELECT nume, telefon FROM Utilizatori WHERE ID = ?`,
      [user]
    );

    // 4. 🔍 Obținem emailul și expoToken-ul salonului
    const [[salon]] = await connection.query(`
      SELECT P.email, P.denumire, U.expoToken FROM Utilizatori U
JOIN Parteneri P ON U.partenerID = P.CUI
WHERE U.partenerID = ? LIMIT 1`,
      [partenerID]
    );

    // 5. 🔍 Obținem denumirile serviciilor și prețurile
    const [serviciiInfo] = await connection.query(`
      SELECT denumire, pret FROM Servicii WHERE ID IN (?)`,
      [servicii]
    );

    const listaServicii = serviciiInfo.map(s =>
      `<li>${s.denumire} – ${parseFloat(s.pret).toFixed(2)} RON</li>`).join('');
    const total = serviciiInfo.reduce((acc, s) => acc + parseFloat(s.pret), 0).toFixed(2);

    // 6. 📧 Email către salon
    if (salon?.email) {
      const mesajHTML = `
        <h2>Programare nouă la ${salon.denumire}</h2>
        <p><strong>Nume client:</strong> ${client.nume}</p>
        <p><strong>Telefon:</strong> ${client.telefon}</p>
        <p><strong>Data:</strong> ${data}</p>
        <p><strong>Ora:</strong> ${ora}</p>
        <p><strong>Servicii:</strong></p>
        <ul>${listaServicii}</ul>
        <p><strong>Total:</strong> ${total} RON</p>
      `;

      await resend.emails.send({
        from: `GlowApp <programari@glowapp.ro>`,
        to: [salon.email],
        subject: `🔔 Programare nouă la ${salon.denumire}`,
        html: mesajHTML
      });
    }

    // 7. 🔔 Notificare push către salon (dacă are token valid)
    if (salon?.expoToken?.startsWith('ExponentPushToken')) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: salon.expoToken,
          title: '🔔 Programare nouă',
          body: `Clientul ${client.nume} s-a programat pe ${data} la ${ora}.`,
        }),
      });
    }

    res.json({ success: true });

  } catch (err) {
    await connection.query('ROLLBACK');
    console.error('Eroare salvare programare:', err);
    res.status(500).json({ success: false, message: "Eroare la salvarea programării" });
  }
});

cron.schedule('*/15 * * * *', async () => {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        P.ID AS programareID,
        P.clientID,
        P.partenerID,
        P.data,
        P.ora,
        P.durata_totala,
        U.nume,
        U.email,
        U.expoToken,
        Pa.denumire AS salon,
        Pa.google_place_id
      FROM Programari P
      JOIN Utilizatori U ON P.clientID = U.ID
      JOIN Parteneri Pa ON P.partenerID = Pa.CUI
      WHERE P.status = 'confirmata'
        AND TIMESTAMP(P.data, P.ora) + INTERVAL P.durata_totala MINUTE < NOW()
        AND P.recenzieSolicitata IS NULL
    `);

    for (const p of rows) {
      const recenzieUrl = `https://search.google.com/local/writereview?placeid=${p.google_place_id}`;
      const formattedDate = new Date(p.data).toLocaleDateString('ro-RO');
      const ora = p.ora.slice(0, 5);

      // 📨 Email
      if (p.email) {
        const html = `
          <h2>Salut, ${p.nume}!</h2>
          <p>Programarea ta la <strong>${p.salon}</strong> din ${formattedDate} ora ${ora} s-a încheiat.</p>
          <p>Ne-ar ajuta mult o recenzie:</p>
          <p><a href="${recenzieUrl}" target="_blank">Click aici pentru a scrie o recenzie</a></p>
        `;
        await resend.emails.send({
          from: `GlowApp <recenzii@glowapp.ro>`,
          to: [p.email],
          subject: `Cum a fost la ${p.salon}?`,
          html
        });
      }

      // 📱 Notificare Push
      if (p.expoToken && Expo.isExpoPushToken(p.expoToken)) {
        await expo.sendPushNotificationsAsync([
          {
            to: p.expoToken,
            sound: 'default',
            title: `Recenzie pentru ${p.salon}`,
            body: `Spune-ne cum a fost vizita ta din ${formattedDate} ora ${ora}`,
            data: { url: recenzieUrl }
          }
        ]);
      }

      // ✅ Marcare ca notificare trimisă
      await db.promise().query(
        `UPDATE Programari SET recenzieSolicitata = 1 WHERE ID = ?`,
        [p.programareID]
      );
    }

    console.log(`[CRON] Trimise notificări recenzie pentru ${rows.length} programări.`);
  } catch (err) {
    console.error('Eroare la task-ul de recenzii:', err);
  }
});


app.post('/salveazatoken', async (req, res) => {
  const token = req.headers.token;
  const { expoToken } = req.body;

  if (!token || !expoToken) {
    return res.status(400).json({ success: false, message: 'Token lipsă sau expoToken lipsă' });
  }

  try {
    const [rows] = await db.promise().query(
      'SELECT ID FROM Utilizatori WHERE token = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilizator inexistent' });
    }

    await db.promise().query(
      'UPDATE Utilizatori SET expoToken = ? WHERE token = ?',
      [expoToken, token]
    );

    return res.json({ success: true, message: 'Token de notificări salvat cu succes' });
  } catch (err) {
    console.error('Eroare la /salveazatoken:', err);
    return res.status(500).json({ success: false, message: 'Eroare server' });
  }
});


app.get('/program', (req, res) => {
  const token = req.headers.token;

  if (!token) {
    return res.status(400).json({ error: 'Token lipsă' });
  }

  // Obține partenerID din token
  db.query('SELECT partenerID FROM Utilizatori WHERE token = ?', [token], (err, results) => {
    if (err) return res.status(500).json({ error: 'Eroare la căutarea utilizatorului' });
    if (results.length === 0) return res.status(404).json({ error: 'Token invalid' });

    const partenerID = results[0].partenerID;

    // Preia programul salonului din ProgramSalon
    db.query(
      'SELECT zi, ora_start, ora_end, inchis FROM ProgramSalon WHERE partenerID = ? ORDER BY FIELD(zi, "Luni", "Marti", "Miercuri", "Joi", "Vineri", "Sambata", "Duminica")',
      [partenerID],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Eroare interogare program' });

        const program = result.map((item) => ({
          zi: item.zi,
          deschidere: item.inchis || !item.ora_start ? '' : item.ora_start.slice(0, 5),
          inchidere: item.inchis || !item.ora_end ? '' : item.ora_end.slice(0, 5),
        }));

        return res.json({ success: true, program });
      }
    );
  });
});


// Endpoint stergere imagine
app.delete('/:partenerID/images/:imageNumber', (req, res) => {
  const { partenerID, imageNumber } = req.params;

  if (!/^\d+$/.test(imageNumber)) {
    return res.status(400).json({ error: 'Invalid image number' });
  }

  const mediaPath = path.join('/srv/data', partenerID, 'media');
  const extensions = ['.png', '.jpg', '.jpeg'];
  let deleted = false;

  extensions.forEach(ext => {
    const filePath = path.join(mediaPath, `${imageNumber}${ext}`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted = true;
    }
  });

  if (deleted) {
    res.json({ success: true, message: 'Image deleted successfully' });
  } else {
    res.status(404).json({ success: false, message: 'Image not found' });
  }
});

app.get('/:partenerID/list/images', (req, res) => {
  const { partenerID } = req.params;
  const mediaPath = path.join('/srv/data', partenerID, 'media');

  fs.readdir(mediaPath, (err, files) => {
    if (err) {
      return res.status(404).json({
        success: false,
        message: 'Directorul nu a fost găsit'
      });
    }

    // Filtrează doar fișierele numerotate (1.jpg, 2.png etc.)
    const images = files
      .filter(file => /^\d+\.(png|jpg|jpeg)$/i.test(file))
      .sort((a, b) => {
        const numA = parseInt(a.split('.')[0]);
        const numB = parseInt(b.split('.')[0]);
        return numA - numB;
      });

    res.status(200).json({
      success: true,
      images: images
    });
  });
});
app.get('/loialitateclient/:clientID', async (req, res) => {
  const token = req.headers.token;
  const clientID = req.params.clientID;

  if (!token) return res.status(400).json({ error: 'Token lipsă' });
  if (!clientID) return res.status(400).json({ error: 'ID client lipsă' });

  try {
    const [userRows] = await db.promise().query('SELECT partenerID FROM Utilizatori WHERE token = ?', [token]);
    if (!userRows.length) return res.status(403).json({ error: 'Token invalid' });

    const partenerID = userRows[0].partenerID;
    const azi = new Date().toISOString().split('T')[0];

    const [durataRows] = await db.promise().query(`
      SELECT SUM(P.durata_totala) AS totalMinute
      FROM Programari P
      WHERE P.clientID = ? AND P.partenerID = ? AND P.data < ? AND P.status = 'confirmata'
    `, [clientID, partenerID, azi]);

    const totalMinute = durataRows[0].totalMinute || 0;
    const puncte = Math.floor(totalMinute / 30);

    // Nivel card
    let card = 'silver';
    if (puncte >= 500) card = 'diamond';
    else if (puncte >= 200) card = 'gold';

    const [vouchereRows] = await db.promise().query(`
      SELECT ID, cod, valoare, data_expirare
      FROM Vouchere
      WHERE clientID = ? AND partenerID = ?
      ORDER BY data_expirare ASC
    `, [clientID, partenerID]);

    return res.json({
      success: true,
      puncte,
      card,
      vouchere: vouchereRows
    });

  } catch (err) {
    console.error('Eroare la /loialitateclient:', err);
    return res.status(500).json({ error: 'Eroare server' });
  }
});
app.get('/disponibilitate', async (req, res) => {
  const partenerID = req.query.id;  const data = req.query.data;
  const durata = parseInt(req.query.durata);
  const departament = req.query.departament;
  if (!partenerID || !data || isNaN(durata) || !departament) {
    return res.status(400).json({ success: false, message: "Parametri lipsă sau invalizi" });
  }

  try {
    const zi = new Date(data).toLocaleDateString('ro-RO', { weekday: 'long' });
    const ziCapitalizata = zi.charAt(0).toUpperCase() + zi.slice(1);

    const [program] = await db.promise().query(
      `SELECT ora_start, ora_end, inchis FROM ProgramSalon WHERE partenerID = ? AND zi = ?`,
      [partenerID, ziCapitalizata]
    );

    if (!program.length || program[0].inchis || !program[0].ora_start || !program[0].ora_end) {
      return res.json({ success: true, intervale: [] });
    }

    const oraStart = program[0].ora_start;
    const oraEnd = program[0].ora_end;

    // 💡 Obținem doar programările din acel departament
    const [programari] = await db.promise().query(
      `SELECT P.ora, SUM(S.durata) as durata_totala
       FROM Programari P
       JOIN ProgramariServicii PS ON P.ID = PS.programareID
       JOIN Servicii S ON S.ID = PS.serviciuID
       JOIN Departamente D ON D.ID = S.departamentID
       WHERE P.partenerID = ? AND P.data = ? AND D.denumire = ? AND P.status != 'Anulata'
       GROUP BY P.ora`,
      [partenerID, data, departament]
    );

    const intervale = [];
    const [hStart, mStart] = oraStart.split(':').map(Number);
    const [hEnd, mEnd] = oraEnd.split(':').map(Number);

    const startMinute = hStart * 60 + mStart;
    const endMinute = hEnd * 60 + mEnd;

    for (let t = startMinute; t + durata <= endMinute; t += 15) {
      const ora = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      const conflict = programari.find(p => {
        const pStart = parseInt(p.ora.split(':')[0]) * 60 + parseInt(p.ora.split(':')[1]);
        const pEnd = pStart + parseInt(p.durata_totala);
        const tEnd = t + durata;
        return (t < pEnd && tEnd > pStart);
      });

      if (!conflict) {
        intervale.push(ora);
      }
    }

    return res.json({ success: true, intervale });

  } catch (err) {
    console.error("Eroare la /disponibilitate:", err);
    return res.status(500).json({ success: false, message: "Eroare server" });
  }
});


