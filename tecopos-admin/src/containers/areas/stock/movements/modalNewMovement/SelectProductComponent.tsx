import { useState } from "react";
import {
  MovementProductsInterface,
  PriceInvoiceInterface,
  ProductInterface,
} from "../../../../../interfaces/ServerInterfaces";
import ProductSelectableList from "./ProductSelectableList";
import SearchComponent from "../../../../../components/misc/SearchComponent";
import Button from "../../../../../components/misc/Button";
import ProductSelectedList from "./ProductSelectedList";
import { toast } from "react-toastify";
import EmptyList from "../../../../../components/misc/EmptyList";
import MovementsTypeBadge from "../../../../../components/misc/badges/MovementsTypeBadge";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { useAppSelector } from "../../../../../store/hooks";
import Modal from "../../../../../components/modals/GenericModal";
import SetProdQuantComponent from "./SetProdQuantComponent";

interface SelectProductInterface {
  products: Partial<ProductInterface>[];
  movementType: string|null;
  back: Function;
  next: Function;
  selectedProducts: (Partial<ProductInterface> & {
    quantityToMove: number;
    price?: PriceInvoiceInterface;
    supplierId?: number;
  })[];
  setSelectedProducts: Function;
  stockTo?: number;
  loading?: boolean;
  setFilter: Function;
}

const SelectProductComponent = ({
  products,
  movementType,
  back,
  next,
  stockTo,
  loading,
  selectedProducts,
  setSelectedProducts,
  setFilter,
}: SelectProductInterface) => {
  const { areas } = useAppSelector((state) => state.nomenclator);
  const areaDest = areas.filter((item) => item.id === stockTo)[0]?.name ?? "";

  //Find if Product exists in Selected List. Return index
  const index = (value: Partial<ProductInterface>) =>
    selectedProducts.findIndex((item) => item.id === value.id);

  //setProducts to Selected List
  const addSelected = (
    value: Partial<ProductInterface> & {
      quantityToMove: number;
      price?: PriceInvoiceInterface;
      supplierId?: number;
    }
  ) => {
    if (index(value) === -1) {
      setSelectedProducts([...selectedProducts, value]);
    } else {
      const updated = selectedProducts;
      updated.splice(index(value), 1, value);
      setSelectedProducts(updated);
    }
  };

  //UnsetProducts from Selected List
  const unsetSelected = (item: number) => {
    setSelectedProducts(selectedProducts.filter((value) => item !== value.id));
  };
  //--------------------------------------------------------------------------------------

  //Final Submit Action ------------------------------------------------------------------------------
  const submitAction = () => {
    if (selectedProducts.length === 0) {
      toast.error("Debe seleccionar al menos un producto", {
        autoClose: 3000,
      });
    } else {
      const dataToSend: Partial<MovementProductsInterface>[] = [];
      selectedProducts.map((item, idx) => {
        dataToSend.push({
          productId: item.id,
          quantity: item.quantityToMove,
          supplierId: item.supplier?.id,
        });
        item?.price &&
          dataToSend.splice(idx, 1, {
            ...dataToSend[idx],
            price: item.price,
          });
      });

      next(dataToSend);
    }
  };
  //-------------------------------------------------------------------------------------------

  //Modal Quantity Function ----------------------------------------------------------------------
  const [openQuantityModal, setOpenQuantityModal] = useState<{
    state: boolean;
    data: (Partial<ProductInterface> & { quantity?: number }) | null;
  }>({ state: false, data: null });

  const actionModal = ({
    id,
    name,
    quantityToMove,
    measure,
    averageCost,
    supplierId,
    price,
    variationId,
  }: {
    id: number;
    name: string;
    quantityToMove: number;
    measure: string;
    averageCost?: number;
    supplierId?: number;
    price?: PriceInvoiceInterface;
    variationId?: number;
  }) => {
    let selectedData: any = { id, name, quantityToMove, measure };
    if (price) selectedData.price = price;
    if (supplierId) selectedData.supplierId = supplierId;
    if (averageCost) selectedData.averageCost = averageCost;
    if (variationId) selectedData.variationId = variationId;
    addSelected(selectedData);
    setOpenQuantityModal({ state: false, data: null });
  };
  //------------------------------------------------------------------------------------------------

  const [filterInside, setFilterInside] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 h-96 border border-slate-300 p-2 rounded-md justify-center gap-2">
        <div className="border border-slate-300 p-2 rounded overflow-y-auto scrollbar-thin">
          <div className="sticky -top-3 bg-gray-50 p-2 rounded ">
            <SearchComponent
              findAction={(find: string | null) => {
                if (movementType === "ENTRY") {
                  setFilter(find);
                } else {
                  setFilterInside(find);
                }
              }}
              placeholder="Buscar Producto"
            />
          </div>
          <ProductSelectableList
            data={products}
            selected={selectedProducts}
            isSelectedIndex={index}
            filter={filterInside}
            unselect={unsetSelected}
            movementType={movementType}
            openModalQuant={setOpenQuantityModal}
            loading={loading}
          />
        </div>
        <div className=" border border-slate-300 p-2 rounded overflow-y-auto scrollbar-thin">
          <div className="sticky top-0 p-1 rounded text-sm inline-flex gap-2 items-center">
            <MovementsTypeBadge operation={movementType} />
            {stockTo && (
              <>
                <ArrowsRightLeftIcon className="h-5" />
                <div className="h-5">{areaDest}</div>
              </>
            )}
          </div>
          {selectedProducts.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <EmptyList />
            </div>
          ) : (
            <ProductSelectedList
              selected={selectedProducts}
              unsetSelected={(id: number) => unsetSelected(id)}
              updateQuant={setOpenQuantityModal}
            />
          )}
        </div>
      </div>

      {openQuantityModal.state && (
        <Modal
          state={openQuantityModal.state}
          close={() => setOpenQuantityModal({ state: false, data: null })}
        >
          <SetProdQuantComponent
            data={openQuantityModal.data}
            action={actionModal}
            movementType={movementType}
          />
        </Modal>
      )}


      <div className="grid grid-cols-2 gap-2 py-3 ">
        <Button
          color="blue-700"
          name="Atrás"
          action={back}
          textColor="blue-800"
          full
          outline
        />
        <Button
          color="indigo-700"
          name="Siguiente"
          full
          action={() => submitAction()}
        />
      </div>
    </>
  );
};

export default SelectProductComponent;
