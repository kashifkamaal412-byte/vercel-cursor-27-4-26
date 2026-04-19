import { useState, useCallback } from "react";

export interface TextOverlay {
  id: string;
  text: string;
  position: { x: number; y: number };
  rotation: number;
  scale: number;
}

export interface EditorState {
  trimStart: number;
  trimEnd: number;
  speed: number;
  filter: string;
  brightness: number;
  contrast: number;
  videoVolume: number;
  musicVolume: number;
  textOverlays: TextOverlay[];
}

interface UseEditorHistoryReturn {
  state: EditorState;
  setState: (newState: Partial<EditorState>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetHistory: (initialState: EditorState) => void;
}

const MAX_HISTORY_SIZE = 50;

export const useEditorHistory = (initialState: EditorState): UseEditorHistoryReturn => {
  const [history, setHistory] = useState<EditorState[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const state = history[currentIndex];

  const setState = useCallback((newState: Partial<EditorState>) => {
    setHistory((prev) => {
      // Remove any future states (if we've undone and are now making a new change)
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Create the new state by merging with current
      const updatedState = { ...newHistory[currentIndex], ...newState };
      
      // Add new state to history
      newHistory.push(updatedState);
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    
    setCurrentIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, history.length]);

  const resetHistory = useCallback((newInitialState: EditorState) => {
    setHistory([newInitialState]);
    setCurrentIndex(0);
  }, []);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    resetHistory,
  };
};