import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import { Cog8ToothIcon } from "@heroicons/react/24/outline";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import {
  FaArrowRotateLeft,
  FaArrowRotateRight,
  FaPlus,
  FaTrash,
} from "react-icons/fa6";
import { useAppSelector } from "../../store/hooks";
import { FixedCostCategoriesInterface } from "../../interfaces/ServerInterfaces";
import Modal from "../../components/misc/GenericModal";
import Input from "../../components/forms/Input";
import TextArea from "../../components/forms/TextArea";
import Button from "../../components/misc/Button";
import useServer from "../../api/useServerMain";
import AlertContainer from "../../components/misc/AlertContainer";

const FixedCosts = () => {
  const { fixedCostCategories } = useAppSelector((state) => state.nomenclator);
  const [currentData, setCurrentData] = useState<
    FixedCostCategoriesInterface | undefined | null
  >(null);
  //Breadcrumb data ---------------------------
  const paths: PathInterface[] = [
    {
      name: "Configuraciones",
    },
    {
      name: "Costos fijos",
    },
  ];

  //---------------------------------------------

  //Table data ------------------------------------

  const tableTitles = ["Concepto", "Descripción"];

  const tableData: DataTableInterface[] = fixedCostCategories.map((data) => ({
    rowId: data.id,
    payload: {
      Concepto: data.name,
      Descripción: data.description,
    },
  }));

  const tableActions: BtnActions[] = [
    {
      title: "Nuevo costo fijo",
      icon: <FaPlus className="h-7" />,
      action: () => setCurrentData(undefined),
    },
  ];

  const rowAction = (id: number) => {
    const current = fixedCostCategories.find((elem) => elem.id === id);
    setCurrentData(current);
  };

  //-----------------------------------------------

  return (
    <>
      <Breadcrumb
        icon={<Cog8ToothIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        actions={tableActions}
        rowAction={rowAction}
      />

      {currentData !== null && (
        <Modal state={currentData !== null} close={() => setCurrentData(null)}>
          <FormData data={currentData} close={() => setCurrentData(null)} />
        </Modal>
      )}
    </>
  );
};

//Edit View in Modal ====================================

interface FormFCInterface {
  data?: FixedCostCategoriesInterface;
  close: Function;
}

const FormData = ({ data, close }: FormFCInterface) => {
  const { handleSubmit, control, formState } = useForm();
  const { isSubmitting } = formState;
  const {
    addFixedCostCategory,
    updateFixedCostCategory,
    deleteFixedCostCategory,
    isFetching,
  } = useServer();

  const [del, setDel] = useState(false);

  const onSubmit: SubmitHandler<Record<string, any>> = async (values) => {
    if (data) {
      await updateFixedCostCategory(data.id, values, close);
    } else {
      await addFixedCostCategory(values, close);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-3">
      <div>
        <Input
          name="name"
          label="Concepto"
          control={control}
          defaultValue={data?.name}
        />
        <TextArea
          name="description"
          label="Descripción"
          control={control}
          defaultValue={data?.description}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {data ? (
          <Button
            icon={<FaTrash className="h-5 text-red-500" />}
            color="red-500"
            name="Eliminar"
            textColor="red-500"
            action={() => setDel(true)}
            outline
          />
        ) : (
          <span />
        )}
        <Button
          type="submit"
          icon={
            data ? (
              <FaArrowRotateRight
                className={`h-5 ${isSubmitting ? "animate-spin" : ""}`}
              />
            ) : (
              <FaPlus className="h-5" />
            )
          }
          color="slate-600"
          name={`${data ? "Actualizar" : "Insertar"}`}
          loading={!data&&isSubmitting}
          disabled={isFetching}
        />
      </div>

      {del && (
        <Modal state={del} close={setDel}>
          <AlertContainer
            onAction={() => deleteFixedCostCategory(data!.id, close)}
            onCancel={setDel}
            text="¿Seguro que desea eliminar esta categoría?"
            title={`Eliminando ${data?.name}`}
            loading={isFetching}
          />
        </Modal>
      )}
    </form>
  );
};

export default FixedCosts;
