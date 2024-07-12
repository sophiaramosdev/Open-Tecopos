import { useState, createContext } from "react";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import TabNav from "../../../components/navigation/TabNav";
import { CouponInterface } from "../../../interfaces/ServerInterfaces";
// SECCIONES DEL MODAL

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBoxesStacked,
} from "@fortawesome/free-solid-svg-icons";
import Fetching from "../../../components/misc/Fetching";
import { FaBoxOpen } from 'react-icons/fa'
import CouponDiscountTypeBadge from "../../../components/misc/badges/CouponDiscountTypeBadge";
import General from "./couponDetails/General";
import Restrictions from "./couponDetails/Restrictions";
import Limits from "./couponDetails/Limits";

interface CouponCtx {
    coupon: CouponInterface | null;
    updateCoupon: Function;
    deleteCoupon: Function;
    isFetching: boolean;
    updateStockCouponState: Function;
}


const detailCouponContext: Partial<CouponCtx> = {};

export const DetailCouponContext = createContext(detailCouponContext);
interface Detail {
    coupon: CouponInterface | null;
    loading: boolean;
    crud: {
        updateCoupon: Function;
        deleteCoupon?: Function;
        isFetching: boolean;
        updateStockCouponState?: Function;
        getCoupon?: Function
    };
    closeModal: Function;
}

const CouponModalEdit = ({
    coupon,
    loading,
    crud,
    closeModal,
}: Detail) => {


    //Manage Tabs ------------------------------------------------------------------------------------------------------
    const [currentTab, setCurrentTab] = useState("general");
    const tabs = [
        {
            icon: <FaBoxOpen />,
            name: "Generales",
            href: "general",
            current: currentTab === "general",
        },
        {
            icon: <FontAwesomeIcon icon={faBoxesStacked} />,
            name: "Restricciones de Uso",
            href: "restrictions",
            current: currentTab === "restrictions",
        },
        {
            icon: <FontAwesomeIcon icon={faBoxesStacked} />,
            name: "Límites de uso",
            href: "limits",
            current: currentTab === "limits",
        },
    ];

    //--------------------------------------------------------------------------------------------------------

    if (loading)
        return (
            <div className="h-96 flex items-center justify-center">
                <SpinnerLoading />
            </div>
        );

    const {
        updateCoupon,
        deleteCoupon,
        isFetching,
        updateStockCouponState,
        getCoupon
    } = crud;


    return (
        <div className="h-full">
            <div className="inline-flex gap-5">
                <h2 className="text-lg text-gray-700 font-medium">{coupon?.code}</h2>
                <CouponDiscountTypeBadge type={coupon?.discountType ?? ""} />
            </div>

            <TabNav action={setCurrentTab} tabs={tabs} className="whitespace-nowrap" />
            <DetailCouponContext.Provider
                value={{
                    coupon,
                    updateCoupon,
                    deleteCoupon,
                    isFetching,
                    updateStockCouponState,
                }}
            >
                {isFetching && <Fetching />}
                {currentTab === "general" && <General source="modal" />}
                {currentTab === "restrictions" && <Restrictions source="modal" />}
                {currentTab === "limits" && <Limits source="modal" />}
            </DetailCouponContext.Provider>
        </div>
    );
}

export default CouponModalEdit
