/* eslint-disable array-callback-return */
/* eslint-disable react-hooks/exhaustive-deps */
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAppSelector } from "../../../../../store/hooks";
import { translateMeasure } from "../../../../../utils/translate";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";
import Input from "../../../../../components/forms/Input";
import Select from "../../../../../components/forms/Select";
import SearchComponent from "../../../../../components/misc/SearchComponent";
import SpinnerLoading from "../../../../../components/misc/SpinnerLoading";
import EmptyList from "../../../../../components/misc/EmptyList";
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
import CustomRadioV2, {
  CustomRadioData2,
} from "../../../../../components/forms/CustomRadioV2";
interface NewProductBillingModalInterface {
  closeModal: Function;
}
// NEW element modal
export const NewProductBillingModal3 = ({
  closeModal,
}: NewProductBillingModalInterface) => {
  const { clearErrors } = useForm();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    orderById,
  } = useContext(RegisterContext);
  //const { stockProducts, getProductsByArea } = useServerArea();
  const { getProductsByAreaSearch, saleProductsSearch, isLoading } =
    useServerOrders();
  const {
    addProductsToAddArray,
    defaultValues,
    editMode,
    setAddedProductsArray,
  } = useContext(EditContextBilling);

  const type = watch!("registerType");
  const isPreBilling = type !== "BILLING";
  const initFilter = null;
  const [filter, setFilter] = useState<Record<
    string,
    string | number | boolean | null
  > | null>(initFilter);
  useEffect(() => {
    if (type === "PRE-BILLING") {
      setFilter({ ...filter, notStrickStock: true });
    } else {
      setFilter({ ...filter, notStrickStock: false });
    }
  }, [type]);
  //------------------------Config key --->
  const enable_to_sale_in_negative =
    business?.configurationsKey.find(
      (itm) => itm.key === "enable_to_sale_in_negative"
    )?.value === "true";
  //------------------------Config key --->

  // ----------------------- check is order online --->
  const originsOnline = ["marketplace", "online", "shop", "shopapk"];
  const isOrderOnline = originsOnline.includes(defaultValues?.origin!);

  //===> Area Data
  const areaSalesId = watch!("areaSalesId");
  const areaSalesSelected = allAreas?.find((area) => area?.id === areaSalesId);
  const stockAreaId = allAreas?.find(
    (area) => area?.id === areaSalesId
  )?.stockAreaId;

  const allowProductsMultiprice = allAreas.find(
    (area) => area.id === areaSalesId
  )?.allowProductsMultiprice;
  const allowManualPrice = allAreas?.find(
    (area) => area.id === areaSalesId
  )?.allowManualPrice;

  const currenciesSelector =
    business?.availableCurrencies.map((itm) => itm.code) ?? [];

  //Data for list product ------------------------------------------------------------------
  const onSubmitAdd = async (data?: any) => {
    const supplyProductId = watch!("supplyProductId") || data?.supplyProductId;
    const quantityToBuy = watch!("quantityToBuy") || data?.quantityToBuy;
    const priceId = watch!("priceToSell") || data?.priceId;
    const variationId = watch!("variationId");
    const priceToSellManual = watch!("priceToSellManual");

    const checkProduct = saleProductsSearch.find(
      (item) => item.id === supplyProductId
    );
    const selectedProductQuantity =
      selectedProductsList?.find(
        (item) => item?.product?.id === supplyProductId
      )?.quantity ?? 0;

    if (quantityToBuy <= 0) {
      return toast.warn("Seleccione una cantidad valida.");
    }
    if (checkProduct) {
      const stockArea = checkProduct?.stockAreaProducts.find(
        (item) => item?.areaId === areaSalesSelected?.stockAreaId
      );
      //---------------For product type combo --->
      if (
        checkProduct.type === "COMBO" &&
        quantityToBuy > checkProduct.totalQuantity - selectedProductQuantity &&
        !enable_to_sale_in_negative &&
        !isPreBilling &&
        checkProduct.stockLimit
      ) {
        return toast.warn(
          `Excediste la cantidad disponible ${
            checkProduct.totalQuantity - selectedProductQuantity
          }`
        );
      }
      //---------------For product type stock normal --->
      if (
        stockArea &&
        stockArea?.quantity - selectedProductQuantity < quantityToBuy &&
        !enable_to_sale_in_negative &&
        !isPreBilling &&
        checkProduct.stockLimit
      ) {
        return toast.warn(
          `Excediste la cantidad disponible ${
            stockArea?.quantity - selectedProductQuantity
          }`
        );
      }
    }

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

        const productExistInOrden = orderById?.selledProducts.find((item) => {
          const productId =
            productExistInArray.product.id ||
            productExistInArray.product.productId;
          if (
            item.productId === productId &&
            item.priceUnitary.codeCurrency ===
              productExistInArray.price.codeCurrency &&
            item.priceUnitary.amount === productExistInArray.price.price
          ) {
            return item;
          }
        });
        // control state array for edit products in order
        if (editMode && productExistInArray) {
          //@ts-ignore
          setAddedProductsArray!((data: any) => {
            const update = data.map((item: any) => {
              if (item.product.id === supplyProductId) {
                let fieldAdd = item;
                const newQuantity =
                  Number(productExistInArray.quantity) +
                  Number(productData.quantity);

                item.quantity = productExistInOrden
                  ? newQuantity - productExistInOrden.quantity
                  : newQuantity;

                return fieldAdd;
              }
              return item;
            });
            return update;
          });
        }
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
  const areaStockId = watch!("areaStockId");
  useEffect(() => {
    if ((areaSalesId || areaStockId) && filter) {
      const areaToSearch = areaSalesId ?? areaStockId;
      getProductsByAreaSearch!(areaToSearch, {
        ...filter,
        areaStockSelect: isOrderOnline,
      });
    }
    //saleProducts
  }, [areaSalesId, filter]);

  const productFromStockList: CustomRadioData2[] = [];
  const productSelected = watch!("supplyProductId");
  const pushingData = (productFromStock: ProductSale) => {
    //
    const quantity =
      productFromStock.stockAreaProducts.find(
        (item: any) => item.areaId === stockAreaId
      )?.quantity ?? 0;

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
        const discount = 1 - productOnSaleDiscount / 100;
        onSalePrice.amount = mathOperation(
          price?.price,
          discount,
          "multiplication",
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
      if (productFromStock.type === "SERVICE") {
        return "";
      }

      if (productFromStock.type === "COMBO") {
        return productFromStock?.totalQuantity - selectedProductQuantity;
      }

      return quantity - selectedProductQuantity;
    };

    const stock = getStock();

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
        <div className="w-[10px] -mx-10 ">
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
      measure: (
        <div className="flex items-center gap-x-3">
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
          <div className="">
            <Input
              placeholder="Cantidad"
              name="quantityToBuy"
              type={productFromStock.saleByWeight ? "number" : "text"}
              control={control}
              rules={{
                required: "Este campo es requerido",
              }}
              autoFocus
              textAsNumber={!productFromStock.saleByWeight}
            />
          </div>
        ) : (
          ""
        ),
      price:
        productSelected === productFromStock?.id &&
        productFromStock?.prices?.length > 0 ? (
          <div className="w-full ">
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
    });
  };

  saleProductsSearch.length > 0 &&
    saleProductsSearch!.map((productFromStock) => {
      pushingData(productFromStock);
    });

  const { salesCategories } = useAppSelector((state) => state.nomenclator);
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
        className="my-0"
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
        placeholder={
          !stockAreaId && !areaStockId
            ? "Seleccione un punto de venta para continuar"
            : "Buscar producto"
        }
        disabled={!stockAreaId && !areaStockId}
      />
      <section>
        <div className="mt-5 pr-2 h-[45vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-100">
          {isLoading ? (
            <div className="grid w-full  place-items-center">
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
            <CustomRadioV2
              data={productFromStockList}
              name="supplyProductId"
              control={control}
              action={() => {
                // setValue!("priceToSell", null);
                setValue!("quantityToBuy", null);
                clearErrors();
              }}
              // rules={{ required: "Este campo es requerido" }}
              className="w-[90%] h-full px-2"
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
