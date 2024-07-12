import {
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFieldArrayReplace,
} from "react-hook-form";
import { ProductInterface } from "../../interfaces/ServerInterfaces";
import useServerProduct from "../../api/useServerProducts";
import { useEffect, useState } from "react";
import { BasicType } from "../../interfaces/InterfacesLocal";
import SearchComponent from "./SearchComponent";
import SpinnerLoading from "./SpinnerLoading";
import EmptyList from "./EmptyList";
import ProductTypeBadge from "./badges/ProductTypeBadge";
import Button from "./Button";
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";

interface NewElemInterface {
  append: UseFieldArrayAppend<Record<string, any>, "products">;
  remove: UseFieldArrayRemove;
  fields: Record<"id" | string, any>;
  close: Function;
  productFilter: BasicType;
}

const ProductSelector = ({
  append,
  remove,
  close,
  productFilter,
  fields,
}: NewElemInterface) => {
  const { getAllProducts, allProducts, outLoading } = useServerProduct();
  const [search, setSearch] = useState<string | null>(null);

  //Data for list product ---------------------------------------------------------
  useEffect(() => {
    getAllProducts({ ...productFilter, search });
  }, [search]);
  //-----------------------------------------------------------------------------
  //Manage selected products------------------------------------------------------

  const selected = (id: number) =>
    !!fields.find((itm: any) => itm.productId === id);

  const deleteAction = (id: number) => {
    const idx = fields.findIndex((itm: any) => itm.productId === id);
    if (idx !== -1) remove(idx);
  };

  const clickProductEvent = (item: ProductInterface) => {
    if (!selected(item.id)) {
      append({ productId: item.id, productName: item.name });
    }
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
            const selectedProduct = selected(item.id);
            return (
              <div
                key={idx}
                className={`w-full border border-gray-300 p-5 text-sm rounded-md shadow-md grid grid-cols-6 items-center mb-2 ${
                  selected(item.id) ? "ring-1 ring-slate-500" : ""
                } cursor-pointer`}
                onClick={() => clickProductEvent(item)}
              >
                <div className="col-span-3 flex flex-col">
                  <p className="font-semibold">{item.name}</p>
                </div>
                <div className="col-span-2">
                  <ProductTypeBadge type={item.type} />
                </div>

                {selectedProduct && (
                  <div className="inline-flex gap-2 h-10 justify-end">
                    <Button
                      color="gray-500"
                      icon={
                        <ArrowUturnLeftIcon className="h-5 text-gray-400" />
                      }
                      action={() => deleteAction(item.id)}
                      outline
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="inline-flex w-full justify-end py-2">
        <Button color="slate-600" name="Aceptar" action={close} />
      </div>
    </div>
  );
};

export default ProductSelector;
