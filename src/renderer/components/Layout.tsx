import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Layout.css';

interface LayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  orientation?: 'vertical' | 'horizontal';
}

export const Layout: React.FC<LayoutProps> = ({ left, right, orientation = 'vertical' }) => {
  const [leftSize, setLeftSize] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) {
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      if (orientation === 'vertical') {
        const containerWidth = containerRect.width;
        const offsetX = e.clientX - containerRect.left;
        const newLeftSize = (offsetX / containerWidth) * 100;
        const clampedSize = Math.max(20, Math.min(80, newLeftSize));
        setLeftSize(clampedSize);
      } else {
        const containerHeight = containerRect.height;
        const offsetY = e.clientY - containerRect.top;
        const newLeftSize = (offsetY / containerHeight) * 100;
        const clampedSize = Math.max(20, Math.min(80, newLeftSize));
        setLeftSize(clampedSize);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, orientation]);

  const isVertical = orientation === 'vertical';

  return (
    <div
      ref={containerRef}
      className={`layout-container layout-${orientation} ${isResizing ? 'layout-resizing' : ''}`}
      style={{ flexDirection: isVertical ? 'row' : 'column' }}
    >
      <div
        className="layout-pane layout-pane-left"
        style={{
          [isVertical ? 'width' : 'height']: `${leftSize}%`,
          [isVertical ? 'height' : 'width']: '100%',
        }}
      >
        {left}
      </div>
      <div
        className={`layout-resizer layout-resizer-${orientation}`}
        onMouseDown={handleMouseDown}
      />
      <div
        className="layout-pane layout-pane-right"
        style={{
          [isVertical ? 'width' : 'height']: `${100 - leftSize}%`,
          [isVertical ? 'height' : 'width']: '100%',
        }}
      >
        {right}
      </div>
    </div>
  );
};
