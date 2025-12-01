import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import * as FMLRuntime from "@lib";

function runtimeToString(): string {
  return `
    const createSignal = ${FMLRuntime.createSignal.toString()};
    const f = ${FMLRuntime.f.toString()};
    const createStore = ${FMLRuntime.createStore.toString()};
    const effect = ${FMLRuntime.effect.toString()};
    const createMemo = ${FMLRuntime.createMemo.toString()};
  `;
}

interface FMLREPLConfig {
  container: HTMLElement;
  previewFrame: HTMLIFrameElement;
  errorBadge: HTMLElement;
  previewError: HTMLElement;
  fileName: () => string;
}

export class FMLREPL {
  private editor: EditorView;
  private previewFrame: HTMLIFrameElement;
  private errorBadge: HTMLElement;
  private previewError: HTMLElement;
  private fileName: () => string;
  private currentCode: string = this.getDefaultCode();

  constructor(config: FMLREPLConfig) {
    this.previewFrame = config.previewFrame;
    this.errorBadge = config.errorBadge;
    this.previewError = config.previewError;
    this.fileName = config.fileName;

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
          EditorView.theme({
            "&": { "max-height": "300px" },
            ".cm-scroller": { overflow: "auto" },
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
  const [count, setCount] = createSignal(0);
)

Counter => (
  div class="p-4 bg-gray-100 rounded-lg text-center" (
    h1 class="text-2xl font-bold mb-4" $ "Hello world",
    p class="" $ [() => \`Counter: $\{count()\}\`],
    button onclick=[() => setCount(prev => prev + 1)] $ "Increment"
  )
)`;
  }

  private async renderPreview() {
    try {
      // Clear previous error
      this.errorBadge.classList.add("hidden");
      this.previewError.classList.add("hidden");
      this.previewError.textContent = "";

      // Get transpiled code (now can contain imports!)
      const transpiledCode = await this.transpileFML(
        this.fileName(),
        this.currentCode,
      );

      // ✅ Create full HTML page with transpiled code
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        </head>
        <body>
          <div id="app"></div>
          <script type="module">
let currentTracker= null;
const taskQueue = new Set();
let flushing = false;

function flush() {
  for (const sub of Array.from(taskQueue)) {
    taskQueue.delete(sub);
    try {
      sub.run();
    } catch (e) {
      console.error(e);
    }
  }
  flushing = false;
}

function schedule(sub) {
  taskQueue.add(sub);
  if (!flushing) {
    flushing = true;
    queueMicrotask(flush);
  }
}
                ${runtimeToString()}
              ${transpiledCode}
              
              // Mount the component
              const app = document.getElementById('app');
              const element = ${this.fileName()}(); // export default function
              
              if (element instanceof HTMLElement) {
                app.appendChild(element);
              } else if (typeof element === 'string') {
                app.innerHTML = element;
              }
          </script>
        </body>
        </html>
      `;

      console.log(`HTML: ${html}`);

      this.previewFrame.srcdoc = html;
    } catch (error) {
      this.showError(error as Error);
    }
  }

  private async transpileFML(fileName: string, fmlCode: string) {
    const response = await fetch("/api/transpile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: fmlCode, fileName }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      const errorText = await response.text();
      throw new Error(`Transpiler error (${response.status}): ${errorText}`);
    }

    const jsCode = result.code;
    return jsCode.replace(/from\s+['"]@\/?lib['"]/g, 'from "/lib/index"');
  }

  private showError(error: Error): void {
    this.errorBadge.classList.remove("hidden");
    this.previewError.classList.remove("hidden");
    this.previewError.textContent = `Error: ${error.message}\n\n${error.stack || ""}`;
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
