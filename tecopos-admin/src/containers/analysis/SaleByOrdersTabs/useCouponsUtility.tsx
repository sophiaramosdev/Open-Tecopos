import { useState, useEffect, useMemo } from "react";
import useServerCoupon from "../../../api/useServerCoupons";

export const useCouponsUtility = (time = 500) => {

  const {
      allCoupons,
      getAllCoupons,
      outLoading: loadingCoupons,
    } = useServerCoupon();

  const [couponSearch, setCouponSearch] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  
  useEffect(() => {
    if (debouncedValue.length > 1) {
      getAllCoupons({ all_data: true, search: debouncedValue });
    }
  }, [debouncedValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(couponSearch);
    }, time);

    return () => {
      clearTimeout(timeout);
    };
  }, [couponSearch]);

  const coupons = useMemo(
    () =>
      allCoupons.map((cupon) => ({
        id: cupon.code,
        name: cupon.code,
      })), [allCoupons]);


  return {coupons, couponSearch, loadingCoupons, setCouponSearch};
};


export default useCouponsUtility;