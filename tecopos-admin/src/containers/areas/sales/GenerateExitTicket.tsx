import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useParams } from "react-router-dom";

import { useAppSelector } from "../../../store/hooks";

import Button from "../../../components/misc/Button";
import Toggle from "../../../components/forms/Toggle";
import useServerArea from "../../../api/useServerArea";
import Select from "../../../components/forms/Select";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";

const GenerateExitTicket = () => {

  const { isFetching, updateArea } = useServerArea();

  const { areaId } = useParams();

  const { areas } = useAppSelector((state) => state.nomenclator);
  const { business } = useAppSelector((state) => state.init);

  const currentArea = areas.find((item) => item.id === Number(areaId));

  const { control, handleSubmit } = useForm({ mode: "onChange" });

  const onSubmit: SubmitHandler<Record<string, string | number | boolean | string[]>> = (
    data
  ) => {

    updateArea(Number(areaId), data);
  };

  //---------------------------------------------------------------------------------------
  const enforceCurrency = currentArea?.enforceCurrency
  const [enforceCurrency_toggle, setEnforceCurrency_toggle] = useState<boolean>(enforceCurrency as boolean)

  //select currency data ----------------------------------
  const currencies: SelectInterface[] = business!.availableCurrencies.map(
    (item) => ({
      id: item.code,
      name: item.code,
    })
  );

  return (
    <>
      <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6 bg-white">
        <form onSubmit={handleSubmit(onSubmit)}>

          <div className="py-1">
            <Toggle
              name="createAccessPointTicket"
              control={control}
              defaultValue={currentArea?.createAccessPointTicket}
              title="Generar ticket de salida"
            />
          </div>
          <div className="py-1">
            <Toggle
              name="allowProductsMultiprice"
              control={control}
              defaultValue={currentArea?.allowProductsMultiprice}
              title="Permitir múltiples precios en los productos"
            />
          </div>
          <div className="py-1">
            <Toggle
              name="allowManualPrice"
              control={control}
              defaultValue={currentArea?.allowManualPrice}
              title="Permitir definir precio manualmente"
            />
          </div>
          <div className="py-1">
            <Toggle
              name="enforceCurrency"
              control={control}
              defaultValue={currentArea?.enforceCurrency}
              title="Forzar moneda para precios de venta"
              changeState={setEnforceCurrency_toggle}
            />
          </div>
          {
            (enforceCurrency_toggle) && (
              <div className="py-1">
                <Select
                  data={currencies}
                  label="Moneda disponible"
                  name="availableCodeCurrency"
                  defaultValue={currencies.find(elem => elem.name === currentArea?.availableCodeCurrency)?.id!}
                  control={control}
                />
              </div>
            )
          }
          <div className="py-1">
            <Toggle
              name="giveChangeWith"
              control={control}
              defaultValue={currentArea?.giveChangeWith}
              title="Desactivar manejo de vuelto para esta área"
            />
          </div>

          <div className="pt-6">
            <div className="max-w-full flow-root  pt-5 pb-4 bg-slate-50 sm:px-6">
              <div className="float-right">
                <Button
                  color="slate-600"
                  type="submit"
                  name="Actualizar"
                  loading={isFetching}
                  disabled={isFetching}
                />
              </div>
            </div>
          </div>
        </form>
      </div>

    </>
  );
};

export default GenerateExitTicket;
