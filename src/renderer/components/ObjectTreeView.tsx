import React, { useState } from 'react';
import './ObjectTreeView.css';

export type InspectedNode =
  | string
  | number
  | boolean
  | null
  | { __type: 'undefined' }
  | { __type: 'function'; name: string }
  | { __type: 'symbol'; description: string }
  | { __type: 'circular'; name: string }
  | { __type: 'maxDepth' }
  | { __type: 'object'; name: string; props: Record<string, InspectedNode> }
  | { __type: 'array'; length: number; items: InspectedNode[] }
  | { __type: 'getter' }
  | { __type: 'error'; message: string }
  | { __type: 'truncated'; count: number };

function isInspectedObject(value: unknown): value is { __type: string } {
  return (
    value !== null && typeof value === 'object' && '__type' in (value as Record<string, unknown>)
  );
}

interface ObjectTreeViewProps {
  node: InspectedNode;
  depth?: number;
  defaultCollapsed?: boolean;
  keyName?: string;
}

const ObjectTreeViewComponent: React.FC<ObjectTreeViewProps> = ({
  node,
  depth = 0,
  defaultCollapsed = false,
  keyName,
}) => {
  const [expanded, setExpanded] = useState(depth === 0 ? !defaultCollapsed : false);

  const renderPrimitive = (value: string | number | boolean | null): React.ReactNode => {
    if (value === null) return <span className="object-tree-null">null</span>;
    if (value === undefined) return <span className="object-tree-undefined">undefined</span>;
    if (typeof value === 'string') {
      return <span className="object-tree-string">&apos;{value}&apos;</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="object-tree-boolean">{String(value)}</span>;
    }
    return <span className="object-tree-number">{String(value)}</span>;
  };

  const renderPreview = (): React.ReactNode => {
    if (node === null) return renderPrimitive(null);
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
      return renderPrimitive(node);
    }
    if (!isInspectedObject(node)) return String(node);

    switch (node.__type) {
      case 'undefined':
        return <span className="object-tree-undefined">undefined</span>;
      case 'function':
        return <span className="object-tree-function">ƒ {node.name}()</span>;
      case 'symbol':
        return (
          <span className="object-tree-symbol">
            Symbol({node.description ? <>&apos;{node.description}&apos;</> : ''})
          </span>
        );
      case 'circular':
        return <span className="object-tree-circular">[Circular: {node.name}]</span>;
      case 'maxDepth':
        return <span className="object-tree-maxDepth">[Max depth]</span>;
      case 'getter':
        return <span className="object-tree-getter">[Getter]</span>;
      case 'error':
        return <span className="object-tree-error">[Error: {node.message}]</span>;
      case 'truncated':
        return <span className="object-tree-truncated">... {node.count} more items</span>;
      case 'object': {
        const keys = Object.keys(node.props);
        const preview = `${node.name} { ${keys.length ? '...' : ''} }`;
        return <span className="object-tree-object-preview">{preview}</span>;
      }
      case 'array':
        return (
          <span className="object-tree-array-preview">
            Array({node.length}) [ {node.items && node.items.length ? '...' : ''} ]
          </span>
        );
      default:
        return String(node);
    }
  };

  const toggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  if (!isInspectedObject(node) || (node.__type !== 'object' && node.__type !== 'array')) {
    return (
      <span className="object-tree-leaf">
        {keyName != null && (
          <>
            <span className="object-tree-key">{keyName}: </span>
          </>
        )}
        {renderPreview()}
      </span>
    );
  }

  if (node.__type === 'object') {
    const props = 'props' in node && node.props && typeof node.props === 'object' ? node.props : {};
    const keys = Object.keys(props);
    const hasChildren = keys.length > 0;
    return (
      <div className="object-tree-node">
        <div
          className="object-tree-line"
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle(e);
            }
          }}
          role="button"
          tabIndex={0}
        >
          {keyName != null && <span className="object-tree-key">{keyName}: </span>}
          <span className="object-tree-toggle" aria-hidden>
            {expanded ? '▼' : '▶'}
          </span>
          <span className="object-tree-object-preview">
            {node.name} {'{'} {expanded && hasChildren ? '' : hasChildren ? '...' : ''} {'}'}
          </span>
        </div>
        {expanded && (
          <div className="object-tree-children">
            {hasChildren ? (
              keys.map((key) => (
                <div key={key} className="object-tree-child">
                  <ObjectTreeViewComponent
                    node={props[key]}
                    depth={depth + 1}
                    defaultCollapsed={true}
                    keyName={key}
                  />
                </div>
              ))
            ) : (
              <div className="object-tree-child object-tree-empty">No properties</div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (node.__type === 'array') {
    const items = node.items || [];
    return (
      <div className="object-tree-node">
        <div
          className="object-tree-line"
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle(e);
            }
          }}
          role="button"
          tabIndex={0}
        >
          {keyName != null && <span className="object-tree-key">{keyName}: </span>}
          <span className="object-tree-toggle" aria-hidden>
            {expanded ? '▼' : '▶'}
          </span>
          <span className="object-tree-array-preview">
            Array({node.length}) [ {expanded && items.length > 0 ? '' : '...'} ]
          </span>
        </div>
        {expanded && (
          <div className="object-tree-children">
            {items.length > 0 ? (
              items.map((item, i) => (
                <div key={i} className="object-tree-child">
                  <ObjectTreeViewComponent
                    node={item}
                    depth={depth + 1}
                    defaultCollapsed={true}
                    keyName={String(i)}
                  />
                </div>
              ))
            ) : (
              <div className="object-tree-child object-tree-empty">Empty array</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export const ObjectTreeView = React.memo(ObjectTreeViewComponent);
