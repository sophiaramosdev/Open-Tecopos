import { useForm, SubmitHandler } from "react-hook-form";

import { useAppSelector } from "../../../store/hooks";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";

import Button from "../../../components/misc/Button";
import MultiSelect from "../../../components/forms/Multiselect";

import { translateProductTypes } from "../../../utils/translate";

import useServer from "../../../api/useServerMain";
import { ConfigUpdate, SendConfigUpdate } from "../../../interfaces/Interfaces";

const AtAllProducts = () => {
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
      key: "type_products",
      value: data.type_products.toString(),
    });

    configsSend = {
      configs: config,
    };

    EditBussinesAdjustment(configsSend);
  };

  //-- Array de los tipos de productos
  const product_type = [
    "MENU",
    "STOCK",
    "SERVICE",
    "RAW",
    "MANUFACTURED",
    "WASTE",
    "ASSET",
    "ADDON",
    "COMBO",
    "VARIATION",
  ];
  const selectTypeProduct: SelectInterface[] = [];

  product_type.map((item) => {
    selectTypeProduct.push({
      id: item,
      name: translateProductTypes(item) ?? "",
    });
  });

  //-- Tipos de productos
  const type_products =
    business?.configurationsKey
      ?.find((item) => item.key === "type_products")
      ?.value.split(",")
      .map((value) => ({ id: value, name: translateProductTypes(value) })) ??
    [];

  //---------------------------------------------------------------------------------------
  return (
    <>
      <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6 bg-white">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="py-4">
            <MultiSelect
              name="type_products"
              data={selectTypeProduct.map((item) => ({
                id: item.id,
                name: item.name,
              }))}
              label="Tipos de Productos"
              control={control}
              byDefault={type_products.map((item) => item.id)}
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

export default AtAllProducts;
