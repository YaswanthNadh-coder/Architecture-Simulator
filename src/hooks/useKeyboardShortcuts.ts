/**
 * Keyboard Shortcuts Hook
 * Provides global keyboard shortcuts for the simulator.
 * Shortcuts are disabled when the Monaco editor is focused.
 */

import { useEffect, useCallback, useState } from 'react';
import { useSimulatorStore } from '../store/simulatorStore';

export interface ShortcutDef {
  key: string;
  label: string;
  description: string;
  modifier?: 'ctrl' | 'shift' | 'alt';
}

export const SHORTCUTS: ShortcutDef[] = [
  { key: 'Space', label: 'Space', description: 'Step forward one cycle' },
  { key: 'Space', label: 'Shift + Space', description: 'Toggle auto-play', modifier: 'shift' },
  { key: 'r', label: 'R', description: 'Reset simulation' },
  { key: 'Enter', label: 'Ctrl + Enter', description: 'Assemble code', modifier: 'ctrl' },
  { key: 'z', label: 'Ctrl + Z', description: 'Step backward', modifier: 'ctrl' },
  { key: 'Escape', label: 'Esc', description: 'Stop auto-play' },
  { key: '/', label: '?', description: 'Toggle shortcuts help', modifier: 'shift' },
  { key: '1', label: '1', description: 'Pipeline view' },
  { key: '2', label: '2', description: 'Datapath view' },
  { key: '3', label: '3', description: 'Timing diagram' },
  { key: '4', label: '4', description: 'Memory view' },
  { key: '5', label: '5', description: 'Cache view' },
  { key: '6', label: '6', description: 'What-If / Diff view' },
  { key: '7', label: '7', description: 'Branch view' },
];

function isEditorFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  // Monaco editor uses textarea inside .monaco-editor
  if (active.tagName === 'TEXTAREA' && active.closest('.monaco-editor')) return true;
  // Also check for input/textarea generally
  if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') return true;
  // Check contenteditable
  if (active.getAttribute('contenteditable') === 'true') return true;
  return false;
}

type TabView = 'Pipeline' | 'Datapath' | 'Timing' | 'Memory' | 'Cache' | 'Diff' | 'Branching';

const TAB_MAP: Record<string, TabView> = {
  '1': 'Pipeline',
  '2': 'Datapath',
  '3': 'Timing',
  '4': 'Memory',
  '5': 'Cache',
  '6': 'Diff',
  '7': 'Branching',
};

export function useKeyboardShortcuts(
  setActiveTab?: (tab: TabView) => void,
) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't capture when editor is focused (unless Ctrl+Enter for assemble)
    if (isEditorFocused()) {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        useSimulatorStore.getState().assemble();
      }
      return;
    }

    const key = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Space — step or toggle play
    if (key === ' ' || key === 'Space') {
      e.preventDefault();
      if (shift) {
        useSimulatorStore.getState().togglePlay();
      } else {
        useSimulatorStore.getState().nextCycle();
      }
      return;
    }

    // R — reset
    if (key === 'r' && !ctrl && !shift) {
      e.preventDefault();
      useSimulatorStore.getState().reset();
      return;
    }

    // Ctrl+Enter — assemble
    if (key === 'Enter' && ctrl) {
      e.preventDefault();
      useSimulatorStore.getState().assemble();
      return;
    }

    // Ctrl+Z — step backward
    if (key === 'z' && ctrl && !shift) {
      e.preventDefault();
      useSimulatorStore.getState().prevCycle();
      return;
    }

    // Escape — stop auto-play
    if (key === 'Escape') {
      const state = useSimulatorStore.getState();
      if (state.isPlaying) {
        e.preventDefault();
        state.togglePlay();
      }
      // Also close help
      setShowHelp(false);
      return;
    }

    // ? — toggle help (Shift + /)
    if (key === '?' || (key === '/' && shift)) {
      e.preventDefault();
      setShowHelp(prev => !prev);
      return;
    }

    // Number keys — switch tabs
    if (!ctrl && !shift && TAB_MAP[key] && setActiveTab) {
      e.preventDefault();
      setActiveTab(TAB_MAP[key]);
      return;
    }
  }, [setActiveTab]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}
