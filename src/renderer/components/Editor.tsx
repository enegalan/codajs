import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import './Editor.css';
import { initializeEditorThemes, getMonacoThemeName } from '../utils/monaco-themes';

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  onExecute: () => void;
  onSave?: () => void;
  language?: 'javascript' | 'typescript';
  fontSize?: number;
  theme?: string;
}

export const Editor: React.FC<EditorProps> = ({
  code,
  onChange,
  onExecute,
  onSave,
  language = 'javascript',
  fontSize = 14,
  theme = 'dark',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const isSettingValueRef = useRef(false);

  // Use refs to hold the latest callbacks to avoid stale closures
  const onChangeRef = useRef(onChange);
  const onExecuteRef = useRef(onExecute);
  const onSaveRef = useRef(onSave);

  // Keep refs updated with latest callbacks
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onExecuteRef.current = onExecute;
  }, [onExecute]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    initializeEditorThemes();

    const monacoTheme = getMonacoThemeName(theme);

    // Create editor with JavaScript language and IntelliSense enabled
    const editor = monaco.editor.create(editorRef.current, {
      value: code,
      language: language,
      theme: monacoTheme,
      automaticLayout: true,
      minimap: {
        enabled: false,
      },
      fontSize: fontSize,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      renderLineHighlight: 'none',
      // Enable IntelliSense features
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      codeLens: false,
      links: true,
      colorDecorators: true,
      hover: {
        enabled: true,
        delay: 300,
      },
      parameterHints: {
        enabled: true,
      },
      formatOnPaste: false,
      formatOnType: false,
      suggest: {
        showKeywords: true,
        showSnippets: true,
        showClasses: true,
        showFunctions: true,
        showVariables: true,
        showModules: true,
        showProperties: true,
        showValues: true,
        showWords: true,
        showColors: true,
        showFiles: true,
        showReferences: true,
        showFolders: true,
        showTypeParameters: true,
        showIssues: true,
        showUsers: true,
        showOperators: true,
      },
    });

    monacoEditorRef.current = editor;

    editor.onDidChangeModelContent(() => {
      if (isSettingValueRef.current) {
        return;
      }
      const value = editor.getValue();
      onChangeRef.current(value);
    });

    // Add keyboard shortcut for execution (Cmd/Ctrl + Enter)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onExecuteRef.current();
    });

    // Add keyboard shortcut for save (Cmd/Ctrl + S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSaveRef.current) {
        onSaveRef.current();
      }
    });

    return () => {
      editor.dispose();
    };
  }, []);

  useEffect(() => {
    if (monacoEditorRef.current && monacoEditorRef.current.getValue() !== code) {
      const position = monacoEditorRef.current.getPosition();
      const scrollTop = monacoEditorRef.current.getScrollTop();
      isSettingValueRef.current = true;
      monacoEditorRef.current.setValue(code);
      isSettingValueRef.current = false;
      if (position) {
        monacoEditorRef.current.setPosition(position);
      }
      monacoEditorRef.current.setScrollTop(scrollTop);
    }
  }, [code]);

  useEffect(() => {
    if (monacoEditorRef.current) {
      monacoEditorRef.current.updateOptions({
        fontSize: fontSize,
      });
    }
  }, [fontSize]);

  useEffect(() => {
    if (monacoEditorRef.current) {
      monaco.editor.setTheme(getMonacoThemeName(theme));
    }
  }, [theme]);

  useEffect(() => {
    if (monacoEditorRef.current) {
      const model = monacoEditorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  // Listen for menu commands
  useEffect(() => {
    const handleEditorCommand = (event: CustomEvent<string>) => {
      const editor = monacoEditorRef.current;
      if (!editor) {
        return;
      }

      const command = event.detail;
      switch (command) {
        case 'deleteAll':
          editor.setValue('');
          break;
        case 'find':
          editor.getAction('actions.find')?.run();
          break;
        case 'replace':
          editor.getAction('actions.replace')?.run();
          break;
        case 'commentLine':
          editor.getAction('editor.action.commentLine')?.run();
          break;
        case 'blockComment':
          editor.getAction('editor.action.blockComment')?.run();
          break;
        case 'format':
          editor.getAction('editor.action.formatDocument')?.run();
          break;
        default:
          break;
      }
    };

    const handleFormatCode = () => {
      const editor = monacoEditorRef.current;
      if (editor) {
        editor.getAction('editor.action.formatDocument')?.run();
      }
    };

    window.addEventListener('menu:editor-command', handleEditorCommand as EventListener);
    window.addEventListener('menu:format-code', handleFormatCode);

    return () => {
      window.removeEventListener('menu:editor-command', handleEditorCommand as EventListener);
      window.removeEventListener('menu:format-code', handleFormatCode);
    };
  }, []);

  return <div ref={editorRef} className="editor-container" />;
};
