import { create } from "zustand";
import { getJson } from "../api/client";

type SignalStore = {
  currentPhase: any | null;
  markets: any[];
  backtest: any | null;
  model: any | null;
  refresh: () => Promise<void>;
};

export const useSignalStore = create<SignalStore>((set) => ({
  currentPhase: null,
  markets: [],
  backtest: null,
  model: null,
  refresh: async () => {
    const [currentPhase, markets, backtest, model] = await Promise.all([
      getJson("/current_phase/"),
      getJson("/edge/markets"),
      getJson("/backtest/midnight_hammer"),
      getJson("/current_phase/model")
    ]);
    set({ currentPhase, markets, backtest, model });
  }
}));
