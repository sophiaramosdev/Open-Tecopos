import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import useServerArea from "../../../api/useServerArea";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../../store/hooks";
import { Cog8ToothIcon, PlusIcon } from "@heroicons/react/24/outline";
import ModalSalesCategories from "./ModalSalesCategories"
import { BasicNomenclator } from "../../../interfaces/ServerInterfaces";
import InlineRadio, { InlineRadioData } from "../../../components/forms/InlineRadio";
import GridList, { ListGridInterface } from "../../../components/misc/GridList";
import Button from "../../../components/misc/Button";
import Modal from "../../../components/modals/GenericModal";

const SalesConfig = () => {
  const { updateArea, isFetching } = useServerArea();
  const { areaId } = useParams();
  const { areas, salesCategories } = useAppSelector((state) => state.nomenclator);
  const { control, watch, getFieldState } = useForm();


  //Sales Configuration -----------------------------------------------------------------------------------
  const currentArea = areas.find((item) => item.id === Number(areaId));

  let defaultSale: number | null = null;
  if (currentArea?.saleByCategory && !currentArea?.saleOnlyMyStock)
    defaultSale = 1;
  if (!currentArea?.saleByCategory && currentArea?.saleOnlyMyStock)
    defaultSale = 2;
  if (!currentArea?.saleByCategory && !currentArea?.saleOnlyMyStock)
    defaultSale = 3;

  const [initialized, setInitialized] = useState(false);

  const salesConfig = watch("salesConfig") ?? defaultSale;



  const salesOptions: InlineRadioData[] = [
    { label: "Vender todo", value: 3, disabled: isFetching },
    {
      label: "Vender sólo productos de almacén",
      value: 2,
      disabled: isFetching,
    },
    { label: "Vender sólo por categorías", value: 1, disabled: isFetching },
  ];
  //----------------------------------------------------------------------------------------

  //Sales Categories----------------------------------------------------------------------------
  //modal state
  const [modalSalesCat, setModalSalesCat] = useState(false);

  //selectedData state
  const [selected, setSelected] = useState<BasicNomenclator[]>([]);

  const checkSales: BasicNomenclator[] = [];
  salesCategories.map((item: { name: any; id: any; }) =>
    checkSales.push({
      name: item.name,
      id: item.id,
    })
  );

  useEffect(() => {
    const selectedCategories = currentArea?.salesCategories;
    let next: BasicNomenclator[] = [];
    selectedCategories?.map((value) => {
      const newItem = checkSales.filter((item) => item.id === value.id);
      next.push(...newItem);
    });
    setSelected(next);

    setInitialized(true);

  }, []);


  useEffect(() => {
    if (salesConfig && areaId) {
      let data;
      switch (salesConfig) {
        case 1:
          data = { saleByCategory: true, saleOnlyMyStock: false };
          break;

        case 2:
          data = { saleByCategory: false, saleOnlyMyStock: true };
          break;

        default:
          data = { saleByCategory: false, saleOnlyMyStock: false };
          break;
      }
      getFieldState("salesConfig").isDirty && initialized && updateArea(Number(areaId), data);
    }
  }, [salesConfig]);

  //------------------------------------------------------------------------------------------

  //Data to GridList -----------------------------------------------------------------------------
  const categoriesList: ListGridInterface[] = [];
  currentArea?.salesCategories.map(item => categoriesList.push({
    name: item?.name,
    imgSrc: item?.image,
  }))

  //--------------------------------------------------------------------------------------------

  return (
    <>
      <div className="flex-col">
        <InlineRadio
          data={salesOptions}
          name="salesConfig"
          control={control}
          defaultValue={defaultSale}
        />

        {salesConfig === 1 && (
          <div className="grid grid-cols-3 flex-row-reverse mt-5 gap-3">
            <div className="col-span-2">
              <GridList data={categoriesList} emptyText="Aún no hay categorías, agregue las que desee" />
            </div>
            <div className="col-span-1">
              <Button
                name={categoriesList.length === 0 ? "Agregar" : "Configurar"}
                color="slate-600"
                action={() => setModalSalesCat(true)}
                icon={categoriesList.length === 0 ? <PlusIcon className="h-5" /> : <Cog8ToothIcon className="h-5" />}
                full
              />
            </div>
          </div>

        )}
      </div>

      <Modal
        state={modalSalesCat}
        close={() => setModalSalesCat(false)}
        size="m"
      >
        <ModalSalesCategories areaId={Number(areaId)} closeModal={() => setModalSalesCat(false)} data={checkSales} selected={selected} setSelected={setSelected} update={updateArea} isFetching={isFetching} />
      </Modal>
    </>
  );
};

export default SalesConfig;
