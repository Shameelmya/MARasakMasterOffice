const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyDlWgaEm8v3k0tmapwa9Q4Fbx-D0_YXD_A",
  authDomain: "ma-razak-master-office.firebaseapp.com",
  projectId: "ma-razak-master-office",
  storageBucket: "ma-razak-master-office.firebasestorage.app",
  messagingSenderId: "743153965338",
  appId: "1:743153965338:web:5212b3ab18dc57376a74a3"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
const PORT = process.env.PORT || 4000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Enable CORS for all routes (important for React app to communicate with it)
app.use(cors());

// Serve static files from the uploads directory
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.json());

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename to prevent overwriting
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit (adjustable)
});

// 1. UPLOAD ENDPOINT
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    // Determine the base URL (Cloudflare tunnel or localhost)
    const hostUrl = req.headers['x-forwarded-proto'] 
      ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host'] || req.headers.host}`
      : `${req.protocol}://${req.get('host')}`;

    const fileUrl = `${hostUrl}/uploads/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      url: fileUrl,
      id: req.file.filename,
      name: req.file.originalname
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 2. DELETE ENDPOINT
app.delete('/delete/:fileId', (req, res) => {
  try {
    const fileId = req.params.fileId;
    // Basic security check to prevent directory traversal
    if (fileId.includes('..') || fileId.includes('/')) {
      return res.status(400).json({ success: false, error: 'Invalid file ID.' });
    }

    const filePath = path.join(UPLOADS_DIR, fileId);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.status(200).json({ success: true, message: 'File deleted.' });
    } else {
      return res.status(404).json({ success: false, error: 'File not found.' });
    }
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 MLA Office Local File Server Running!`);
  console.log(`📁 Saving files to: ${UPLOADS_DIR}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`=========================================`);
  
  startCloudflareAndSync();
});

function startCloudflareAndSync() {
  // If running via pkg, the executable is process.cwd() not __dirname
  const basePath = process.pkg ? path.dirname(process.execPath) : __dirname;
  const cloudflaredPath = path.join(basePath, 'cloudflared.exe');
  
  if (!fs.existsSync(cloudflaredPath)) {
    console.log("⚠️ cloudflared.exe not found! Please download it to the same folder.");
    return;
  }
  
  console.log("Starting Cloudflare Tunnel...");
  const cf = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${PORT}`]);
  
  let urlFound = false;
  
  cf.stderr.on('data', (data) => {
    const output = data.toString();
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    
    if (match && !urlFound) {
      const url = match[0];
      urlFound = true;
      console.log(`✅ Cloudflare Tunnel URL established: ${url}`);
      console.log(`🔄 Syncing URL to Firebase...`);
      
      setDoc(doc(db, "globals", "settings"), { localServerUrl: url }, { merge: true })
        .then(() => {
          console.log("🎉 Successfully synced URL to Firebase Database!");
          console.log("✨ The system is now 100% automated and ready!");
        })
        .catch(err => {
          console.error("❌ Failed to sync URL to Firebase:", err);
        });
    }
  });
  
  cf.on('close', (code) => {
    console.log(`Cloudflare tunnel closed with code ${code}`);
  });
}
