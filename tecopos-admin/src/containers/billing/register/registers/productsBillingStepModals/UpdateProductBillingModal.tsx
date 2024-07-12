import { useContext, useEffect, useMemo, useState } from "react";
import AmountCurrencyInput from "../../../../../components/forms/AmountCurrencyInput";
import Input from "../../../../../components/forms/Input";
import Button from "../../../../../components/misc/Button";
import { PriceInterface } from "../../../../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../../../../store/hooks";
import { toast } from "react-toastify";
import { RegisterContext } from "../../AllRegistersList";
import { EditContextBilling } from "../../registerDetailsTabs/RegisterDetailsTab";
import TextArea from "../../../../../components/forms/TextArea";
import { useForm } from "react-hook-form";
import Fetching from "../../../../../components/misc/Fetching";

interface UpdateInterface {
  currentProductFieldId: any;
  closeUpdateModal: Function;
}

export const UpdateProductBillingModal = ({
  currentProductFieldId,
  closeUpdateModal,
}: UpdateInterface) => {
  //==>> Hooks
  const { update, fields, watch, control, setValue } =
    useContext(RegisterContext);
  const {
    addProductsToDelArray,
    addProductsToAddArray,
    defaultValues,
    delProductToAddArray,
    editMode,
    deletedProductsArray,
    addedProductsArray,
    setAddedProductsArray,
    setDeletedProductsArray,
  } = useContext(EditContextBilling);
  const { areas: allAreas } = useAppSelector((state) => state.nomenclator);
  const { business } = useAppSelector((state) => state.init);
  const currentProductField = fields?.find(
    (field, idx) => idx === currentProductFieldId
  );
  const idxField = fields?.findIndex(
    (field, idx) => idx === currentProductFieldId
  );

  const type = watch!("registerType");
  const isPreBilling = type !== "BILLING";

  //=Config keys==>>
  const enable_to_sale_in_negative =
    business?.configurationsKey.find(
      (itm) => itm.key === "enable_to_sale_in_negative"
    )?.value === "true";

  //=Config keys==>>

  //==>> watchers
  const productArea = watch!("areaSalesId");
  const newQuantity = watch!("newQuantity");
  const newPrice = watch!("newPriceToSell");
  const observations = watch!("observations_sell");

  //=>> Area config
  const enforceCurrency = allAreas?.find(
    (area) => area.id === productArea
  )?.enforceCurrency;
  const allowManualPrice = allAreas?.find(
    (area) => area.id === productArea
  )?.allowManualPrice;
  const allowProductsMultiprice = allAreas.find(
    (area) => area.id === productArea
  )?.allowProductsMultiprice;
  const availableCodeCurrency = allAreas.find(
    (area) => area.id === productArea
  )?.availableCodeCurrency;

  // new array without duplicated currencies
  const currenciesArrayDuplicated: string[] =
    currentProductField?.product?.prices?.map(
      (price: PriceInterface) => price?.codeCurrency
    );
  const currenciesSet = new Set(currenciesArrayDuplicated);

  // if the sale area have enforced currency enable
  const currencies: string[] =
    enforceCurrency && availableCodeCurrency
      ? Array.from(currenciesSet).filter(
          (currency) =>
            currency ===
            JSON.stringify(availableCodeCurrency)?.replaceAll('"', "")
        )
      : Array.from(currenciesSet);

  const UpdateProductBillingModal = () => {
    const sameProductsArray = fields
      ?.filter((item) => currentProductField?.product?.id === item.product.id)
      .filter(
        (item) =>
          item.price.codeCurrency !== currentProductField?.price.codeCurrency
      );

    const notCheckStock = ["SERVICE", "COMBO","MENU", "ADDON"];

    if (
      newQuantity > currentProductField?.allowQuantity &&
      !notCheckStock.includes(currentProductField?.product?.type) &&
      !enable_to_sale_in_negative &&
      !isPreBilling
    ) {
      toast.warn(
        `Excediste la cantidad disponible ${currentProductField?.allowQuantity}`
      );
    } else if (newQuantity <= 0) {
      toast.warn("Debe seleccionar como mínimo 1 producto");
    } else {
      const indexOfProduct = fields?.findIndex(
        (item) => item?.id === currentProductField?.id
      );
      update!(indexOfProduct!, {
        ...currentProductField,
        quantity: newQuantity,
        observations,
        price: {
          price: newPrice?.amount ?? currentProductField?.price?.price,
          codeCurrency:
            newPrice?.codeCurrency ?? currentProductField?.price?.codeCurrency,
        },
        allowQuantity:
          currentProductField?.quantity +
          currentProductField?.allowQuantity -
          newQuantity,
      });

      sameProductsArray?.map((prod) => {
        const indexOfProduct = fields?.findIndex(
          (item) => item?.id === prod.id
        );
        update!(indexOfProduct!, {
          ...prod,
          observations,
          allowQuantity:
            currentProductField?.quantity +
            currentProductField?.allowQuantity -
            newQuantity,
        });
      });

      // EDIT MODE ================
      editMode &&
        defaultValues?.selledProducts.map((selledProd) => {
          const isTheSameProduct =
            selledProd?.productId === currentProductField?.product?.productId;
          const isTheSameCodeCurrency =
            selledProd?.priceUnitary?.codeCurrency ===
            currentProductField?.price?.codeCurrency;

          
          if (isTheSameProduct && isTheSameCodeCurrency) {
            if (newQuantity > currentProductField?.quantity) {
              addProductsToAddArray!({
                ...currentProductField,
                observations,
                quantity: newQuantity - currentProductField?.quantity,
                price: {
                  price: newPrice?.amount ?? currentProductField?.price?.price,
                  codeCurrency:
                    newPrice?.codeCurrency ??
                    currentProductField?.price?.codeCurrency,
                },
                allowQuantity:
                  currentProductField.quantity +
                  currentProductField.allowQuantity -
                  newQuantity,
              });
            } else {
              addProductsToDelArray!({
                ...selledProd,
                observations,
                quantity: currentProductField?.quantity - newQuantity,
              });
            }
          } else if (isTheSameProduct && !isTheSameCodeCurrency) {
            addProductsToAddArray!({
              ...currentProductField,
              observations,
              quantity: newQuantity,
              price: {
                price: newPrice?.amount ?? currentProductField?.price?.price,
                codeCurrency:
                  newPrice?.codeCurrency ??
                  currentProductField?.price?.codeCurrency,
              },
              allowQuantity:
                currentProductField.quantity +
                currentProductField.allowQuantity -
                newQuantity,
            });
          } else if (!isTheSameProduct) {
            // delProductToAddArray!(currentProductField);
            // addProductsToAddArray!({
            //   ...currentProductField,
            //   quantity: newQuantity,
            //   price: {
            //     price: newPrice?.amount ?? currentProductField?.price?.price,
            //     codeCurrency:
            //       newPrice?.codeCurrency ??
            //       currentProductField?.price?.codeCurrency,
            //   },
            //   allowQuantity:
            //     currentProductField?.quantity +
            //     currentProductField?.allowQuantity -
            //     newQuantity,
            // });
          }
        });

      if (editMode) {
        const conditional = {
          productId:
            currentProductField?.product?.productId ??
            currentProductField?.product?.id,
          amount: currentProductField?.price?.price,
          codeCurrency: currentProductField?.price?.codeCurrency,
        };
        const existInArrayAdd = addedProductsArray!.find((item) => {
          return (
            item?.product?.id === conditional?.productId &&
            item?.price?.price === conditional?.amount &&
            item?.price?.codeCurrency === conditional?.codeCurrency
          );
        });
        if (existInArrayAdd) {
          setAddedProductsArray!((data: any) => {
            const update = data.map((item: any) => {
              if (item?.product?.id === existInArrayAdd?.product?.id) {
                let fieldAdd = item;
                item.quantity = newQuantity;
                return fieldAdd;
              }
              return item;
            });
            return update;
          });
        }
        const existInArrayDel = deletedProductsArray!.find(
          (item) =>
            item?.product?.id === conditional?.productId &&
            item?.price?.price === conditional?.amount &&
            item?.price?.codeCurrency === conditional?.codeCurrency
        );

        if (existInArrayDel) {
          setDeletedProductsArray!((data: any) => {
            const update = data.map((item: any) => {
              if (item?.product?.id === existInArrayAdd?.product?.id) {
                let fieldAdd = item;
                item.quantity = newQuantity;
                return fieldAdd;
              }
              return item;
            });
            return update;
          });
        }
      }

      // ====================
      closeUpdateModal();
    }
  };

  const [state, steState] = useState(true);
  //Change default date 
  useEffect(() => {
    steState(true);
    setValue!("newQuantity", currentProductField?.quantity);
    setValue!("newPriceToSell.amount", currentProductField?.price?.price);
    setValue!(
      "newPriceToSell.codeCurrency",
      currentProductField?.price?.codeCurrency
    );
    setValue!("observations_sell", currentProductField?.observations);
    steState(false);
  }, [currentProductField]);

  if (state) {
    return <div className="h-72"> </div>;
  }

  return (
    <>
      <form className="h-72">
        <Input
          name="newQuantity"
          label="Cantidad"
          type="number"
          defaultValue={currentProductField?.quantity}
          rules={{
            required: "Debe insertar una cantidad",
            // onChange: (e) => {
            //   if (
            //     e.target.value > currentProductField?.allowQuantity &&
            //     currentProductField?.product?.type !== "SERVICE" &&
            //     currentProductField?.product?.type !== "COMBO" &&
            //     !enable_to_sale_in_negative &&
            //     !isPreBilling
            //   ) {
            //     toast.warn(
            //       `Excediste la cantidad disponible ${currentProductField?.allowQuantity}`
            //     );
            //   }
            // },
          }}
          control={control}
          // placeholder={`${currentProductField?.allowQuantity} disponible`}
        />
        {allowManualPrice && !editMode && (
          <AmountCurrencyInput
            name="newPriceToSell"
            label="Precio"
            currencies={currencies}
            defaultValue={{
              amount: currentProductField?.price?.price,
              codeCurrency: currentProductField?.price?.codeCurrency,
            }}
            control={control}
          />
        )}
        {
          <TextArea
            name="observations_sell"
            control={control}
            label="Observaciones"
          />
        }

        <footer className="w-full flex justify-end">
          <div className="py-2 w-1/2 flex justify-end">
            <Button
              name="Aceptar"
              action={() => UpdateProductBillingModal()}
              color="slate-600"
              full
            />
          </div>
        </footer>
      </form>
    </>
  );
};
