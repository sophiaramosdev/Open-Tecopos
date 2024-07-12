import Button from "../../../../components/misc/Button";
import { useContext, useEffect, useMemo, useState } from "react";
import { BtnActions } from "../../../../components/misc/MultipleActBtn";
import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Modal from "../../../../components/misc/GenericModal";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import { toast } from "react-toastify";
import { UpdateProductBillingModal } from "./productsBillingStepModals/UpdateProductBillingModal";
import {
  AvailableCurrency,
  CurrencyInterface,
  PriceInvoiceInterface,
  ProductInterface,
} from "../../../../interfaces/ServerInterfaces";
import Select from "../../../../components/forms/Select";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../../store/hooks";
import { RegisterContext } from "../AllRegistersList";
import { translateMeasure } from "../../../../utils/translate";
import { EditContextBilling } from "../registerDetailsTabs/RegisterDetailsTab";
import useServerArea from "../../../../api/useServerArea";
import useServerProduct from "../../../../api/useServerProducts";
import { NewProductBillingModal2 } from "./productsBillingStepModals/NewProductBillingModalV2";
import {
  exchangeCurrency,
  formatCurrency,
  truncateValue,
} from "../../../../utils/helpers";
import useServerBusiness from "../../../../api/useServerBusiness";
import useServer from "../../../../api/useServerMain";
import { NewProductBillingModal3 } from "./productsBillingStepModals/NewProductBillingModalV3";
import { mathOperation } from "../../../../utils/helpers";
import { orderBy } from "lodash";
import { Area } from "../../../../interfaces/Interfaces";

interface ProductFieldInterface {
  quantity: number;
  product: ProductInterface | any;
  price: { price: number; codeCurrency: string };
  measure: string;
  allowQuantity: number;
  observations?: string;
}

// =====> MAIN SECTION
export const ProductsDetailsBillingStep = ({
  controlPrice,
  onSubmitForm,
}: any) => {
  // Hooks
  const { areas: allAreas } = useAppSelector((state) => state.nomenclator);
  const {
    setCurrentStep,
    isLoading: isLoadingContext,
    fields,
    remove,
    currentStep,
    setValue,
    control,
    watch,
    append,
    handleSubmit,
    isSubmit,
    isFetching,
  } = useContext(RegisterContext);
  const {
    editMode,
    defaultValues,
    delProductToAddArray,
    addProductsToDelArray,
  } = useContext(EditContextBilling);
  const { getProductsByArea, stockProducts, isLoading } = useServerArea();
  const { getAllProducts, allProducts } = useServerProduct();

  // ------------ Get availableCurrencies at redux --->
  const { business } = useAppSelector((state) => state.init);

  const online_shop_area_stock = business?.configurationsKey.find(
    (item) => item.key === "online_shop_area_stock"
  )?.value;

  const currenciesSelector =
    business?.availableCurrencies.map((itm) => ({
      id: itm.code,
      name: itm.code,
    })) ?? [];

  // EDIT MODE PRODUCTLIST ==============
  const stockAreaId = allAreas?.find(
    (area) =>
      area?.id === (defaultValues?.areaSales?.id ?? defaultValues?.areaId)
  )?.stockAreaId;

  const getAllDefaultProducts = async () => {
    const defaultProds: ProductFieldInterface[] = [];
    defaultValues?.selledProducts?.map((selledProd) => {
      const variationQuantity = stockProducts
        .find((stockProd) => stockProd.product.id === selledProd.productId)
        ?.variations.find(
          (variation) => variation.id === selledProd.variationId
        )?.quantity;
      const stoctProd = stockProducts.find(
        (item) => item.id === selledProd.productId
      );
      // if (stoctProd) {
      //   defaultProds.push({
      //     quantity: selledProd?.quantity,
      //     allowQuantity:
      //       variationQuantity! - selledProd?.quantity ??
      //       stoctProd?.quantity - selledProd?.quantity,
      //     price: {
      //       price: selledProd?.priceUnitary?.amount,
      //       codeCurrency: selledProd?.priceUnitary?.codeCurrency,
      //     },
      //     observations: selledProd?.observations,
      //     measure: translateMeasure(stoctProd?.product?.measure),
      //     product: stoctProd?.product,
      //     ...(selledProd.variationId && {
      //       variationId: selledProd?.variationId,
      //     }),
      //     ...(selledProd.variationId && {
      //       variationName: selledProd?.variation?.name,
      //     }),
      //   });
      // } else {
      defaultProds.push({
        quantity: selledProd?.quantity,
        observations: selledProd?.observations,
        allowQuantity:
          variationQuantity! - selledProd?.quantity ??
          selledProd?.quantity - selledProd?.quantity,
        price: {
          price: selledProd?.priceUnitary?.amount,
          codeCurrency: selledProd?.priceUnitary?.codeCurrency,
        },
        measure: translateMeasure(selledProd?.measure),
        product: { name: selledProd.name, productId: selledProd.productId },
        ...(selledProd.variationId && {
          variationId: selledProd?.variationId,
        }),
        ...(selledProd.variationId && {
          variationName: selledProd?.variation?.name,
        }),
      });
      // }
    });
    if (fields?.length === 0 && defaultProds.length > 0) append!(defaultProds);
  };

  const deleteEditMode = (objectInField: any) => {
    for (const selledProd of defaultValues?.selledProducts || []) {
      if (
        selledProd.productId === objectInField?.product?.productId &&
        selledProd.priceUnitary?.amount === objectInField?.price?.price &&
        selledProd.priceUnitary?.codeCurrency ===
          objectInField?.price?.codeCurrency
      ) {
        addProductsToDelArray!(selledProd);
      } else {
        delProductToAddArray!(
          objectInField?.product?.id ?? objectInField?.product?.productId
        );
      }
    }
  };

  const originsOnline = ["marketplace", "online", "shop", "shopapk"];
  const isOrderOnline = originsOnline.includes(defaultValues?.origin!);

  const getProductsByAreaId = async () => {
    if (stockAreaId || online_shop_area_stock) {
      const areaGet = isOrderOnline
        ? Number(online_shop_area_stock)
        : stockAreaId;
      await getProductsByArea(areaGet, { areaStockSelect: isOrderOnline });
    }
    // getAllProducts({ all_data: true });
  };
  const { allowRoles: verifyRoles } = useServer();

  useEffect(() => {
    if (editMode) {
      getProductsByAreaId();
    }
  }, []);
  useEffect(() => {
    if (editMode) {
      getAllDefaultProducts();
    }
  }, [stockProducts, allProducts, defaultValues]);

  // ====================================

  const { user } = useAppSelector((state) => state.init);
  const [addModal, setAddModal] = useState(false);

  const [updateModal, setUpdateModal] = useState<{
    id: number | string | null;
    state: boolean;
  }>({ id: null, state: false });

  const onSubmit = async () => {
    if (fields && fields?.length > 0) {
      setCurrentStep!(currentStep! + 1);
    } else {
      toast.warn("No puede realizar un registro sin agregar productos");
    }
  };

  // Data table
  const actions: BtnActions[] = [
    {
      title: "Añadir Producto",
      action: () => setAddModal(true),
      icon: <PlusIcon className="h-5" />,
    },
  ];

  const tableTitles = [
    "Producto",
    "Cantidad",
    // "Precio unitario",
    "Subtotal",
    "",
  ];

  // AREAS BY ROLES
  const areas: SelectInterface[] = useMemo(() => {
    const allSalesAreas = allAreas?.filter((area) => area.type === "SALE");
    // AREAS FOR ADMINS
    if (verifyRoles(["ADMIN"])) {
      const areasForAdmins = allSalesAreas.map((area) => ({
        id: area?.id ?? null,
        name: area?.name ?? "",
      }));
      return areasForAdmins ?? [];
      //  AREAS FOR MANAGER AREA
    } else if (
      verifyRoles(["MANAGER_AREA", "MANAGER_SALES", "MARKETING_SALES"])
    ) {
      const allowedAreasForManagerArea = user?.allowedSalesAreas.map(
        (area) => ({ id: area?.id, name: area?.name })
      );
      const areasForManagerArea = allSalesAreas
        ?.filter((area) =>
          allowedAreasForManagerArea?.find(
            (allowedArea) => allowedArea.id === area.id
          )
        )
        ?.map((area) => ({ id: area?.id ?? null, name: area?.name ?? "" }));
      return areasForManagerArea ?? [];
    }
    return [];
  }, []);

  //@ts-ignore
  const { tableData, priceUpdate, rowTotal } = useMemo(() => {
    const currency = watch!("transform_selled_products");
    const changeCurrency = !!currency;
    const getPrice = (price: any): { amount: number; codeCurrency: string } => {
      if (changeCurrency) {
        const result = exchangeCurrency(
          { amount: price.amount, codeCurrency: price.codeCurrency },
          currency,
          [...(business?.availableCurrencies || [])]
          // allCurrencies
        );
        return {
          amount: truncateValue(result?.amount || 0, 2),
          codeCurrency: result?.codeCurrency ?? "",
        };
      }
      return price;
    };

    const priceUpdate: { amount: number; codeCurrency: string }[] = [];

    //----------------Display date table ------------------- --->
    const tableData: DataTableInterface[] =
      fields?.map((item: any, idx: number) => {
        const currentFieldId = fields?.findIndex(
          (field) => field.id === item.id
        );

        const priceSale = getPrice({
          amount: item?.price?.price,
          codeCurrency: item?.price?.codeCurrency,
        });

        const totalPriceSale = getPrice({
          amount: item?.price?.price,
          codeCurrency: item?.price?.codeCurrency,
        });

        priceUpdate[idx] = priceSale;
        // setValue!(`products[${idx}].price.amount`, priceSale.amount);
        // setValue!(`products[${idx}].price.codeCurrency`, priceSale.codeCurrency);

        const productEdit = defaultValues?.selledProducts.find((ele) => {
          return (
            ele.productId === (item?.product?.productId || item?.product?.id) &&
            ele?.priceUnitary?.amount === item.price?.price &&
            ele?.priceUnitary?.codeCurrency === item.price?.codeCurrency
          );
        });

        const rowColor = editMode
          ? getColorRow(item.quantity, productEdit?.quantity)
          : "";

        return {
          rowId: item.id,
          rowColor,
          payload: {
            Producto: (
              <span className="flex flex-col">
                <p className="font-semibold">
                  {item?.variationId
                    ? `${item?.product?.name} ${item?.variationName}`
                    : item?.product?.name}
                </p>
                {item?.observations && (
                  <p className="opacity-80 text-slate-500">
                    {item?.observations}
                  </p>
                )}
              </span>
            ),
            Cantidad: (
              <>
                {item?.quantity} {item?.measure}
              </>
            ),
            // "Precio unitario": (
            //   <>
            //     {truncateValue(priceSale.amount, 2)} {priceSale.codeCurrency}
            //   </>
            // ),
            Subtotal: (
              <>
                {formatCurrency(
                  truncateValue(totalPriceSale.amount * item.quantity, 2),
                  totalPriceSale.codeCurrency
                )}
              </>
            ),
            "": (
              <div className="grid gap-4 grid-cols-2 min-w-max">
                {verifyRoles(["ADMIN", "MANAGER_AREA"]) && (
                  <Button
                    icon={<PencilIcon className="h-4 text-yellow-500" />}
                    color="yellow-300"
                    action={() =>
                      setUpdateModal({ id: currentFieldId, state: true })
                    }
                    outline
                  />
                )}

                <Button
                  icon={<TrashIcon className="h-4 text-red-500" />}
                  color="red-500"
                  action={() => {
                    remove!(currentFieldId);
                    editMode && deleteEditMode!(fields[currentFieldId]);
                  }}
                  outline
                />
              </div>
            ),
          },
        };
      }) ?? [];
    //----------------Display date table ------------------- --->

    //---------------------Total a pagar vista previo ---------------- --->
    const rowTotals: {
      name: string;
      amount: string | PriceInvoiceInterface | PriceInvoiceInterface[];
      color?: string;
      prefix?: string;
    }[] = [];

    let subtotal: Array<{ amount: number; codeCurrency: string }> = [];

    fields?.forEach((prod) => {
      const priceSale = getPrice({
        amount: prod?.price?.price,
        codeCurrency: prod?.price?.codeCurrency,
      });
      //--- Control for shell in dif currency --->
      let found = subtotal.find((elem) =>
        changeCurrency
          ? priceSale.codeCurrency
          : elem.codeCurrency === prod.price.codeCurrency
      );
      if (found) {
        const subtotal = mathOperation(
          priceSale.amount,
          prod.quantity,
          "multiplication"
        );
        found.amount = mathOperation(found.amount, subtotal, "addition", 2);
      } else {
        subtotal.push({
          amount: mathOperation(
            priceSale.amount,
            prod.quantity,
            "multiplication"
          ),
          codeCurrency: priceSale.codeCurrency,
        });
      }
    });

    rowTotals.push({
      name: `Total a pagar`,
      amount:
        subtotal?.map((itm) => ({
          amount: itm?.amount,
          codeCurrency: itm?.codeCurrency,
        })) ?? [],
    });

    const rowTotal: any = {
      rowId: "totals",
      payload: {
        Nombre: "",
        Cantidad: "",
        "Precio unitario": (
          <div className="flex flex-col gap-y-1">
            {rowTotals.map((title, idx) => {
              if (Array.isArray(title.amount)) {
                return title.amount.map((_, ix) => (
                  <div key={ix} className="p-0 h-4 font-semibold text-right">
                    {ix === 0 ? title?.name : ""}
                  </div>
                ));
              } else {
                return (
                  <p key={idx} className="p-0 h-4 font-semibold text-right">
                    {title?.name}
                  </p>
                );
              }
            })}
          </div>
        ),
        Subtotal: (
          <div className="flex flex-col gap-y-1">
            {rowTotals.map((item, idx) => {
              if (Array.isArray(item.amount)) {
                return item.amount.map((elem, ix) => (
                  <div
                    className={`${
                      item.color ?? ""
                    } flex flex-col items-start justify-start`}
                  >
                    <div key={ix} className="p-0 h-4 font-semibold text-left">
                      {item?.prefix ?? ""}
                      {formatCurrency(elem.amount, elem.codeCurrency)}
                    </div>
                  </div>
                ));
              } else if (typeof item.amount === "string") {
                return (
                  <p
                    key={idx}
                    className={`${
                      item.color ?? ""
                    } p-0 h-4 font-semibold text-left`}
                  >
                    {item.amount}
                  </p>
                );
              } else {
                return (
                  <p
                    key={idx}
                    className={`${
                      item.color ?? ""
                    } p-0 h-4 font-semibold text-left`}
                  >
                    {formatCurrency(
                      item.amount.amount,
                      item.amount.codeCurrency
                    )}
                  </p>
                );
              }
            })}
          </div>
        ),
      },
    };
    //---------------------Total a pagar vista previo ---------------- --->
    return { tableData, priceUpdate, rowTotal };
  }, [fields, remove, watch!("transform_selled_products")]);

  // change total a pagar aproximado
  useEffect(() => {
    tableData.length !== 0 && tableData.push(rowTotal);
  }, [tableData, rowTotal, fields]);

  //control de precio in transform_selled_products
  useEffect(() => {
    controlPrice && controlPrice(priceUpdate);
  }, [priceUpdate]);

  useEffect(() => {
    if (fields?.length === 0) {
      setValue!("transform_selled_products", null);
    }
  }, [fields]);

  const isAreaSelected = watch!("areaSalesId");

  useEffect(() => {
    if (isAreaSelected && !editMode) {
      setAddModal(true);
    }
  }, [isAreaSelected]);

  const type = watch!("registerType");

  const transform_invoice_into_sell_currency =
    business?.configurationsKey.find(
      (item) => item.key === "transform_invoice_into_sell_currency"
    )?.value === "true" ?? false;

  const transform_sell_currency =
    !editMode && transform_invoice_into_sell_currency;

  const stockAreas = useMemo(() => {
    const stockAreas : SelectInterface[] = [];
    allAreas.map((area) => {
      if (area.type === "STOCK") {
        stockAreas.push({
          id: area?.id ?? null,
          name: area?.name ?? "",
        });
      }
    })

    return stockAreas
  },[]);

  return (
    <div className=" grid px-5 min-h-[25rem] max-h-fit  overflow-hidden">
      <div className="flex flex-col justify-between h-full">
        {/*PUNTO DE VENTA */}
        <div className="pb-2 grid grid-cols-3 gap-x-5 ">
          <div
            className={`w-full col-span-${transform_sell_currency ? "2" : "3"}`}
          >
            {(
              <Select
                name="areaSalesId"
                control={control}
                label={"Punto de venta (*)"}
                data={areas ?? []}
                rules={{ required: "Este campo es requerido" }}
                disabled={fields!.length > 0 && !isOrderOnline}
                defaultValue={
                  defaultValues?.areaSales?.id ??
                  defaultValues?.areaId ??
                  areas.length === 1
                    ? areas[0].id
                    : null ?? null
                }
              />
            )}
          </div>
          {transform_sell_currency && (
            <div className="w-full">
              <Select
                name="transform_selled_products"
                control={control}
                label={"Facturar en"}
                data={currenciesSelector}
                placeholder="Seleccione una moneda"
                disabled={fields!.length === 0}
              />
            </div>
          )}
        </div>
        <div className="space-y-1  sm:space-y-5">
          <div className="">
            <section className="grid  sm:grid-cols-2 gap-x-5">
              <aside className="h-full">
                <NewProductBillingModal3
                  closeModal={() => {
                    setAddModal(false);
                  }}
                />
              </aside>
              <article className="mt-10 py-10 relative max-h-[65vh] overflow-hidden  scrollbar-thin scrollbar-thumb-gray-100">
                <GenericTable
                  //genericTableHeigth96
                  notShadowBotton={tableData.length === 0}
                  tableData={tableData}
                  tableTitles={tableTitles}
                  loading={editMode ? isLoading : false}
                  classRowVoid="h-[50vh] overflow-hidden scrollbar-none"
                />
              </article>
            </section>
          </div>
        </div>

        <div className="flex w-full row-span-2 items-end justify-end relative ">
          {/*EDIT MODE BUTTONS  */}
          {!editMode && (
            <div className="grid grid-cols-2 w-full gap-3 pt-2">
              <Button
                name="Atrás"
                color="white"
                textColor="blue-800"
                outline
                type="button"
                action={() => {
                  setCurrentStep!(currentStep! - 1);
                }}
                full
                disabled={currentStep === 0 ? true : false}
              />
              <Button
                name={`${type !== "BILLING" ? "Registrar" : "Continuar"}`}
                color="slate-700"
                type={`${type !== "BILLING" ? "submit" : "button"}`}
                action={type !== "BILLING" ? onSubmitForm : onSubmit}
                full
                loading={isSubmit}
                disabled={isSubmit}
              />
            </div>
          )}
        </div>
        <>
          {editMode && (
            <>
              {(defaultValues?.isPreReceipt ||
                watch!("registerType") === "PRE-BILLING") && (
                <div className="grid max-w-[80px] ml-[90%] ">
                  <Button
                    name={editMode ? "Actualizar" : `Registrar`}
                    color="slate-700"
                    type="submit"
                    full
                    loading={isLoadingContext}
                    disabled={isLoadingContext}
                  />
                </div>
              )}
              {!defaultValues?.isPreReceipt &&
                watch!("registerType") !== "PRE-BILLING" && (
                  <div className="grid max-w-[80px] ml-[90%] mt-2">
                    <Button
                      name={editMode ? "Actualizar" : `Registrar`}
                      color="slate-700"
                      type="submit"
                      full
                      loading={isFetching}
                      disabled={isFetching}
                      action={onSubmitForm}
                    />
                  </div>
                  // <Button
                  //   name="Continuar"
                  //   color="indigo-700"
                  //   type="button"
                  //   action={() => onSubmit()}
                  // />
                )}
            </>
          )}
        </>
      </div>

      {/* {addModal && (
        <Modal state={addModal} close={setAddModal} size="l">
          <NewProductBillingModal2
            closeModal={() => {
              setAddModal(false);
            }}
          />
        </Modal>
      )} */}
      {updateModal.state && typeof updateModal.id === "number" && (
        <Modal
          state={updateModal.state}
          close={() => setUpdateModal({ state: false, id: null })}
        >
          {
            <UpdateProductBillingModal
              closeUpdateModal={() =>
                setUpdateModal({ state: false, id: null })
              }
              currentProductFieldId={updateModal?.id}
            />
          }
        </Modal>
      )}
    </div>
  );
};

const getColorRow = (
  afterQuantity: number | undefined,
  beforeQuantity: number | undefined
) => {
  if (!afterQuantity || !beforeQuantity) {
    return "";
  }

  if (afterQuantity > beforeQuantity) {
    return "green-100";
  } else if (afterQuantity < beforeQuantity) {
    return "red-100";
  }

  return "";
};
