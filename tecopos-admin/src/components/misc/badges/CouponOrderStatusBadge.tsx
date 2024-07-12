

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
import { getCouponOrdersStatus } from "../../../utils/stylesHelpers";

const getColorCouponOrderStatus = (value: string) => {
    switch (value) {
        case "CREATED":
            return "bg-purple-100 text-purple-800";

        case "IN_PROCCESS":
            return "bg-red-100 text-blue-800";

        case "COMPLETED":
            return "bg-orange-100 text-green-800";

        case "BILLED":
            return "bg-orange-100 text-blue-800";

        case "PRE_BILLED":
            return "bg-orange-100 text-blue-400";

        case "CANCELLED":
            return "bg-orange-100 text-red-800";

        default:
            return "bg-green-100 text-green-800";
    }
};


const getCouponOrderStatusIcon = (value?: string) => {
    switch (value) {
        case "CREATED":
            return faSquare;

        case "IN_PROCCESS":
            return faMinusSquare;

        case "COMPLETED":
            return faDiagramProject;

        case "BILLED":
            return faDiagramProject;

        case "PRE_BILLED":
            return faDiagramProject;

        case "CANCELLED":
            return faDiagramProject;

        default:
            return faMoneyBill1Wave;
    }

};


const CouponOrderStatusBadge = ({ type }: { type: string }) => {


    const discountTypes = getCouponOrdersStatus("CREATED,IN_PROCCESS,COMPLETED,BILLED,PRE_BILLED,CANCELLED")

    return (
        <span
            className={`${getColorCouponOrderStatus(type)} inline-flex items-center gap-2 px-2 py-1 rounded-full text-sm font-medium flex-shrink`}
        >
            {["CREATED", "IN_PROCCESS", "COMPLETED", "BILLED", "PRE_BILLED", "CANCELLED"].includes(type) ? (
                <>
                    {/* <FontAwesomeIcon
                        icon={getCouponOrderStatusIcon()}
                        className={`${getColorCouponOrderStatus(type)}`}
                    /> */}
                    <p>{discountTypes.map(types => {
                        if (types.value === type) {
                            return types.title
                        }
                    })}</p>
                    {/* <FontAwesomeIcon
                        icon={getCouponDiscountTypeIcon(type)}
                        className={`${getColorCouponDiscountType(type)}`}
                    /> */}
                </>
            ) : (
                <FontAwesomeIcon
                    icon={getCouponOrderStatusIcon(type)}
                    className={`${getColorCouponOrderStatus(type)}`}
                />
            )}

            <span className="max-w-full">{translateProductTypes(type)}</span>
        </span>
    );
}

export default CouponOrderStatusBadge
