import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import { useContext } from "react";
import { NewReservationContext } from "./NewReservation";
import Button from "../../../../components/misc/Button";
import ComboBox from "../../../../components/forms/Combobox";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../../store/hooks";
import Fetching from "../../../../components/misc/Fetching";

const SelectServiceForm = () => {
  const {
    control,
    watch = () => {},
    fields,
    services = [],
    isFetchingProduct,
  } = useContext(NewReservationContext);

  const { areas } = useAppSelector((state) => state.nomenclator);
  const salesAreas: SelectInterface[] = areas
    .filter((area) => area.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));

  const areaId = watch("areaSalesId");

  return (
    <>
      {isFetchingProduct && <Fetching />}
      <div className="flex flex-col justify-between gap-y-5 h-[25rem]">
        <div className=" flex flex-col gap-y-5">
          <ComboBox
            data={salesAreas}
            name="areaSalesId"
            label="Punto de venta (*)"
            control={control}
            rules={{ required: "Este campo es requerido" }}
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

                {services[0]?.resources?.length > 0 && (
                  <>
                    <AsyncComboBox
                      dataQuery={{
                        url: "/administration/resource-business",
                        defaultParams: {
                          productId: watch(
                            `reservationProducts[${idx}].productId`
                          ),
                        },
                      }}
                      normalizeData={{
                        id: "id",
                        name: ["code"],
                      }}
                      label="Recurso "
                      name={`reservationProducts[${idx}].resourceId`}
                      disabled={!watch(`reservationProducts[${idx}].productId`)}
                      control={control}
                      rules={{
                        required: "Este campo es requerido",
                      }}
                    />
                  </>
                )}
              </div>
              {/* </AccordionItem> */}
            </>
          ))}
        </div>

        <footer className="grid grid-cols-3 gap-x-5 items-end justify-end  ">
          <div></div>
          <div></div>
          <Button name="Siguiente" color="indigo-700" type="submit" full />
        </footer>
      </div>
    </>
  );
};

export default SelectServiceForm;
