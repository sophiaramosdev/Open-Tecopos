import useServerBusiness from "../../../api/useServerBusiness";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { useEffect, useState } from "react";
import StateSpanForTable from "../../../components/misc/badges/StateSpanForTable";
import Modal from "../../../components/modals/GenericModal";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  BasicType,
  SelectInterface,
} from "../../../interfaces/InterfacesLocal";
import Input from "../../../components/forms/Input";
import Select from "../../../components/forms/Select";
import Button from "../../../components/misc/Button";
import { useAppSelector } from "../../../store/hooks";
import { translatePaymetMethods } from "../../../utils/translate";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import { ImCreditCard } from "react-icons/im";
import { BsCashCoin } from "react-icons/bs";
import Paginate from "../../../components/misc/Paginate";
import Toggle from "../../../components/forms/Toggle";
import { PaymentGatewayInterface } from "../../../interfaces/ServerInterfaces";

const PaymentGateway = () => {
  const {
    getAllPaymentGateways,
    updatePaymetGatway,
    allPayGateway,
    isLoading,
    isFetching,
    paginate
  } = useServerBusiness();
  const [editModal, setEditModal] = useState<number | null>(null);
  const [filter, setFilter] = useState({page:1})
  
  useEffect(() => {
    getAllPaymentGateways();
  }, []);

  //Data for table------------------------------------------------
  const tableTitles = [
    "Nombre",
    "Estado",
    "Método de pago",
    "Descripción",
  ];
  const tableData: DataTableInterface[] =
    allPayGateway.map((item) => ({
      rowId: item.id,
      payload: {
        Nombre: item.name,
        Estado: (
          <StateSpanForTable
            currentState={item.isActive}
            greenState="Habilitado"
            redState="Deshabilitado"
          />
        ),
        "Método de pago": (
          <div className="flex justify-center items-center">
            {item.paymentWay === "TRANSFER" ? (
              <ImCreditCard className="text-xl" />
            ) : item.paymentWay === "CASH" ? (
              <BsCashCoin className="text-xl" />
            ) : (
              "-"
            )}
          </div>
        ),
        Descripción: <p className="text-justify">{item.description}</p>,
      },
    })) ?? [];

  const rowAction = (id: number) => setEditModal(id);

  //----------------------------------------------------------

  const update = (id: number, data: BasicType) => {
    updatePaymetGatway(id, data, () => setEditModal(null));
  };

  return (
    <>
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        rowAction={rowAction}
        loading={isLoading}
        paginateComponent={<Paginate action={(page:number)=>setFilter({...filter, page})} data={paginate} />}
        syncAction={{action:getAllPaymentGateways, loading:isLoading}}
      />

      {!!editModal && (
        <Modal state={!!editModal} close={() => setEditModal(null)}>
          <EditPaymentGW
            payGateway={allPayGateway.filter(payGateWay => payGateWay.id === editModal)[0]}
            id={editModal}
            update={update}
            isFetching={isFetching}
          />
        </Modal>
      )}
    </>
  );
};

//Edit Component ---------------------------------------------------------------
interface EditInterface {
  payGateway: PaymentGatewayInterface | null;
  id: number | null;
  update: Function;
  isFetching: boolean;
}
const EditPaymentGW = ({ payGateway, id, update, isFetching }: EditInterface) => {
  const { isLoading } = useServerBusiness();
  const { configurationsKey } = useAppSelector((state) => state.init.business!);
  const { handleSubmit, control } = useForm();

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    const { paymentWay, isActive } = data
    id && update(id, {
      paymentWay,
      isActive
    });
  };

  const payWaySelectorData: SelectInterface[] =
    configurationsKey
      .find((item) => item.key === "payment_methods_enabled")
      ?.value.split(",")
      .map((key) => ({
        id: key,
        name: translatePaymetMethods(key),
      })) ?? [];

  if (isLoading)
    return (
      <div className="h-32 flex justify-center items-center">
        <SpinnerLoading />
      </div>
    );
  return (

    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
      <Input name="name" defaultValue={payGateway?.name} control={control} disabled={true} />
      <Select
        name="paymentWay"
        data={payWaySelectorData}
        control={control}
        defaultValue={payGateway?.paymentWay}
      />

      <Toggle name='isActive' control={control} defaultValue={payGateway?.isActive} title='Habilitar pasarela de pago' />
      <div>
        <Button
          name="Actualizar"
          type="submit"
          color="slate-600"
          loading={isFetching}
          disabled={isFetching}
        />
      </div>
    </form>
  );
};

//------------------------------------------------------------------------------

export default PaymentGateway;
