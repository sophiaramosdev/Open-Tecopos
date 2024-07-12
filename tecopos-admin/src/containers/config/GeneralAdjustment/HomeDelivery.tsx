import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

import { useAppSelector } from "../../../store/hooks";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";

import Button from "../../../components/misc/Button";

import {
  convertBoolean,
  translateTypeHomeDelivery,
} from "../../../utils/translate";
import ComboBox from "../../../components/forms/Combobox";

import Toggle from "../../../components/forms/Toggle";
import useServer from "../../../api/useServerMain";
import { ConfigUpdate, SendConfigUpdate } from "../../../interfaces/Interfaces";
import Input from "../../../components/forms/Input";

const HomeDelivery = () => {
  const { isLoading, isFetching, EditBussinesAdjustment } = useServer();

  const { business } = useAppSelector((state) => state.init);

  const { control, handleSubmit, watch } = useForm();

  const onSubmit: SubmitHandler<
    Record<string, string | number | boolean | string[]>
  > = (data) => {
    let configsSend: SendConfigUpdate = {
      configs: [],
    };

    const config: ConfigUpdate[] = [];

    config.push({
      key: "enable_delivery",
      value: data.enable_delivery.toString(),
    });

    config.push({
      key: "delivery_type",
      value: data.delivery_type.toString(),
    });

    if (delivery_type_show === "FIXED") {
      config.push({
        key: "amount_delivery_fixed",
        value: data.amount_delivery_fixed.toString(),
      });
    }

    config.push({
      key: "enable_pick_up_in_store",
      value: data.enable_pick_up_in_store.toString(),
    });

    configsSend = {
      configs: config,
    };

    EditBussinesAdjustment(configsSend);
  };

  //-- enable_delivery
  const enable_delivery = convertBoolean(
    business?.configurationsKey?.find((item) => item.key === "enable_delivery")
      ?.value ?? ""
  );
  const [enable_delivery_toggle, setEnable_delivery_toggle] =
    useState(enable_delivery);

  //-- delivery_type
  const delivery_type =
    business?.configurationsKey?.find((item) => item.key === "delivery_type")
      ?.value ?? "";

  const [delivery_type_show, setDelivery_type_show] =
    useState<string>(delivery_type);

  //const delivery_type_show = watch("delivery_type") ?? delivery_type;

  //-- enable_pick_up_in_store
  const enable_pick_up_in_store = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'enable_pick_up_in_store')?.value ?? '');


  //-- Array de los tipos de entrega
  const type_home_delivery = ["FIXED", "VARIABLE", "BYREGION"];
  const selectTypeHomeDelivery: SelectInterface[] = [];

  type_home_delivery.map((item) => {
    selectTypeHomeDelivery.push({
      id: item,
      name: translateTypeHomeDelivery(item) ?? "",
    });
  });

  //-- amount_delivery_fixed
  const amount_delivery_fixed =
    business?.configurationsKey?.find(
      (item) => item.key === "amount_delivery_fixed"
    )?.value ?? "";
  //---------------------------------------------------------------------------------------
  return (
    <>
      <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6 bg-white">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="py-3">
            <Toggle
              name="enable_delivery"
              control={control}
              defaultValue={enable_delivery}
              changeState={setEnable_delivery_toggle}
              title="Habilitar"
            />
          </div>


          {enable_delivery_toggle === true && (
            <div>
              <div className="py-3">
                <Toggle
                  name="enable_pick_up_in_store"
                  control={control}
                  defaultValue={enable_pick_up_in_store}
                  title="Habilitar recogida en tienda"
                />
              </div>

              <div className="py-3">
                <ComboBox
                  name="delivery_type"
                  data={selectTypeHomeDelivery.map((item) => ({
                    id: item.id,
                    name: item.name,
                  }))}
                  label="Tipos de Entrega"
                  control={control}
                  defaultValue={delivery_type}
                  changeState={(e: SelectInterface) => {
                    setDelivery_type_show(String(e.id));
                  }}
                  rules={{ required: "Este campo es requerido" }}
                />
              </div>

              {delivery_type_show === "FIXED" && (
                <Input
                  type="number"
                  label="Monto de entrega fija *"
                  name="amount_delivery_fixed"
                  control={control}
                  defaultValue={amount_delivery_fixed}
                  textAsNumber
                  rules={{
                    required: "Campo requerido",
                    validate: (value) =>
                      value >= 0 || "Este valor debe ser mayor que cero",
                  }}
                />
              )}
            </div>
          )}
          <div className="pt-6">
            <div className="max-w-full flow-root  pt-5 pb-4  bg-slate-50 sm:px-6">
              <div className="float-right">
                <Button
                  color="slate-600"
                  type="submit"
                  name="Actualizar"
                  loading={isFetching}
                  disabled={isLoading || isFetching}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default HomeDelivery;
