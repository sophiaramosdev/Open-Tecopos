import { useState } from "react";
import { useAppSelector } from "../../store/hooks";
import { GiCheckMark } from "react-icons/gi";
import { GrAdd } from "react-icons/gr";
import { SubmitHandler, useForm } from "react-hook-form";
import { BasicType } from "../../interfaces/InterfacesLocal";
import { Cog8ToothIcon, TrashIcon } from "@heroicons/react/24/outline";
import { PriceSystem } from "../../interfaces/ServerInterfaces";
import useServerBusiness from "../../api/useServerBusiness";
import GenericTable, { DataTableInterface } from "../../components/misc/GenericTable";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import Modal from "../../components/modals/GenericModal";
import Button from "../../components/misc/Button";
import Input from "../../components/forms/Input";
import AlertContainer from "../../components/misc/AlertContainer";
import Breadcrumb, { PathInterface } from "../../components/navigation/Breadcrumb";

interface FormModalInterface {
  data?: PriceSystem;
  action: Function;
  delAction: Function;
  isFetching: boolean;
}

const FormModal = ({
  action,
  isFetching,
  data,
  delAction,
}: FormModalInterface) => {
  const { control, handleSubmit, reset } = useForm();
  const [delAlert, setDelAlert] = useState(false);

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    action(data);
    reset();
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="relative">
        <Input
          name="name"
          control={control}
          rules={{ required: "Requerido" }}
          label={
            data
              ? "Editar sistema de precio"
              : "Cree un nuevo sistema de precio*"
          }
          defaultValue={data?.name}
        />
        <div className={`flex ${data ? "justify-between" : "justify-end"} p-3 items-center`}>
          {data && (
            <Button
              icon={<TrashIcon className="h-5 text-red-500" />}
              color="red-500"
              action={() => setDelAlert(true)}
              outline
            />
          )}
          <Button
            color="slate-600"
            type="submit"
            name={data ? "Actualizar" : "Agregar"}
            loading={isFetching}
            disabled={isFetching}
          />
        </div>
      </form>

      {delAlert && (
        <Modal state={delAlert} close={setDelAlert}>
          <AlertContainer
            onAction={() => delAction(data?.id)}
            onCancel={setDelAlert}
            text="Seguro que desea continuar"
            title={`Eliminar ${data?.name}`}
            loading={isFetching}
          />
        </Modal>
      )}
    </>
  );
};

const PriceSystemConfig = () => {
  const { business } = useAppSelector((state) => state.init);
  const { addPriceSystem, deletePriceSystem, updatePriceSystem, isFetching } = useServerBusiness();
  const initState = { state: false, id: null };
  const [priceSystemModal, setPriceSystemModal] = useState<{
    state: boolean;
    id: number | null;
  }>(initState);

  //TableData --------------------------------------------------------------------------------

  const tableData: DataTableInterface[] =
    business?.priceSystems.map((item) => ({
      rowId: item.id,
      payload: {
        Nombre: item.name,
        Principal: item.isMain ? <GiCheckMark /> : "",
      },
    })) ?? [];

  const tableActions: BtnActions[] = [
    {
      icon: <GrAdd />,
      title: "Nuevo sistema de precio",
      action: () => setPriceSystemModal({ ...priceSystemModal, state: true }),
    },
  ];

  const rowAction = (id: number) => {
    setPriceSystemModal({ state: true, id });
  };

  //--------------------------------------------------------------------------------------------

  //Breadcrumb ----------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Configuraciones",
    },
    {
      name: "Sistemas de precios",
    },
  ];
  //-----------------------------------------------------------------------------------------

  const currentData = business?.priceSystems.find(
    (item) => item.id === priceSystemModal.id
  );

  const formAction = (data: Record<string, string>) => {
    if (priceSystemModal.id) {
      updatePriceSystem(priceSystemModal.id, business?.priceSystems ?? [], data, () =>
        setPriceSystemModal(initState))
    } else {
      addPriceSystem(business?.priceSystems ?? [], data, () =>
        setPriceSystemModal(initState)
      );
    }
  }


  const deleteAction = (id: number) => {
    deletePriceSystem(id, business?.priceSystems ?? [], () =>
      setPriceSystemModal(initState)
    );
  };

  return (
    <div>
      <Breadcrumb
        icon={<Cog8ToothIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableTitles={["Nombre", "Principal"]}
        tableData={tableData}
        actions={tableActions}
        rowAction={rowAction}
      />

      {priceSystemModal.state && (
        <Modal
          state={priceSystemModal.state}
          close={() => {
            setPriceSystemModal(initState);
          }}
        >
          <FormModal
            action={formAction}
            delAction={deleteAction}
            isFetching={isFetching}
            data={currentData}
          />
        </Modal>
      )}
    </div>
  );
};

export default PriceSystemConfig;
