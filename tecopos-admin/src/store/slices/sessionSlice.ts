import { createSlice } from "@reduxjs/toolkit";
import { closeSystem } from "../actions/globals";

interface InitialState {
  key: { token: string; refresh_token: string } | null;
  businessId: number | null;
  staticBar: boolean;
  rollSize: number;
  specificColumnSpaceToSave: Array<{
    spaceToSave: string;
    selectableTitles: Array<{
      id: number;
      name: string;
    }>;
  }>;
}

const initialState: InitialState = {
  key: null,
  businessId: null,
  staticBar: true,
  rollSize: 58,
  specificColumnSpaceToSave: [],
};

const sessionSlice = createSlice({
  initialState,
  name: "session",
  reducers: {
    setKeys: (state, action) => ({ ...state, key: action.payload }),
    setBusinessId: (state, action) => ({
      ...state,
      businessId: action.payload,
    }),
    changeStaticBar: (state) => ({ ...state, staticBar: !state.staticBar }),
    setRollSize: (state, action) => ({
      ...state,
      rollSize: action.payload,
    }),
    setSpecificColumnSpaceToSave: (state, action) => ({
      ...state,
      specificColumnSpaceToSave: action.payload,
    }),
  },
  extraReducers: (builder) =>
    builder.addCase(closeSystem, (state) => (initialState)),
});

export const {
  setKeys,
  setBusinessId,
  changeStaticBar,
  setRollSize,
  setSpecificColumnSpaceToSave,
} = sessionSlice.actions;
export default sessionSlice.reducer;
