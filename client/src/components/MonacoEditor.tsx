/**
 * Axiom Studio — Monaco Editor (ported from TrustGen)
 * Full Lume syntax highlighting + ecosystem theme.
 * DarkWave Studios LLC — Copyright 2026
 */
import { useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useSettings } from "../contexts/SettingsContext";

interface Props {
  value: string;
  language: string;
  onChange: (v: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

const LANG_MAP: Record<string, string> = {
  javascript: "javascript", typescript: "typescript", typescriptreact: "typescript",
  json: "json", html: "html", css: "css", markdown: "markdown", python: "python",
  rust: "rust", go: "go", yaml: "yaml", shell: "shell", sql: "sql", xml: "xml",
  lume: "lume", plaintext: "plaintext",
};

function getLang(file: string): string {
  if (file.endsWith(".tsx") || file.endsWith(".jsx")) return "typescript";
  if (file.endsWith(".ts")) return "typescript";
  if (file.endsWith(".js") || file.endsWith(".mjs")) return "javascript";
  if (file.endsWith(".json")) return "json";
  if (file.endsWith(".css")) return "css";
  if (file.endsWith(".html")) return "html";
  if (file.endsWith(".md")) return "markdown";
  if (file.endsWith(".lume")) return "lume";
  if (file.endsWith(".py")) return "python";
  if (file.endsWith(".yaml") || file.endsWith(".yml")) return "yaml";
  if (file.endsWith(".sql")) return "sql";
  return LANG_MAP[file] || file || "plaintext";
}

export { getLang };

export default function MonacoEditor({ value, language, onChange, onSave, readOnly = false }: Props) {
  const monacoRef = useRef<any>(null);
  const { settings } = useSettings();

  const handleMount = useCallback((editor: any, monaco: any) => {
    monacoRef.current = { editor, monaco };

    // Register Lume language
    if (!monaco.languages.getLanguages().some((l: any) => l.id === "lume")) {
      monaco.languages.register({ id: "lume", extensions: [".lume"], aliases: ["Lume"] });
      monaco.languages.setMonarchTokensProvider("lume", {
        tokenizer: {
          root: [
            [/\/\/.*$/, "comment"], [/#.*$/, "comment"],
            [/"([^"\\]|\\.)*"/, "string"], [/'([^'\\]|\\.)*'/, "string"], [/`([^`\\]|\\.)*`/, "string"],
            [/\b(ask|think|generate)\b/, "keyword.ai"],
            [/\b(fn|let|const|mut|if|else|while|for|in|return|import|from|as|type|struct|enum|match|try|catch|throw|async|await)\b/, "keyword"],
            [/\b(true|false|null)\b/, "keyword.literal"],
            [/\b(place|add|create|remove|delete|move|rotate|scale|animate|walk|pan|zoom|focus|orbit|narrate|render|publish|describe|set|environment|music)\b/, "keyword.english"],
            [/\b(string|number|bool|list|map|any|void|auto)\b/, "type"],
            [/\b\d+(\.\d+)?\b/, "number"],
            [/[a-zA-Z_]\w*(?=\s*\()/, "function"],
            [/[a-zA-Z_]\w*/, "identifier"],
            [/[{}()\[\]]/, "delimiter.bracket"], [/[;,.]/, "delimiter"],
            [/=>|->/, "operator"],
          ],
        },
      });
    }

    // Axiom Studio dark theme
    monaco.editor.defineTheme("axiom-dark", {
      base: "vs-dark", inherit: true,
      rules: [
        { token: "comment", foreground: "4a5568", fontStyle: "italic" },
        { token: "keyword", foreground: "22d3ee" },
        { token: "keyword.ai", foreground: "a78bfa", fontStyle: "bold" },
        { token: "keyword.english", foreground: "34d399", fontStyle: "italic" },
        { token: "keyword.literal", foreground: "14b8a6" },
        { token: "string", foreground: "34d399" },
        { token: "number", foreground: "22d3ee" },
        { token: "type", foreground: "06b6d4" },
        { token: "function", foreground: "a78bfa" },
        { token: "identifier", foreground: "e2e8f0" },
        { token: "operator", foreground: "22d3ee" },
        { token: "delimiter", foreground: "64748b" },
        { token: "delimiter.bracket", foreground: "94a3b8" },
      ],
      colors: {
        "editor.background": "#0a0b10",
        "editor.foreground": "#e2e8f0",
        "editor.lineHighlightBackground": "#0f1016",
        "editor.selectionBackground": "#06b6d430",
        "editorCursor.foreground": "#22d3ee",
        "editorGutter.background": "#080910",
        "editorLineNumber.foreground": "#334155",
        "editorLineNumber.activeForeground": "#06b6d4",
        "editorBracketMatch.background": "#06b6d420",
        "editorBracketMatch.border": "#06b6d4",
        "editorIndentGuide.activeBackground1": "#1a1b2e",
        "editorIndentGuide.background1": "#0f1016",
        "minimap.background": "#080910",
        "scrollbarSlider.background": "#06b6d420",
        "scrollbarSlider.hoverBackground": "#06b6d440",
      },
    });
    monaco.editor.setTheme("axiom-dark");

    // Ctrl+S save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (settings.editor.formatOnSave) {
        editor.getAction('editor.action.formatDocument').run().then(() => {
          onSave?.();
        });
      } else {
        onSave?.();
      }
    });
  }, [onSave, settings.editor.formatOnSave]);

  return (
    <Editor
      height="100%"
      language={getLang(language)}
      value={value}
      onChange={(v) => onChange(v || "")}
      onMount={handleMount}
      theme="axiom-dark"
      options={{
        automaticLayout: true,
        minimap: { enabled: settings.editor.minimap },
        fontSize: settings.appearance.fontSize, 
        lineNumbers: "on", roundedSelection: true,
        scrollBeyondLastLine: false, 
        wordWrap: settings.editor.wordWrap, 
        tabSize: settings.editor.tabSize,
        insertSpaces: true,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontLigatures: true, cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on", smoothScrolling: true,
        padding: { top: 12, bottom: 12 },
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        readOnly,
        renderWhitespace: "selection",
        suggest: { showKeywords: true, showSnippets: true },
      }}
      loading={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
          Loading editor...
        </div>
      }
    />
  );
}
