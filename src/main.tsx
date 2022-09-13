import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import editorWorker from "../../cadl-azure/core/packages/playground/node_modules/monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "../../cadl-azure/core/packages/playground/node_modules/monaco-editor/esm/vs/language/json/json.worker?worker";
import "./style.css";
(self as any).MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === "json") {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
