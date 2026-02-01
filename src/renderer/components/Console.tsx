import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { LogEntry } from '../../shared/types';
import { CONSOLE_DEFAULTS } from '../constants';
import { getMonacoThemeName } from '../utils/monaco-themes';
import {
  consoleOutputToTextAndDecorations,
  type ConsoleDecoration,
} from '../utils/consoleOutputDecorations';
import { registerConsoleFoldingProvider } from '../utils/consoleFoldingProvider';
import './Console.css';

interface ConsoleProps {
  output: LogEntry[];
  fontSize?: number;
  visible?: boolean;
  theme?: string;
}

const ConsoleComponent: React.FC<ConsoleProps> = ({
  output,
  fontSize = CONSOLE_DEFAULTS.FONT_SIZE,
  visible = true,
  theme = 'dark',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const foldingDisposableRef = useRef<monaco.IDisposable | null>(null);

  useEffect(() => {
    if (!containerRef.current || !visible) {
      return;
    }

    const monacoTheme = getMonacoThemeName(theme);
    foldingDisposableRef.current = registerConsoleFoldingProvider();

    const editor = monaco.editor.create(containerRef.current, {
      value: '',
      language: 'plaintext',
      theme: monacoTheme,
      readOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      renderLineHighlight: 'none',
      folding: true,
      showFoldingControls: 'always',
    });

    editorRef.current = editor;

    return () => {
      foldingDisposableRef.current?.dispose();
      foldingDisposableRef.current = null;
      editor.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fontSize/theme updated in separate effects
  }, [visible]);

  useEffect(() => {
    if (!editorRef.current) return;
    const { text, decorations } =
      output.length === 0
        ? { text: '', decorations: [] as ConsoleDecoration[] }
        : consoleOutputToTextAndDecorations(output);
    const model = editorRef.current.getModel();
    if (model) {
      const current = model.getValue();
      if (current !== text) {
        model.setValue(text);
        requestAnimationFrame(() => {
          editorRef.current?.getAction('editor.foldAll')?.run();
        });
      }
      const monacoDecorations = decorations.map(
        (d: ConsoleDecoration): monaco.editor.IModelDeltaDecoration => ({
          range: new monaco.Range(d.line, d.startCol, d.line, d.endCol),
          options: {
            inlineClassName: `console-token-${d.type}`,
          },
        })
      );
      decorationIdsRef.current = editorRef.current.deltaDecorations(
        decorationIdsRef.current,
        monacoDecorations
      );
    }
  }, [output]);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({ fontSize });
  }, [fontSize]);

  useEffect(() => {
    if (!editorRef.current) return;
    monaco.editor.setTheme(getMonacoThemeName(theme));
  }, [theme]);

  if (!visible) {
    return null;
  }

  return (
    <div className="console-container">
      <div
        ref={containerRef}
        className="console-output console-monaco"
        style={{ fontSize: `${fontSize}px` }}
      />
    </div>
  );
};

export const Console = React.memo(ConsoleComponent);
