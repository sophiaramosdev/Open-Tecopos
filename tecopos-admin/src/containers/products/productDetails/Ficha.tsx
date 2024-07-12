import React, { useContext, useEffect, useState } from "react";
import ProductTypeBadge from "../../../components/misc/badges/ProductTypeBadge";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import {
  FixedCost,
  ProductInterface,
  SuppliesInterface,
} from "../../../interfaces/ServerInterfaces";
import { translateMeasure } from "../../../utils/translate";
import { DetailProductContext } from "../DetailProductContainer";
import { useForm, SubmitHandler } from "react-hook-form";
import Modal from "../../../components/modals/GenericModal";
import {
  ArrowUturnLeftIcon,
  ListBulletIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import useServerProduct from "../../../api/useServerProducts";
import SearchComponent from "../../../components/misc/SearchComponent";
import CustomRadio, {
  CustomRadioData,
} from "../../../components/forms/CustomRadio";
import EmptyList from "../../../components/misc/EmptyList";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import Button from "../../../components/misc/Button";
import Input from "../../../components/forms/Input";
import { toast } from "react-toastify";
import { formatCurrency } from "../../../utils/helpers";
import { useAppSelector } from "../../../store/hooks";
import { BtnActions } from "../../../components/misc/MultipleActBtn";
import { Plus, TrashOutline } from "heroicons-react";
import AlertContainer from "../../../components/misc/AlertContainer";

interface NewElement {
  addElement: Function;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

//New Materia Prima Product Modal ---------------------------------------------------------------------------------------
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
          input:
            watch("supplyProductId") === product.id ? (
              <Input
                name="quantity"
                type="number"
                placeholder="Cantidad (*)"
                control={control}
                rules={{ required: "Campo requerido" }}
              />
            ) : (
              ""
            ),
        },
      })
    );
  //---------------------------------------------------------------------------------------------

  return (
    <>
      <SearchComponent findAction={setSearch} />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mt-5 pr-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-100">
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
        <div className="flex p-2 justify-end">
          <Button name="Agregar" type="submit" color="slate-600" />
        </div>
      </form>
    </>
  );
};

//-----------------------------------------------------------------------------------------------------------

//Update Quantity Modal ------------------------------------------------------------------------------------
interface UpdateQuantInt {
  currentQuant: number;
  updateQuant: SubmitHandler<Record<string, number>>;
}

const UpdateQuant = ({ currentQuant, updateQuant }: UpdateQuantInt) => {
  const { control, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(updateQuant)}>
      <Input
        name="quantity"
        label="Cantidad"
        type="number"
        rules={{ required: "Debe insertar una cantidad" }}
        control={control}
        defaultValue={currentQuant}
      />
      <div className="py-2 flex justify-end">
        <Button name="Aceptar" type="submit" color="slate-600" />
      </div>
    </form>
  );
};

//Costos Fijos --------------------------------------------------------------

//Componente de Costo Fijo -----------------------------------------------------------------------------------
interface FixCost {
  fixedCost?: FixedCost;
  close: Function;
}

const FixedCosts = ({ fixedCost, close }: FixCost) => {
  const { control, handleSubmit, reset } = useForm();
  const { addFixedCost, editFixedCost, deleteFixedCost, isFetching } =
    useServerProduct();
  const { product, updateFixedCostState, updateStockProductState } =
    useContext(DetailProductContext);
  const [view, setView] = useState("form");

  const onSubmit: SubmitHandler<Record<string, number>> = (data) => {
    if (fixedCost) {
      const callback = (cost: FixedCost, id: number) => {
        reset();
        close();
        updateFixedCostState &&
          updateFixedCostState(cost, id, updateStockProductState);
      };
      editFixedCost(fixedCost.id, data, callback);
    } else {
      const callback = (cost: FixedCost) => {
        reset();
        close();
        updateFixedCostState &&
          updateFixedCostState(cost, undefined, updateStockProductState);
      };
      product && addFixedCost({ ...data, productId: product.id }, callback);
    }
  };

  //----------------------------------------------------------------------------------

  //Delete cost ---------------------------------------------------------------
  const deleteCost = (id?: number) => {
    const callback = (id: number) => {
      reset();
      updateFixedCostState &&
        updateFixedCostState(undefined, id, updateStockProductState);
      close();
    };
    deleteFixedCost(id ?? 0, callback);
  };
  //--------------------

  return (
    <>
      {view === "form" && (
        <div className="relative">
          <div className="inline-flex gap-3 items-center">
            {fixedCost ? (
              <h5 className="text-gray-500">{fixedCost.description}</h5>
            ) : (
              <h5 className="text-gray-500">Nuevo gasto fijo</h5>
            )}
            {fixedCost && (
              <Button
                color="gray-400"
                icon={<TrashOutline className="h-5 text-gray-500" />}
                action={() => setView("delete")}
                outline
              />
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-3">
              <Input
                name="description"
                control={control}
                placeholder="Descripción"
                defaultValue={fixedCost?.description}
              />
              <Input
                name="costAmount"
                control={control}
                type="number"
                placeholder="Monto"
                defaultValue={fixedCost?.costAmount}
                numberAsCurrency={{ precision: 2 }}
              />
            </div>

            <div className="inline-flex justify-end gap-2 pt-3 w-full">
              <Button
                name={`${fixedCost ? "Actualizar" : "Crear"}`}
                color="slate-600"
                type="submit"
                loading={isFetching}
              />
            </div>
          </form>
        </div>
      )}
      {view === "delete" && (
        <AlertContainer
          onAction={() => deleteCost(fixedCost?.id ?? 0)}
          onCancel={() => close()}
          text={`Seguro que desea continuar?`}
          title={`Eliminar ${fixedCost?.description}`}
          loading={isFetching}
        />
      )}
    </>
  );
};
//------------------------------------------------------------------------------------------

//Main Component ---------------------------------------------------------------------------------

const Ficha = () => {
  const { product, manageSupplies, updateStockProductState } =
    useContext(DetailProductContext);
  const { business } = useAppSelector((state) => state.init);
  const [dataTable, setDataTable] = useState<SuppliesInterface[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<{
    idx: number | null;
    state: boolean;
  }>({ idx: null, state: false });
  const [fixCostModal, setFixCostModal] = useState<{
    state: boolean;
    current?: number;
  }>({ state: false });

  useEffect(() => {
    product?.supplies && setDataTable(product.supplies);
  }, [product]);

  const precission = Number(
    business?.configurationsKey.find(
      (item) => item.key === "precission_after_coma"
    )?.value
  );

  const addSuplies = (data: ProductInterface & { quantity: number }) => {
    setDataTable([
      ...dataTable,
      {
        id: 0,
        quantity: data.quantity,
        supply: {
          id: data.id,
          averageCost: data.averageCost,
          measure: data.measure,
          name: data.name,
          type: data.type,
        },
      },
    ]);
    setAddModal(false);
  };

  const updateQuantity: SubmitHandler<Record<string, number>> = (data) => {
    const nextData = [...dataTable];
    if (editModal.idx !== null) {
      const idx = editModal.idx;
      nextData.splice(idx, 1, {
        ...nextData[idx],
        id: 0,
        quantity: data.quantity,
      });
    }
    setDataTable(nextData);
    setEditModal({ state: false, idx: null });
  };

  const deleteSupply = (idx: number) => {
    const nextData = [...dataTable];
    nextData.splice(idx, 1, { ...nextData[idx], id: -1 });
    setDataTable(nextData);
    setEditModal({ state: false, idx: null });
  };

  const undelete = (idx: number) => {
    const nextData = [...dataTable];
    nextData.splice(idx, 1, { ...nextData[idx], id: 2 });
    setDataTable(nextData);
    setEditModal({ state: false, idx: null });
  };

  const fetchSupplyUpdate = () => {
    const dataToSend = dataTable.filter((item) => item.id !== -1);
    const data = dataToSend.map((item) => ({
      supplyProductId: item.supply.id,
      quantity: item.quantity,
    }));

    manageSupplies &&
      // watch("performance") > 1
      //   ? manageSupplies(product?.id, { products: data, performance: watch("performance") }, updateStockProductState)
      //   : manageSupplies(product?.id, { products: data, performance: 1 }, updateStockProductState)
      manageSupplies(
        product?.id,
        { products: data, performance: watch("performance") },
        updateStockProductState
      );
  };

  //Data for table of supplies---------------------------------------------------------------------------------
  let total = 0;
  const tableData: DataTableInterface[] = [];
  dataTable.forEach((item, idx) => {
    tableData.push({
      rowId: item.supply.id,
      boldRow: item.id === 0,
      deletedRow: item.id === -1,
      payload: {
        Producto: item.supply.name,
        Tipo: <ProductTypeBadge type={item.supply.type} />,
        Cantidad: item.quantity,
        U_Medida: translateMeasure(item.supply.measure),
        U_Costo: formatCurrency(
          item.supply.averageCost * item.quantity,
          business?.costCurrency ?? "CUP",
          precission
        ),
        "": (
          <div className="flex gap-1">
            {item.id !== -1 ? (
              <>
                <Button
                  icon={<PencilIcon className="h-4 text-yellow-500" />}
                  color="yellow-300"
                  action={() => setEditModal({ idx, state: true })}
                  outline
                />
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
    });
    total += item.supply.averageCost * item.quantity;
  });

  tableData.length !== 0 &&
    tableData.push({
      payload: {
        Producto: <p className="text-sm font-semibold">Subtotal</p>,
        Tipo: "",
        Cantidad: "",
        U_Medida: "",
        U_Costo: (
          <p className="text-sm font-semibold">
            {"$" +
              formatCurrency(
                total,
                business?.costCurrency ?? "CUP",
                precission
              )}
          </p>
        ),
        "": "",
      },
    });

  const tableTitles = [
    "Producto",
    "Tipo",
    "Cantidad",
    "U_Medida",
    "U_Costo",
    "",
  ];

  const actions: BtnActions[] = [
    {
      title: "Añadir Producto",
      action: () => setAddModal(true),
      icon: <PlusIcon className="h-5" />,
    },
  ];

  //----------------------------------------------------------------------------------------------------

  //Data for table fixed Cost ----------------------------------------------------
  let totalCost = 0;
  const costTitles = ["Descripción", "Monto"];
  const costData: DataTableInterface[] = [];

  product?.fixedCosts?.forEach((item) => {
    costData.push({
      rowId: item.id,
      payload: {
        Descripción: item.description,
        Monto: `$${formatCurrency(item.costAmount, business?.costCurrency)}`,
      },
    });
    totalCost += item.costAmount;
  });

  costData.length !== 0 &&
    costData.push({
      payload: {
        Descripción: <p className="text-sm font-semibold">Subtotal</p>,
        Monto: (
          <p className="text-sm font-semibold">
            {"$" +
              formatCurrency(
                totalCost,
                business?.costCurrency ?? "CUP",
                precission
              )}
          </p>
        ),
        "": "",
      },
    });

  const rowActionCost = (id?: number) =>
    setFixCostModal({ state: true, current: id });

  const costActions: BtnActions[] = [
    {
      title: "Insertar gasto",
      icon: <Plus className="h-5" />,
      action: () => setFixCostModal({ state: true }),
    },
  ];
  //----------------------------------------------------------------------------------

  const { control, watch } = useForm();

  return (
    <div>
      <div className="border border-slate-300 rounded-md p-5 h-[34rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-50 pr-5">
        <div className="inline-flex pb-3">
          <span className="text-gray-600 font-semibold uppercase">{`Costo total: $${formatCurrency(
            !!product?.recipe
              ? product.recipe.unityToBeProducedCost
              : totalCost + total,
            business?.costCurrency
          )}`}</span>
        </div>

        <div className="w-1/2">
          <div className="w-1/2">
            <Input
              label="Rendimiento"
              name="performance"
              control={control}
              rules={{ required: "Este campo es requerido" }}
              defaultValue={product?.performance ? product?.performance : 1}
              type="number"
            />
          </div>

          {watch("performance") > 1 && (
            <div className="inline-flex pb-3">
              <span className="text-gray-600 font-semibold uppercase">{`COSTO EN BASE A RENDIMIENTO: $${formatCurrency(
                (!!product?.recipe
                  ? product.recipe.unityToBeProducedCost
                  : totalCost + total) / watch("performance"),
                business?.costCurrency,
                precission
              )}`}</span>
            </div>
          )}
        </div>

        {!!product?.recipe ? (
          <div className="border border-gray-300 bg-gray-100 p-5 rounded-md">
            Este producto está asociado a la receta:{" "}
            <span className="font-semibold">{product.recipe.name}</span>
          </div>
        ) : (
          <div>
            <h5 className="text-gray-700 py-3 text-sm font-semibold">
              Costos de materia prima
            </h5>
            <GenericTable
              tableData={tableData}
              tableTitles={tableTitles}
              actions={actions}
            />
          </div>
        )}
        <h5 className="text-gray-700 py-3 text-sm font-semibold">
          Costos fijos
        </h5>
        <GenericTable
          tableData={costData}
          tableTitles={costTitles}
          actions={costActions}
          rowAction={rowActionCost}
        />
      </div>
      <div className="flex justify-end py-4">
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

      {editModal.state && editModal.idx !== null && (
        <Modal
          state={editModal.state}
          close={(state: boolean) => setEditModal({ state, idx: null })}
        >
          {
            <UpdateQuant
              currentQuant={dataTable[editModal.idx].quantity}
              updateQuant={updateQuantity}
            />
          }
        </Modal>
      )}

      {fixCostModal.state && (
        <Modal
          state={fixCostModal.state}
          close={() => setFixCostModal({ state: false })}
        >
          <FixedCosts
            fixedCost={product?.fixedCosts.find(
              (item) => item.id === fixCostModal.current
            )}
            close={() => setFixCostModal({ state: false })}
          />
        </Modal>
      )}
    </div>
  );
};

//--------------------------------------------------------------------------------------------------

export default Ficha;
