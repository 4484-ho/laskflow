import { create } from 'zustand'

interface UiStore {
  isCreateIssueModalOpen: boolean
  openCreateIssueModal: () => void
  closeCreateIssueModal: () => void
  commandPaletteOpen: boolean
  openCommandPalette: () => void
  closeCommandPalette: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  isCreateIssueModalOpen: false,
  openCreateIssueModal: () => set({ isCreateIssueModalOpen: true }),
  closeCreateIssueModal: () => set({ isCreateIssueModalOpen: false }),
  commandPaletteOpen: false,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
}))
