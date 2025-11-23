import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";

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

interface FMLREPLConfig {
  container: HTMLElement;
  previewContainer: HTMLElement;
  errorBadge: HTMLElement;
  previewError: HTMLElement;
}

export class FMLREPL {
  private editor: EditorView;
  private previewContainer: HTMLElement;
  private errorBadge: HTMLElement;
  private previewError: HTMLElement;
  private currentCode: string = this.getDefaultCode();
  private fileName: string = "Counter";

  constructor(config: FMLREPLConfig) {
    this.previewContainer = config.previewContainer;
    this.errorBadge = config.errorBadge;
    this.previewError = config.previewError;

    // Create CodeMirror editor
    this.editor = new EditorView({
      state: EditorState.create({
        doc: this.getDefaultCode(),
        extensions: [
          javascript({ typescript: true }),
          keymap.of(defaultKeymap),
          oneDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.currentCode = update.state.doc.toString();
              this.renderPreview();
            }
          }),
        ],
      }),
      parent: config.container,
    });

    // Initial render
    this.renderPreview();
  }

  private getDefaultCode(): string {
    return `script (
  import { createSignal } from '@lib';
  
  const [count, setCount] = createSignal(0);
)

Counter => (
  div class="p-4 bg-gray-100 rounded-lg text-center" (
  )
)`;
  }

  private async renderPreview() {
    try {
      // Clear previous error
      this.errorBadge.classList.add("hidden");
      this.previewError.classList.add("hidden");
      this.previewError.textContent = "";

      // Transpile FML code to JavaScript
      const transpiledCode = this.transpileFML(this.fileName, this.currentCode);

      // Create a sandboxed environment
      const sandbox = this.createSandbox();

      // Execute the transpiled code
      const component = new Function(
        "f",
        "createSignal",
        "effect",
        ...sandbox.keys(),
        await transpiledCode,
      );
      const element = component(...sandbox.values());

      // Render to preview
      if (element instanceof HTMLElement) {
        this.previewContainer.innerHTML = "";
        this.previewContainer.appendChild(element);
      } else if (typeof element === "string") {
        this.previewContainer.innerHTML = element;
      } else {
        throw new Error("Component must return HTMLElement or string");
      }
    } catch (error) {
      this.showError(error as Error);
    }
  }

  private async transpileFML(fileName: string, fmlCode: string) {
    const rawJsCode = await fetch("/api/transpile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // ← Add this!
      },
      body: JSON.stringify({ code: fmlCode, fileName }),
    }).then((res) => res.json());
    const jsCode = rawJsCode.code;
    let componentName = fileName
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

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

  private createSandbox(): Map<string, any> {
    const sandbox = new Map<string, any>();

    // Mock your FML runtime
    sandbox.set("f", (tag: string, props: any, ...children: any[]) => {
      const el = document.createElement(tag);
      if (props) {
        for (const [key, value] of Object.entries(props)) {
          if (typeof value === "string") {
            el.setAttribute(key, value);
          }
        }
      }
      children.flat().forEach((child) => {
        if (typeof child === "string") {
          el.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
          el.appendChild(child);
        }
      });
      return el;
    });

    // Mock signals
    sandbox.set("createSignal", (initial: any) => {
      let value = initial;
      const get = () => value;
      const set = (v: any) => {
        value = typeof v === "function" ? v(value) : v;
      };
      return [get, set];
    });

    sandbox.set("effect", (fn: () => void) => {
      // Simplified effect
      fn();
      return () => {};
    });

    return sandbox;
  }

  private showError(error: Error): void {
    this.errorBadge.classList.remove("hidden");
    this.previewError.classList.remove("hidden");
    this.previewError.textContent = `Error: ${error.message}\n\n${error.stack || ""}`;
    this.previewContainer.innerHTML = "";
  }

  public loadExample(exampleName: string): void {
    // Load example code from examples directory
    fetch(`/examples/${exampleName}.fml`)
      .then((response) => response.text())
      .then((code) => {
        this.editor.dispatch({
          changes: { from: 0, to: this.editor.state.doc.length, insert: code },
        });
        this.currentCode = code;
        this.renderPreview();
      })
      .catch((err) => {
        console.error("Failed to load example:", err);
        this.showError(new Error(`Failed to load example: ${err.message}`));
      });
  }

  public getShareableCode(): string {
    return btoa(encodeURIComponent(this.currentCode));
  }

  public loadFromCode(encodedCode: string): void {
    try {
      const code = decodeURIComponent(atob(encodedCode));
      this.editor.dispatch({
        changes: { from: 0, to: this.editor.state.doc.length, insert: code },
      });
      this.currentCode = code;
      this.renderPreview();
    } catch (error) {
      console.error("Failed to load encoded code:", error);
    }
  }
}
