import { createSlice } from "@reduxjs/toolkit";

export interface Factory {
  id: string;
  name: string;
  description: string;
  output: string;
}

export const FactoriesSlice = createSlice({
  name: "Factories",
  initialState: {
    value: 0,
  },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action) => {
      state.value += action.payload;
    },
  },
});
