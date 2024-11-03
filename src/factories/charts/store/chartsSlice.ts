import { useStore } from '@/core/zustand';
import { createSlice } from '@/core/zustand-helpers/slices';

export interface ChartsSlice {
  selected: 'graph' | 'sankey';
  settings: {
    widthMatchesInputAmount?: boolean;
    colorizeEdgesByTransport?: boolean;
  };
}

export const chartsSlice = createSlice({
  name: 'charts',
  value: {
    selected: 'graph',
    settings: {
      widthMatchesInputAmount: true,
    },
  } as ChartsSlice,
  actions: {
    setChartView: (view: 'graph' | 'sankey') => state => {
      state.selected = view;
    },
    setChartSetting:
      (key: keyof ChartsSlice['settings'], value: any) => state => {
        if (!state.settings) state.settings = {};
        state.settings[key] = value;
      },
  },
});

export function useChartsView() {
  return useStore(state => state.charts.selected);
}

export function useChartsSettings() {
  return useStore(state => state.charts.settings);
}

export function useChartSetting<K extends keyof ChartsSlice['settings']>(
  key: K,
  defaultValue?: ChartsSlice['settings'][K],
) {
  return useStore(state => state.charts.settings[key] ?? defaultValue);
}
