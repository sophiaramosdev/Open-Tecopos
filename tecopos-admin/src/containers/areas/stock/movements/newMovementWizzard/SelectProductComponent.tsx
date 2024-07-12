import { useState, useEffect, useContext } from "react";
import SearchComponent from "../../../../../components/misc/SearchComponent";
import Button from "../../../../../components/misc/Button";
import EmptyList from "../../../../../components/misc/EmptyList";
import MovementsTypeBadge from "../../../../../components/misc/badges/MovementsTypeBadge";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { useAppSelector } from "../../../../../store/hooks";
import Modal from "../../../../../components/modals/GenericModal";
import { MovementsContext } from "./WizzardContainer";
import { useParams } from "react-router";
import ProductSelectableList from "./ProductSelectableList";
import ProductSelectedList from "./ProductSelectedList";
import { toast } from "react-toastify";
import MovementAreaSelector from "./MovementAreaSelector";
import { AiOutlineThunderbolt } from "react-icons/ai";
import FastEntryComponent from "./FastEntryComponent";
import { ProductInterface } from "../../../../../interfaces/ServerInterfaces";
import QuantitySelector from "./QuantitySelector";

const SelectProductComponent = () => {
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { watch, setSearch, setCurrentStep, fields, remove, reset, setValue } =
    useContext(MovementsContext);

  const { stockId } = useParams();

  const [fastEntry, setFastEntry] = useState(false);

  //Quantity Selector Modal State --------------------------------------------------------------
  const [productQuantityModal, setProductQuantityModal] =
    useState<ProductInterface | null>(null);
  //-------------------------------------------------------------------------------------------

  const movementType = watch!("movementType");

  const areaDest =
    areas.find((item) => item.id === watch!("stockAreaToId"))?.name ?? "";

  const [areaSelector, setAreaSelector] = useState(false);

  useEffect(() => {
    if (movementType === "MOVEMENT") {
      setValue!("stockAreaFromId", Number(stockId));
      setAreaSelector(true);
    } else {
      setValue!("stockAreaId", Number(stockId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeAreaModal = () => {
    if (watch!("stockAreaToId")) {
      setAreaSelector(false);
    } else {
      toast.error("Debe seleccionar un área destino");
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 h-96 border border-slate-300 p-2 rounded-md justify-center gap-2">
        <div className="border border-slate-300 p-2 rounded overflow-y-auto scrollbar-thin">
          <div className="sticky -top-3 bg-gray-50 p-2 rounded inline-flex w-full gap-x-2">
            <SearchComponent
              findAction={(find: string | null) => setSearch!(find)}
              placeholder="Buscar Producto"
            />
            {movementType === "ENTRY" && (
              <Button
                color="slate-300"
                outline
                icon={
                  <AiOutlineThunderbolt className="text-lg text-slate-400" />
                }
                textColor="slate"
                action={() => setFastEntry(true)}
              />
            )}
          </div>
          <ProductSelectableList setQuantity={setProductQuantityModal} />
        </div>
        <div className=" border border-slate-300 p-2 rounded overflow-y-auto scrollbar-thin">
          <div className="sticky top-0 p-1 rounded text-sm inline-flex gap-2 items-center">
            <MovementsTypeBadge operation={movementType} />
            {watch!("stockAreaToId") && (
              <>
                <ArrowsRightLeftIcon className="h-5" />
                <div className="h-5">{areaDest}</div>
              </>
            )}
          </div>
          {(watch!("products") ?? []).length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <EmptyList />
            </div>
          ) : (
            <ProductSelectedList />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 py-3 ">
        <Button
          color="slate-600"
          name="Atrás"
          action={() => {
            reset!();
            remove!();
            setCurrentStep!(0);
            setSearch!(null);
          }}
          textColor="slate-600"
          full
          outline
        />
        <Button
          color="slate-600"
          name="Siguiente"
          full
          action={() => {
            if (fields!.length !== 0) {
              setCurrentStep!(2);
            } else {
              toast.error("Debe seleccionar al menos un producto");
            }
          }}
        />
      </div>

      {areaSelector && (
        <Modal state={areaSelector} close={closeAreaModal}>
          <MovementAreaSelector close={() => setAreaSelector(false)} />
        </Modal>
      )}

      {fastEntry && (
        <Modal state={fastEntry} close={() => setFastEntry(false)} size="m">
          <FastEntryComponent
            setQuantity={(product) => {
              setFastEntry(false);
              setProductQuantityModal(product);
            }}
          />
        </Modal>
      )}

      {productQuantityModal && (
        <Modal
          state={!!productQuantityModal}
          close={() => setProductQuantityModal(null)}
        >
          <QuantitySelector
            productData={productQuantityModal}
            close={() => setProductQuantityModal(null)}
          />
        </Modal>
      )}
    </>
  );
};

export default SelectProductComponent;
