import { create } from "zustand";

type State = {
  open: boolean;
  type?: "right" | "left";
};

type Action = {
  updateOpen: (open: State["open"]) => void;
  setType: (type: State["type"]) => void;
};

export type SidebarStore = State & Action;

export const useSidebarStore = create<SidebarStore>()((set) => ({
  open: false,
  updateOpen: (open) => set(() => ({ open: open })),
  setType: (type) => set(() => ({ type: type })),
}));
