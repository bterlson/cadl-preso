import { useEffect, useState, useMemo, FunctionComponent, useCallback } from 'react'
import { CadlEditor } from "../../cadl-azure/core/packages/playground/src/components/cadl-editor";
import { useMonacoModel } from "../../cadl-azure/core/packages/playground/src/components/editor";
import { attachServices } from "../../cadl-azure/core/packages/playground/src/services";
import { createBrowserHost } from "../../cadl-azure/core/packages/playground/src/browser-host";
import { importCadlCompiler } from "../../cadl-azure/core/packages/playground/src/core";
import { editor, KeyCode, KeyMod, MarkerSeverity, Uri } from "../../cadl-azure/core/packages/playground/node_modules/monaco-editor";
import { Program } from "@cadl-lang/compiler";
import type { CompletionItemTag } from "../../cadl-azure/core/packages/playground/node_modules/vscode-languageserver";
import { PlaygroundManifest } from "./manifest";
import { OpenAPIOutput } from "../../cadl-azure/core/packages/playground/src/components/openapi-output";
import { OutputTabs, Tab } from "../../cadl-azure/core/packages/playground/src/components/output-tabs";

const host = await createBrowserHost();
await attachServices(host);

import Reveal from 'reveal.js';

function App() {
  const cadlModel = useMonacoModel("inmemory://test/main.cadl", "cadl");
  const [outputFiles, setOutputFiles] = useState<string[]>([]);
  const [program, setProgram] = useState<Program>();
  const [internalCompilerError, setInternalCompilerError] = useState<any>();
  editor.EditorOptions.fontSize.defaultValue = 20;
  useEffect(() => {
    Reveal.initialize({disableLayout: true });
    Reveal.on('slidechanged', event => {
      (document as any).activeElement.blur();
      const sample = event.currentSlide.getAttribute("data-code-sample");
      if (sample) {
        cadlModel.setValue(codeSamples[sample])
      } else {
        cadlModel.setValue("");
      }
    })
  }, []);

  useEffect(() => {
    cadlModel.onDidChangeContent(() => doCompile(cadlModel.getValue()));
  }, [cadlModel]);

  async function doCompile(content: string) {
    await host.writeFile("main.cadl", content);
    await emptyOutputDir();
    const cadlCompiler = await importCadlCompiler();
    try {
      const program = await cadlCompiler.compile("main.cadl", host, {
        outputPath: "cadl-output",
        emitters: { [PlaygroundManifest.defaultEmitter]: {} },
      });
      setInternalCompilerError(undefined);
      setProgram(program);
      console.log(program.diagnostics);
      const markers: editor.IMarkerData[] = program.diagnostics.map((diag) => ({
        ...getMarkerLocation(cadlCompiler, diag.target),
        message: diag.message,
        severity: diag.severity === "error" ? MarkerSeverity.Error : MarkerSeverity.Warning,
        tags: diag.code === "deprecated" ? [CompletionItemTag.Deprecated] : undefined,
      }));

      editor.setModelMarkers(cadlModel, "owner", markers ?? []);

      const outputFiles = await host.readDir("./cadl-output");
      setOutputFiles(outputFiles);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Internal compiler error", error);
      editor.setModelMarkers(cadlModel, "owner", []);
      setProgram(undefined);
      setInternalCompilerError(error);
    }
  }
  
  async function emptyOutputDir() {
    // empty output directory
    const dirs = await host.readDir("./cadl-output");
    for (const file of dirs) {
      const path = "./cadl-output/" + file;
      const uri = Uri.parse(host.pathToFileURL(path));
      const model = editor.getModel(uri);
      if (model) {
        model.dispose();
      }
      await host.unlink(path);
    }
  }

  function getMarkerLocation(
    cadlCompiler: typeof import("@cadl-lang/compiler"),
    target: DiagnosticTarget | typeof NoTarget
  ): Pick<editor.IMarkerData, "startLineNumber" | "startColumn" | "endLineNumber" | "endColumn"> {
    const loc = cadlCompiler.getSourceLocation(target);
    if (loc === undefined || loc.file.path != "/test/main.cadl") {
      return {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      };
    }
    const start = loc.file.getLineAndCharacterOfPosition(loc.pos);
    const end = loc.file.getLineAndCharacterOfPosition(loc.end);
    return {
      startLineNumber: start.line + 1,
      startColumn: start.character + 1,
      endLineNumber: end.line + 1,
      endColumn: end.character + 1,
    };
  }

  const cadlEditorCommands = useMemo(
    () => [
      // ctrl/cmd+S => save
      { binding: KeyMod.CtrlCmd | KeyCode.LeftArrow, handle: () => {Reveal.prev()} },
      { binding: KeyMod.CtrlCmd | KeyCode.RightArrow, handle: () => {Reveal.next()} },
    ],
    []
  );

  return (
    <div className="reveal">
      <div className="slides">
        <section className="flex-col middle">
          <div className="title">
            <h2 className="subtitle">Azure Developer Division</h2>
            <h1>API-First Services with Cadl</h1>
          </div>
          <p>
            Brian Terlson<br />
            Principal Architect<br />
            @bterlson
          </p>
        </section>
        <section className="flex-col middle center">
          <h1>Disclaimer: Cadl is under construction!</h1>
          <div>
            <div>
            <img src="/uc2.gif" /><img src="/uc2.gif" /><img src="/uc1.gif" />
            <img src="/uc2.gif" /><img src="/uc2.gif" />
            </div>
            <h2>Your feedback is important!</h2>
          </div>
        </section>
        <section>
          <section className="flex-col middle center">
            <h1>Why Cadl?</h1>
          </section>
          <section className="flex-col middle center">
            <h1>Azure struggles with API design at scale</h1>
            <h2 className="fragment">How to ensure APIs are consistent?</h2>
            <h2 className="fragment">How to ensure APIs meet guidelines?</h2>
            <h2 className="fragment">How to leverage existing work?</h2>
            <h2 className="fragment">How to use the same data shapes across many services and protocols?</h2>
          </section>
          <section className="flex-col middle center">
            <div style={{backgroundImage: "url('/mando.webp')", width:1200, height: 700, backgroundSize: "1200px 700px"}}>
              <h2 style={{textAlign: "left", color: "white", padding: "100px 50px"}}>API First is the way</h2>
            </div>
          </section>
        </section>
        <section>
          <section className="flex-col middle">
            <h1>Say Hi to Cadl!</h1>
            <div>
              <h2><a href="https://github.com/microsoft/cadl">github.com/microsoft/cadl</a></h2>
              <p>GitHub repo - documentation, report bugs, send pull requests</p>
            </div>
            <div>
              <h2><a href="https://aka.ms/trycadl">https://aka.ms/trycadl</a></h2>
              <p>Run Cadl and emit OpenAPI 3, all in your browser</p>
            </div>
          </section>
          <section className="flex-col middle center">
            <h1>Cadl makes API first productive and fun</h1>
          </section>
          <section className="flex-col middle center">
            <h1>Cadl 💖 OpenAPI</h1>
            <h2>Cadl emits standards compliant OpenAPI 3</h2>
            <h4>(we even have an OA2 + custom extensions emitter internally)</h4>
          </section>
          <section className="flex-col middle center">
            <h1>Cadl syntax is familiar</h1>
            <h2>Anyone familiar with OO languages can learn it quickly</h2>
          </section>
          <section className="flex-col middle center">
            <h1>Cadl is expressive</h1>
            <h2>Cadl programs are typically much shorter than other description languages</h2>
          </section>
          <section className="flex-col middle center">
            <h1>Cadl is extensible</h1>
            <h2>Define HTTP services, gRPC services, or anything else.</h2>
            <h2 className="fragment">It can be customized with your own metadata</h2>
            <h2 className="fragment">It can emit service specifications, emit implementation code, documentation, etc.</h2>
          </section>
          <section className="flex-col middle">
            <h1>Cadl is toolable</h1>
            <h2>Language service with support for VS &amp; VSCode</h2>
            <ul>
              <li>go-to-definition</li>
              <li>member completions</li>
              <li>rename refactoring</li>
              <li>symbol explorer</li>
              <li>custom lint rules</li>
            </ul>
          </section>
          <section className="flex-col middle center">
            <h1>Cadl is composable</h1>
            <h2>Abstract common patterns into components and share them across your team, organization, or the entire ecosystem.</h2>
            <h2>Build services from re-usable building blocks</h2>
          </section>
        </section>
        <section style={{textAlign: "left", height: "100vh"}} data-code-sample="basic">
          <h1>Cadl Basics</h1>
          <div className="editor">
            <div className="cadl-editor-container">
              <CadlEditor model={cadlModel} commands={cadlEditorCommands} style={{width: "50%"}} />
            </div>
            <div className="output-panel">
              <OutputView
                program={program}
                outputFiles={outputFiles}
                internalCompilerError={internalCompilerError}
              />
            </div>
          </div>

          <aside className="notes">
            Walk through:
              Modules
              Namespaces
              Decorators
              Models
              Interfaces
              Operations
            
            Then:
              Add an enum
          </aside>
        </section>
        <section style={{textAlign: "left", overflow: "hidden"}} data-code-sample="composition">
          <h1>Cadl Libraries &amp; Composition</h1>
          <div className="editor" style={{overflow: "hidden"}}>
            <div className="cadl-editor-container">
              <CadlEditor model={cadlModel} commands={cadlEditorCommands} style={{width: "50%"}} />
            </div>
            <div className="output-panel">
              <OutputView
                program={program}
                outputFiles={outputFiles}
                internalCompilerError={internalCompilerError}
              />
            </div>
          </div>
          <aside className="notes">
            Walk through:
              The resource abstraction
              Point out how this is just like, cadl's opinion man. You could have your own convention here!
          </aside>
        </section>
        <section style={{textAlign: "left", overflow: "hidden"}} data-code-sample="othercomp">
          <h1>More Cadl Composition</h1>
          <div className="editor" style={{overflow: "hidden"}}>
            <div className="cadl-editor-container">
              <CadlEditor model={cadlModel} commands={cadlEditorCommands} style={{width: "50%"}} />
            </div>
            <div className="output-panel">
              <OutputView
                program={program}
                outputFiles={outputFiles}
                internalCompilerError={internalCompilerError}
              />
            </div>
          </div>
          <aside className="notes">
            Walk through:
              Spread
              Extends
              Templates
          </aside>
        </section>
        <section className="flex-col center middle">
          <h1>Demo: Cadl &amp; Spectral</h1>
        </section>
        <section className="flex-col center middle">
          <h1>Cadl is a work in progress</h1>
          <h2>Try it out, give feedback 💖</h2>
        </section>
        <section className="flex-col center middle">
          <h1>Cadl Playground</h1>
          <h2><a href="aka.ms/trycadl">aka.ms/trycadl</a></h2>
        </section>
        <section className="flex-col center middle">
          <h1>GitHub</h1>
          <h2><a href="https://github.com/microsoft/cadl">github.com/microsoft/cadl</a></h2>
        </section>
        <section className="flex-col center middle">
          <h1>Thank you!</h1>
          <h2>Please talk to me after!</h2>
        </section>
      </div>
    </div>
  )
}

export default App

export interface OutputViewProps {
  outputFiles: string[];
  internalCompilerError?: any;
  program: Program | undefined;
}

export const OutputView: FunctionComponent<OutputViewProps> = (props) => {
  const [viewSelection, setViewSelection] = useState<ViewSelection>({
    type: "file",
    filename: "",
    content: "",
  });

  useEffect(() => {
    if (viewSelection.type === "file") {
      if (props.outputFiles.length > 0) {
        void loadOutputFile(props.outputFiles[0]);
      } else {
        setViewSelection({ type: "file", filename: "", content: "" });
      }
    }
  }, [props.program, props.outputFiles]);

  async function loadOutputFile(path: string) {
    const contents = await host.readFile("./cadl-output/" + path);
    setViewSelection({ type: "file", filename: path, content: contents.text });
  }

  const diagnostics = props.program?.diagnostics;
  const tabs: Tab[] = useMemo(() => {
    return [
      ...props.outputFiles.map(
        (x): Tab => ({
          align: "left",
          name: x,
          id: x,
        })
      ),
      { id: "type-graph", name: "Type Graph", align: "right" },
      {
        id: "errors",
        name: (
          <ErrorTabLabel
            internalCompilerError={props.internalCompilerError}
            diagnostics={diagnostics}
          />
        ),
        align: "right",
      },
    ];
  }, [props.outputFiles, diagnostics, props.internalCompilerError]);
  const handleTabSelection = useCallback((tabId: string) => {
    if (tabId === "type-graph") {
      setViewSelection({ type: "type-graph" });
    } else if (tabId === "errors") {
      setViewSelection({ type: "errors" });
    } else {
      void loadOutputFile(tabId);
    }
  }, []);
  const content =
    viewSelection.type === "file" ? (
      <OpenAPIOutput content={viewSelection.content} />
    ) : <ErrorTab internalCompilerError={props.internalCompilerError} diagnostics={diagnostics} />;
  return (
    <>
      <OutputTabs
        tabs={tabs}
        selected={viewSelection.type === "file" ? viewSelection.filename : viewSelection.type}
        onSelect={handleTabSelection}
      />
      <div className="output-content">{content}</div>
    </>
  );
};

type ViewSelection =
  | { type: "file"; filename: string; content: string }
  | { type: "type-graph" }
  | { type: "errors" };

const ErrorTabLabel: FunctionComponent<{
  internalCompilerError?: any;
  diagnostics?: readonly Diagnostic[];
}> = ({ internalCompilerError, diagnostics }) => {
  const errorCount = (internalCompilerError ? 1 : 0) + (diagnostics ? diagnostics.length : 0);
  return (
    <div>Errors {errorCount > 0 ? <span className="error-tab-count">{errorCount}</span> : ""}</div>
  );
};


const codeSamples: Record<string, string> = {
  "basic":
`import "@cadl-lang/rest";

@serviceTitle("Widget Service")
namespace DemoService;
using Cadl.Http;

model Widget {
  @key id: string;
  weight: int32;
}

@error
model Error {
  code: int32;
  message: string;
}

@route("/widgets")
interface WidgetService {
  @get list(): Widget[] | Error;
  @get read(@path id: string): Widget | Error;
  @post create(@body body: Widget): Widget | Error;
}`,
  composition:
`import "@cadl-lang/rest";

@serviceTitle("Widget Service")
namespace DemoService;

using Cadl.Http;
using Cadl.Rest;

model Widget {
  @key id: string;
  weight: int32;
  color: "red" | "blue";
}

@error
model Error {
  code: int32;
  message: string;
}

interface WidgetService extends Resource.ResourceOperations<Widget, Error> {}`,
 othercomp:
`import "@cadl-lang/rest";

@serviceTitle("Widget Service")
namespace DemoService;

using Cadl.Http;
model Widget {
  @key id: string;
  weight: int32;
}

// extends
model MyWidget extends Widget {
  color: "red" | "blue"
}

// spread
model MyWidget2 {
  ...Widget;
  color: "red" | "blue";
}

// templates
model WidgetEnvelope<TWidget extend Widget> {
  address: string;
  widget: TWidget;
}

model CustomTProp is WidgetEnvelope<Widget2>;

@error
model Error {
  code: int32;
  message: string;
}

@route("/widgets")
interface WidgetService {
  @get list(): Widget[] | Error;
  @get read(@path id: string): MyWidget2 | Error;
  @post create(@body body: Widget): CustomTProp | Error;
}`,
  e2edemo:
`import "@cadl-lang/rest";
import "cadl-data-store";
import "cadl-azure-static-web-app";
import "cadl-use";
import "cadl-azure-functions";

using Cadl.Http;

@serviceTitle("Demo")
namespace DemoApp;

@store("dbName")
model Comment {
  @key
  @visibility("read")
  id: string;

  contents: string;

  @visibility("read")
  sentiment: string;
}

@withVisibility("write")
model CommentRequest {
  ... Comment
};

@AzureFunction
@use("Microsoft.KeyVault.Secrets.getSecret")
@use("Azure.AI.TextAnalytics.Sentiment.analyzeSentiment")
@route("/comments")
interface Comments {
  @post op createComment(@body comment: CommentRequest): OkResponse<Comment>;
  @get op getComment(@path id: string): OkResponse<Comment>;
  @get op listComments(): OkResponse<Comment[]>;
}

@AzureStaticWebApp
@use(Comments)
interface Static { }`
}