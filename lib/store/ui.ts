"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  SearchFilters,
  SortBy,
  SortOrder,
  ViewMode,
} from "@/lib/types";

interface UiState {
  // navigation
  currentDataroomId: string | null;
  setCurrentDataroomId: (id: string | null) => void;
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;

  // selection (IDs only)
  selectedItems: Set<string>;
  setSelectedItems: (ids: Set<string>) => void;
  clearSelection: () => void;

  // layout & prefs
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  sortBy: SortBy;
  setSortBy: (s: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (o: SortOrder) => void;

  // dialogs
  showUploadZone: boolean;
  setShowUploadZone: (v: boolean) => void;

  // search
  searchFilters: SearchFilters;
  setSearchFilters: (f: SearchFilters) => void;
  // dataroom coordination
  ensureDataroomSelection: (ids: string[]) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      currentDataroomId: null,
      setCurrentDataroomId: (id) =>
        set({
          currentDataroomId: id,
          currentFolderId: null,
          selectedItems: new Set(),
          showUploadZone: false,
        }),
      currentFolderId: null,
      setCurrentFolderId: (id) =>
        set({ currentFolderId: id, selectedItems: new Set() }),

      selectedItems: new Set<string>(),
      setSelectedItems: (ids) => set({ selectedItems: new Set(ids) }),
      clearSelection: () => set({ selectedItems: new Set() }),

      viewMode: "grid",
      setViewMode: (m) => set({ viewMode: m }),
      sortBy: "date",
      setSortBy: (s) => set({ sortBy: s }),
      sortOrder: "desc",
      setSortOrder: (o) => set({ sortOrder: o }),

      showUploadZone: false,
      setShowUploadZone: (v) =>
        set((state) => {
          if (v && !state.currentDataroomId) {
            return { showUploadZone: false };
          }
          if (state.showUploadZone === v) {
            return {};
          }
          return { showUploadZone: v };
        }),

      searchFilters: {
        query: "",
        fileTypes: [],
        sizeRange: null,
        dateRange: null,
        owner: null,
        shared: null,
      },
      setSearchFilters: (f) => set({ searchFilters: f }),
      ensureDataroomSelection: (ids) =>
        set((state) => {
          if (ids.length === 0) {
            if (state.currentDataroomId === null) {
              return {};
            }
            return {
              currentDataroomId: null,
              currentFolderId: null,
              selectedItems: new Set(),
              showUploadZone: false,
            };
          }

          if (
            state.currentDataroomId &&
            ids.includes(state.currentDataroomId)
          ) {
            return {};
          }

          return {
            currentDataroomId: ids[0],
            currentFolderId: null,
            selectedItems: new Set(),
            showUploadZone: false,
          };
        }),
    }),
    {
      name: "ui-prefs", // persist only lightweight prefs via partialize
      partialize: (state) => ({
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        currentDataroomId: state.currentDataroomId,
      }),
    }
  )
);
