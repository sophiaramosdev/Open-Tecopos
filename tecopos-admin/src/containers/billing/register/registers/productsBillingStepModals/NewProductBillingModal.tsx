import { useContext, useEffect, useState } from "react";
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
import useServerArea from "../../../../../api/useServerArea";
import ScrollTypeFilter from "../../../../../components/misc/ScrollTypeFilter";
import useServerOrders from "../../../../../api/useServerOrders";
interface NewProductBillingModalInterface {
  closeModal: Function;
}
// NEW element modal
export const NewProductBillingModal = ({
  closeModal,
}: NewProductBillingModalInterface) => {
  const { clearErrors } = useForm();
  const [search, setSearch] = useState<string | null>(null);
  const { areas: allAreas } = useAppSelector((state) => state.nomenclator);
  const {
    watch,
    append,
    setValue,
    control,
    fields: selectedProductsList,
    update,
  } = useContext(RegisterContext);
  const { stockProducts, isLoading, getProductsByArea } = useServerArea();
  const {getProductsByAreaSearch,saleProducts } = useServerOrders()
  const { addProductsToAddArray, defaultValues, editMode } =
    useContext(EditContextBilling);

    const initFilter = {
      page: 1,
    };
    const [filter, setFilter] =
    useState<Record<string, string | number | boolean | null>>(initFilter);

  // Functions

  const isVariationsOnSale = (prod: StockAreaProducts ) => {
    return prod.variations.some( item => item.quantity > 0)
  }

  //Data for list product ------------------------------------------------------------------
  const onSubmit = async () => {
    const supplyProductId = watch!("supplyProductId");
    const quantityToBuy = watch!("quantityToBuy");
    const price = watch!("priceToSell");
    const variationId = watch!("variationId");

    if (supplyProductId && quantityToBuy && price) {
      const productSelected = stockProducts!.find(
        (prod) => prod.product.id === supplyProductId
      );

      // Normal product
      const productExistInArrayList = selectedProductsList?.filter(
        (field) => field.product.id === productSelected?.product?.id
      );
      const totalQuantityOfSameProduct = productExistInArrayList?.reduce(
        (acc, prod) => acc + prod.quantity,
        quantityToBuy
      );

      // Variation product
      const variationExistInArrayList = selectedProductsList?.filter(
        (field) => field.variationId === variationId
      )
      const totalQuantityOfSameVariation = variationExistInArrayList?.reduce(
        (acc, prod) => acc + prod.quantity,
        quantityToBuy
      );

      let productData = variationId ? {
        product: productSelected?.product,
        quantity: quantityToBuy,
        price: price && {price: JSON.parse(price)?.amount , codeCurrency: JSON.parse(price)?.codeCurrency },
        measure: translateMeasure(productSelected?.product.measure),
        allowQuantity: productSelected?.variations.find( item => item.variation.id === variationId)?.quantity! - totalQuantityOfSameVariation,
        variationId: variationId,
        variationName: productSelected?.variations.find( item => item.variation.id === variationId)?.variation.name
      } : { 
        product: productSelected?.product,
        quantity: quantityToBuy,
        price: price && JSON.parse(price),
        measure: translateMeasure(productSelected?.product.measure),
        allowQuantity: productSelected?.quantity! - totalQuantityOfSameProduct,
      }
      ;

      // sum quantity if the product exist and have the same currency 
      const productExistInArray = selectedProductsList?.find(
        (field) => field.variationId ? 
          ((field.product.id === productData.product?.id) &&
          (field?.price?.codeCurrency === productData?.price?.codeCurrency) &&
          (field?.variationId === variationId) && (field?.price?.price === productData?.price?.price) ) 
          :
          ((field.product.id === productData.product?.id) &&
          (field?.price?.codeCurrency === productData?.price?.codeCurrency) && (field?.price?.price === productData?.price?.price)) 
          
      );

      if (productExistInArray) {
        const indexOfProduct = selectedProductsList?.findIndex(
          (item) => item?.id === productExistInArray.id
        );
        update!(indexOfProduct!, {
          quantity: productExistInArray.quantity + productData.quantity,
          price: productData.price,
          product: productData.product,
          measure: productData.measure,
          allowQuantity: productData?.allowQuantity,
          ...(productData.variationId && {variationId: productData.variationId}),
          ...(productData.variationId && {variationName: productData?.variationName}),
        });

        editMode &&
          defaultValues?.selledProducts?.map((deflProds) => {
            deflProds?.productId === productExistInArray?.product?.id &&
              addProductsToAddArray!({
                quantity: productData.quantity,
                price: productData.price,
                product: productData.product,
                measure: productData.measure,
                allowQuantity: productData?.allowQuantity,
                ...(productData.variationId && {variationId: productData.variationId}),
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
            ...(productData.variationId && {variationId: productData.variationId}),

          });
        });
      }

      setValue!("variationId", undefined);
      setValue!("supplyProductId", "");
      setValue!("quantityToBuy", "");
      setValue!("priceToSell", "");
      setValue!("stockAreaId", "");
      setValue!("priceToSell", "");

      closeModal();
    } else if (!quantityToBuy) {
      toast.warn("Seleccione del producto una cantidad disponible ");
    } else if (!price) {
      toast.warn("Seleccione el precio del producto  ");
    }
  };

  //===> Area Data
  const areaSalesId = watch!("areaSalesId");
  const areaSalesSelected = allAreas?.find((area) => area?.id === areaSalesId);
  const stockAreaId = allAreas?.find(
    (area) => area?.id === areaSalesId
  )?.stockAreaId;
  const allowCurrencyInArea = JSON.stringify(
    areaSalesSelected?.availableCodeCurrency
  ).replaceAll('"', "");

  //===> Product Data
  useEffect(() => {
    search &&
      stockAreaId &&
      getProductsByArea!(stockAreaId.toString(), { all_data: true, search });
  }, [search, stockAreaId]);
  useEffect(() => {
      stockAreaId &&
      getProductsByArea!(stockAreaId.toString(), { ...filter,search });
  }, [search, stockAreaId,filter]);

  const productFromStockList: CustomRadioData[] = [];
  const productSelected = watch!("supplyProductId");

  const pushingData = (productFromStock: StockAreaProducts) => {
    const productPricesSelect: SelectInterface[] =
      productFromStock?.product?.prices.map((price) => {
        const priceSelect = {
          id: JSON.stringify({
            price: price?.price ?? null,
            codeCurrency: price?.codeCurrency ?? "",
          }),
          name: [
            printPriceWithCommasAndPeriods(price?.price),
            price?.codeCurrency,
          ]
            ?.toString()
            ?.replace(",", " "),
        };
        return priceSelect;
      });
      // FIX Aviable quantity of variations

      const selectedProductQuantity = selectedProductsList?.find( item => ( (item?.product?.id === productFromStock?.product?.id) && (item?.variationId === watch!('variationId')) ) )?.quantity ?? 0

      const variationQuantity = productFromStock?.variations.find(item => item.variationId === watch!('variationId'))?.quantity ?? 0
  


    const quantityProductsToBuyValidate = (e: any) => {
      if (Number(e.target.value) > productFromStock.quantity) {
        toast.warn(
          `Excediste la cantidad disponible ${productFromStock.quantity}`
        );
        setValue!("quantityToBuy", null);
      }
    };
    const quantityProductsVariationToBuyValidate = (e: any) => {
      const variationAviable = (variationQuantity! -(selectedProductQuantity))
      if (Number(e.target.value) > variationAviable ) {
        toast.warn(
          `Excediste la cantidad disponible ${variationAviable}`
        );
        setValue!("quantityToBuy", null);
      }
    };
    productFromStockList.push(
      {
      value: productFromStock.product.id,
      img:
        productFromStock.product.images[0]?.src ??
        require("../../../../../assets/image-default.jpg"),
      name: productFromStock.product.name,
      elements: 
      productSelected === productFromStock.product.id && productFromStock?.variations.length > 0  ? (
        {
          measure: translateMeasure(productFromStock?.product?.measure),
          variation: (productSelected === productFromStock?.product?.id) ? (
            <div className="mr-2 w-full">
              <Select
                name="variationId"
                data={ productFromStock.variations.map( item => ({id: item.variationId, name: item.variation.name})) ?? [] }
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
            productSelected === productFromStock?.product?.id ? (
              <div className="mr-2">
                <Input
                  name="quantityToBuy"
                  type="number"
                  placeholder={` 
                  ${ variationQuantity! - selectedProductQuantity  } 
                  Disponibles `
                
                }
                  control={control}
                  rules={{
                    required: "Este campo es requerido",
                    onChange: (e) => {
                      quantityProductsVariationToBuyValidate(e);
                    }
                  }}
                />
              </div>
            ) : (
              ""
            ),
          price:
            productSelected === productFromStock.product.id &&
            productFromStock.product.prices.length > 0 ? (
              <div className="w-full">
                <Select
                  name="priceToSell"
                  data={ 
                    productFromStock?.variations.some(item => item.variationId === watch!('variationId')) ?
                    [
                      { 
                      id: JSON.stringify(productFromStock?.variations.find(item => item.variationId === watch!('variationId'))?.variation?.price), 
                      name: `${printPriceWithCommasAndPeriods(productFromStock?.variations?.find(item => item?.variationId === watch!('variationId'))?.variation?.price?.amount)} ${
                      productFromStock?.variations.find(item => item.variationId === watch!('variationId'))?.variation?.price?.codeCurrency
                    }
                      `}] : [] }
                  rules={{ required: "Este campo es requerido" }}
                  control={control}
                />
              </div>
            ) : (
              ""
            ),
            
        }
      ) : (
        {
          measure: translateMeasure(productFromStock?.product?.measure),
          input:
            productSelected === productFromStock?.product?.id ? (
              <div className="mr-2">
                <Input
                  name="quantityToBuy"
                  type="number"
                  placeholder={` ${productFromStock?.quantity} Disponibles `}
                  control={control}
                  rules={{
                    required: "Este campo es requerido",
                    onChange: (e) => quantityProductsToBuyValidate(e),
                  }}
                />
              </div>
            ) : (
              ""
            ),
          price:
            productSelected === productFromStock.product.id &&
            productFromStock.product.prices.length > 0 ? (
              <div className="w-full">
                <Select
                  name="priceToSell"
                  data={productPricesSelect}
                  rules={{ required: "Este campo es requerido" }}
                  control={control}
                />
              </div>
            ) : (
              ""
            ),
        }
      ) 
    });
  };

  search &&
    stockProducts!.map((productFromStock) => {
      const stockProductQuantity = selectedProductsList
        ?.filter(
          (productSelected) =>
            productFromStock.product.id === productSelected.product.id
        )
        ?.reduce((acc, item) => acc + item.quantity, 0);

      const productWhitDiscount = stockProductQuantity && {
        quantity: productFromStock.quantity - stockProductQuantity,
        variations: productFromStock.variations,
        area: productFromStock.area,
        id: productFromStock.id,
        product: productFromStock.product,
      };
      const productFromStockEdited = productWhitDiscount || productFromStock;

      if (
        areaSalesSelected?.allowProductsMultiprice &&
        productFromStockEdited!.product?.prices?.length > 0 &&
        productFromStockEdited.quantity > 0 
      ) {
          if (productFromStockEdited.variations.length > 0 && isVariationsOnSale(productFromStockEdited)) {
            
            const productVariationFromStockEdited = {
              ...productFromStockEdited,
              variations: productFromStockEdited.variations.filter(item => item.quantity > 0)
            }

            pushingData(productVariationFromStockEdited);

          } else if (productFromStockEdited.variations.length === 0) {
          pushingData(productFromStockEdited);
          }
        }
      // filtered data based on config areaSales
      else
      //  (
      //   areaSalesSelected?.enforceCurrency &&
      //   productFromStockEdited!.product?.prices?.length > 0 &&
      //   productFromStockEdited!.product?.prices?.some(
      //     (price) => price.codeCurrency === allowCurrencyInArea
      //   )
      // )
       {
        const aviablePrice = productFromStockEdited!.product?.prices.filter(
          (price) => price.codeCurrency === allowCurrencyInArea
        );

        const productWhitOutUnaviableCurrencies = {
          product: { ...productFromStockEdited!.product, prices: productFromStockEdited!.product?.prices },
          quantity: productFromStockEdited?.quantity,
          variations: productFromStockEdited?.variations,
          id: productFromStockEdited?.id,
        };
        // @ts-ignore
        pushingData(productWhitOutUnaviableCurrencies);
      }
    });

    const { salesCategories, measures } = useAppSelector(
      (state) => state.nomenclator
    );
    let categoriesDisplay: SelectInterface[] = [];
    salesCategories.map((item) =>
      categoriesDisplay.push({ id: item.id, name: item.name })
    );
   
  // ------------------------
  return (
    <div className="min-h-[24rem]">
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
      />
      <SearchComponent findAction={setSearch} placeholder="Buscar producto" />
      <form>
        <div className="mt-5 pr-2 h-[24rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-100">
          {isLoading ? (
            <div className="grid w-full h-full place-items-center">
              <SpinnerLoading text="Buscando producto" />
            </div>
          ) : productFromStockList.length === 0 && !search ? (
            <div className="grid w-full h-full place-items-center">
              <EmptyList
                title="Buscar Producto"
                subTitle="Inserte un criterio de búsqueda"
              />
            </div>
          ) : productFromStockList.length === 0 && search ? (
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
              action={() => clearErrors()}
              rules={{ required: "Este campo es requerido" }}
            />
          )}
        </div>
        <footer className="w-full flex justify-end">
          <div className="w-1/2 ">
            <Button
              name="Agregar"
              action={() => onSubmit()}
              color="slate-700"
              full
            />
          </div>
        </footer>
      </form>
    </div>
  );
};
