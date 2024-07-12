import { useForm, SubmitHandler } from "react-hook-form";

import { useAppSelector } from "../../../store/hooks";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";

import Button from "../../../components/misc/Button";

import {
  convertBoolean,
} from "../../../utils/translate";

import Toggle from "../../../components/forms/Toggle";

import useServer from "../../../api/useServerMain";
import { ConfigUpdate, SendConfigUpdate } from "../../../interfaces/Interfaces";

const AtAllStock = () => {
  const { isLoading, isFetching, EditBussinesAdjustment } = useServer();

  const { business } = useAppSelector((state) => state.init);

  const { control, handleSubmit, watch } = useForm({ mode: "onChange" });

  const onSubmit: SubmitHandler<
    Record<string, string | number | boolean | string[]>
  > = (data) => {
    let configsSend: SendConfigUpdate = {
      configs: [],
    };

    const config: ConfigUpdate[] = [];

    config.push({
      key: "allow_tablet_to_elaborate_products_in_stock",
      value: data.allow_tablet_to_elaborate_products_in_stock.toString(),
    });

    config.push({
      key: "allow_tablet_to_make_fast_entries_in_stock",
      value: data.allow_tablet_to_make_fast_entries_in_stock.toString(),
    });

    config.push({
      key: "allow_tablet_to_make_movements_in_stock",
      value: data.allow_tablet_to_make_movements_in_stock.toString(),
    });
    
    config.push({
      key: "allow_tablet_to_make_direct_operations_in_stock",
      value: data.allow_tablet_to_make_direct_operations_in_stock?.toString(),
    });

    config.push({
      key: "allow_tablet_to_make_transformations_in_stock",
      value: data.allow_tablet_to_make_transformations_in_stock?.toString(),
    });

    configsSend = {
      configs: config,
    };

    EditBussinesAdjustment(configsSend);
  };

  //-- allow_tablet_to_elaborate_products_in_stock
  const allow_tablet_to_elaborate_products_in_stock = convertBoolean(
    business?.configurationsKey?.find(
      (item) => item.key === "allow_tablet_to_elaborate_products_in_stock"
    )?.value ?? ""
  );

  //-- allow_tablet_to_make_fast_entries_in_stock
  const allow_tablet_to_make_fast_entries_in_stock = convertBoolean(
    business?.configurationsKey?.find(
      (item) => item.key === "allow_tablet_to_make_fast_entries_in_stock"
    )?.value ?? ""
  );

  //-- allow_tablet_to_make_movements_in_stock
  const allow_tablet_to_make_movements_in_stock = convertBoolean(
    business?.configurationsKey?.find(
      (item) => item.key === "allow_tablet_to_make_movements_in_stock"
    )?.value ?? ""
  );

  //-- allow_tablet_to_make_direct_operations_in_stock
  const allow_tablet_to_make_direct_operations_in_stock = convertBoolean(
    business?.configurationsKey?.find(
      (item) => item.key === "allow_tablet_to_make_direct_operations_in_stock"
    )?.value ?? ""
  );

  //-- allow_tablet_to_make_transformations_in_stock
  const allow_tablet_to_make_transformations_in_stock = convertBoolean(
    business?.configurationsKey?.find(
      (item) => item.key === "allow_tablet_to_make_transformations_in_stock"
    )?.value ?? ""
  );

  //---------------------------------------------------------------------------------------
  return (
    <>
      <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6 bg-white">
         <form onSubmit={handleSubmit(onSubmit)}>
              <div className="py-3">
                <Toggle
                  name="allow_tablet_to_elaborate_products_in_stock"
                  control={control}
                  defaultValue={allow_tablet_to_elaborate_products_in_stock}
                  title="Elaborar productos"
                />
              </div>

              <div className="py-3">
                <Toggle
                  name="allow_tablet_to_make_fast_entries_in_stock"
                  control={control}
                  defaultValue={allow_tablet_to_make_fast_entries_in_stock}
                  title="Hacer entradas rápidas"
                />
              </div>
              <div className="py-3">
                <Toggle
                  name="allow_tablet_to_make_movements_in_stock"
                  control={control}
                  defaultValue={allow_tablet_to_make_movements_in_stock}
                  title="Hacer traslados directamente"
                />
              </div>
              <div className="py-3">
                <Toggle
                  name="allow_tablet_to_make_direct_operations_in_stock"
                  control={control}
                  defaultValue={allow_tablet_to_make_direct_operations_in_stock}
                  title="Hacer operaciones directamente"
                />
              </div>
              <div className="py-3">
                <Toggle
                  name="allow_tablet_to_make_transformations_in_stock"
                  control={control}
                  defaultValue={allow_tablet_to_make_transformations_in_stock}
                  title="Permitir transformaciones"
                />
              </div>
              <div className="pt-6">
                <div className="max-w-full flow-root  pt-5 pb-4  bg-slate-50 sm:px-6">
                  <div className="float-right">
                    <Button
                      color="slate-600"
                      type="submit"
                      name="Actualizar"
                      loading={isLoading}
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

export default AtAllStock;
