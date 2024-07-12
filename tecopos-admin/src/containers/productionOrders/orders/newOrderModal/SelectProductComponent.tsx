import React, { useEffect, useState } from "react";
import {
  ProductInterface,
  PriceInvoiceInterface,
} from "../../../../interfaces/ServerInterfaces";
import useServerProduct from "../../../../api/useServerProducts";
import SearchComponent from "../../../../components/misc/SearchComponent";
import Button from "../../../../components/misc/Button";
import SpinnerLoading from "../../../../components/misc/SpinnerLoading";
import EmptyList from "../../../../components/misc/EmptyList";
import Modal from "../../../../components/modals/GenericModal";
import ProductSelectableList from "../../../areas/stock/movements/modalNewMovement/ProductSelectableList";
import ProductSelectedList from "../../../areas/stock/movements/modalNewMovement/ProductSelectedList";
import SetProdQuantComponent from "../../../areas/stock/movements/modalNewMovement/SetProdQuantComponent";

interface SelectProductInterface {
  back:Function;
  after: Function;
  selected: (Partial<ProductInterface> & { quantityToMove: number })[];
  setSelected: Function;
  oppType?: string;
}

const SelectProductComponent = ({
  back,
  after,
  selected,
  setSelected,
}: SelectProductInterface) => {
  const { getAllProducts, allProducts, outLoading } = useServerProduct();

  //Data for Product List to Select ----------------------------------------------------------------
  const displayData: Partial<ProductInterface>[] = [];

  allProducts.map((item) => {
    displayData.push({
      id: item.id,
      type: item.type,
      name: item?.name,
      measure: item.measure,
    });
  });

  //Find index if Product exists in Selected List
  const index = (value: Partial<ProductInterface>) =>
    selected.findIndex((item) => item.id === value.id);

  //setProducts to Selected List
  const addSelected = (
    value: Partial<ProductInterface> & { quantityToMove: number }
  ) => {
    if (index(value) === -1) {
      setSelected([...selected, value]);
    } else {
      const updated = selected;
      updated.splice(index(value), 1, value);
      setSelected(updated);
    }
  };

  //Product Filter
  const [filter, setFilter] = useState<string | null>(null);
  useEffect(() => {
    if (filter !== null) {
      getAllProducts({
        type: "STOCK,MANUFACTURED",
        search: filter,
        all_data: true,
      });
    }
  }, [filter]);

  //UnsetProducts from Selected List
  const unsetSelected = (item: number) => {
    setSelected(selected.filter((value) => item !== value.id));
  };
  //-------------------------------------------------------------------------------------------------

  //Select Product Step Action ----------------------------------------------------------------------
  const actionProduct = () => {
    const dataToSend: { productId: number; quantity: number }[] = [];
    selected.map((item) =>
      dataToSend.push({
        productId: item.id ?? 0,
        quantity: item.quantityToMove ?? 0,
      })
    );
    after(dataToSend);
  };
  //------------------------------------------------------------------------------------------------

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
  }: {
    id: number;
    name: string;
    quantityToMove: number;
    measure: string;
  }) => {
    addSelected({ id, name, quantityToMove, measure });
    setOpenQuantityModal({ state: false, data: null });
  };
  //-----------------------------------------------------------------------------------------------------

  return (
    <>
      <div className="grid grid-cols-2 h-96 border border-slate-300 p-2 rounded-md justify-center gap-2">
        <div className="border border-slate-300 p-2 rounded overflow-y-auto scrollbar-thin">
          <div className="sticky -top-3 bg-gray-50 p-2 rounded">
            <SearchComponent
              findAction={(find: string | null) => setFilter(find)}
              placeholder="Buscar Producto"
            />
          </div>
          <ProductSelectableList
            data={displayData}
            isSelectedIndex={index}
            selected={selected}
            unselect={unsetSelected}
            filter={filter}
            movementType="ENTRY"
            openModalQuant={setOpenQuantityModal}
            loading={outLoading}
          />
        </div>
        <div className=" border border-slate-300 p-2 rounded overflow-y-auto scrollbar-thin">
          {selected.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <EmptyList />
            </div>
          ) : (
            <ProductSelectedList
              selected={selected}
              unsetSelected={(id: number) => unsetSelected(id)}
              updateQuant={setOpenQuantityModal}
            />
          )}
        </div>
      </div>

      {openQuantityModal && (
        <Modal
          state={openQuantityModal.state}
          close={() => setOpenQuantityModal({ state: false, data: null })}
        >
          <SetProdQuantComponent
            data={openQuantityModal.data}
            action={actionModal}
            movementType={"OUT"}
          />
        </Modal>
      )}

      <div className="grid grid-cols-2 gap-2 py-2">
      <Button
            color="blue-700"
            name="Atrás"
            action={back}
            textColor="blue-800"
            full
            outline
          />
        <Button
          color="indigo-600"
          name="Siguiente"
          action={actionProduct}
          full
        />
      </div>
    </>
  );
};

export default SelectProductComponent;
