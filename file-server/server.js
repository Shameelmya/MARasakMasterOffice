const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

// 1. Initialize Multi-Project Firebase Admin
const basePath = process.pkg ? path.dirname(process.execPath) : __dirname;

const RAZAK_PROJECT = 'ma-razak-master-office';
const KGM_PROJECT = 'kgm-project-tracker';

const razakCredPath = process.env.RAZAK_FIREBASE_CREDENTIALS || path.join(basePath, 'secrets', 'razak-service-account.json');
const kgmCredPath = process.env.KGM_FIREBASE_CREDENTIALS || path.join(basePath, 'secrets', 'kgm-service-account.json');

let razakAdmin = null;
let kgmAdmin = null;

try {
  if (fs.existsSync(razakCredPath)) {
    const razakServiceAccount = JSON.parse(fs.readFileSync(razakCredPath, 'utf8'));
    razakAdmin = admin.initializeApp({ credential: admin.credential.cert(razakServiceAccount) }, RAZAK_PROJECT);
    console.log(`✅ initialized Razak Firebase Admin`);
  } else {
    throw new Error(`Missing Razak credentials at ${razakCredPath}`);
  }

  if (fs.existsSync(kgmCredPath)) {
    const kgmServiceAccount = JSON.parse(fs.readFileSync(kgmCredPath, 'utf8'));
    kgmAdmin = admin.initializeApp({ credential: admin.credential.cert(kgmServiceAccount) }, KGM_PROJECT);
    console.log(`✅ initialized KGM Firebase Admin`);
  } else {
    throw new Error(`Missing KGM credentials at ${kgmCredPath}`);
  }
} catch (error) {
  console.error("❌ CRITICAL: Failed to initialize Firebase Admins:", error.message);
  console.error("The server must fail closed to prevent unauthenticated access.");
  process.exit(1);
}

const razakDb = razakAdmin ? razakAdmin.firestore() : null;
const kgmDb = kgmAdmin ? kgmAdmin.firestore() : null;

// File isolation paths
const UPLOADS_DIR = path.join(basePath, 'uploads');
const RAZAK_DIR = path.join(UPLOADS_DIR, 'razak');
const KGM_DIR = path.join(UPLOADS_DIR, 'kgm');
const BACKUPS_DIR = process.env.BACKUP_DIR || ''; 

// Ensure directories exist
[UPLOADS_DIR, RAZAK_DIR, KGM_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
if (BACKUPS_DIR && !fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

// 2. Performance: Auth LRU Cache (60s TTL)
const authCache = new Map();
const CACHE_TTL_MS = 60000;

const getCachedAuth = (key) => {
  const cached = authCache.get(key);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }
  return null;
};

const setCachedAuth = (key, data) => {
  authCache.set(key, { timestamp: Date.now(), data });
};

// 3. Multi-Project Auth Middleware
const verifyMultiProjectAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided.' });
  }

  const token = authHeader.split('Bearer ')[1];
  
  try {
    // Decode without verifying signature just to read `aud` (Project ID)
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.aud) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Malformed token.' });
    }

    const projectId = decoded.aud;
    const uid = decoded.sub;
    const cacheKey = `${projectId}_${uid}`;

    // A. Check cache
    const cachedUser = getCachedAuth(cacheKey);
    if (cachedUser) {
      req.user = cachedUser;
      return next();
    }

    // B. Verify Signature & DB based on Project
    if (projectId === RAZAK_PROJECT) {
      if (!razakAdmin) return res.status(500).json({ success: false, error: 'Razak Admin not configured.' });
      
      const verifiedToken = await razakAdmin.auth().verifyIdToken(token);
      const userDoc = await razakDb.collection('artifacts').doc('ma-razak-master-office')
                              .collection('public').doc('data')
                              .collection('users').doc(verifiedToken.uid).get();
                              
      if (!userDoc.exists || userDoc.data().enabled === false) {
        return res.status(403).json({ success: false, error: 'Forbidden: Razak user disabled or not found.' });
      }

      req.user = {
        uid: verifiedToken.uid,
        projectId: RAZAK_PROJECT,
        role: userDoc.data().role
      };

    } else if (projectId === KGM_PROJECT) {
      if (!kgmAdmin) return res.status(500).json({ success: false, error: 'KGM Admin not configured.' });
      
      const verifiedToken = await kgmAdmin.auth().verifyIdToken(token);
      // Determine KGM AppId (defaults to kgm-tracker-default unless overridden by env in future)
      const kgmAppId = process.env.KGM_APP_ID || 'kgm-tracker-default';
      const userDoc = await kgmDb.collection('artifacts').doc(kgmAppId)
                              .collection('public').doc('data')
                              .collection('staff_users').doc(verifiedToken.uid).get();
                              
      if (!userDoc.exists) {
        // Fallback for hardcoded admin if missing document:
        // We reject because server-side authorization MUST rely on verified backend data.
        console.warn(`[AUTH] KGM user ${verifiedToken.email} attempted access but lacks staff_users doc.`);
        return res.status(403).json({ success: false, error: 'Forbidden: KGM user document not found. Create doc in staff_users to grant access.' });
      }

      if (userDoc.data().email !== verifiedToken.email) {
        return res.status(403).json({ success: false, error: 'Forbidden: Email mismatch.' });
      }

      req.user = {
        uid: verifiedToken.uid,
        projectId: KGM_PROJECT,
        role: userDoc.data().role
      };
    } else {
      return res.status(403).json({ success: false, error: 'Forbidden: Unapproved Firebase Project.' });
    }

    // C. Save to cache and proceed
    setCachedAuth(cacheKey, req.user);
    next();

  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token.' });
  }
};

const app = express();
const PORT = process.env.PORT || 4000;

// 4. Strict CORS
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'https://ma-razak-master-office.web.app', 'https://ma-razak-master-office.firebaseapp.com'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error('CORS Policy Violation: Origin not allowed'), false);
  }
}));

app.use(express.json());

// 5. File Upload Configuration
const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 250) * 1024 * 1024;
const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.js', '.vbs', '.scr', '.msi', '.com', '.sh', '.php'];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Physical isolation based on token's project
    const destFolder = req.user.projectId === RAZAK_PROJECT ? RAZAK_DIR : KGM_DIR;
    cb(null, destFolder);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      return cb(new Error('Dangerous file types are not allowed.'), false);
    }
    cb(null, true);
  }
});

// 6. UPLOAD ENDPOINT
app.post('/upload', verifyMultiProjectAuth, (req, res, next) => {
  upload.single('file')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, error: `File too large (${process.env.MAX_FILE_SIZE_MB || 250}MB max).` });
      return res.status(400).json({ success: false, error: err.message });
    } else if (err) {
      return res.status(415).json({ success: false, error: err.message });
    }
    next();
  });
}, (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded.' });

    const hostUrl = req.headers['x-forwarded-proto'] 
      ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host'] || req.headers.host}`
      : `${req.protocol}://${req.get('host')}`;

    const fileId = req.file.filename;
    
    // Backup Logic
    if (BACKUPS_DIR) {
      try {
        const backupProjDir = path.join(BACKUPS_DIR, req.user.projectId === RAZAK_PROJECT ? 'razak' : 'kgm');
        if (!fs.existsSync(backupProjDir)) fs.mkdirSync(backupProjDir, { recursive: true });
        fs.copyFileSync(req.file.path, path.join(backupProjDir, fileId));
      } catch (backupErr) {
        console.error("⚠️ Backup failed for", fileId, backupErr);
      }
    }

    return res.status(200).json({
      success: true,
      url: `${hostUrl}/api/files/${fileId}`,
      id: fileId,
      name: req.file.originalname,
      sourceProject: req.user.projectId
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 7. VIEW/DOWNLOAD ENDPOINT (Protected & Isolated)
const serveFile = (req, res) => {
  try {
    const fileId = req.params.fileId;
    if (fileId.includes('..') || fileId.includes('/')) return res.status(400).json({ success: false, error: 'Invalid file ID.' });

    // Isolation: Construct path based on user's authorized project
    let filePath = path.join(req.user.projectId === RAZAK_PROJECT ? RAZAK_DIR : KGM_DIR, fileId);

    // Fallback/Migration for older Razak files in root /uploads/
    if (!fs.existsSync(filePath) && req.user.projectId === RAZAK_PROJECT) {
      const legacyPath = path.join(UPLOADS_DIR, fileId);
      if (fs.existsSync(legacyPath)) {
        filePath = legacyPath;
      } else {
        return res.status(404).json({ success: false, error: 'File not found.' });
      }
    } else if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found.' });
    }

    // High performance stream with express res.sendFile (handles HTTP Range automatically)
    res.sendFile(filePath, err => {
        if (err && !res.headersSent) res.status(500).json({ success: false, error: 'Error streaming file.' });
    });
  } catch (err) {
    if (!res.headersSent) return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

app.get('/api/files/:fileId', verifyMultiProjectAuth, serveFile);
// Alias for backward compatibility with old hardcoded URLs
app.get('/uploads/:fileId', verifyMultiProjectAuth, serveFile);

// 8. DELETE ENDPOINT
app.delete('/delete/:fileId', verifyMultiProjectAuth, (req, res) => {
  try {
    const fileId = req.params.fileId;
    if (fileId.includes('..') || fileId.includes('/')) return res.status(400).json({ success: false, error: 'Invalid file ID.' });

    let filePath = path.join(req.user.projectId === RAZAK_PROJECT ? RAZAK_DIR : KGM_DIR, fileId);

    // Legacy fallback
    if (!fs.existsSync(filePath) && req.user.projectId === RAZAK_PROJECT) {
      filePath = path.join(UPLOADS_DIR, fileId);
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      if (BACKUPS_DIR) {
        const backupPath = path.join(BACKUPS_DIR, req.user.projectId === RAZAK_PROJECT ? 'razak' : 'kgm', fileId);
        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
      }
      return res.status(200).json({ success: true, message: 'File deleted.' });
    } else {
      return res.status(404).json({ success: false, error: 'File not found.' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 9. Start Server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`=========================================`);
  console.log(`🚀 MLA Office Multi-Project File Server Running!`);
  console.log(`🔒 Bind IP: 127.0.0.1 (Localhost Only)`);
  if (!BACKUPS_DIR) console.log(`⚠️  External backup not configured.`);
  console.log(`=========================================`);
  
  startCloudflareAndSync();
});

function startCloudflareAndSync() {
  const cloudflaredPath = path.join(basePath, 'cloudflared.exe');
  if (!fs.existsSync(cloudflaredPath)) return;
  
  const cf = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${PORT}`]);
  let urlFound = false;
  
  cf.stderr.on('data', (data) => {
    const output = data.toString();
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    
    if (match && !urlFound) {
      const url = match[0];
      urlFound = true;
      console.log(`✅ Cloudflare URL: ${url}`);
      
      // Update Razak DB for compatibility. KGM reads this anonymously.
      if (razakDb) {
        razakDb.collection('globals').doc('settings').set({ localServerUrl: url }, { merge: true })
          .then(() => console.log("🎉 Synced URL to Razak Firebase"))
          .catch(err => console.error("❌ Failed to sync URL:", err));
      }
    }
  });
}
