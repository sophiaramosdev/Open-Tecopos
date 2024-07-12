import { useContext, useEffect, useState } from "react";
import {
  Manufacturations,
  ProductInterface,
} from "../../../interfaces/ServerInterfaces";
import { DetailProductContext } from "../DetailProductContainer";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { translateMeasure } from "../../../utils/translate";
import {
  ArrowUturnLeftIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Button from "../../../components/misc/Button";
import { BtnActions } from "../../../components/misc/MultipleActBtn";
import Modal from "../../../components/misc/GenericModal";
import SearchComponent from "../../../components/misc/SearchComponent";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import EmptyList from "../../../components/misc/EmptyList";
import CustomRadio, {
  CustomRadioData,
} from "../../../components/forms/CustomRadio";
import ProductTypeBadge from "../../../components/misc/badges/ProductTypeBadge";
import { SubmitHandler, useForm } from "react-hook-form";
import useServerProduct from "../../../api/useServerProducts";
import { toast } from "react-toastify";

const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

const Descomposition = () => {
  const { product, manageManufacturer } = useContext(DetailProductContext);
  const [dataTable, setDataTable] = useState<
    Partial<Manufacturations & { status: "add" | "del" }>[]
  >([]);
  const [addModal, setAddModal] = useState(false);
  useEffect(() => {
    product?.listManufacturations && setDataTable(product.listManufacturations);
  }, [product]);

  const addSuplies = (data: ProductInterface) => {
    setDataTable([
      ...dataTable,
      { id: data.id, name: data.name, measure: data.measure, status: "add" },
    ]);
    setAddModal(false);
  };

  const deleteSupply = (idx: number) => {
    const nextData = [...dataTable];
    nextData.splice(idx, 1, { ...nextData[idx], status: "del" });
    setDataTable(nextData);
  };

  const undelete = (idx: number) => {
    const nextData = [...dataTable];
    nextData.splice(idx, 1, { ...nextData[idx], status: undefined });
    setDataTable(nextData);
  };

  const fetchSupplyUpdate = () => {
    const dataToSend = dataTable.filter((item) => item.status !== "del");
    const data = dataToSend.map((item) => item.id);
    manageManufacturer && manageManufacturer(product?.id, data);
  };

  //Data for table ---------------------------------------------------------------------------------------
  const tableData: DataTableInterface[] = [];
  dataTable.map((item, idx) =>
    tableData.push({
      rowId: item.id,
      boldRow: item.status === "add",
      deletedRow: item.status === "del",
      payload: {
        Producto: item.name,
        U_Medida: translateMeasure(item.measure),
        "": (
          <div className="flex gap-1">
            {item.status !== "del" ? (
              <>
                <Button
                  icon={<TrashIcon className="h-4 text-red-500" />}
                  color="red-500"
                  action={() => deleteSupply(idx)}
                  outline
                />
              </>
            ) : (
              <Button
                icon={<ArrowUturnLeftIcon className="h-4 text-gray-500" />}
                color="gray-500"
                action={() => undelete(idx)}
                outline
              />
            )}
          </div>
        ),
      },
    })
  );

  const tableTitles = ["Producto", "U_Medida", ""];

  const actions: BtnActions[] = [
    {
      title: "Añadir producto",
      icon: <PlusIcon className="h-6" />,
      action: () => setAddModal(true),
    },
  ];

  //----------------------------------------------------------------------------------------------------
  return (
    <div className="h-[36rem]">
      <div className="border border-slate-300 rounded-md p-3 h-[500px] scrollbar-thin scrollbar-thumb-gray-100 pr-5">
        <GenericTable
          tableData={tableData}
          tableTitles={tableTitles}
          actions={actions}
        />
      </div>
      <div className="flex justify-end py-5">
        <Button
          name="Actualizar"
          color="slate-600"
          action={fetchSupplyUpdate}
        />
      </div>
      {addModal && (
        <Modal state={addModal} close={setAddModal} size="m">
          <NewElement addElement={addSuplies} />
        </Modal>
      )}
    </div>
  );
};

//New Product Modal --------------------------------------------
interface NewElement {
  addElement: Function;
}

const NewElement = ({ addElement }: NewElement) => {
  const { control, handleSubmit, getValues, setError, watch, clearErrors } =
    useForm();
  const { getAllProducts, allProducts, outLoading } = useServerProduct();
  const [search, setSearch] = useState<string | null>(null);

  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    const supplyProductId = getValues("supplyProductId");
    if (!supplyProductId) {
      toast.error("Busque y seleccione un producto", { autoClose: 5000 });
    } else {
      addElement({
        ...allProducts.find((prod) => prod.id === supplyProductId),
        quantity: data.quantity,
      });
    }
  };

  //Data for list product -----------------------------------------------------------------------
  useEffect(() => {
    search &&
      getAllProducts({
        type: "RAW,MANUFACTURED,STOCK,WASTE",
        search,
        all_data: true,
      });
  }, [search]);

  const data: CustomRadioData[] = [];
  search &&
    allProducts.map((product) =>
      data.push({
        value: product.id,
        img:
          product.images[0]?.src ??
          require("../../../assets/image-default.jpg"),
        name: product.name,
        elements: {
          type: <ProductTypeBadge type={product.type} />,
          measure: translateMeasure(product.measure),
          cost: currency.format(product.averageCost),
        },
      })
    );
  //---------------------------------------------------------------------------------------------

  return (
    <>
      <SearchComponent findAction={setSearch} />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mt-5 pr-2 h-[36rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-100">
          {outLoading ? (
            <SpinnerLoading text="Buscando producto" />
          ) : data.length === 0 && !search ? (
            <EmptyList
              title="Buscar Producto"
              subTitle="Inserte un criterio de búsqueda"
            />
          ) : data.length === 0 && search ? (
            <EmptyList
              title="Producto no encontrado"
              subTitle="Inserte otro criterio de búsqueda"
            />
          ) : (
            <CustomRadio
              data={data}
              name="supplyProductId"
              control={control}
              action={() => clearErrors()}
            />
          )}
        </div>
        <div className="flex py-4 justify-end">
          <Button name="Agregar" type="submit" color="slate-600" />
        </div>
      </form>
    </>
  );
};

export default Descomposition;
