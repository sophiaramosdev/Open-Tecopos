import { useContext, useEffect, useMemo, useState } from "react";
import { Tooltip } from "react-tooltip";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAppSelector } from "../../../../../store/hooks";
import { translateMeasure } from "../../../../../utils/translate";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";
import CustomRadio, {
  CustomRadioData,
} from "../../../../../components/forms/CustomRadio";
import { StockAreaProducts } from "../../../../../interfaces/ServerInterfaces";
import Input from "../../../../../components/forms/Input";
import Select from "../../../../../components/forms/Select";
import SearchComponent from "../../../../../components/misc/SearchComponent";
import SpinnerLoading from "../../../../../components/misc/SpinnerLoading";
import EmptyList from "../../../../../components/misc/EmptyList";
import Button from "../../../../../components/misc/Button";
import { printPriceWithCommasAndPeriods } from "../../../../../utils/functions";
import { RegisterContext } from "../../AllRegistersList";
import { EditContextBilling } from "../../registerDetailsTabs/RegisterDetailsTab";
import ScrollTypeFilter from "../../../../../components/misc/ScrollTypeFilter";
import useServerOrders from "../../../../../api/useServerOrders";
import { Price, ProductSale } from "../../../../../interfaces/Interfaces";
import {
  truncateValue,
  mathOperation,
  formatCurrency,
} from "../../../../../utils/helpers";
import { PlusIcon } from "@heroicons/react/24/outline";
import CurrencyAmountInput from "../../../../../components/forms/CurrencyAmountInput";
import ProductTypeBadge from "../../../../../components/misc/badges/ProductTypeBadge";
import CustomRadioV2 from "../../../../../components/forms/CustomRadioV2";
interface NewProductBillingModalInterface {
  closeModal: Function;
}
// NEW element modal
export const NewProductBillingModal2 = ({
  closeModal,
}: NewProductBillingModalInterface) => {
  const { clearErrors } = useForm();
  const [search, setSearch] = useState<string | null>(null);
  const { areas: allAreas } = useAppSelector((state) => state.nomenclator);
  const { business } = useAppSelector((state) => state.init);
  const priceSystems = business?.priceSystems.find(
    (item) => item.isMain === true
  );

  const {
    watch,
    append,
    setValue,
    control,
    fields: selectedProductsList,
    update,
  } = useContext(RegisterContext);
  //const { stockProducts, getProductsByArea } = useServerArea();
  const { getProductsByAreaSearch, saleProductsSearch, isLoading } =
    useServerOrders();
  const { addProductsToAddArray, defaultValues, editMode } =
    useContext(EditContextBilling);

  const initFilter = null;
  const [filter, setFilter] = useState<Record<
    string,
    string | number | boolean | null
  > | null>(initFilter);

  const isVariationsOnSale = (prod: StockAreaProducts) => {
    return prod.variations.some((item) => item.quantity > 0);
  };

  const type = watch!("registerType");
  const isPreBilling = type !== "BILLING";
  //------------------------Config key --->
  const enable_to_sale_in_negative =
    business?.configurationsKey.find(
      (itm) => itm.key === "enable_to_sale_in_negative"
    )?.value === "true";
  //------------------------Config key --->

  //Data for list product ------------------------------------------------------------------
  const onSubmitAdd = async (data?: any) => {
    const supplyProductId = watch!("supplyProductId") || data?.supplyProductId;
    const quantityToBuy = watch!("quantityToBuy") || data?.quantityToBuy;
    const priceId = watch!("priceToSell") || data?.priceId;
    const variationId = watch!("variationId");
    const priceToSellManual = watch!("priceToSellManual");

    const priceManual = {
      price: priceToSellManual?.amount,
      codeCurrency: priceToSellManual?.codeCurrency,
    };

    if (supplyProductId && quantityToBuy && priceId) {
      const productSelected = saleProductsSearch!.find(
        (prod) => prod.id === supplyProductId
      ) as ProductSale;

      const quantity =
        productSelected.stockAreaProducts.find(
          (item) => item.areaId === stockAreaId
        )?.quantity ?? 0;

      const priceSelect =
        typeof priceId === "string" && priceId !== "manual"
          ? JSON.parse(priceId)
          : priceManual;

      // Normal product
      const productExistInArrayList = selectedProductsList?.filter(
        (field) => field.product.id === productSelected?.id
      );
      const totalQuantityOfSameProduct = productExistInArrayList?.reduce(
        (acc, prod) => acc + prod.quantity,
        quantityToBuy
      );

      // Variation product
      const variationExistInArrayList = selectedProductsList?.filter(
        (field) => field.variationId === variationId
      );
      const totalQuantityOfSameVariation = variationExistInArrayList?.reduce(
        (acc, prod) => acc + prod.quantity,
        quantityToBuy
      );

      let productData = variationId
        ? {
            product: productSelected,
            quantity: quantityToBuy,
            price: priceId && {
              price: priceSelect.amount,
              codeCurrency: priceSelect.codeCurrency,
            },
            measure: translateMeasure(productSelected.measure),
            allowQuantity:
              productSelected?.variations.find(
                (item) => item.variation.id === variationId
              )?.quantity! - (totalQuantityOfSameVariation || 0),
            variationId: variationId,
            variationName: productSelected?.variations.find(
              (item) => item.variation.id === variationId
            )?.variation.name,
          }
        : {
            product: productSelected,
            quantity: quantityToBuy,
            price: priceSelect,
            measure: translateMeasure(productSelected.measure),
            allowQuantity: quantity - (totalQuantityOfSameProduct || 0),
          };
      // sum quantity if the product exist and have the same currency
      const productExistInArray = selectedProductsList?.find((field) => {
        const idField = field.product.id ?? field.product.productId;

        return field.variationId
          ? field.product.id ??
              (field.product.productId === productData.product?.id &&
                field?.price?.codeCurrency ===
                  productData?.price?.codeCurrency &&
                field?.variationId === variationId &&
                field?.price?.price === productData?.price)
          : idField === productData.product?.id &&
              field?.price?.codeCurrency === productData?.price?.codeCurrency &&
              //@ts-ignore
              field?.price?.price === productData?.price?.price;
      });

      if (productExistInArray) {
        const indexOfProduct = selectedProductsList?.findIndex(
          (item) => item?.id === productExistInArray.id
        );
        update!(indexOfProduct!, {
          quantity:
            Number(productExistInArray.quantity) + Number(productData.quantity),
          price: productData.price,
          product: productData.product,
          measure: productData.measure,
          allowQuantity: productData?.allowQuantity,
          ...(productData.variationId && {
            variationId: productData.variationId,
          }),
          ...(productData.variationId && {
            variationName: productData?.variationName,
          }),
        });

        editMode &&
          defaultValues?.selledProducts?.map((deflProds) => {
            deflProds?.productId === productExistInArray?.product.productId &&
              addProductsToAddArray!({
                quantity: Number(productData.quantity),
                price: productData.price,
                product: productData.product,
                measure: productData.measure,
                allowQuantity: productData?.allowQuantity,
                ...(productData.variationId && {
                  variationId: productData.variationId,
                }),
              });
          });
      } else {
        append!(productData);

        editMode && addProductsToAddArray!(productData);
      }

      // update others products whit the same id
      const otherProdWhitTheSameId = productExistInArrayList?.filter(
        (field) =>
          field?.price?.codeCurrency !== productData?.price?.codeCurrency
      );

      if (otherProdWhitTheSameId?.length! > 0) {
        otherProdWhitTheSameId?.map((field) => {
          const indexOfProduct = selectedProductsList?.findIndex(
            (item) => item?.id === field?.id
          );

          update!(indexOfProduct!, {
            allowQuantity: productData?.allowQuantity,
            quantity: field.quantity,
            price: field?.price,
            product: field?.product,
            measure: field?.measure,
            ...(productData.variationId && {
              variationId: productData.variationId,
            }),
          });
        });
      }

      setValue!("variationId", undefined);
      setValue!("supplyProductId", "");
      setValue!("quantityToBuy", "");
      setValue!("priceToSell", "");
      setValue!("stockAreaId", "");
      setValue!("priceToSell", "");
      setValue!("priceToSellManual", null);

      toast.success("Producto agregado a la orden ");
      //closeModal();
    } else if (!quantityToBuy) {
      toast.warn("Seleccione del producto una cantidad disponible ");
    } else if (!priceId) {
      toast.warn("Seleccione el precio del producto  ");
    }
  };

  //===> Area Data
  const areaSalesId = watch!("areaSalesId");
  const areaSalesSelected = allAreas?.find((area) => area?.id === areaSalesId);
  const stockAreaId = allAreas?.find(
    (area) => area?.id === areaSalesId
  )?.stockAreaId;
  // const allowCurrencyInArea = JSON.stringify(
  //   areaSalesSelected?.availableCodeCurrency
  // ).replaceAll('"', "");
  const allowProductsMultiprice = allAreas.find(
    (area) => area.id === areaSalesId
  )?.allowProductsMultiprice;
  const allowManualPrice = allAreas?.find(
    (area) => area.id === areaSalesId
  )?.allowManualPrice;

  const availableCodeCurrency = allAreas.find(
    (area) => area.id === stockAreaId
  )?.availableCodeCurrency;

  const currenciesSelector =
    business?.availableCurrencies.map((itm) => itm.code) ?? [];

  useEffect(() => {
    if (areaSalesId && filter) {
      getProductsByAreaSearch!(areaSalesId, { ...filter });
    }
    //saleProducts
  }, [areaSalesId, filter]);

  const productFromStockList: CustomRadioData[] = [];
  const productSelected = watch!("supplyProductId");
  const pushingData = (productFromStock: ProductSale) => {
    //
    const quantity =
      productFromStock.stockAreaProducts.find(
        (item: any) => item.areaId === stockAreaId
      )?.quantity ?? 0;

    //@ts-ignore
    const stockVariations =
      productFromStock.stockAreaProducts.find(
        (item: any) => item.areaId === stockAreaId
      )?.variations ?? [];

    const variation = [...productFromStock.variations];

    const variation2 = stockVariations.map((item) => {
      const inStock = productFromStock?.variations.find(
        (variation) => item?.variationId === variation?.id
      );
    });

    //Prices product-------------------------------------------------
    const productOnSale = productFromStock?.onSale;
    const productOnSaleDiscount = productFromStock?.onSaleDiscountAmount || 0;
    const productOnSaleType = productFromStock?.onSaleType;
    let onSalePrice =
      productFromStock?.onSalePrice ??
      ({ amount: 0, codeCurrency: "" } as Price);

    const productPricesSelect: any[] = [];
    productFromStock?.prices.forEach((price: any) => {
      if (productOnSaleType === "percent" && productOnSale && onSalePrice) {
        const discount = truncateValue(productOnSaleDiscount / 100 + 1, 3);
        onSalePrice.amount = mathOperation(
          price?.price,
          discount,
          "division",
          2
        );
        onSalePrice.codeCurrency = price?.codeCurrency;
      }
      const idOnSale = JSON.stringify({
        price: onSalePrice?.amount,
        codeCurrency: onSalePrice?.codeCurrency,
      });

      if (allowProductsMultiprice) {
        const priceSelect = {
          id: productOnSale ? idOnSale : JSON.stringify({ ...price }),
          name: productOnSale ? (
            <span className=" flex gap-x-2">
              {onSalePrice?.amount} {onSalePrice?.codeCurrency}
              <span className="line-through">
                {price?.price} {price?.codeCurrency}
              </span>
            </span>
          ) : (
            ` ${price?.price} ${price?.codeCurrency}`
          ),
        };
        productPricesSelect.push(priceSelect);
      }
      if (
        !allowProductsMultiprice &&
        price.priceSystemId === priceSystems?.id
      ) {
        const priceSelect = {
          id: productOnSale ? idOnSale : JSON.stringify({ ...price }),
          name: productOnSale ? (
            <span className=" flex gap-x-2">
              {onSalePrice?.amount} {onSalePrice?.codeCurrency}
              <span className="line-through">
                {price?.price} {price?.codeCurrency}
              </span>
            </span>
          ) : (
            ` ${price?.price} ${price?.codeCurrency}`
          ),
        };
        productPricesSelect.push(priceSelect);
      }
    });

    if (allowManualPrice) {
      productPricesSelect.push({ id: "manual", name: "Manual" });
    }
    //Prices product-------------------------------------------------

    // FIX Aviable quantity of variations
    const selectedProductQuantity =
      selectedProductsList?.find(
        (item) =>
          item?.product?.id === productFromStock?.id &&
          item?.variationId === watch!("variationId")
      )?.quantity ?? 0;

    const getStock = () => {
      if (
        productFromStock.type === "SERVICE" ||
        productFromStock.type === "COMBO"
      ) {
        return "";
      }

      if (enable_to_sale_in_negative && ((quantity - selectedProductQuantity) < 0)  ) {
        return 0;
      }

      return quantity - selectedProductQuantity;
    };

    const stock = getStock();

    const variationQuantity =
      productFromStock?.variations?.find(
        (item: { variationId: any }) =>
          item.variationId === watch!("variationId")
      )?.quantity ?? 0;

    const productsNotStock = ["SERVICE", "COMBO"];

    //----------------------Validation form------------------>
    const quantityProductsToBuyValidate = (e: any) => {
 
      if (
        Number(e.target.value) > quantity &&
        !productsNotStock.includes(productFromStock.type) &&
        !enable_to_sale_in_negative &&
        !isPreBilling
      ) {
        toast.warn(
          `Excediste la cantidad disponible ${
            quantity - selectedProductQuantity
          }`
        );
        setValue!("quantityToBuy", null);
      }
    };
    const quantityProductsVariationToBuyValidate = (e: any) => {
      const variationAviable = variationQuantity! - selectedProductQuantity;
      if (
        Number(e.target.value) > variationAviable &&
        !enable_to_sale_in_negative &&
        !isPreBilling
      ) {
        toast.warn(`Excediste la cantidad disponible ${variationAviable}`);
        setValue!("quantityToBuy", null);
      }
    };
    //----------------------Validation form------------------>
    const priceDefault = JSON.parse(productPricesSelect[0].id) ?? "";

    const dataDefaultToAdd = {
      supplyProductId: productFromStock.id,
      quantityToBuy: watch!("quantityToBuy") || 1,
      //priceId: productPricesSelect[0].id,
      //---------- todas las combinaciones del precio si es el del select , manual , o por defecto el 1ro --->
      priceId:
        watch!("priceToSell") ||
        watch!("priceToSellManual") ||
        productPricesSelect[0].id,
      //variationId:
    };

    //Change in table
    productFromStockList.push({
      value: productFromStock.id,
      img:
        productFromStock.images[0]?.src ??
        require("../../../../../assets/image-default.jpg"),
      name: productFromStock.name,
      endElement: (
        <div className="w-[10px] -mx-10 z-50">
          <PlusIcon
            className="w-7 cursor-pointer ml-5  "
            onClick={() => {
              //if (watch!("priceToSell") !== "manual") {
              onSubmitAdd(dataDefaultToAdd);
              // }
            }}
          />
        </div>
      ),
      elements:
        productSelected === productFromStock.id && variation.length > 0
          ? {
              measure: translateMeasure(productFromStock?.measure),
              variation:
                productSelected === productFromStock?.id ? (
                  <div className="m ">
                    <Select
                      name="variationId"
                      data={
                        variation.map((item: any) => ({
                          id: item?.variationId,
                          name: item?.name,
                        })) ?? []
                      }
                      control={control}
                      rules={{
                        required: "Este campo es requerido",
                      }}
                    />
                  </div>
                ) : (
                  ""
                ),
              input:
                productSelected === productFromStock?.id ? (
                  <div className="">
                    <Input
                      name="quantityToBuy"
                      type="number"
                      //     placeholder={`
                      // ${variationQuantity! - selectedProductQuantity}
                      // Disponibles `}
                      control={control}
                      rules={{
                        required: "Este campo es requerido",
                        onChange: (e) => {
                          quantityProductsVariationToBuyValidate(e);
                        },
                      }}
                    />
                  </div>
                ) : (
                  ""
                ),
              price:
                productSelected === productFromStock.id &&
                productFromStock.prices.length > 0 ? (
                  <div className="w-full">
                    <Select
                      name="priceToSell"
                      data={
                        productFromStock?.variations.some(
                          (item: { variationId: any }) =>
                            item.variationId === watch!("variationId")
                        )
                          ? [
                              {
                                id: JSON.stringify(
                                  productFromStock?.variations.find(
                                    (item: any) =>
                                      item.variationId === watch!("variationId")
                                  )?.variation?.price
                                ),
                                name: `${printPriceWithCommasAndPeriods(
                                  productFromStock?.variations?.find(
                                    (item: any) =>
                                      item?.variationId ===
                                      watch!("variationId")
                                  )?.variation?.price?.amount
                                )} ${
                                  productFromStock?.variations.find(
                                    (item: any) =>
                                      item.variationId === watch!("variationId")
                                  )?.variation?.price?.codeCurrency
                                }
                      `,
                              },
                            ]
                          : []
                      }
                      rules={{ required: "Este campo es requerido" }}
                      control={control}
                    />
                  </div>
                ) : (
                  ""
                ),
            }
          : {
              measure: (
                <div className="flex flex-col justify-center items-center">
                  {translateMeasure(productFromStock?.measure)}
                  <ProductTypeBadge type={productFromStock.type} />
                </div>
              ),
              stock: (
                <div className="flex  justify-start gap-x-3">
                  <span className="text-start">{stock} Disponible</span>
                  <span className="flex justify-start">
                    {formatCurrency(
                      truncateValue(priceDefault.price, 2),
                      priceDefault.codeCurrency
                    )}
                  </span>
                </div>
              ),
              input:
                productSelected === productFromStock?.id ? (
                  <div className="max-w-[50px]">
                    <Input
                      name="quantityToBuy"
                      type="text"
                      // placeholder={` ${stock} Disponibles `}
                      control={control}
                      rules={{
                        required: "Este campo es requerido",
                        onChange: (e) => quantityProductsToBuyValidate(e),
                      }}
                      textAsNumber
                    />
                  </div>
                ) : (
                  ""
                ),
              price:
                productSelected === productFromStock?.id &&
                productFromStock?.prices?.length > 0 ? (
                  <div className="w-full min-w-[200px]">
                    {watch!("priceToSell") !== "manual" ? (
                      <Select
                        name="priceToSell"
                        data={productPricesSelect}
                        rules={{ required: "Este campo es requerido" }}
                        control={control}
                        defaultValue={productPricesSelect[0].id}
                      />
                    ) : (
                      <CurrencyAmountInput
                        name="priceToSellManual"
                        control={control}
                        currencies={currenciesSelector}
                      />
                    )}
                  </div>
                ) : (
                  ""
                ),
            },
    });
  };

  saleProductsSearch.length > 0 &&
    saleProductsSearch!.map((productFromStock) => {
      const stockProduct = productFromStock.stockAreaProducts.find(
        (item) => item.areaId === stockAreaId
      )?.quantity;
      pushingData(productFromStock);
    });

  const { salesCategories, measures } = useAppSelector(
    (state) => state.nomenclator
  );
  let categoriesDisplay: SelectInterface[] = [];
  salesCategories.map((item) => {
    categoriesDisplay.push({ id: item.id, name: item.name });
  });
  // ------------------------

  useEffect(() => {
    const handleEnter = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
       // onSubmitAdd();
      }
    };

    document.addEventListener("keydown", handleEnter);

    return () => {
      document.removeEventListener("keydown", handleEnter);
    };
  }, []);

  return (
    <div className="min-h-[24rem] scrollbar-none">
      <ScrollTypeFilter
        title="Categorías de ventas"
        items={categoriesDisplay}
        current={Number(filter?.salesCategoryId) ?? null}
        onChange={(item: string | number | null) =>
          setFilter({
            ...filter,
            salesCategoryId: item,
          })
        }
        scrollbarDisabled={true}
        allButtonDisabled
        allButtonEnd
      />
      <SearchComponent
        findAction={(e: any) => setFilter({ search: e })}
        placeholder="Buscar producto"
      />
      <section>
        <div className="mt-5 pr-2 h-[24rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-100">
          {isLoading ? (
            <div className="grid w-full h-full place-items-center">
              <SpinnerLoading text="Buscando producto" />
            </div>
          ) : productFromStockList?.length === 0 && !search ? (
            <div className="grid w-full h-full place-items-center">
              <EmptyList
                title="Buscar Producto"
                subTitle="Inserte un criterio de búsqueda"
              />
            </div>
          ) : productFromStockList?.length === 0 && search ? (
            <div className="grid w-full h-full place-items-center">
              <EmptyList
                title="Producto no encontrado"
                subTitle="Inserte otro criterio de búsqueda"
              />
            </div>
          ) : (
            <CustomRadio
              data={productFromStockList}
              name="supplyProductId"
              control={control}
              action={() => {
                setValue!("priceToSell", null);
                clearErrors();
              }}
              rules={{ required: "Este campo es requerido" }}
              className="w-[90%] px-2"
            />
          )}
        </div>
        {/* <footer className="w-full flex justify-end gap-x-5">
          <div className="w-1/2 ">
            <Button
              name="Cerrar"
              color="white"
              textColor="blue-800"
              outline
              type="button"
              action={() => closeModal()}
              full
            />
          </div>
          <div className="w-1/2 ">
            <Button
              name="Agregar"
              action={() => onSubmitAdd()}
              color="indigo-700"
              type="button"
              full
            />
          </div>
        </footer> */}
      </section>
    </div>
  );
};
