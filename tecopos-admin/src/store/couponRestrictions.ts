import { createSlice } from "@reduxjs/toolkit";
import { ProductInterface } from "../interfaces/ServerInterfaces";

interface InitialState {
    allowedProducts: Array<ProductInterface> | null
}

const initialState: InitialState = {
    allowedProducts: null
}

export const couponRestrictions = createSlice({
    name: "couponRestrictions",

    initialState: initialState,

    reducers: {

        setAllowedProducts: (state, action) => {
            state.allowedProducts = action.payload;
        },

    }
});

export const { setAllowedProducts} =
    couponRestrictions.actions;

export const selectCouponRestrictions = (state: any) => state;

export default couponRestrictions.reducer;