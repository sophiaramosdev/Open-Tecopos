import { useContext, useEffect, useState, createContext, useMemo } from "react";
import ProductTypeBadge from "../../../components/misc/badges/ProductTypeBadge";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { DetailProductContext } from "../DetailProductContainer";
import {
  useForm,
  useFieldArray,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFieldArrayUpdate,
} from "react-hook-form";
import Modal from "../../../components/modals/GenericModal";
import {
  ArrowUturnLeftIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import useServerProduct from "../../../api/useServerProducts";
import SearchComponent from "../../../components/misc/SearchComponent";
import EmptyList from "../../../components/misc/EmptyList";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import Button from "../../../components/misc/Button";
import Input from "../../../components/forms/Input";
import { BtnActions } from "../../../components/misc/MultipleActBtn";
import { translateMeasure } from "../../../utils/translate";
import {
  ProductInterface,
  ServerVariationInterface,
} from "../../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../../store/hooks";
import { formatCurrency } from "../../../utils/helpers";

interface ComposedInterface {
  composedId: number;
  composedName: string;
  composedCost: number;
  measure: string;
  quantity?: number;
  variationId?: number;
  variationName?: string;
}

//Contexto ---------------------------------------------------
interface ComboContextInterface {
  fields: Record<string, any>[];
  append: UseFieldArrayAppend<Record<string, any>, "products">;
  update: UseFieldArrayUpdate<Record<string, any>, "products">;
  remove: UseFieldArrayRemove;
  deleteSelected: Function;
}
const ComboContext = createContext<Partial<ComboContextInterface>>({});

//-------------------------------------------------------------

//Interfaz de para normalizar data de la tabla----------------------------
interface NormalizedData {
  id: number;
  name: string;
  quantity: number;
  measure: string;
  cost: number;
  variations?: { name: string; quantity: number }[];
}
//-----------------------------------------------------------------------------

//Main Component ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
const Combos = () => {
  const { product, manageCombos } = useContext(DetailProductContext);
  const { business } = useAppSelector((state) => state.init);
  const { control, getValues } = useForm();
  const { fields, append, update, remove, insert } = useFieldArray({
    control,
    name: "products",
  });
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<
    (ComposedInterface & { variation: boolean }) | null
  >(null);

  useEffect(() => {
    insert(
      0,
      product!.compositions?.map((item) => {
        let data: ComposedInterface = {
          composedId: item?.composed?.id ?? 0,
          composedName: item?.composed?.name ?? "",
          quantity: item.quantity,
          composedCost: item?.composed?.averageCost,
          measure: item?.composed?.measure ?? "UNIT",
        };
        if (item.variation)
          data = {
            ...data,
            variationId: item.variation.id,
            variationName: item.variation.name,
          };

        return data;
      }) ?? []
    );
  }, []);

  const deleteSelected = (id: number) => {
    const indexes =
      fields!.map((elem: Record<string, any>, idx) => {
        if (elem.composedId === id) {
          return idx;
        } else {
          return Infinity;
        }
      }) ?? [];
    remove!(indexes);
  };

  const editSelected = (data: NormalizedData) => {
    setEditModal({
      composedId: data.id,
      composedName: data.name,
      measure: data.measure,
      variation: !!data?.variations,
      quantity: data.quantity,
      composedCost: data.cost,
    });
  };

  const totalCost = fields!.reduce(
    (total, itm: Record<string, any>) =>
      (itm.composedCost * itm.quantity ?? 0) + total,
    0
  );

  //Data for table ---------------------------------------------------------------------------------------
  const tableData: DataTableInterface[] = useMemo(() => {
    const composedProducts: NormalizedData[] = [];
    fields!.forEach((item: Record<string, any>) => {
      const idx = composedProducts.findIndex(
        (elem) => elem.id === item.composedId
      );
      if (idx !== -1) {
        composedProducts.splice(idx, 1, {
          ...composedProducts[idx],
          quantity: composedProducts[idx].quantity + item.quantity,
          variations: [
            ...composedProducts[idx].variations!,
            { name: item.variationName, quantity: item.quantity },
          ],
        });
      } else {
        let current: NormalizedData = {
          id: item.composedId,
          name: item.composedName,
          quantity: item.quantity,
          measure: item.measure,
          cost: item.composedCost,
        };
        if (item.variationName)
          current.variations = [
            {
              name: item.variationName,
              quantity: item.quantity,
            },
          ];
        composedProducts.push(current);
      }
    });

    return composedProducts.map((item) => ({
      rowId: item.id,
      payload: {
        Producto: item.name,
        "Costo unitario": formatCurrency(item.cost, business?.costCurrency),
        Cantidad: `${item.quantity}${translateMeasure(item.measure)}`,
        "": (
          <div className="flex gap-1 justify-end">
            <Button
              icon={<PencilIcon className="h-4 text-yellow-500" />}
              color="yellow-300"
              action={() => editSelected(item)}
              outline
            />
            <Button
              icon={<TrashIcon className="h-4 text-red-500" />}
              color="red-500"
              action={() => deleteSelected(item.id)}
              outline
            />
          </div>
        ),
      },
      childRows: item.variations
        ? item.variations.map((elem) => ({
            payload: { Producto: elem.name, Cantidad: elem.quantity },
          }))
        : undefined,
    }));
  }, [fields]);

  const tableTitles = ["Producto", "Cantidad", "Costo unitario", ""];

  const actions: BtnActions[] = [
    {
      title: "Añadir Producto",
      action: () => setAddModal(true),
      icon: <PlusIcon className="h-5" />,
    },
  ];
  //----------------------------------------------------------------------------------------------------

  //Submit action ------------------------------------
  const submit = () => {
    const getFinalProduct = (product: Record<string, any>) => {
      const objToArray = Object.entries(product).filter(
        (itm) =>
          !["id", "variationName", "composedName", "composedCost"].includes(
            itm[0]
          )
      );
      return Object.fromEntries(objToArray);
    };

    let data: Record<string, any> = getValues();
    data.products = data.products.map((item: Record<string, any>) =>
      getFinalProduct(item)
    );
    manageCombos!(product?.id, data);
  };
  //------------------------------------------------

  return (
    <ComboContext.Provider
      value={{ fields, append, update, deleteSelected, remove }}
    >
      <div className="border border-slate-300 rounded-md p-5 h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-100 pr-5">
        <div className="py-2">{`Costo total: ${formatCurrency(
          totalCost,
          business?.costCurrency
        )}`}</div>
        <GenericTable
          tableData={tableData}
          tableTitles={tableTitles}
          actions={actions}
        />
      </div>
      <div className="flex justify-end py-5">
        <Button name="Actualizar" color="slate-600" action={submit} />
      </div>
      {addModal && (
        <Modal state={addModal} close={setAddModal} size="m">
          <NewElement close={() => setAddModal(false)} />
        </Modal>
      )}
      {editModal && (
        <Modal state={!!editModal} close={() => setEditModal(null)}>
          {editModal.variation ? (
            <SelectVariationProducts
              product={(() => {
                const { variation, ...rest } = editModal;
                return rest;
              })()}
              close={() => setEditModal(null)}
            />
          ) : (
            <SelectQuant
              close={() => setEditModal(null)}
              product={(() => {
                const { variation, ...rest } = editModal;
                return rest;
              })()}
            />
          )}
        </Modal>
      )}
    </ComboContext.Provider>
  );
};
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//New Product Modal +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface NewElemInterface {
  close: Function;
}

const NewElement = ({ close }: NewElemInterface) => {
  const { fields, deleteSelected } = useContext(ComboContext);
  const { getAllProducts, allProducts, outLoading } = useServerProduct();
  const [search, setSearch] = useState<string | null>(null);
  const [quantModal, setQuantModal] = useState<ComposedInterface | null>(null);
  const [varModal, setVarModal] = useState<ComposedInterface | null>(null);

  //Data for list product ------------------------------------------------------------------------
  useEffect(() => {
    search &&
      getAllProducts({
        type: "MENU,STOCK,SERVICE,VARIATION,ADDON",
        search,
        all_data: true,
      });
  }, [search]);
  //-----------------------------------------------------------------------------------------------

  //Manage selected products----------------------------------------------------------------------
  const getIfSelected = (id: number) => {
    const elem = fields!.find((elem) => elem.composedId === id);
    if (elem) {
      return elem;
    } else {
      return null;
    }
  };

  const clickProductEvent = (item: ProductInterface) => {
    const selected = getIfSelected(item.id);
    if (!selected) {
      if (item.type === "VARIATION") {
        setVarModal({
          composedId: item.id,
          composedName: item.name,
          measure: item.measure,
          composedCost: item.averageCost,
        });
      } else {
        setQuantModal({
          composedId: item.id,
          composedName: item.name,
          measure: item.measure,
          composedCost: item.averageCost,
        });
      }
    }
  };

  const variationsSelected = (item: ProductInterface) => {
    const selected = !!getIfSelected(item.id);
    if (item.type === "VARIATION" && selected) {
      const variations: { name: string; quantity: number }[] = fields!
        .filter((elem) => elem.composedId === item.id)
        .map((elem) => ({ name: elem.variationName, quantity: elem.quantity }));
      return variations;
    } else {
      return null;
    }
  };
  //-----------------------------------------------------------------------------------------------

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
            const selectedProduct = getIfSelected(item.id);
            const variations = variationsSelected(item);
            return (
              <div
                key={idx}
                className={`w-full border border-gray-300 p-5 text-sm rounded-md shadow-md grid grid-cols-5 items-center mb-2 ${
                  selectedProduct ? "ring-1 ring-slate-500" : "cursor-pointer"
                }`}
                onClick={() => clickProductEvent(item)}
              >
                <div className="col-span-2 flex flex-col">
                  <p className="font-semibold">{item.name}</p>
                  {variations && (
                    <div className="flex flex-col text-xs pl-3">
                      {variations.map((item, idx) => (
                        <div
                          key={idx}
                          className="inline-flex justify-between w-1/2"
                        >
                          <p>{item.name}</p>
                          <p>{item.quantity}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <ProductTypeBadge type={item.type} />
                <p className="flex items-center justify-center font-semibold">{`${
                  selectedProduct
                    ? variations
                      ? variations.reduce(
                          (total, item) => item.quantity + total,
                          0
                        )
                      : selectedProduct.quantity
                    : ""
                } ${translateMeasure(item.measure)}`}</p>
                {selectedProduct && (
                  <div className="inline-flex gap-2 h-10 justify-end">
                    <Button
                      color="gray-500"
                      icon={
                        <ArrowUturnLeftIcon className="h-5 text-gray-400" />
                      }
                      action={() => deleteSelected!(item.id)}
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
          <SelectQuant product={quantModal} close={() => setQuantModal(null)} />
        </Modal>
      )}

      {varModal && (
        <Modal state={!!varModal} close={() => setVarModal(null)}>
          <SelectVariationProducts
            product={varModal}
            close={() => setVarModal(null)}
          />
        </Modal>
      )}

      <div className="inline-flex w-full justify-end py-2">
        <Button color="slate-600" name="Aceptar" action={close} />
      </div>
    </div>
  );
};
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//Quantity Selector Modal ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface SelectQuantInterface {
  product: ComposedInterface | null;
  close: Function;
}

const SelectQuant = ({ product, close }: SelectQuantInterface) => {
  const { append, update, fields } = useContext(ComboContext);
  const { control, trigger, getValues, setValue, watch } = useForm();

  const submit = async () => {
    if (await trigger("quantity")) {
      if (product?.variationId && product.variationName) {
        setValue("variationId", product.variationId);
        setValue("variationName", product.variationName);
      }
      if (product?.quantity) {
        const idx = product.variationId
          ? fields!.findIndex(
              (elem) => elem.variationId === product!.variationId
            )
          : fields!.findIndex(
              (elem) => elem?.composedId === product!.composedId
            );
        update!(idx, { ...fields![idx], ...getValues() });
      } else {
        append!({
          composedId: product!.composedId,
          composedName: product!.composedName,
          composedCost: product!.composedCost,
          measure: product!.measure,
          ...getValues(),
        });
      }
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
      <div className="py-2 flex justify-end">
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

//Variation Selector Modal ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface VarSelectorInterface {
  product: ComposedInterface | null;
  close: Function;
}
const SelectVariationProducts = ({ close, product }: VarSelectorInterface) => {
  const { getVariation, productVariations, isFetching } = useServerProduct();
  const { fields, remove } = useContext(ComboContext);
  const [quantModal, setQuantModal] = useState<ComposedInterface | null>(null);

  useEffect(() => {
    getVariation(product!.composedId);
  }, []);

  //List managment ---------------------------------------------------------------------------
  const getIfSelected = (id: number) => {
    const elem = fields!.find((elem) => elem.variationId === id);
    if (elem) {
      return elem;
    } else {
      return null;
    }
  };

  const deleteSelected = (id: number) => {
    const idx = fields!.findIndex((elem) => elem.variationId === id);
    remove!(idx);
  };

  const productClickEvent = (variation: ServerVariationInterface) => {
    const selected = getIfSelected(variation.id);
    let data = {
      ...product!,
      variationId: variation.id,
      variationName: variation.name,
    };
    if (selected) data.quantity = selected.quantity;
    setQuantModal(data);
  };

  //---------------------------------------------------------------------------------------------

  if (isFetching)
    return (
      <SpinnerLoading
        text="Cargando variaciones"
        className="flex flex-col h-96 justify-center items-center"
      />
    );
  return (
    <div>
      <h5>
        Seleccionar variaciones de{" "}
        <span className="font-semibold">{product?.composedName}</span>
      </h5>
      <div className="mt-3 border border-gray-400 rounded-md h-80 p-3 overflow-auto scrollbar-thin">
        {productVariations.length === 0 ? (
          <EmptyList />
        ) : (
          productVariations.map((elem, idx) => {
            const selected = getIfSelected(elem.id);
            return (
              <div
                key={idx}
                className={`grid grid-cols-4 items-center mb-2 px-2 py-3 border border-gray-400 rounded-md shadow-md cursor-pointer ${
                  selected ? "ring-1 ring-slate-500" : ""
                }`}
                onClick={() => productClickEvent(elem)}
              >
                <p className="col-span-2">{elem.name}</p>
                <p className="flex justify-center font-semibold">
                  {selected && selected.quantity}{" "}
                  {translateMeasure(product?.measure)}
                </p>
                {selected && (
                  <div className="flex justify-end items-center">
                    <XMarkIcon
                      className="h-5 text-gray-400 cursor-pointer"
                      onClick={() => deleteSelected(elem.id)}
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
          <SelectQuant product={quantModal} close={() => setQuantModal(null)} />
        </Modal>
      )}

      <div className="inline-flex justify-end py-3 w-full">
        <Button color="slate-600" action={close} name="Aceptar" />
      </div>
    </div>
  );
};
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

export default Combos;
