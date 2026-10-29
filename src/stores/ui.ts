import { create } from 'zustand';

/** Whether the current page has scrolled away from the top (the nav turns solid). */
export const useScrollFlag = create<{ scrolled: boolean; setScrolled: (v: boolean) => void }>()((set) => ({
  scrolled: false,
  setScrolled: (scrolled) => set({ scrolled }),
}));

/** The preview-controls sheet can be opened from several places. */
export const usePreviewSheet = create<{ open: boolean; setOpen: (v: boolean) => void }>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
