import { useContext, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import Input from "../../../components/forms/Input";
import TextArea from "../../../components/forms/TextArea";
import Select from "../../../components/forms/Select";
import { useAppSelector } from "../../../store/hooks";
import Button from "../../../components/misc/Button";
import { DetailProductContext } from "../DetailProductContainer";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import { formatCurrency } from "../../../utils/helpers";
import FacebookStyleImages from "../../../components/misc/Images/FacebookStyleImages";
import { FaRegFilePdf } from "react-icons/fa";
import reportDownloadHandler from "../../../reports/helpers/reportDownloadHandler";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";
import useServer from "../../../api/useServerMain";
import Toggle from "../../../components/forms/Toggle";
import InputDuration from "../../../components/forms/InputDuration";
import InputColor from "../../../components/forms/InputColor";
import { CiBarcode } from "react-icons/ci";
import Modal from "../../../components/misc/GenericModal";
import Barcode from "react-barcode";

const Details = () => {
  const { product, updateProduct, updateStockProductState } =
    useContext(DetailProductContext);
  const { business } = useAppSelector((state) => state.init);
  const { productCategories, measures, salesCategories } = useAppSelector(
    (state) => state.nomenclator
  );
  const { control, handleSubmit, watch, setValue } = useForm();
  const { allowRoles: verifyRoles } = useServer();

  const [barCode, setBarCode] = useState<string | null>(null);

  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    const dataToSend = data;
    if (data.barCode === product?.barCode) {
      delete dataToSend.barCode;
    }
    data.hasDurationEdit = true;
    updateProduct && updateProduct(product?.id, data, updateStockProductState);
  };

  const updateImages = (items: Record<string, any>, callback: Function) => {
    callback();
    updateProduct!(product?.id, items, updateStockProductState);
  };

  const precision = Number(
    business?.configurationsKey.find(
      (item) => item.key === "precission_after_coma"
    )?.value
  );

  //------------------------------------------------------------------------

  const selectSalesCategory: SelectInterface[] = [];
  salesCategories.map((cat) =>
    selectSalesCategory.push({
      name: cat.name,
      id: cat.id,
    })
  );
  selectSalesCategory.push({
    name: "Sin categoría",
    id: null,
  });

  const selectStockCategory: SelectInterface[] = [];
  productCategories?.map((cat) =>
    selectStockCategory.push({
      name: cat.name,
      id: cat.id,
    })
  );
  selectStockCategory.push({
    name: "Sin categoría",
    id: null,
  });

  const selectMeasure: SelectInterface[] = [];
  measures.map((item) =>
    selectMeasure.push({
      id: item.code,
      name: item.value,
    })
  );

  //----------------------------------------------------------------------------------------------------

  //Calculate cost by supplies and fixed cost ----------------------------------------------------------------
  const totalCostCalculated = () => {
    if (product?.fixedCosts.length !== 0 || product?.supplies.length !== 0) {
      return (
        (product?.fixedCosts.reduce(
          (total, value) => total + value.costAmount,
          0
        ) ?? 0) +
        (product?.supplies.reduce(
          (total, value) => total + value.quantity * value.supply.averageCost,
          0
        ) ?? 0)
      );
    }
    return undefined;
  };

  //-------------------------------------------------------------------------------------------

  const adminRole = verifyRoles(["ADMIN", "MANAGER_COST_PRICES", "PRODUCT_PROCESATOR"]);

  const hasDuration = watch("hasDuration") ?? product?.hasDuration;

  const generateBarCode = () => {
    const code = "(01)" + product!.barCode.padStart(8, "0");
    setBarCode(code);
  };

  return (
    <div>
      <div className="relative grid grid-cols-5 gap-3 h-[34rem]">
        <FacebookStyleImages
          className="flex border border-gray-300 rounded col-span-2 h-full w-full"
          previewDefault={product?.images.map((item) => ({
            id: item.id,
            src: item.src,
            hash: item.blurHash,
          }))}
          submit={updateImages}
          disabled={!adminRole}
        />
        <div className="border border-gray-300 p-2 rounded col-span-3 overflow-auto scrollbar-none">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col items-stretch h-full"
          >
            <div className="flex flex-row justify-between">
              <div className="">
                <p className="text-gray-600 text-start">
                  {"Código universal: "}
                  <span className="font-semibold">{product?.salesCode}</span>
                </p>
                {product?.externalId && (
                  <p className="text-gray-600 text-start">
                    {"Referencia externa: "}
                    <span className="font-semibold">{product?.externalId}</span>
                  </p>
                )}
              </div>
              <Button
                color="white"
                name="Exportar"
                textColor="gray-500"
                icon={<FaRegFilePdf className="h-5 text-gray-500" />}
                action={() => {
                  reportDownloadHandler(
                    "Ficha de producto",
                    "product_sheet",
                    business!,
                    product
                  );
                }}
                outline
              />
            </div>
            <div className="flex-col">
              <Input
                label="Nombre"
                name="name"
                control={control}
                placeholder="Nombre del producto"
                rules={{ required: "Este campo es requerido" }}
                defaultValue={product?.name}
                disabled={!adminRole}
              />

              {adminRole &&
                (["MANUFACTURED", "MENU", "STOCK", "ADDON"].includes(
                  product?.type ?? ""
                ) &&
                (product?.supplies.length !== 0 ||
                  product?.fixedCosts.length !== 0) ? (
                  <div className="inline-flex gap-5 w-full mt-2 text-sm font-semibold p-2 border-y border-gray-700">
                    Costo ponderado:{" "}
                    <span className="text-gray-500">
                      {formatCurrency(
                        totalCostCalculated() ?? product?.averageCost ?? 0,
                        business?.costCurrency ?? "CUP",
                        precision
                      )}
                    </span>
                  </div>
                ) : product?.type !== "COMBO" ? (
                  <Input
                    name="averageCost"
                    type="number"
                    label={`Costo ponderado en: ${business?.costCurrency}`}
                    control={control}
                    defaultValue={product?.averageCost}
                    disabled={product?.supplies.length !== 0}
                    numberAsCurrency={{ precision }}
                  />
                ) : (
                  <div className="inline-flex gap-5 w-full mt-2 text-sm font-semibold p-2 border-y border-gray-700">
                    Costo ponderado:{" "}
                    <span className="text-gray-500">
                      {formatCurrency(
                        product?.averageCost ?? 0,
                        business?.costCurrency ?? "CUP",
                        precision
                      )}
                    </span>
                  </div>
                ))}

              {[
                "STOCK",
                "MENU",
                "SERVICE",
                "ADDON",
                "COMBO",
                "VARIATION",
              ].includes(product?.type ?? "") && (
                <Select
                  label="Categoría de Venta"
                  data={selectSalesCategory}
                  name="salesCategoryId"
                  control={control}
                  defaultValue={product?.salesCategory?.id}
                  disabled={!adminRole}
                />
              )}

              {["STOCK", "RAW", "MANUFACTURED", "WASTE", "ASSET"].includes(
                product?.type ?? ""
              ) && (
                <Select
                  label="Categoría de almacén"
                  data={selectStockCategory}
                  name="productCategoryId"
                  control={control}
                  defaultValue={product?.productCategory?.id}
                  disabled={!adminRole}
                />
              )}

              {(["RAW", "MANUFACTURED", "WASTE"].includes(
                product?.type ?? ""
              ) ||
                (product?.type === "STOCK" && product.saleByWeight)) && (
                <Select
                  label="Unidad de medida"
                  data={selectMeasure}
                  name="measure"
                  control={control}
                  rules={{ required: "Este campo es requerido" }}
                  defaultValue={product?.measure}
                  disabled={!adminRole}
                />
              )}

              {business?.subscriptionPlan.code !== "FREE" && (
                <AsyncComboBox
                  name="supplierId"
                  dataQuery={{
                    url: "/administration/supplier",
                    defaultParams: { all_data: true },
                  }}
                  normalizeData={{ id: "id", name: "name" }}
                  defaultItem={
                    product?.supplier && {
                      id: product.supplier.id,
                      name: product.supplier.name,
                    }
                  }
                  nullOpt={{ id: null, name: "Sin proveedor" }}
                  control={control}
                  label="Proveedor"
                  disabled={!adminRole}
                />
              )}
              <div className="relative">
                <Input
                  name="barCode"
                  label="Código de barra"
                  defaultValue={product?.barCode}
                  control={control}
                  textAsNumber
                  disabled={!adminRole}
                />
                {product?.barCode && (
                  <CiBarcode
                    className="text-4xl text-gray-600 hover:text-gray-700 hover:cursor-pointer hover:scale-105 absolute right-2 bottom-0.5"
                    onClick={generateBarCode}
                  />
                )}
              </div>

              {product?.type === "SERVICE" &&
                business?.configurationsKey.find(
                  (itm) => itm.key === "module_booking"
                )?.value === "true" && (
                  <article>
                    <div className="flex gap-x-2 items-center ">
                      <div className="flex-1">
                        <InputDuration
                          name="duration"
                          label="Duración"
                          control={control}
                          defaultValue={product?.duration}
                          disabled={!hasDuration }
                        />
                      </div>
                      <div className="mt-5">
                        <Toggle
                          name="hasDuration"
                          control={control}
                          title="Tiene duración"
                          defaultValue={product?.hasDuration}
                        />
                      </div>
                    </div>
                    <div className="block ">
                      <InputColor
                        name="color"
                        control={control}
                        label="Color "
                        defaultValue={product.color}
                      />
                    </div>
                  </article>
                )}

              <TextArea
                label="Descripción"
                name="description"
                placeholder="Breve descripción del producto"
                control={control}
                defaultValue={product?.description}
                disabled={!adminRole}
              />
            </div>
            <div className="absolute -bottom-14 right-0 flex justify-end pt-10 self-end">
               {adminRole && <Button name="Actualizar" color="slate-600" type="submit" />}
            </div>
          </form>
        </div>
      </div>

      {barCode && (
        <Modal state={!!barCode} close={() => setBarCode(null)}>
          <div className="w-full flex flex-col items-center">
            <h5 className="font-mono">{product?.name}</h5>
            <Barcode value={barCode} />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Details;
