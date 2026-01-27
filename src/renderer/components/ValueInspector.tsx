import React, { useState } from 'react';
import { useI18n } from '../i18n';
import './ValueInspector.css';

interface ValueInspectorProps {
  value: unknown;
}

const ValueInspectorComponent: React.FC<ValueInspectorProps> = ({ value }) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  const renderValue = (val: unknown, path: string = '', depth: number = 0): React.ReactNode => {
    if (val === null) {
      return <span className="value-null">null</span>;
    }

    if (val === undefined) {
      return <span className="value-undefined">undefined</span>;
    }

    if (typeof val === 'string') {
      return <span className="value-string">&quot;{val}&quot;</span>;
    }

    if (typeof val === 'number') {
      return <span className="value-number">{val}</span>;
    }

    if (typeof val === 'boolean') {
      return <span className="value-boolean">{val ? 'true' : 'false'}</span>;
    }

    if (Array.isArray(val)) {
      const isExpanded = expanded.has(path);
      return (
        <div className="value-array">
          <span className="value-expand-toggle" onClick={() => toggleExpand(path)}>
            {isExpanded ? '▼' : '▶'} {t.valueInspector.array}({val.length})
          </span>
          {isExpanded && (
            <div className="value-children">
              {val.map((item, index) => (
                <div key={index} className="value-item">
                  <span className="value-key">[{index}]:</span>
                  {renderValue(item, `${path}[${index}]`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (typeof val === 'object') {
      const objVal = val as Record<string, unknown>;
      const isExpanded = expanded.has(path);
      const keys = Object.keys(objVal);
      return (
        <div className="value-object">
          <span className="value-expand-toggle" onClick={() => toggleExpand(path)}>
            {isExpanded ? '▼' : '▶'} {t.valueInspector.object}
            {keys.length > 0 ? ` {${keys.length}}` : ' {}'}
          </span>
          {isExpanded && (
            <div className="value-children">
              {keys.map((key) => (
                <div key={key} className="value-item">
                  <span className="value-key">{key}:</span>
                  {renderValue(objVal[key], `${path}.${key}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return <span className="value-unknown">{String(val)}</span>;
  };

  return (
    <div className="value-inspector-container">
      <div className="value-inspector-header">
        <span className="value-inspector-title">{t.valueInspector.title}</span>
      </div>
      <div className="value-inspector-content">{renderValue(value)}</div>
    </div>
  );
};

export const ValueInspector = React.memo(ValueInspectorComponent);
