import { useContext, useEffect, useState } from "react";
import ReceiptContext from "../ReceiptContext";
import { ProductInterface } from "../../../../../interfaces/ServerInterfaces";
import moment from "moment";
import SearchComponent from "../../../../../components/misc/SearchComponent";
import useServerProduct from "../../../../../api/useServerProducts";
import EmptyList from "../../../../../components/misc/EmptyList";
import ProductTypeBadge from "../../../../../components/misc/badges/ProductTypeBadge";
import { translateMeasure } from "../../../../../utils/translate";
import SpinnerLoading from "../../../../../components/misc/SpinnerLoading";
import Modal from "../../../../../components/misc/GenericModal";
import BatchForm from "./BatchForm";
import Button from "../../../../../components/misc/Button";
import { AiOutlineThunderbolt } from "react-icons/ai";
import FastEntryComponent from "../../movements/newMovementWizzard/FastEntryComponent";
import useServer from "../../../../../api/useServerMain";

const ProductSelector = () => {
  const {allowRoles} = useServer();
  const { fieldsProducts: fields } = useContext(ReceiptContext);
  const { getAllProducts, allProducts, outLoading } = useServerProduct();
  const [search, setSearch] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<{
    product: ProductInterface;
    idx?: number;
  } | null>(null);

  const [fastEntry, setFastEntry] = useState(false);

  useEffect(() => {
    if (!!search) {
      getAllProducts({ type: "STOCK,MANUFACTURED,RAW", search });
    }
  }, [search]);
  
  return (
    <div className="grid grid-cols-2 gap-2 h-full">
      <div className="relative border border-slate-300 rounded-md p-3 max-h-full overflow-auto scrollbar-none">
        <div className="sticky -top-3 bg-gray-50 p-2 rounded inline-flex w-full gap-x-2">
          <SearchComponent
            findAction={(find: string | null) => setSearch!(find)}
            placeholder="Buscar Producto"
          />
          {allowRoles([]) && <Button
            color="slate-300"
            outline
            icon={<AiOutlineThunderbolt className="text-lg text-slate-400" />}
            textColor="slate"
            action={() => setFastEntry(true)}
          />}
        </div>
        <div>
          {outLoading ? (
            <div className="mt-32">
              <SpinnerLoading text="Buscando" />
            </div>
          ) : allProducts.length !== 0 ? (
            allProducts.map((product, idx) => (
              <div
                key={idx}
                className="border border-slate-300 rounded-md p-5 grid grid-cols-2 gap-y-4 mt-2 hover:ring-1 hover:ring-slate-300 hover:cursor-pointer"
                onClick={() => setSelectedProduct({ product })}
              >
                <div className="flex flex-col gap-3">
                  <div>
                    <ProductTypeBadge type={product.type} />
                  </div>
                  <h5 className="font-semibold pl-2">{product.name}</h5>
                </div>

                <div className="flex items-center justify-end">
                  <h5 className="font-bold text-gray-400">
                    {translateMeasure(product.measure)}
                  </h5>
                </div>
              </div>
            ))
          ) : (
            <div className="mt-32">
              <EmptyList
                title={`${
                  search
                    ? "Producto no encontrado"
                    : "Inserte un criterio de busqueda"
                }`}
              />
            </div>
          )}
        </div>
      </div>
      <div className="border border-slate-300 rounded-md p-3 max-h-full overflow-auto scrollbar-none">
        <div className="flex flex-col gap-1">
          {fields!.map((item: any, idx: number) => (
            <div
              key={idx}
              className="border border-slate-300 p-5 w-full rounded-md grid grid-cols-2 gap-y-5 hover:cursor-pointer hover:ring-1 hover:ring-slate-300"
              onClick={() => setSelectedProduct({ product: item.product, idx })}
            >
              <div className="inline-flex gap-3">
                <h5 className="text-gray-700 font-semibold">Producto:</h5>
                <p className="text-gray-600 font-sans">{item?.product.name}</p>
              </div>

              <div className="inline-flex gap-3">
                <h5 className="text-gray-700 font-semibold">Lote:</h5>
                <p className="text-gray-600 font-sans">{item.uniqueCode}</p>
              </div>
              <div className="inline-flex gap-3 items-end">
                <h5 className="text-gray-700 font-semibold text-sm">
                  Cantidad:
                </h5>
                <p className="text-gray-600 font-sans text-sm">
                  {item.entryQuantity}
                </p>
              </div>
              <div className="inline-flex gap-3 items-end">
                <h5 className="text-gray-700 font-semibold text-sm">
                  Fecha expiración:
                </h5>
                <p className="text-gray-600 font-sans text-sm">
                  {item?.expirationAt
                    ? moment(item?.expirationAt).format("DD/MM/YYYY")
                    : "-"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!!selectedProduct && (
        <Modal
          state={!!selectedProduct}
          close={() => setSelectedProduct(null)}
          size="m"
        >
          <BatchForm
            product={selectedProduct.product}
            close={() => setSelectedProduct(null)}
            idx={selectedProduct?.idx}
          />
        </Modal>
      )}

      {fastEntry && (
        <Modal state={fastEntry} close={() => setFastEntry(false)} size="m">
          <FastEntryComponent
            setQuantity={(product) => {
              setFastEntry(false);
              setSelectedProduct({ product });
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default ProductSelector;
