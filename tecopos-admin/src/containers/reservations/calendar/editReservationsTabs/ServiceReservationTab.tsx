import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import { useContext, useEffect } from "react";
import Button from "../../../../components/misc/Button";
import ComboBox from "../../../../components/forms/Combobox";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../../store/hooks";
import { useFieldArray, useForm } from "react-hook-form";
import { ReservationsContext } from "../CalendarReservation";

const ServiceReservationTab = () => {
  const { areas } = useAppSelector((state) => state.nomenclator);
  const salesAreas: SelectInterface[] = areas
    .filter((area) => area.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));

    const { selectEvent, reservation, isLoading } =
    useContext(ReservationsContext);

  const { watch, control } = useForm();
  const { append, remove, fields } = useFieldArray<any>({
    name: "reservationProducts",
    control,
  });

  useEffect(() => {
    append({});
  }, []);

  const areaId = watch("areaSalesId");

  return (
    <>
      <form className="flex flex-col gap-y-5">
        <ComboBox
          data={salesAreas}
          name="areaSalesId"
          label="Punto de venta (*)"
          control={control}
          rules={{ required: "Este campo es requerido" }}
          defaultValue={reservation?.orderReceipt?.areaSalesId}
        />
        {fields?.map((field: any, idx) => (
          <>
            {/* <AccordionItem
              title={`Reserva # ${idx + 1} `}
              className="flex flex-col gap-y-2"
              key={idx}
              open={idx === fields.length - 1}
            > */}
            <div key={idx} className="flex flex-col gap-y-5">
              <div className=" flex gap-x-2 items-center">
                <div className="flex-1">
                  <AsyncComboBox
                    dataQuery={{
                      url: "/administration/product",
                      defaultParams: {
                        all_data: true,
                        type: "SERVICE",
                        areaId,
                        availableForReservation: true,
                      },
                    }}
                    normalizeData={{
                      id: "id",
                      name: ["name"],
                    }}
                    label="Servicio (*)"
                    name={`reservationProducts[${idx}].productId`}
                    //disabled={!areaId}
                    control={control}
                    rules={{
                      required: "Este campo es requerido",
                    }}
                    defaultValue={reservation?.productId}
                  />
                </div>

                {/* <div className="mt-5">
                    <Button
                      color="red-500"
                      textColor="red-500"
                      outline
                      icon={<TrashIcon className="h-5" />}
                      action={() => remove && remove(idx)}
                    />
                  </div> */}
              </div>

              <AsyncComboBox
                dataQuery={{
                  url: "/administration/resource-business",
                  defaultParams: {
                    productId: watch(`reservationProducts[${idx}].productId`),
                  },
                }}
                normalizeData={{
                  id: "id",
                  name: ["code"],
                }}
                label="Recurso "
                name={`reservationProducts[${idx}].resourceId`}
                control={control}
                defaultValue={reservation?.resourceId}
              />
            </div>
            {/* </AccordionItem> */}
          </>
        ))}

        <footer className="flex flex-col items-end justify-end h">
          <div className="w-52 mt-[300px]">
            <Button name="Siguiente" color="slate-700" type="submit" full />
          </div>
        </footer>
      </form>
    </>
  );
};

export default ServiceReservationTab;
