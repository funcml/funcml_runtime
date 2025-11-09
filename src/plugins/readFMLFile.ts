import type { Plugin } from "vite";
import path from "path";
import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import os from "os";

export function readFMLPlugin(): Plugin {
  return {
    name: "fml-read-file-plugin",
    resolveId(source, importer) {
      if (!source.endsWith(".fml")) return null;
      const resolved = path.isAbsolute(source)
        ? source
        : path.resolve(path.dirname(importer || ""), source);
      return resolved;
    },
    load(id) {
      if (id.endsWith(".fml")) {
        const platform = os.platform();
        if (platform !== "darwin" && platform !== "win32") {
          throw new Error(
            `Unsupported platform: ${platform}. This plugin only supports 'darwin' (macOS) and 'win32' (Windows).`
          );
        }
        const content = readFileSync(id, "utf-8");
        const rawJsCode = spawnSync(`./bin/fml_${platform}`, ["-c", `${content}`], {
          encoding: "utf8", // ← Critical: get string, not Buffer
          stdio: ["ignore", "pipe", "inherit"], // stdin: ignore, stdout: capture, stderr: show
          env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
        }).output.toString();
        const jsCode = rawJsCode
          .slice(1, rawJsCode.length - 1)
          .trim()
          .replace(/\x1b\[[0-9;]*m/g, "");
        // console.log(jsCode);
        return `
        import { f } from '@lib'
        ${jsCode} 
        `;
      }
      return null;
    },
  };
}
