import { Control, SubmitHandler, useForm } from "react-hook-form";
import { createContext, useEffect, useState } from "react";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import {
  CheckIcon,
  PlusIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Modal from "../../../../components/misc/GenericModal";
import AddPolicy from "./AddPolicy";
import useServerBusiness from "../../../../api/useServerBusiness";
import { ReservationPolicy } from "../../../../interfaces/ServerInterfaces";
import { toast } from "react-toastify";

interface DiscountContextInterface {
  isFetching?: boolean;
  control?: Control;
  watch?: Function;
  reset?: Function;
}
export const DiscountContext = createContext<DiscountContextInterface>({});

const DiscountPolicy = () => {
  const {
    getAllReservationPolicy,
    allReservationsPolicy,
    isLoading,
    addNewReservationPolicy,
    isFetching,
    updateReservationPolicy,
    deletedReservationPolicy,
  } = useServerBusiness();

  const { handleSubmit, control, watch, reset, clearErrors } = useForm({
    mode: "onSubmit",
  });

  // const [openDetailModal, setOpenDetailModal] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [selectPolicy, setSelectPolicy] = useState<ReservationPolicy | null>(
    null
  );

  useEffect(() => {
    getAllReservationPolicy && getAllReservationPolicy({ type: "DISCOUNT" });
  }, []);

  const titles: string[] = ["Frecuencia", "%", "Estado", "Descripción"];
  const displayData: Array<DataTableInterface> = [];
  allReservationsPolicy?.forEach((item, index) => {
    displayData.push({
      rowId: item.id,
      payload: {
        Frecuencia: `${item.quantity} ${translatePolicyFrequencyToSpInTab(
          item.frequency,item.quantity
        )}`,
        "%": item.discount,
        Estado: (
          <div className="flex justify-center">
            {item.isActive ? (
              <CheckIcon className="h-7 text-green-500" />
            ) : (
              <XMarkIcon className="w-7 text-red-500" />
            )}{" "}
            
          </div>
        ),
        Descripción: <p className="text-start">{item.description ?? ""}</p>,
      },
    });
  });

  const rowAction = (id: number) => {
    const select = allReservationsPolicy.find((item: any) => item.id === id);
    setSelectPolicy(select ?? null);
    //setOpenDetailModal(true);
  };

  const actions = [
    {
      icon: <PlusIcon className="h-7 flex justify-center" title="Añadir" />,
      action: () => setOpenAddModal(true),
      title: "Añadir",
    },
  ];

  const handleDeleted = () => {
    deletedReservationPolicy(selectPolicy?.id as number, () =>
      // setOpenDetailModal(false)
      setSelectPolicy(null)
    );
    clearErrors();
  };

  const onSubmit = (data: any) => {
    const { frequency, ...rest } = data;
    const adapterData = {
      type: "DISCOUNT",
      frequency: translatePolicyFrequency(frequency),
      ...rest,
    };
    addNewReservationPolicy &&
      addNewReservationPolicy(adapterData, () => setOpenAddModal(false));
    clearErrors();
  };

  const onSubmitEdit = (data: any) => {
    const { frequency, ...rest } = data;
    const adapterData = {
      type: "DISCOUNT",
      frequency: translatePolicyFrequency(frequency),
      ...rest,
    };
    updateReservationPolicy &&
      updateReservationPolicy(selectPolicy?.id as number, adapterData, () =>
        // setOpenDetailModal(false)
        setSelectPolicy(null)
      );
  };

  return (
    <>
      <div className="h-full bg-white rounded-md  min-h-screen">
        <div>
          <GenericTable
            tableTitles={titles}
            tableData={displayData}
            actions={actions}
            rowAction={rowAction}
            loading={isLoading}
          />
        </div>

        <DiscountContext.Provider value={{ isFetching, control, watch, reset }}>
          {openAddModal && (
            <Modal state={openAddModal} close={setOpenAddModal}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <AddPolicy
                  context={DiscountContext}
                  title=" Añadir nueva"
                  type="discount"
                />
              </form>
            </Modal>
          )}
          {selectPolicy && (
            <Modal state={!!selectPolicy} close={setSelectPolicy}>
              <form onSubmit={handleSubmit(onSubmitEdit)}>
                <AddPolicy
                  title="Editar "
                  defaultValue={selectPolicy}
                  action={handleDeleted}
                  context={DiscountContext}
                  type="discount"
                />
              </form>
            </Modal>
          )}
        </DiscountContext.Provider>
      </div>
    </>
  );
};

export default DiscountPolicy;
export const translatePolicyFrequencyToSp = (policy: string) => {
  switch (policy) {
    case "days":
      return "Días";
    case "weeks":
      return "Semanas";
    case "months":
      return "Meses";
    default:
      return "";
  }
};
export const translatePolicyFrequencyToSpInTab = (
  policy: string,
  quantity?: number
) => {
  switch (policy) {
    case "days":
      return quantity === 1 ? "Dia" : "Días";
    case "weeks":
      return quantity === 1 ? "Semana" : "Semanas";
    case "months":
      return quantity === 1 ? "Mes" : "Meses";
    default:
      return "";
  }
};

export const translatePolicyFrequency = (policy: string) => {
  switch (policy) {
    case "Días":
      return "days";
    case "Semanas":
      return "weeks";
    case "Meses":
      return "months";
    default:
      return "days";
  }
};
