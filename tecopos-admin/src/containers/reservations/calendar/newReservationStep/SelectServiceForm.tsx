import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import { useContext, useMemo, useState } from "react";
import { NewReservationContext } from "./NewReservation";
import Button from "../../../../components/misc/Button";
import ComboBox from "../../../../components/forms/Combobox";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../../store/hooks";
import Fetching from "../../../../components/misc/Fetching";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import AddReservation from "./servicesModals/AddReservation";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Modal from "../../../../components/misc/GenericModal";
import moment from "moment";
import { formatDateR } from "../../../../utils/helpers";
import { Product } from "../../../../interfaces/Interfaces";

const SelectServiceForm = () => {
  const {
    control,
    watch = () => {},
    fields,
    services = [],
    remove,
    setShowNewClient,
    setAddModal,
    setServices,
  } = useContext(NewReservationContext);

  const [defaultData, setDefaultData] = useState<any>(null);

  const { areas } = useAppSelector((state) => state.nomenclator);
  const salesAreas: SelectInterface[] = areas
    .filter((area) => area.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));

  const areaId = watch("areaSalesId");

  const tableTitles = [
    "Servicio",
    "Recurso",
    "Fecha entrada",
    "Fecha salida",
    "Adultos",
    "Niños",
    "Duración",
    ""
  ];
  const { tableData } = useMemo(() => {
    const tableData: DataTableInterface[] =
      fields?.map((item: any, idx: number) => {
        const start = moment(item?.startDateAt).toDate();
        const durationInDays = moment(item?.endDateAt).startOf("day").diff(
          moment(new Date(item?.startDateAt)).startOf("day"),
          "days"
        );
        const prefix = durationInDays === 1 ? "dia" : "días";
        const product = services.find(
          (ele) => ele.id === item.productId
        ) as Product;
        return {
          rowId: item.id,
          payload: {
            Servicio: item?.name,
            Recurso: item?.resource,
            "Fecha entrada": formatDateR(item?.startDateAt),
            "Fecha salida": formatDateR(item?.endDateAt),
            Adultos: item?.numberAdults,
            Niños: item?.numberKids,
            Duración: product?.hasDuration
              ? product.duration
              : `${durationInDays} ${prefix}`,
            "": <span>
               <Button
                  icon={<TrashIcon className="h-4 text-red-500" />}
                  color="red-500"
                  action={() => {
                    const reservationSelect = fields?.findIndex(
                      (field) => field.id === item.id
                    ) as number;
                    const removeService = services.filter(
                      //@ts-ignore
                      (item) => item.id !== fields[reservationSelect]?.productId
                    );
                    remove!(reservationSelect);
                    setServices!(removeService);
                  }}
                  outline
                />
            </span>,
          },
        };
      }) ?? [];

    return { tableData };
  }, [fields]);

  const rowAction = (id: number | string) => {
    const reservationSelect = fields?.findIndex(
      (item) => item.id === id
    ) as number;
    const removeService = services.filter(
      //@ts-ignore
      (item) => item.id !== fields[reservationSelect]?.productId
    );
    remove!(reservationSelect);
    setServices!(removeService);
  };

  return (
    <>
      {/* {isFetchingProduct && <Fetching />} */}
      <div className="flex flex-col justify-between gap-y-5 h-[25rem] px-3 overflow-auto scroll-auto">
        <div className=" flex flex-col gap-y-5">
          <ComboBox
            data={salesAreas}
            name="areaSalesId"
            label="Punto de venta (*)"
            control={control}
            rules={{ required: "Este campo es requerido" }}
          />

          <article className=" flex gap-x-2 items-center">
            <div className="flex-1">
              <AsyncComboBox
                dataQuery={{
                  url: "/customer",
                  defaultParams: { all_data: false },
                }}
                normalizeData={{
                  id: "id",
                  name: ["firstName", "lastName"],
                  format: "firstName lastName",
                }}
                label="Cliente "
                name="clientId"
                control={control}
                rules={{ required: "Este campo es requerido" }}
              />
            </div>

            <div className="mt-5">
              <Button
                icon={<PlusIcon className="h-5" />}
                color="gray-400"
                textColor="slate-600"
                action={() => setShowNewClient!(true)}
                outline
              />
            </div>
          </article>

          <section className="grid  gap-x-5">
            <article className=" py-2  overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-100">
              <GenericTable
                tableData={tableData}
                tableTitles={tableTitles}
                rowActionDeleteIcon
                iconTable={
                  <Button
                    color="gray-400"
                    textColor="slate-600"
                    outline
                    action={() => {
                      areaId && setAddModal!(true);
                    }}
                    icon={
                      <PlusIcon className="w-5 h-5 " name="Agregar reserva" />
                    }
                  />
                }
              />
            </article>
          </section>
        </div>

        <footer className="grid grid-cols-3 gap-x-5 items-end justify-end  ">
          <div></div>
          <div></div>
          <Button name="Siguiente" color="slate-700" type="submit" full />
        </footer>
      </div>
    </>
  );
};

export default SelectServiceForm;
