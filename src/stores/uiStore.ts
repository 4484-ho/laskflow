import { create } from 'zustand'

interface UiStore {
  isCreateIssueModalOpen: boolean
  openCreateIssueModal: () => void
  closeCreateIssueModal: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  isCreateIssueModalOpen: false,
  openCreateIssueModal: () => set({ isCreateIssueModalOpen: true }),
  closeCreateIssueModal: () => set({ isCreateIssueModalOpen: false }),
}))
