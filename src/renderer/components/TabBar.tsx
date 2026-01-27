import React, { useState, useRef, useEffect } from 'react';
import { Tab } from '../../shared/types';
import { useI18n } from '../i18n';
import './TabBar.css';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSwitch: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabCloseOthers: (id: string) => void;
  onTabCloseAll: () => void;
  onTabCreate: () => void;
  onTabRename: (id: string, title: string) => void;
  onTabReorder: (fromIndex: number, toIndex: number) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabSwitch,
  onTabClose,
  onTabCloseOthers,
  onTabCloseAll,
  onTabRename,
  onTabCreate,
  onTabReorder,
}) => {
  const { t } = useI18n();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleTabDoubleClick = (tab: Tab) => {
    setEditingTabId(tab.id);
    setEditingTitle(tab.title);
  };

  const handleTitleSubmit = (tabId: string) => {
    if (editingTitle.trim()) {
      onTabRename(tabId, editingTitle.trim());
    }
    setEditingTabId(null);
    setEditingTitle('');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter') {
      handleTitleSubmit(tabId);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditingTitle('');
    }
  };

  const handleCloseClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose(tabId);
  };

  const handleContextMenu = async (e: React.MouseEvent, tab: Tab) => {
    e.preventDefault();
    e.stopPropagation();

    const action = await window.electronAPI.showTabContextMenu(tab.id, tabs.length);

    if (action === 'close') {
      onTabClose(tab.id);
    } else if (action === 'close-others') {
      onTabCloseOthers(tab.id);
    } else if (action === 'close-all') {
      onTabCloseAll();
    } else if (action === 'rename') {
      setEditingTabId(tab.id);
      setEditingTitle(tab.title);
    }
  };

  const isModified = (tab: Tab): boolean => {
    return tab.modifiedAt > (tab.savedAt || tab.createdAt);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(null);
      return;
    }
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onTabReorder(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getTabClassName = (tab: Tab, index: number): string => {
    const classes = ['tab-item'];
    if (tab.id === activeTabId) {
      classes.push('tab-item-active');
    }
    if (dragOverIndex === index && draggedIndex !== null) {
      if (draggedIndex < index) {
        classes.push('tab-item-drag-over-right');
      } else {
        classes.push('tab-item-drag-over-left');
      }
    }
    return classes.join(' ');
  };

  const handleContainerDragLeave = (e: React.DragEvent) => {
    const container = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!container.contains(relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  return (
    <div className="tab-bar">
      <div className="tab-bar-tabs" onDragLeave={handleContainerDragLeave}>
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            className={getTabClassName(tab, index)}
            onClick={() => onTabSwitch(tab.id)}
            onDoubleClick={() => handleTabDoubleClick(tab)}
            onContextMenu={(e) => handleContextMenu(e, tab)}
            draggable={editingTabId !== tab.id}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            {editingTabId === tab.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => handleTitleSubmit(tab.id)}
                onKeyDown={(e) => handleTitleKeyDown(e, tab.id)}
                className="tab-title-input"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="tab-title">{tab.title}</span>
                <div className="tab-actions">
                  {isModified(tab) && <span className="tab-modified-indicator">•</span>}
                  <button
                    className="tab-close-button"
                    onClick={(e) => handleCloseClick(e, tab.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    ×
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        <button className="tab-add-button" onClick={onTabCreate} title={t.tabBar.newTab}>
          +
        </button>
      </div>
    </div>
  );
};
