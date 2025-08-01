const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const UPLOAD_DIR = "uploads";
const DATA_FILE = "files.json";

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, file.originalname)
});

const upload = multer({ storage });

app.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: "No file uploaded." });

  const files = JSON.parse(fs.readFileSync(DATA_FILE));
  const newFile = {
    filename: file.originalname,
    path: `/uploads/${file.originalname}`,
    status: "pending",
    uploadedAt: new Date().toISOString(),
    scanResult: null,
    scannedAt: null
  };

  files.push(newFile);
  fs.writeFileSync(DATA_FILE, JSON.stringify(files, null, 2));
  res.status(200).json({ message: "File uploaded successfully." });

  // Simulate scanning
  setTimeout(() => {
    const index = files.findIndex(f => f.filename === file.originalname);
    const content = fs.readFileSync(path.join(UPLOAD_DIR, file.originalname), "utf8");
    const infected = /rm -rf|eval|bitcoin/i.test(content);
    files[index].status = "scanned";
    files[index].scanResult = infected ? "infected" : "clean";
    files[index].scannedAt = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(files, null, 2));
  }, 5000);
});

app.get("/files", (req, res) => {
  const files = JSON.parse(fs.readFileSync(DATA_FILE));
  res.json(files);
});

app.delete("/files/:filename", (req, res) => {
  const { filename } = req.params;
  let files = JSON.parse(fs.readFileSync(DATA_FILE));
  files = files.filter(f => f.filename !== filename);
  fs.writeFileSync(DATA_FILE, JSON.stringify(files, null, 2));

  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  res.json({ message: "File deleted." });
});

app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
