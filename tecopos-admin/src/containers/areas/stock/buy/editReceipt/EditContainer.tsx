import { useEffect, useState } from "react";
import TabNav, { TabsAttr } from "../../../../../components/navigation/TabNav";
import Button from "../../../../../components/misc/Button";
import Details from "./Details";
import useServerArea from "../../../../../api/useServerArea";
import SpinnerLoading from "../../../../../components/misc/SpinnerLoading";
import ReceiptContext from "../ReceiptContext";
import { useFieldArray, useForm } from "react-hook-form";
import Batches from "./Batches";
import Documents from "./Documents";
import Costs from "./Costs";
import Operations from "./Operations";
import SideNav from "../../../../../components/misc/SideNav";

interface EditContainerProps {
  id: number;
  updateLocaly: Function;
}

const EditContainer = ({ id, updateLocaly }: EditContainerProps) => {
  const {
    getReceipt,
    updateReceipt,
    dispatchReceipt,
    extractFoundsFrom,
    addBatch,
    updateBatch,
    deleteBatch,
    cancelReceipt,
    receipt,
    isLoading,
    isFetching,
  } = useServerArea();
  const { control } = useForm();

  const { fields: fieldsProducts, replace: setProducts } = useFieldArray({
    name: "batches",
    control,
  });

  useEffect(() => {
    getReceipt(id);
  }, []);

  useEffect(() => {
    const batches =
      receipt?.batches.map((item) => ({ ...item, batchId: item.id })) ?? [];
    setProducts(batches);
  }, [receipt]);

  const [current, setCurrent] = useState("details");

  const tabs: TabsAttr[] = [
    {
      name: "Detalles",
      current: current === "details",
      href: "details",
    },
    {
      name: "Productos",
      current: current === "products",
      href: "products",
    },
    {
      name: "Anexos",
      current: current === "anex",
      href: "anex",
    },
    {
      name: "Costos adicionales",
      current: current === "costs",
      href: "costs",
    },
    /*{
      name: "Operaciones",
      current: current === "operations",
      href: "operations",
    },*/
  ];

  if (isLoading) {
    return (
      <div className="relative flex h-[36rem] justify-center items-center">
        <SpinnerLoading />
      </div>
    );
  } else {
    return (
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-2">
          <SideNav tabs={tabs} action={setCurrent} />
        </div>

        <div className="col-span-10 border border-slate-300 rounded-md p-2 h-[34rem]">
          <ReceiptContext.Provider
            value={{
              receipt,
              control,
              dispatchReceipt,
              extractFoundsFrom,
              updateReceipt,
              isFetching,
              fieldsProducts,
              addBatch,
              updateBatch,
              deleteBatch,
              updateOuterList: updateLocaly,
              cancelReceipt,
            }}
          >
            {current === "details" && <Details />}
            {current === "products" && <Batches />}
            {current === "anex" && <Documents />}
            {current === "costs" && <Costs />}
            {current === "operations" && <Operations />}
          </ReceiptContext.Provider>
        </div>
      </div>
    );
  }
};

export default EditContainer;
