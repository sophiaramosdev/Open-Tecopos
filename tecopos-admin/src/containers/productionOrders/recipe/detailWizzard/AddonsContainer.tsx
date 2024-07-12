import React, { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../../../../store/hooks";
import { translateMeasure } from "../../../../utils/translate";
import MeasureInput from "../../../../components/forms/MeasureInput";
import {
  SubmitHandler,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFieldArrayReplace,
  UseFieldArrayUpdate,
  useFieldArray,
  useForm,
} from "react-hook-form";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import useServerProduct from "../../../../api/useServerProducts";
import {
  ProductInterface,
  RecipeInterface,
} from "../../../../interfaces/ServerInterfaces";
import SearchComponent from "../../../../components/misc/SearchComponent";
import SpinnerLoading from "../../../../components/misc/SpinnerLoading";
import EmptyList from "../../../../components/misc/EmptyList";
import ProductTypeBadge from "../../../../components/misc/badges/ProductTypeBadge";
import {
  ArrowUturnLeftIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Button from "../../../../components/misc/Button";
import Modal from "../../../../components/misc/GenericModal";
import Input from "../../../../components/forms/Input";
import { BtnActions } from "../../../../components/misc/MultipleActBtn";
import { formatCurrency, truncateValue } from "../../../../utils/helpers";
import { toast } from "react-toastify";

// Función para calcular la división con mayor precisión
function divisionWithPrecision(num1: number, num2: number, precision: number): number {
  // Realizar la división multiplicando por la potencia de 10
  const result: number = num1 / num2;

  // Ajustar la precisión del resultado
  const finalResult: number = parseFloat(result.toFixed(precision));

  return finalResult;
}


interface NormalizedRawProductInterface {
  productId: number;
  productName: string;
  measure: string;
  quantity: number;
  productCost: number;
}
//Main Component +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface AddonsInterface {
  recipe: RecipeInterface;
  addRecipeProducts: Function;
  setRecipeState: Function;
  isFetching: boolean;
}
const AddonsContainer = ({
  recipe,
  addRecipeProducts,
  setRecipeState,
  isFetching,
}: AddonsInterface) => {
  const { measures } = useAppSelector((state) => state.nomenclator);
  const { business } = useAppSelector((state) => state.init);
  const { handleSubmit, control, watch } = useForm();
  const { append, fields, replace, remove, update } = useFieldArray({
    name: "products",
    control,
  });
  const [newProductModal, setNewProductModal] = useState(false);
  const [quantModal, setQuantModal] = useState<any | null>(null);
  const measuresSelector = measures.map((item) => ({
    key: item.code,
    value: item.value,
  }));

  //Values to calculate ------------------------------------------
  const precission = Number(
    business?.configurationsKey.find(
      (itm) => itm.key === "precission_after_coma"
    )?.value
  );

  const unitToProduce: number =
    watch("prodUnit")?.quantity ?? recipe.unityToBeProduced;

  const measureToProduce: string = watch("prodUnit")?.measure;

  const realPerformace: number = watch("realPerformance") ? watch("realPerformance") : recipe.realPerformance;

  //---------------------------------------------------------------

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    if (data.products.length === 0) {
      toast.error("Debe insertar al menos un producto");
      return;
    }
    const dataToSend = {
      measure: data.prodUnit.measure,
      unityToBeProduced: data.prodUnit.quantity,
      realPerformance: data.realPerformance,
      products:
        fields.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
        })) ?? [],
    };

    addRecipeProducts(recipe.id, dataToSend, setRecipeState);
  };

  useEffect(() => {
    const rawProducts: NormalizedRawProductInterface[] =
      recipe.productsRawRecipe.map((item) => ({
        productId: item.product.id,
        measure: item.product.measure,
        productCost: item.product.averageCost,
        productName: item.product.name,
        quantity: item.quantity,
      }));
    if (rawProducts.length > 0) replace(rawProducts);
  }, []);

  interface TotalVisualInterface {
    totalMass: number;
    totalCost: number;
    performace: number | null;
    performaceUnitCost: number | null;
  }
  const totalsCalc: TotalVisualInterface = useMemo(() => {
    let total: TotalVisualInterface = {
      totalMass: 0,
      totalCost: 0,
      performace: null,
      performaceUnitCost: null,
    };
    fields.forEach((itm: any) => {
      if (itm.quantity) {
        total.totalMass += itm.quantity;
        if (itm.productCost) total.totalCost += itm.productCost * itm.quantity;
      }
    });
    if (unitToProduce) {
      total.performace = total.totalMass / unitToProduce;
      // if (total?.totalCost !== 0) {
      //   total.performaceUnitCost =
      //     total.totalCost / (realPerformace || unitToProduce / total.totalCost);
      // }
      if (total?.totalCost !== 0) {
        let divisor;
        if (realPerformace) {
          divisor = realPerformace;
        } else {
          // Si realPerformace es falsy, usar unitToProduce / total.totalCost como divisor
          divisor = divisionWithPrecision(unitToProduce, total.totalCost, precission);
        }
        total.performaceUnitCost = total.totalCost / divisor;
      }
    }

    return total;
  }, [fields, unitToProduce, realPerformace]);

  //Table----------------------------------------------
  const tableTitles = [
    "Nombre",
    "U/M",
    "Cantidad",
    "Costo total",
    "Costo unitario",
    "IC",
  ];
  const tableData: DataTableInterface[] = [];
  fields.forEach((item: any) => {
    const performance = realPerformace || totalsCalc.performace;
    const ic = performance
      ? truncateValue(item.quantity / performance, precission)
      : "-";
    tableData.push({
      rowId: item.productId,
      payload: {
        Nombre: item.productName,
        "U/M": item.measure,
        Cantidad: item.quantity,
        "Costo total": formatCurrency(
          item.productCost,
          business?.costCurrency
        ),
        "Costo unitario": formatCurrency(
          item.productCost * item.quantity,
          business?.costCurrency
        ),
        IC: ic,
      },
    });
  });
  if (fields.length !== 0) {
    tableData.push({
      borderTop: true,
      borderBottom: true,
      rowId: "totales",
      payload: {
        Nombre: "Totales",
        "U/M": "",
        Cantidad: (
          <div className="font-semibold">
            {truncateValue(totalsCalc.totalMass, precission)}
          </div>
        ),
        "Costo total": "",
        "Costo unitario": (
          <div className="font-semibold">
            {formatCurrency(totalsCalc.totalCost, business?.costCurrency)}
          </div>
        ),
        IC: "",
      },
    });
  }

  const actions: BtnActions[] = [
    {
      title: "Agregar producto",
      icon: <PlusIcon className="h-5" />,
      action: () => setNewProductModal(true),
    },
  ];

  const rowAction = (id: number) => {
    const elem = fields.find((itm: any) => itm.productId === id);
    if (elem) setQuantModal(elem);
  };

  //------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex w-full justify-center items-center gap-10 pt-5">
        <MeasureInput
          name="prodUnit"
          label="Unidad de producción"
          control={control}
          measures={measuresSelector}
          rules={{
            validate: {
              required: (value) =>
                (!!value.quantity && !!value.measure) || "* Requerido",
            },
          }}
          showInline
          valueDefault={
            recipe?.unityToBeProduced && recipe?.measure
              ? { quantity: recipe.unityToBeProduced, measure: recipe.measure }
              : undefined
          }
          disabledMeasure={fields.length !== 0}
        />
        <div className="relative">
          <div className="inline-flex gap-2 text-xs absolute right-2 -top-4">
            <p className="font-semibold">Rendimiento calculado:</p>
            <p>
              {totalsCalc.performace
                ? truncateValue(totalsCalc.performace, precission)
                : "-"}
            </p>
          </div>
          <Input
            name="realPerformance"
            control={control}
            label="Rendimiento"
            type="number"
            showInline
            rules={{
              validate: { required: (value) => value > 0 || "* Requerido" },
            }}
            defaultValue={recipe.realPerformance}
          />
        </div>
      </div>
      <div className="flex gap-10 justify-center pt-5 w-full">
        <div className="inline-flex gap-2">
          <p className="font-semibold">Costo total:</p>
          <p>{formatCurrency(totalsCalc.totalCost, business?.costCurrency)}</p>
        </div>
        {totalsCalc.performaceUnitCost && (
          <div className="inline-flex gap-2">
            <p className="font-semibold">Costo rendimiento unitario:</p>
            <p>
              {formatCurrency(
                totalsCalc.performaceUnitCost,
                business?.costCurrency,
                precission
              )}
            </p>
          </div>
        )}
      </div>
      <div className="mt-5 h-96 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 p-1">
        <GenericTable
          tableData={tableData}
          tableTitles={tableTitles}
          actions={actions}
          rowAction={rowAction}
        />
      </div>
      <div className="flex justify-end">
        <Button
          name="Actualizar"
          color="slate-600"
          type="submit"
          loading={isFetching}
          disabled={isFetching}
        />
      </div>
      {newProductModal && (
        <Modal state={newProductModal} close={setNewProductModal} size="m">
          <NewProduct
            append={append}
            close={() => setNewProductModal(false)}
            fields={fields}
            measure={measureToProduce}
            remove={remove}
            replace={replace}
          />
        </Modal>
      )}
      {quantModal && (
        <Modal state={!!quantModal} close={() => setQuantModal(null)}>
          <SelectQuant
            product={quantModal}
            close={() => setQuantModal(null)}
            update={update}
            fields={fields}
            remove={remove}
          />
        </Modal>
      )}
    </form>
  );
};

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//New Product Modal +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface NewElemInterface {
  append: UseFieldArrayAppend<Record<string, any>, "products">;
  fields: Record<"id" | string, any>[];
  replace: UseFieldArrayReplace<Record<string, any>, "products">;
  remove: UseFieldArrayRemove;
  close: Function;
  measure: string;
}

const NewProduct = ({
  append,
  remove,
  fields,
  close,
  measure,
}: NewElemInterface) => {
  const { getAllProducts, allProducts, outLoading } = useServerProduct();
  const [search, setSearch] = useState<string | null>(null);
  const [quantModal, setQuantModal] = useState<any | null>(null);

  //Data for list product ---------------------------------------------------------
  useEffect(() => {
    search &&
      getAllProducts({
        type: "STOCK,RAW,MANUFACTURED",
        measure,
        search,
        all_data: true,
      });
  }, [search]);
  //-----------------------------------------------------------------------------
  //Manage selected products------------------------------------------------------
  const getIfSelected = (id: number) => {
    const elem = fields!.find((elem) => elem.productId === id);
    if (elem) {
      return elem;
    } else {
      return null;
    }
  };

  const clickProductEvent = (item: ProductInterface) => {
    const selected = getIfSelected(item.id);
    if (!selected) {
      setQuantModal({
        productId: item.id,
        productName: item.name,
        measure: item.measure,
        productCost: item.averageCost,
      });
    }
  };

  const deleteSelected = (id: number) => {
    const idx = fields.findIndex((elem) => elem.productId === id);
    if (idx !== -1) remove(idx);
  };

  //-------------------------------------------------------------------------------

  return (
    <div>
      <SearchComponent
        findAction={setSearch}
        placeholder="Criterio de búsqueda"
      />
      <div
        className={`mt-5 p-3 pr-2 h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-100 border border-gray-200 rounded-md`}
      >
        {outLoading ? (
          <SpinnerLoading text="Buscando productos" />
        ) : allProducts.length === 0 ? (
          <EmptyList
            title={
              !search ? "Inserte un criterio de búsqueda" : "Sin resultados"
            }
            subTitle={
              search !== ""
                ? "No se ha encontrado ningún producto con relacionado con la búsqueda"
                : undefined
            }
          />
        ) : (
          allProducts.map((item, idx) => {
            const selectedProduct: Record<string, any> | null = getIfSelected(
              item.id
            );
            return (
              <div
                key={idx}
                className={`w-full border border-gray-300 p-5 text-sm rounded-md shadow-md grid grid-cols-5 items-center mb-2 ${selectedProduct ? "ring-1 ring-slate-500" : ""
                  } cursor-pointer`}
                onClick={() => clickProductEvent(item)}
              >
                <div className="col-span-2 flex flex-col">
                  <p className="font-semibold">{item.name}</p>
                </div>
                <ProductTypeBadge type={item.type} />
                <p className="flex items-center justify-center font-semibold">{`${selectedProduct ? selectedProduct.quantity : ""
                  } ${translateMeasure(item.measure)}`}</p>
                {selectedProduct && (
                  <div className="inline-flex gap-2 h-10 justify-end">
                    <Button
                      color="gray-500"
                      icon={
                        <ArrowUturnLeftIcon className="h-5 text-gray-400" />
                      }
                      action={() => deleteSelected(item.id)}
                      outline
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {quantModal && (
        <Modal state={!!quantModal} close={() => setQuantModal(null)}>
          <SelectQuant
            product={quantModal}
            close={() => setQuantModal(null)}
            append={append}
            fields={fields}
          />
        </Modal>
      )}

      <div className="inline-flex w-full justify-end py-2">
        <Button color="slate-600" name="Aceptar" action={close} />
      </div>
    </div>
  );
};
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//Quantity Selector Modal +++++++++++++++++++++++++++++++++++++++++++++++++++++
interface SelectQuantInterface {
  product: NormalizedRawProductInterface | null;
  append?: UseFieldArrayAppend<Record<string, any>, "products">;
  fields: Record<"id" | string, any>;
  update?: UseFieldArrayUpdate<Record<string, any>, "products">;
  remove?: UseFieldArrayRemove;
  close: Function;
}

const SelectQuant = ({
  product,
  close,
  append,
  fields,
  update,
  remove,
}: SelectQuantInterface) => {
  const { control, trigger, getValues } = useForm();

  const submit = async () => {
    if (await trigger("quantity")) {
      if (product?.quantity && update) {
        const idx = fields!.findIndex(
          (elem: any) => elem?.productId === product!.productId
        );
        update!(idx, { ...fields![idx], ...getValues() });
      } else if (append) {
        append({
          productId: product!.productId,
          productName: product!.productName,
          productCost: product!.productCost,
          measure: product!.measure,
          ...getValues(),
        });
      }
      close();
    }
  };

  const removeAction = () => {
    let idx = 0
    fields.forEach((itm: any, indx: number) => {
      if (itm.productId === product?.productId) {
        idx = indx
      }
    });

    if (idx !== -1 && !!remove) {
      remove(idx);
      close();
    }
  };

  return (
    <>
      <Input
        name="quantity"
        label="Cantidad"
        type="number"
        rules={{ validate: (val) => val > 0 || "Debe insertar una cantidad" }}
        control={control}
        defaultValue={product?.quantity}
      />
      <div
        className={`py-2 flex ${!!remove ? "justify-between" : "justify-end"}`}
      >
        {!!remove && (
          <Button
            icon={<TrashIcon className="h-5 text-red-500" />}
            color="red-500"
            textColor="red-500"
            name="Eliminar"
            action={removeAction}
            outline
          />
        )}
        <Button
          name="Aceptar"
          type="button"
          color="slate-600"
          action={submit}
        />
      </div>
    </>
  );
};
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

export default AddonsContainer;
