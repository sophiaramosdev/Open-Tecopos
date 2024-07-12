import React, { useState, useEffect, useContext, useMemo } from "react";
import Checkbox from "../../../components/forms/Checkbox";
import {
  BasicNomenclator,
  ProductInterface,
} from "../../../interfaces/ServerInterfaces";
import useServerProduct from "../../../api/useServerProducts";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import Button from "../../../components/misc/Button";
import { DetailProductContext } from "../DetailProductContainer";
import TextArea from "../../../components/forms/TextArea";
import { SubmitHandler, useForm } from "react-hook-form";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { Plus } from "heroicons-react";
import MultipleActBtn, {
  BtnActions,
} from "../../../components/misc/MultipleActBtn";
import Modal from "../../../components/misc/GenericModal";
import CustomRadio, {
  CustomRadioData,
} from "../../../components/forms/CustomRadio";
import EmptyList from "../../../components/misc/EmptyList";
import SearchComponent from "../../../components/misc/SearchComponent";
import Input from "../../../components/forms/Input";
import { toast } from "react-toastify";
import { translateMeasure } from "../../../utils/translate";
import ProductTypeBadge from "../../../components/misc/badges/ProductTypeBadge";
import { CheckIcon } from "@heroicons/react/20/solid";
import { TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import AlertContainer from "../../../components/misc/AlertContainer";
import { Resource } from "../../../interfaces/Interfaces";

interface Addon {
  product: ProductInterface | null;
}

const Resources = () => {
  // const { outLoading } = useServerProduct();
  const {
    product,
    updateProduct,
    closeModal = () => {},
  } = useContext(DetailProductContext);
  const [selected, setSelected] = useState<Resource[]>([]);
  const [resourceDelete, setResourceDelete] = useState<any>(null);
  const [addModal, setAddModal] = useState(false);
  const [deleteModal, setdeleteModal] = useState(false);

  const tableTitle = ["Nombre", "Descripción", "Disponibilidad", "Reservable",""];

  const [resourceIds, setResourcesIds] = useState(
    [...(product?.resources || []), ...selected].map((item) => item.id)
  );
  const [resourceList, setResourcesList] = useState([
    ...(product?.resources || []),
    ...selected,
  ]);

  const { tableData } = useMemo(() => {
    const tableData: DataTableInterface[] = [];

    resourceList.forEach((item) => {
      tableData.push({
        rowId: item.id,
        payload: {
          Nombre: item.code,
          Descripción: item.description,
          Disponibilidad: (
            <div className="flex justify-center">
              {item.isAvailable ? (
                <CheckIcon className="w-7 text-green-500" />
              ) : (
                <XMarkIcon className="w-7 text-red-500" />
              )}
            </div>
          ),
          Reservable: (
            <div className="flex justify-center">
              {item.isReservable ? (
                <CheckIcon className="w-7 text-green-500" />
              ) : (
                <XMarkIcon className="w-7 text-red-500" />
              )}
            </div>
          ),
          "":<Button
          icon={<TrashIcon className="h-4 text-red-500" />}
          color="red-500"
          action={() => {
            setResourceDelete(item.id);
              setdeleteModal(true);
          }}
          outline
        />
        },
      });
    });

    return { tableData };
  }, [resourceList]);

  const { control, handleSubmit } = useForm();
  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    updateProduct &&
      updateProduct(product?.id as number, { resourceIds }, () => {});
    //closeModal()
  };

  const handleAdd = (resource: any) => {
    const exitsInList = selected?.find(
      (item: any) => item?.id === resource?.id
    );
    if (!exitsInList) {
      setSelected([resource, ...selected]);
      setResourcesList([resource, ...resourceList]);
      setResourcesIds([resource?.id, ...resourceIds]);
      toast.success("Recurso agregado");
    } else {
      toast.warning("El recurso ya se encuentra en la lista");
    }
  };
  const hadleDelet = (resourceId: any) => {
    const resourceIds = selected
      .filter((item: any) => item.id !== resourceId)
      .map((item: any) => item.id);

    setResourcesList(resourceList.filter((item) => item.id !== resourceId));
    setResourcesIds(resourceIds.map((item) => item?.id));

    setdeleteModal(false);
  };

  const costActions: BtnActions[] = [
    {
      title: "Añadir recurso",
      icon: <Plus className="h-5" />,
      action: () => setAddModal(true),
    },
  ];

  // if (outLoading)
  //   return (
  //     <div className="h-96">
  //       <SpinnerLoading />
  //     </div>
  //   );
  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col items-stretch p-5"
      >
        <div className="h-96 overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
          <GenericTable
            tableData={tableData}
            tableTitles={tableTitle}
            actions={costActions}
          />
        </div>

        <div className="flex justify-end py-2 ">
          <Button name="Actualizar" color="slate-600" type="submit" />
        </div>
      </form>

      {addModal && (
        <Modal state={addModal} close={setAddModal} size="m">
          <NewElement addElement={handleAdd} />
        </Modal>
      )}
      <>
        {deleteModal && (
          <Modal close={setdeleteModal} state={deleteModal}>
            <AlertContainer
              title={`¡Eliminar recurso asociado!`}
              onAction={() => hadleDelet(resourceDelete)}
              onCancel={() => setdeleteModal(false)}
              text={`¿Seguro que desea eliminar este recurso ?`}
              //loading={outLoading}
            />
          </Modal>
        )}
      </>
    </>
  );
  // return (
  //   <>
  //     <form
  //       onSubmit={handleSubmit(onSubmit)}
  //       className="flex flex-col items-stretch h-full"
  //     >
  //       <div className="h-96 overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
  //         <TextArea
  //           name="elaborationSteps"
  //           control={control}
  //           label="Pasos de elaboración"
  //           defaultValue={product?.elaborationSteps}
  //         />
  //       </div>

  //       <div className="h-96 overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
  //         <Checkbox
  //           data={checkData}
  //           selected={selected}
  //           setSelected={setSelected}
  //         />
  //       </div>

  //       <div className="flex justify-end py-2 ">
  //         <Button name="Actualizar" color="slate-600" type="submit" />
  //       </div>
  //     </form>
  //   </>
  // );
};

interface NewElement {
  addElement: Function;
}
const NewElement = ({ addElement }: NewElement) => {
  const { control, handleSubmit, getValues, setError, watch, clearErrors } =
    useForm();
  const { allResources, outLoading, getAllResources, isLoading } =
    useServerProduct();
  const [search, setSearch] = useState<string | null>(null);

  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    const resourceId = getValues("resourceId");
    if (!resourceId) {
      toast.error("Busque y seleccione un recurso", { autoClose: 5000 });
    } else {
      const resouerce = allResources.find((item) => item.id === resourceId);
      addElement(resouerce);
    }
  };

  //Data for list product -----------------------------------------------------------------------
  useEffect(() => {
    search &&
      getAllResources({
        search,
        all_data: true,
      });
  }, [search]);

  const data: CustomRadioData[] = [];
  search &&
    allResources.map((resource) =>
      data.push({
        value: resource.id,
        img:
          //resource.images[0]?.src ??
          require("../../../assets/image-default.jpg"),
        name: resource.code,
        elements: {
          // type: <ProductTypeBadge type={product.type} />,
          // measure: translateMeasure(product.measure),
          //cost: currency?.format(product.averageCost),
          // input:
          //   watch("supplyProductId") === product.id ? (
          //     <Input
          //       name="quantity"
          //       type="number"
          //       placeholder="Cantidad (*)"
          //       control={control}
          //       rules={{ required: "Campo requerido" }}
          //     />
          //   ) : (
          //     ""
          //   ),
        },
      })
    );
  //---------------------------------------------------------------------------------------------

  return (
    <>
      <div className=" ml-2 mr-7 ">
        <SearchComponent findAction={setSearch} />
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mt-5 pr-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-100">
          {outLoading || isLoading ? (
            <SpinnerLoading text="Buscando recurso" />
          ) : data.length === 0 && !search ? (
            <EmptyList
              title="Buscar Recurso"
              subTitle="Inserte un criterio de búsqueda"
            />
          ) : data.length === 0 && search ? (
            <EmptyList
              title="Recurso no encontrado"
              subTitle="Inserte otro criterio de búsqueda"
            />
          ) : (
            <CustomRadio
              data={data}
              name="resourceId"
              control={control}
              action={() => clearErrors()}
            />
          )}
        </div>
        <div className="flex p-2 justify-end">
          <Button name="Agregar" type="submit" color="slate-600" />
        </div>
      </form>
    </>
  );
};

export default Resources;
