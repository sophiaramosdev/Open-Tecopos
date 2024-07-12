import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import APIServer from "../api/APIServices";

export const getMunicipality = createAsyncThunk(
    "selectData/getMunicipality",
    async () => {
        try {
            const resp = await APIServer.get("/public/municipalities");
            return resp.data.items;
        } catch (error) {}
    }
);
export const getProvince = createAsyncThunk(
    "selectData/getProvince",
    async () => {
        try {
            const resp = await APIServer.get("/public/provinces");
            return resp.data.items;
        } catch (error) {}
    }
);

const selectData = createSlice({
    name: "selectData",
    initialState: {
        municipality: [],
        province: [],
    },
    extraReducers: builder => {
        builder
            .addCase(getMunicipality.fulfilled, (state, action) => {
                state.municipality = action.payload;
                state.isLoading = false;
                state.hasError = false;
            })
            .addCase(getProvince.fulfilled, (state, action) => {
                state.province = action.payload;
                state.isLoading = false;
                state.hasError = false;
            });
    },
});
export const selectMunicipality = state => state.selectData.municipality;
export const selectProvince = state => state.selectData.province;
export default selectData.reducer;
