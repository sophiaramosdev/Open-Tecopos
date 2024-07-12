import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  DocumentMagnifyingGlassIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  MegaphoneIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
import { useNavigate } from "react-router";
import SideNav from "../../../components/misc/SideNav";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import DetailsContainer from "./couponDetails/DetailsContainer";
import useServerCoupon from "../../../api/useServerCoupons";
import OrdersList from "./couponOrders/OrdersList";
import ClientsList from "./couponClients/ClientsList";
import SumaryContainer from "./couponSumary/SumaryContainer";

const DetailCouponContainer = ({
  id,
  updateState,
  closeModal
}: {
  id: number;
  updateState: Function;
  closeModal:Function
}) => {
  const {
    getCoupon,
    isLoading,
    isFetching,
    coupon,
    updateCoupon,
    deleteCoupon,
  } = useServerCoupon();

  const navigate = useNavigate();

  const crud = {
    updateCoupon,
    deleteCoupon,
    isFetching,
    getCoupon,
    updateState
  };

  useEffect(() => {
    getCoupon(id);
  }, []);

  const [currentTab, setCurrentTab] = useState("details");
  const tabs = [
    {
      icon: <DocumentMagnifyingGlassIcon className="h-6" />,
      name: "Detalles",
      href: "details",
      current: currentTab === "details",
    },    
    {
      icon: <ClipboardDocumentCheckIcon className="h-6" />,
      name: "Órdenes",
      href: "orders",
      current: currentTab === "orders",
    },
    {
      icon: <UserGroupIcon className="h-6" />,
      name: "Uso por clientes",
      href: "sumary",
      current: currentTab === "sumary",
    },
  ];

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center">
        <SpinnerLoading />
      </div>
    );

  return (
    <>
      <div className="sm:grid grid-cols-10 gap-3 h-[34rem]">
        <SideNav
          tabs={tabs}
          action={setCurrentTab}
          className="col-span-10 sm:col-span-2"
        />
        <div className="sm:col-span-8 p-3 overflow-auto scrollbar-none border border-slate-300 rounded-md ">
          {currentTab === "details" && (
            <DetailsContainer coupon={coupon} crud={crud} closeModal={closeModal} />
          )}
          {currentTab === "orders" && <OrdersList coupon={coupon} />}
          {currentTab === "clients" && <ClientsList coupon={coupon} />}
          {currentTab === "sumary" && <SumaryContainer coupon={coupon} />}
        </div>
      </div>
    </>
  );
};

export default DetailCouponContainer;
