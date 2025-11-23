import express from "express";
import { spawnSync } from "child_process";

const app = express();
const PORT = 3001;

app.use(express.json());

app.post("/api/transpile", (req, res) => {
  try {
    console.log(req.body);
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

app.listen(PORT, () => {
  console.log(`✅ Transpiler server running on http://localhost:${PORT}`);
});
