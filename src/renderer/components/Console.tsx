import React from 'react';
import { LogEntry } from '../../shared/types';
import { CONSOLE_DEFAULTS } from '../constants';
import { useI18n } from '../i18n';
import './Console.css';

interface ConsoleProps {
  output: LogEntry[];
  fontSize?: number;
  visible?: boolean;
}

const ConsoleComponent: React.FC<ConsoleProps> = ({
  output,
  fontSize = CONSOLE_DEFAULTS.FONT_SIZE,
  visible = true,
}) => {
  const { t } = useI18n();

  // Group consecutive entries from the same line
  const groupedOutput = React.useMemo(() => {
    const groups: Array<{ entries: LogEntry[]; line?: number; level: string; type: string }> = [];

    for (const entry of output) {
      const lastGroup = groups[groups.length - 1];

      // Group entries if they have the same line number and it's defined
      if (
        lastGroup &&
        entry.line != null &&
        lastGroup.line === entry.line &&
        lastGroup.type === entry.type
      ) {
        lastGroup.entries.push(entry);
        // Escalate level: error > warn > info
        if (entry.level === 'error') {
          lastGroup.level = 'error';
        } else if (entry.level === 'warn' && lastGroup.level !== 'error') {
          lastGroup.level = 'warn';
        }
      } else {
        groups.push({
          entries: [entry],
          line: entry.line,
          level: entry.level,
          type: entry.type,
        });
      }
    }

    return groups;
  }, [output]);

  if (!visible) {
    return null;
  }

  const formatValue = (value: unknown): string => {
    if (value === null) {
      return 'null';
    }
    if (value === undefined) {
      return 'undefined';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      try {
        const items = value.map((v) => formatValue(v));
        return `[${items.join(', ')}]`;
      } catch {
        return String(value);
      }
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const formatMessage = (message: unknown): string => {
    // Handle array of arguments from console.log(a, b, c)
    if (Array.isArray(message)) {
      return message.map((arg) => formatValue(arg)).join(' ');
    }
    return formatValue(message);
  };

  const getLevelClass = (level: string, type: string): string => {
    if (type === 'result') {
      return 'console-entry-result';
    }
    switch (level) {
      case 'error':
        return 'console-entry-error';
      case 'warn':
        return 'console-entry-warn';
      default:
        return 'console-entry-info';
    }
  };

  const renderGroup = (
    group: { entries: LogEntry[]; line?: number; level: string; type: string },
    index: number
  ) => {
    // Concatenate all messages from entries in this group
    const message = group.entries.map((entry) => formatMessage(entry.message)).join(' ');
    const levelClass = getLevelClass(group.level, group.type);

    // For errors with multi-line messages, render each line
    if (message.includes('\n')) {
      const lines = message.split('\n');
      return (
        <div key={index} className={`console-entry console-entry-multiline ${levelClass}`}>
          {lines.map((line, lineIndex) => (
            <div key={lineIndex} className="console-entry-line">
              <span className="console-line-number">{lineIndex + 1}</span>
              <span className="console-message">{line}</span>
            </div>
          ))}
        </div>
      );
    }

    // Regular single-line entry
    // If message is empty and we have a line number, show only the line number
    const isEmpty = !message || message.trim() === '';
    return (
      <div key={index} className={`console-entry ${levelClass}`}>
        {group.line != null && <span className="console-line-number">{group.line}</span>}
        {!isEmpty && (
          <span className="console-message">
            {group.type === 'result' && <span className="console-arrow"> </span>}
            {message}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="console-container">
      <div className="console-output" style={{ fontSize: `${fontSize}px` }}>
        {groupedOutput.length === 0 ? (
          <div className="console-empty">{t.console.noOutput}</div>
        ) : (
          groupedOutput.map((group, index) => renderGroup(group, index))
        )}
      </div>
    </div>
  );
};

export const Console = React.memo(ConsoleComponent);
