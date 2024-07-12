

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { translateProductTypes } from "../../../utils/translate";
import {
    faSquare,
    faMinusSquare,
    faDiagramProject,
    faCalculator,
    faAdd,
    faLayerGroup,
    faFire,
    faThLarge,
    faBoxes,
    faPallet,
    faMoneyBill1Wave
} from "@fortawesome/free-solid-svg-icons";
import { getCouponTypes } from "../../../utils/stylesHelpers";

const getColorCouponDiscountType = (value: string) => {
    switch (value) {
        case "PERCENT":
            return "bg-pink-100 text-pink-800";

        case "FIXED_PRODUCT":
            return "bg-green-100 text-green-800";

        case "FIXED_CART":
            return "bg-blue-100 text-blue-800";

        default:
            return "bg-green-100 text-green-800";
    }
};


const getCouponDiscountTypeIcon = (value?: string) => {
    switch (value) {
        case "PERCENT":
            return faSquare;

        case "FIXED_PRODUCT":
            return faMinusSquare;

        case "FIXED_CART":
            return faDiagramProject;

        default:
            return faMoneyBill1Wave;
    }

};


const CouponDiscountTypeBadge = ({ type }: { type: string }) => {


    const discountTypes = getCouponTypes("PERCENT,FIXED_PRODUCT,FIXED_CART")

    return (
        <span
            className={`${getColorCouponDiscountType(type)} inline-flex items-center gap-2 px-2 py-1 rounded-full text-sm font-medium flex-shrink`}
        >
            {["PERCENT", "FIXED_PRODUCT", "FIXED_CART"].includes(type) ? (
                <>
                    {/* <FontAwesomeIcon
                        icon={getCouponDiscountTypeIcon()}
                        className={`${getColorCouponDiscountType(type)}`}
                    /> */}
                    <p>{discountTypes.map(types => {
                        if (types.value === type) {
                            return types.title
                        }
                    })}</p>
                </>
            ) : (
                <FontAwesomeIcon
                    icon={getCouponDiscountTypeIcon(type)}
                    className={`${getColorCouponDiscountType(type)}`}
                />
            )}

            <span className="max-w-full">{translateProductTypes(type)}</span>
        </span>
    );
}

export default CouponDiscountTypeBadge
