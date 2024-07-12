import { createSlice } from "@reduxjs/toolkit";

export const couponSlice = createSlice({
    name: "coupon",

    initialState: {
        coupon: null,
        couponType: null
    },

    reducers: {

        setCoupon: (state, action) => {
            state.coupon = action.payload;
        },

        setCouponType: (state, action) => {
            state.couponType = action.payload;
        },

        updateCoupon: (state, action) => {
            state.coupon = { ...state.coupon, ...action.payload };
        },
    }
});

export const { setCoupon, updateCoupon, setCouponType, setEconCicl } =
    couponSlice.actions;

export const selectCoupon = (state) => state.coupon;

export default couponSlice.reducer;