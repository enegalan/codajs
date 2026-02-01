import * as monaco from 'monaco-editor';

const CONSOLE_LANGUAGE_ID = 'plaintext';

function getIndent(line: string): number {
  let i = 0;
  while (i < line.length && line[i] === ' ') i++;
  return i;
}

function trimLine(line: string): string {
  return line.trimEnd().trimStart();
}

/**
 * Returns folding ranges for console output: only nested blocks (contained in another
 * block) are foldable, so the first level stays visible and only inner blocks collapse.
 */
function computeFoldingRanges(model: monaco.editor.ITextModel): monaco.languages.FoldingRange[] {
  const allRanges: monaco.languages.FoldingRange[] = [];
  const lineCount = model.getLineCount();
  const stack: Array<{ line: number; indent: number; char: '}' | ']' }> = [];

  for (let i = 1; i <= lineCount; i++) {
    const raw = model.getLineContent(i);
    const indent = getIndent(raw);
    const trimmed = trimLine(raw);

    if (trimmed.endsWith(' {')) {
      stack.push({ line: i, indent, char: '}' });
      continue;
    }
    if (trimmed.endsWith(' [')) {
      stack.push({ line: i, indent, char: ']' });
      continue;
    }

    if (trimmed === '}' || trimmed === ']') {
      const top = stack[stack.length - 1];
      if (top && top.indent === indent && trimmed === top.char) {
        stack.pop();
        if (i > top.line + 1) {
          allRanges.push({ start: top.line, end: i });
        }
      }
    }
  }

  const isContainedIn = (
    inner: monaco.languages.FoldingRange,
    outer: monaco.languages.FoldingRange
  ): boolean => outer.start < inner.start && outer.end > inner.end;

  return allRanges.filter((r) => allRanges.some((other) => r !== other && isContainedIn(r, other)));
}

export function registerConsoleFoldingProvider(): monaco.IDisposable {
  return monaco.languages.registerFoldingRangeProvider(CONSOLE_LANGUAGE_ID, {
    provideFoldingRanges(
      model: monaco.editor.ITextModel,
      _context: monaco.languages.FoldingContext
    ): monaco.languages.FoldingRange[] {
      void _context;
      return computeFoldingRanges(model);
    },
  });
}
