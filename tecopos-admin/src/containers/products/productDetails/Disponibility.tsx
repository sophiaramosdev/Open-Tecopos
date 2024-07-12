import { useState, useEffect, useContext } from "react";
import Input from "../../../components/forms/Input";
import GenericToggle from "../../../components/misc/GenericToggle";
import { SubmitHandler, useForm } from "react-hook-form";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { translateMeasure } from "../../../utils/translate";
import Button from "../../../components/misc/Button";
import { DetailProductContext } from "../DetailProductContainer";
import Toggle from "../../../components/forms/Toggle";
import Check from "../../../components/forms/GenericCheck";
import DateInput from "../../../components/forms/DateInput";
import { useAppSelector } from "../../../store/hooks";

//View for case STOCK, RAW, MANUFACTURED, WASTE, ASSET ---------------------------------------------
const Contable = () => {
  const { product, updateProduct } = useContext(DetailProductContext);
  const [alertLimit, setAlertLimit] = useState(!!product?.alertLimit);
  const { control, handleSubmit, setValue, watch } = useForm();
  const onSubmit: SubmitHandler<Record<string, string | number>> = (data) =>
    updateProduct && updateProduct(product?.id, data);

  //Table data ------------------------------------------
  const quantityByGroup: (quantity: number) => string | void = (quantity) => {
    if (product?.enableGroup) {
      const rest = quantity % product.groupConvertion;
      return `${Math.trunc(quantity / product.groupConvertion)} ${
        rest !== 0 ? "(+" + rest + translateMeasure(product.measure) + ")" : ""
      }`;
    }
  };
  const tableTitles = ["Almacén", "Cantidad"];
  if (!!product?.enableGroup) tableTitles.push("Agrupación");
  const tableData: DataTableInterface[] = [];
  product?.stockAreaProducts?.forEach((item) => {
    tableData.push({
      payload: {
        Almacén: item.area.name,
        Cantidad: <p className="font-semibold">{item.quantity}</p>,
        Agrupación: quantityByGroup(item.quantity) ?? "",
      },
    });
    if (item.variations.length !== 0) {
      item.variations.forEach((variation) =>
        tableData.push({
          payload: {
            Almacén: (
              <p className="pl-5 font-normal">{variation.variation.name}</p>
            ),
            Cantidad: variation.quantity,
          },
        })
      );
    }
  });

  //--------------------------------------------------------------------

  useEffect(() => {
    if (!alertLimit) setValue("alertLimit", null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertLimit]);

  return (
    <form className="flex flex-col justify-between" onSubmit={handleSubmit(onSubmit)}>
      <section className="relative grid grid-cols-10 gap-10">
        <div className="place-items-start pt-5 col-span-4 overflow-scroll scrollbar-thin">
          <div>
            <h4 className="font-semibold">Cantidad Total:</h4>
            <p className="text-gray-700 mr-10">
              {product?.totalQuantity +
                " " +
                translateMeasure(product?.measure)}
            </p>
          </div>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-y-2 p-1"
          >
            <GenericToggle
              title="Límite de alerta"
              changeState={setAlertLimit}
              currentState={alertLimit}
            />
            {alertLimit && (
              <Input
                label="Límite de alerta"
                type="number"
                name="alertLimit"
                control={control}
                rules={{ required: "Indique una cantidad" }}
                defaultValue={product?.alertLimit}
              />
            )}
            <Toggle
              name="enableGroup"
              title="Habilitar agrupación"
              control={control}
              defaultValue={!!product?.enableGroup}
            />

            {(watch("enableGroup") ?? product?.enableGroup) && (
              <>
                <Input
                  name="groupName"
                  label="Nombre de la agrupación"
                  control={control}
                  defaultValue={product?.groupName}
                />
                <Input
                  name="groupConvertion"
                  label="Agrupar en conjuntos de"
                  control={control}
                  defaultValue={product?.groupConvertion}
                />
              </>
            )}
          </form>
        </div>
        {tableData.length !== 0 && (
          <div className="h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 col-span-6">
            <GenericTable tableTitles={tableTitles} tableData={tableData} />
          </div>
        )}
      </section>
      <div className=" fixed bottom-16 right-5 flex items-center justify-end pt-3">
        <Button color="slate-600" type="submit" name="Actualizar"  />
      </div>
    </form>
  );
};
//------------------------------------------------------------------------------------------------------
//Component for MENU,ADDON,SERVICE,COMBO ---------------------------------------------------------------
const NoContable = () => {
  const { product, updateProduct, updateStockProductState } =
    useContext(DetailProductContext);
  const { control, handleSubmit, watch, unregister, setValue, clearErrors } =
    useForm();
  const onSubmit: SubmitHandler<Record<string, string | number>> = (data) =>
    updateProduct && updateProduct(product?.id, data, updateStockProductState);
  const {  business } = useAppSelector((state) => state.init);
  const availableForReservation =
    watch("availableForReservation") ?? product?.availableForReservation;

  const [alwaysAvailableForReservation, setAlwaysAvailableForReservation] =
    useState(product?.alwaysAvailableForReservation);

  useEffect(() => {
    setValue("reservationAvailableFrom", undefined);
    setValue("reservationAvailableTo", undefined);
  }, [watch("availableForReservation"), alwaysAvailableForReservation]);

  useEffect(() => {
    setValue("alwaysAvailableForReservation", false);
  }, [availableForReservation]);

  const reservationAvailableFrom =
    watch("reservationAvailableFrom") ?? product?.reservationAvailableFrom;
  const reservationAvailableTo =
    watch("reservationAvailableTo") ?? product?.reservationAvailableTo;

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="w-full grid grid-cols-2">
          {/* Col 1 */}
          <div>
            <Toggle
              name="stockLimit"
              control={control}
              defaultValue={product?.stockLimit}
              title="Limitar cantidad disponible"
            />
            <div className="inline-flex gap-5">
              {(watch("stockLimit") || product?.stockLimit) && (
                <div className="flex flex-col">
                  <Input
                    name="totalQuantity"
                    type="number"
                    label={`Cantidad Total (${translateMeasure(
                      product?.measure
                    )})`}
                    control={control}
                    rules={{ required: "Este campo es requerido" }}
                    defaultValue={product?.totalQuantity}
                    disabled={product?.type === "COMBO"}
                  />

                  {product?.type === "COMBO" &&
                    product.compositions.length !== 0 && (
                      <div className="text-sm text-gray-600 font-semibold">
                        *La disponibilidad se calculará automáticamente por la
                        disponibilidad de sus compuestos
                      </div>
                    )}
                </div>
              )}

              <Input
                name="alertLimit"
                type="number"
                label="Límite de Alerta"
                control={control}
                defaultValue={product?.alertLimit}
              />
            </div>
          </div>
          {/* Col 2 */}
          {product?.type === "SERVICE" &&
            business?.configurationsKey.find(
              (itm) => itm.key === "module_booking"
            )?.value === "true" && (
              <div className=" flex gap-y-3 flex-col justify-center items-start">
                <Toggle
                  name="availableForReservation"
                  control={control}
                  title="Disponibilidad para Reservar"
                  defaultValue={product?.availableForReservation}
                />

                {availableForReservation && (
                  <>
                    <div className="ml-2">
                      <Check
                        value={""}
                        checked={alwaysAvailableForReservation}
                        label="Siempre"
                        onChange={() => {
                          setValue(
                            "alwaysAvailableForReservation",
                            !alwaysAvailableForReservation
                          );
                          setAlwaysAvailableForReservation(
                            !alwaysAvailableForReservation
                          );
                        }}
                      />
                    </div>

                    <div className=" flex gap-x-4">
                      {!alwaysAvailableForReservation && (
                        <DateInput
                          label="Fecha inicio"
                          name="reservationAvailableFrom"
                          control={control}
                          disabled={watch("alwaysAvailableForReservation")}
                          defaultValue={product?.reservationAvailableFrom}
                          rules={{ required: "Este campo es requerido" }}
                        />
                      )}
                      {!alwaysAvailableForReservation && (
                        <DateInput
                          label="Fecha fin"
                          name="reservationAvailableTo"
                          control={control}
                          disabled={
                            alwaysAvailableForReservation ||
                            !reservationAvailableFrom
                          }
                          fromCustom={reservationAvailableFrom}
                          defaultValue={reservationAvailableTo}
                          rules={{
                            validate: (value) => {
                              return (
                                reservationAvailableTo >
                                  reservationAvailableFrom ||
                                "La fecha de finalización debe ser posterior a la fecha de inicio"
                              );
                            },
                            onChange: () => {
                              clearErrors("reservationAvailableTo");
                            },
                          }}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
        </div>
        <div>
          <div className="flex items-center justify-end pt-20">
            <Button color="slate-600" type="submit" name="Actualizar" />
          </div>
        </div>
      </form>
    </div>
  );
};
//-------------------------------------------------------------------------------------------------------
const Disponibility = () => {
  const { product } = useContext(DetailProductContext);

  return (
    <div className="border border-slate-300 rounded-md p-5 h-[34rem]">
      {["STOCK", "RAW", "MANUFACTURED", "WASTE", "ASSET", "VARIATION"].includes(
        product?.type ?? ""
      ) ? (
        <Contable />
      ) : (
        <NoContable />
      )}
    </div>
  );
};

export default Disponibility;
