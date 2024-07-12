
import { useContext } from "react";
import { CouponContext } from "../newCouponModal/NewWizardContainer";
import { getCouponTypes } from "../../../../utils/stylesHelpers";
import RadioGroupForm from "../../../../components/forms/RadioGroup";


const CouponTypeSelector = () => {
  const { control, stepUp } = useContext(CouponContext);
  const couponsTypes = getCouponTypes("PERCENT,FIXED_PRODUCT,FIXED_CART" ?? "")

    return (
        <>
            <div className="h-96 border border-slate-300 rounded p-2 pr-4 overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
                <RadioGroupForm
                    data={couponsTypes}
                    name="discountType"
                    control={control}
                    action={stepUp}
                />
            </div>
        </>
    )
}

export default CouponTypeSelector
