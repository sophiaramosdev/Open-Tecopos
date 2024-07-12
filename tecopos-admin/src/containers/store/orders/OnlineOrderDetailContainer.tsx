import Fetching from "../../../components/misc/Fetching";
import { formatCurrencyV2 } from "../../../utils/helpers";
import { Control, FormState, SubmitHandler, useForm } from "react-hook-form";
import { DataTableInterface } from "../../../components/misc/GenericTable";
import Button from "../../../components/misc/Button";
import { useEffect, useState } from "react";
import useServerEcoCycle from "../../../api/useServerEconomicCycle";
import ImageComponent from "../../../components/misc/Images/Image";
import { useAppSelector } from "../../../store/hooks";
import TabNav, { TabsAttr } from "../../../components/navigation/TabNav";
import Details from "./Details";
import Opperations from "./Opperations";
import { OrderInterface } from "../../../interfaces/ServerInterfaces";
import { createContext } from "react";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import SideNav from "../../../components/misc/SideNav";

interface OrderDetail {
  id: number | null;
  editOrder: Function;
  updListState: (order: OrderInterface) => void;
  closeModal: Function;
  fetching: boolean;
}

interface OnlineOrderCtxInterface {
  order: OrderInterface | null;
  control: Control<BasicType>;
  formState: FormState<BasicType>;
  fetching: boolean;
  updListState: Function;
  editOrder: Function;
  syncronizeOnlineOrder: Function;
  syncFetching: boolean;
  updateSingleOrderState: Function;
}

export const OnlineOrderContext = createContext<
  Partial<OnlineOrderCtxInterface>
>({});

const OnlineOrderDetailContainer = ({
  id,
  fetching,
  editOrder,
  closeModal,
  updListState,
}: OrderDetail) => {
  const { handleSubmit, control, formState } = useForm();
  const {
    getOrder,
    order,
    isLoading,
    syncronizeOnlineOrder,
    syncFetching,
    updateSingleOrderState,
  } = useServerEcoCycle();
  const { costCurrency: mainCurrency } = useAppSelector(
    (state) => state.init.business!
  );

  useEffect(() => {
    id && getOrder(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Products Table-----------------------------------------------------------------
  const tableData: DataTableInterface[] =
    order?.selledProducts?.map((item) => {
      return {
        rowId: item.id,
        payload: {
          Nombre: (
            <div className="inline-flex gap-2 items-center">
              <ImageComponent
                src={item?.image?.src}
                hash={item?.image?.blurHash}
                className="flex h-10 w-10 rounded-md"
              />
              <p>{item.name}</p>
            </div>
          ),
          Cantidad: item.quantity,
          "Precio unitario": formatCurrencyV2(
            item?.priceUnitary?.amount,
            item?.priceUnitary?.codeCurrency
          ),
          "Precio total": formatCurrencyV2(
            item?.priceTotal?.amount,
            item?.priceTotal?.codeCurrency
          ),
        },
      };
    }) ?? [];
  const subtotal =
    order?.selledProducts?.reduce(
      (total, item) => item.priceTotal.amount + total,
      0
    ) ?? 0;

  const rowTotals = [
    {
      name: "Subtotal",
      amount: subtotal,
    },
  ];

  if (order?.shippingPrice)
    rowTotals.push({
      name: "Costo de envío",
      amount: order?.shippingPrice?.amount,
    });

  if (order?.taxes)
    rowTotals.push({
      name: "Impuestos",
      amount: order?.taxes?.amount,
    });

  const total =
    subtotal +
    (order?.taxes?.amount ?? 0) +
    (order?.shippingPrice?.amount ?? 0);

  rowTotals.push({
    name: "Total",
    amount: total,
  });

  const rowTotal = {
    rowId: "totals",
    payload: {
      Nombre: "",
      Cantidad: "",
      "Precio unitario": (
        <div className="flex flex-col">
          {rowTotals.map((title, idx) => (
            <p key={idx} className="p-0 font-semibold text-right">
              {title?.name}
            </p>
          ))}
        </div>
      ),
      "Precio total": (
        <div className="flex flex-col gap-y-1">
          {rowTotals.map((total, idx) => (
            <p key={idx} className="p-0 font-semibold text-center">
              {formatCurrencyV2(total?.amount, mainCurrency)}
            </p>
          ))}
        </div>
      ),
    },
  };
  tableData.push(rowTotal);

  const updateCallback = (order: OrderInterface) => {
    updateSingleOrderState(order);
    closeModal();
  };

  const submitting = formState.isSubmitting;
  const onSubmit: SubmitHandler<Record<string, string>> = async (data) => {
    if (formState.isDirty) {
      if (data.status === "CREATED") delete data.status;
      await editOrder(order?.id, data, updateCallback);
    } else {
      closeModal();
    }
  };

  //Tab Nav ------------------------------------------------------
  const [currentTab, setCurrentTab] = useState("details");
  const tabs: TabsAttr[] = [
    {
      name: "Detalles",
      href: "details",
      current: currentTab === "details",
    },
    {
      name: "Operaciones",
      href: "opperations",
      current: currentTab === "opperations",
    },
  ];
  //--------------------------------------------------------------

  if (isLoading)
    return (
      <div className="h-96">
        <Fetching />
      </div>
    );

  return (
    <OnlineOrderContext.Provider
      value={{
        control,
        order,
        editOrder,
        fetching,
        formState,
        syncFetching,
        syncronizeOnlineOrder,
        updateSingleOrderState,
        updListState,
      }}
    >
      <section className="grid grid-cols-12">
        {/* <TabNav action={(tab: string) => setCurrentTab(tab)} tabs={tabs} />  */}
        <aside className="col-span-2">
          <SideNav tabs={tabs} action={setCurrentTab} />
        </aside>
        <form onSubmit={handleSubmit(onSubmit)} className="px-3 col-span-10">
          {currentTab === "details" && <Details />}
          {currentTab === "opperations" && <Opperations order={order} />}
          <div className="flex justify-end py-5">
            <Button
              color="slate-600"
              name={`${formState.isDirty ? "Actualizar" : "Aceptar"}`}
              type="submit"
              loading={fetching && submitting}
              disabled={fetching}
            />
          </div>
        </form>
      </section>
    </OnlineOrderContext.Provider>
  );
};

export default OnlineOrderDetailContainer;
