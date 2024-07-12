import { createSlice } from "@reduxjs/toolkit";

export const userSessionSlice = createSlice({
  name: "userSession",

  initialState: {
    user: null,
    isLogged: false,
    business: null,
  },

  reducers: {
    login: (state, action) => {
      state.user = action.payload.user;
      state.business = action.payload.business;
      state.isLogged = true;
    },

    logout: (state) => {
      state.user = null;
      state.business = null;
      state.isLogged = false;
    },

    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },

    updateBusiness: (state, action) => {
      state.business = { ...state.business, ...action.payload };
    },
  },
});

export const { login, logout, updateUser, updateBusiness } =
  userSessionSlice.actions;

export const selectUserSession = (state) => state.userSession;

export default userSessionSlice.reducer;
