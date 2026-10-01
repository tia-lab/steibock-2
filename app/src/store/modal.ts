import { create } from "zustand";

type State = {
  open: boolean;
  type?: "default" | "full";
};

type Action = {
  updateOpen: (open: State["open"]) => void;
  setType: (type: State["type"]) => void;
};

export type ModalStore = State & Action;

export const useModalStore = create<ModalStore>()((set) => ({
  open: false,
  updateOpen: (open) => set(() => ({ open: open })),
  setType: (type) => set(() => ({ type: type })),
}));
