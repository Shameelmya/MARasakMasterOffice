const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

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
});
