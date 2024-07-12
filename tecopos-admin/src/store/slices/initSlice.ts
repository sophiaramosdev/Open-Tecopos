import { createSlice } from "@reduxjs/toolkit";
import {
  BranchInterface,
  BusinessInterface,
  UserInterface,
} from "../../interfaces/ServerInterfaces";
import { changeBusiness, initSystem } from "../actions/globals";
import { ConfigUpdate } from "../../interfaces/Interfaces";

interface InitialInterface {
  business: BusinessInterface | null;
  user: UserInterface | null;
  branches: BranchInterface[];
  loading: boolean;
}

const initialState: InitialInterface = {
  business: null,
  user: null,
  branches: [],
  loading: false,
};

const initSlice = createSlice({
  initialState,
  name: "init",
  reducers: {
    //Business --------------------------------------------------------------------------------------
    setFullBusiness: (state, action) => ({
      ...state,
      business: action.payload,
    }),
    updateBusiness: (state, action) => ({
      ...state,
      business: { ...state.business, ...action.payload },
    }),
    updateSpecificElementBussiness: (state, action) => {
      let new_elements: ConfigUpdate[] = action.payload;

      state.business?.configurationsKey?.forEach((item) => {
        new_elements.forEach((new_value) => {
          if (new_value.key === item.key) item.value = new_value.value;
        });
      });
    },
    //Users--------------------------------------------------------------------------------------
    setFullUser: (state, action) => ({ ...state, user: action.payload }),
    updateUser: (state, action) => ({
      ...state,
      user: { ...state.user, ...action.payload },
    }),
    //Branches ---------------------------------------------------------------------------------------
    setBranches: (state, action) => ({ ...state, branches: action.payload }),
  },
  extraReducers(builder) {
    builder
      .addCase(initSystem, (state, action) => {
        const user: UserInterface = action.payload.user;
        return {
          ...state,
          business: action.payload.business,
          user,
          branches: action.payload.branches,
        };
      })
      .addCase(changeBusiness.pending, (state) => ({ ...state, loading: true }))
      .addCase(changeBusiness.fulfilled, (state, action) => ({
        ...state,
        loading: false,
        business: action.payload.business,
      }));
  },
});

export const {
  setBranches,
  setFullBusiness,
  setFullUser,
  updateBusiness,
  updateUser,
  updateSpecificElementBussiness,
} = initSlice.actions;

export default initSlice.reducer;