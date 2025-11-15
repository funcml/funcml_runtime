import type { Plugin } from "vite";
import path from "path";
import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import os from "os";

function extractImports(code: string) {
  let imports = "";

  const lines = code.split("\n");

  let i = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("import ")) {
      imports += `${trimmed}\n`;
      i++;
    } else {
      break;
    }
  }
  return { imports: imports, code: lines.slice(i).join("\n") };
}

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
        console.log(platform);
        // if (platform !== "darwin" && platform !== "win32") {
        //   throw new Error(
        //     `Unsupported platform: ${platform}. This plugin only supports 'darwin' (macOS) and 'win32' (Windows).`
        //   );
        // }
        const content = readFileSync(id, "utf-8");
        const rawJsCode = spawnSync(
          `./bin/fml_${platform}`,
          ["-c", `${content}`],
          {
            encoding: "utf8", // ← Critical: get string, not Buffer
            stdio: ["ignore", "pipe", "inherit"], // stdin: ignore, stdout: capture, stderr: show
            env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
          },
        ).output.toString();
        const jsCode = rawJsCode
          .slice(1, rawJsCode.length - 1)
          .trim()
          .replace(/\x1b\[[0-9;]*m/g, "");
        const fileName = path.basename(id, ".fml");
        let componentName;

        if (fileName === "index") {
          componentName = "Home";
        } else if (fileName === "404") {
          componentName = "NotFound";
        } else {
          componentName = fileName
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("");
        }

        const { imports, code } = extractImports(jsCode);

        const wrappedCode = `
import { f } from '@lib';
${imports}
export default function ${componentName}Component() {
  ${code}

    return ${componentName}();
}
        `;
        console.log(wrappedCode);
        return wrappedCode;
      }
      return null;
    },
  };
}
