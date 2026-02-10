
import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './App.css';
import FileTree from './components/FileTree';
import Editor from './components/Editor';
import Terminal from './components/Terminal';
import { streamCode } from './utils/apiHandler';
import {
  createInitialState,
  insertNode,
  deleteNode,
  renameNode,
  updateFileContent,
  findNode,
  TYPE_FILE,
  TYPE_FOLDER
} from './utils/fileSystem';

const SyntaxGuide = () => (
  <details className="syntax-ref">
    <summary>&raquo; Syntax Cheat Sheet</summary>
    <div>
      <strong>Comments:</strong> <code># this is a comment</code><br />
      <strong>Statements end with <code>;</code>:</strong> <code>let</code>, expression statements, <code>print</code>, <code>return</code>, <code>break</code><br /><br />

      <strong>Variables:</strong> <code>let x = 10;</code> / <code>let y;</code> (sugar for <code>y = none;</code>)<br />
      <strong>Assignment:</strong> <code>x = x + 1;</code> / <code>xs[i] = 42;</code><br />
      <strong>Print:</strong> <code>print expr;</code><br />

      <strong>Blocks / Scope:</strong> <code>{'{ ... }'}</code><br />

      <strong>Conditionals:</strong> <code>if cond {'{ ... }'} else {'{ ... }'}</code><br />
      <strong>Loops:</strong>
      <ul>
        <li><code>while cond {'{ ... }'}</code></li>
        <li><code>for ( init ; cond ; inc ) {'{ ... }'}</code></li>
        <li><code>break;</code> (only inside loops)</li>
      </ul>

      <strong>Functions:</strong> <code>define add(a, b) {'{ return a + b; }'}</code><br />
      <strong>Return:</strong> <code>return expr;</code> or <code>return;</code> (returns <code>none</code>)<br />
      <strong>Lambdas:</strong> <code>let f = lambda(x) {'{ return x * x; }'};</code><br /><br />

      <strong>Types & literals:</strong> <code>none</code>, <code>true</code>, <code>false</code>, numbers (<code>123</code>, <code>3.14</code>), strings (<code>"hello"</code>)<br />

      <strong>Lists:</strong> <code>let xs = [1, 2, 3];</code> / <code>[]</code> (Index: <code>xs[0]</code>)<br />
      <strong>Truthiness:</strong> <code>false</code>, <code>none</code>, <code>0</code>, <code>0.0</code> are false; everything else is true<br /><br />

      <strong>Operators:</strong> <code>+ - * / %</code>, <code>&gt; &gt;= &lt; &lt;= == !=</code>, <code>and</code>, <code>or</code>, unary <code>!</code><br />

      <strong>Built-ins:</strong> <code>timeit()</code>, <code>abs(x)</code>, <code>len(xs)</code>, <code>copy(xs)</code>, <code>append(xs, v)</code>, <code>concat(a, b)</code><br />
      <strong>File I/O:</strong> <code>read("file.txt")</code>, <code>write("file.txt", "content")</code><br />
      <strong>Imports:</strong> <code>import("file.dingle");</code>
    </div>
  </details>
);

function App() {
  const [files, setFiles] = useState(createInitialState());
  const [activeFileId, setActiveFileId] = useState("root-main");
  const [selectedId, setSelectedId] = useState(null);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const wsRef = useRef(null);

  // Load from session storage
  useEffect(() => {
    const saved = sessionStorage.getItem('dinglebob_react_vfs_tree');
    if (saved) {
      try {
        setFiles(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load VFS", e);
      }
    }
  }, []);

  // Save to session storage
  useEffect(() => {
    sessionStorage.setItem('dinglebob_react_vfs_tree', JSON.stringify(files));
  }, [files]);

  // Refresh Warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Standard approach for modern browsers
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleSelectNode = (id) => {
    if (selectedId === id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);

    const node = findNode(files, id);
    if (node && node.type === TYPE_FILE) {
      setActiveFileId(id);
    }
  };

  const activeFileNode = findNode(files, activeFileId);
  const selectedNode = selectedId ? findNode(files, selectedId) : null;

  const handleCodeChange = (newCode) => {
    if (!activeFileId) return;
    setFiles(prev => updateFileContent(prev, activeFileId, newCode));
  };

  const handleRun = () => {
    if (isRunning) return; // Prevent double clicks

    setIsRunning(true);
    setOutput(""); // Clear previous output

    wsRef.current = streamCode(
      files,
      (data) => setOutput(prev => prev + data),
      (newTree) => {
        setFiles(newTree);
        setIsRunning(false);
        wsRef.current = null;

        // Try to re-select main.dingle if active ID is lost (UUIDs regenerate)
        const newMain = newTree.find(n => n.name === 'main.dingle');
        if (newMain) setActiveFileId(newMain.id);
        else setActiveFileId(null);
      },
      (errorMessage) => {
        setOutput(prev => prev + "\nError: " + errorMessage);
        setIsRunning(false);
        wsRef.current = null;
      }
    );
  };

  const handleStop = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setOutput(prev => prev + "\n[Stopped by User]");
      setIsRunning(false);
    }
  };
  const handleCreateFile = () => {
    const parentId = (selectedNode && selectedNode.type === TYPE_FOLDER) ? selectedNode.id : null;
    const name = prompt("Enter file name:");
    if (!name) return;

    const newNode = {
      id: uuidv4(),
      name: name,
      type: TYPE_FILE,
      content: ""
    };

    setFiles(prev => insertNode(prev, parentId, newNode));
    setActiveFileId(newNode.id);
    setSelectedId(newNode.id);
  };

  const handleCreateFolder = () => {
    const parentId = (selectedNode && selectedNode.type === TYPE_FOLDER) ? selectedNode.id : null;
    const name = prompt("Enter folder name:");
    if (!name) return;

    const newNode = {
      id: uuidv4(),
      name: name,
      type: TYPE_FOLDER,
      children: []
    };

    setFiles(prev => insertNode(prev, parentId, newNode));
    setSelectedId(newNode.id);
  };

  const handleDelete = (id) => {
    if (!confirm("Delete?")) return;
    setFiles(prev => deleteNode(prev, id));
    if (activeFileId === id) setActiveFileId(null);
    if (selectedId === id) setSelectedId(null);
  };

  const handleRename = (id) => {
    const node = findNode(files, id);
    if (!node) return;
    const newName = prompt("Rename to:", node.name);
    if (!newName || newName === node.name) return;

    setFiles(prev => renameNode(prev, id, newName));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <h1>DingleBob Playground</h1>
      <div className="intro-text" style={{ marginBottom: '10px' }}>
        Welcome! This is a playground for the <strong>DingleBob</strong> language.
      </div>
      <div className="links" style={{ marginBottom: '20px' }}>
        &raquo; <strong>Syntax Guide:</strong> <a href="https://github.com/poytaytoy/DingleBob/blob/main/SYNTAX.md" target="_blank">SYNTAX.md</a><br />
        &raquo; <strong>Repository:</strong> <a href="https://github.com/poytaytoy/DingleBob" target="_blank">github.com/poytaytoy/DingleBob</a>
      </div>

      <SyntaxGuide />

      <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Project Files:</div>

      <div style={{
        display: 'flex',
        border: '1px solid black',
        height: '500px',
        marginBottom: '20px'
      }}>
        {/* Sidebar */}
        <div style={{
          width: '200px',
          borderRight: '1px solid black',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#eee'
        }}>
          <div style={{ padding: '5px', display: 'flex', gap: '5px', borderBottom: '1px solid #ccc' }}>
            <button onClick={handleCreateFile} style={{ flex: 1, fontSize: '11px', padding: '2px 5px', height: '25px' }}>+File</button>
            <button onClick={handleCreateFolder} style={{ flex: 1, fontSize: '11px', padding: '2px 5px', height: '25px' }}>+Folder</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#fff' }}>
            <FileTree
              nodes={files}
              activeFileId={activeFileId}
              selectedId={selectedId}
              onSelect={handleSelectNode}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          </div>
        </div>

        {/* Editor & Terminal Split */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '5px 10px',
            backgroundColor: '#eee',
            borderBottom: '1px solid #ccc',
            fontSize: '13px',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>{activeFileNode ? activeFileNode.name : "No file open"}</span>
            <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#666' }}>
              {selectedNode ? `Selected: ${selectedNode.name}` : "Editing"}
            </span>
          </div>

          <div style={{ flex: 2, position: 'relative' }}>
            <Editor
              value={activeFileNode ? activeFileNode.content || "" : ""}
              onChange={handleCodeChange}
            />
          </div>

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            borderTop: '1px solid black',
            backgroundColor: '#fff'
          }}>
            <div style={{ padding: '5px 10px', backgroundColor: '#eee', fontSize: '12px', borderBottom: '1px solid #ccc', fontWeight: 'bold' }}>
              Output
            </div>
            <Terminal output={output} />
          </div>
        </div>
      </div>

      <div>
        <button id="run" onClick={handleRun} disabled={isRunning} style={{ marginTop: '0' }}>
          {isRunning ? 'Running...' : 'Run'}
        </button>
        {isRunning && (
          <button onClick={handleStop} style={{ marginTop: '0', marginLeft: '10px', backgroundColor: '#d32f2f' }}>
            Stop
          </button>
        )}
      </div>

    </div>
  );
}

export default App;
