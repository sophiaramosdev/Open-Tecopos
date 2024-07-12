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
import {
  translatePolicyFrequency,
  translatePolicyFrequencyToSp,
  translatePolicyFrequencyToSpInTab,
} from "./DiscountPolicy";
import { ReservationPolicy } from "../../../../interfaces/ServerInterfaces";
import { toast } from "react-toastify";

interface CancelationContextInterface {
  isFetching?: boolean;
  control?: Control;
  reset?: Function;
  watch?: Function;
}
export const CancelationContext = createContext<CancelationContextInterface>(
  {}
);
const CancellationPolicy = () => {
  const {
    getAllReservationPolicy,
    allReservationsPolicy,
    isLoading,
    addNewReservationPolicy,
    isFetching,
    updateReservationPolicy,
    deletedReservationPolicy,
  } = useServerBusiness();

  const { handleSubmit, control, reset, watch } = useForm({ mode: "onSubmit" });

  const [openAddModal, setOpenAddModal] = useState(false);
  const [selectPolicy, setSelectPolicy] = useState<ReservationPolicy | null>(
    null
  );

  useEffect(() => {
    getAllReservationPolicy && getAllReservationPolicy({ type: "CANCELATION" });
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

  const actions = [
    {
      icon: <PlusIcon className="h-7 flex justify-center" title="Añadir" />,
      action: () => setOpenAddModal(true),
      title: "Añadir",
    },
  ];

  const rowAction = (id: number) => {
    const select = allReservationsPolicy.find((item) => item.id === id);
    setSelectPolicy(select ?? null);
  };

  const onSubmit = (data: any) => {
    const { frequency, ...rest } = data;
    const adapterData = {
      type: "CANCELATION",
      frequency: translatePolicyFrequency(frequency),
      ...rest,
    };
    addNewReservationPolicy &&
      addNewReservationPolicy(adapterData, () => setOpenAddModal(false));
  };
  const onSubmitEdit = (data: any) => {
    const { frequency, ...rest } = data;

    const adapterData = {
      type: "CANCELATION",
      frequency: translatePolicyFrequency(frequency),
      ...rest,
    };
    updateReservationPolicy &&
      updateReservationPolicy(selectPolicy?.id as number, adapterData, () =>
        setSelectPolicy(null)
      );
  };
  const handleDeleted = () => {
    deletedReservationPolicy(selectPolicy?.id as number, () =>
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

        <CancelationContext.Provider
          value={{ isFetching, control, reset, watch }}
        >
          {openAddModal && (
            <Modal state={openAddModal} close={setOpenAddModal}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <AddPolicy
                  title=" Añadir nueva"
                  context={CancelationContext}
                  type="cancellation"
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
                  context={CancelationContext}
                  action={handleDeleted}
                  type="cancellation"
                />
              </form>
            </Modal>
          )}
        </CancelationContext.Provider>
      </div>
    </>
  );
};

export default CancellationPolicy;
