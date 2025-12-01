import express from 'express';
import { spawnSync } from 'child_process';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Parse JSON for API
app.use(express.json());

// 2. API endpoint (your existing logic)
app.post("/api/transpile", (req, res) => {
  try {
    const code = req.body.code;

    // Detect OS and choose binary
    const os = process.platform;
    let binPath;
    if (os === "win32") {
      binPath = "./bin/fml_win32.exe";
    } else if (os === "darwin") {
      binPath = "./bin/fml_darwin";
    } else {
      binPath = "./bin/fml_linux";
    }

    // Run Haskell transpiler
    const result = spawnSync(binPath, ["-c", code], {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "inherit"],
    });

    if (result.status !== 0) {
      return res.status(400).json({
        error: "Transpilation failed",
        details: result.stderr || "Unknown error",
      });
    }
    const transpiledCode = result.stdout.trim().replace(/\x1b\[[0-9;]*m/g, "");

    res.json({
      code: transpiledCode,
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: error });
  }
});

// 3. ✅ Serve Vite static files (NEW)
const staticDir = path.resolve('./dist'); // Serve from dist in prod

app.use(express.static(staticDir));

// 4. ✅ Handle SPA routing (NEW)
app.get('*', (_, res) => {
  res.sendFile(path.resolve(staticDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
