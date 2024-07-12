import { TrashIcon } from "@heroicons/react/24/outline";
import { useState, useContext, useEffect, useMemo } from "react";
import AlertContainer from "../../../components/misc/AlertContainer";
import Button from "../../../components/misc/Button";
import { DetailProductContext } from "../DetailProductContainer";
import Modal from "../../../components/modals/GenericModal";
import { SubmitHandler, useForm } from "react-hook-form";
import Toggle from "../../../components/forms/Toggle";
import Input from "../../../components/forms/Input";
import GenericToggle from "../../../components/misc/GenericToggle";
import { useAppSelector } from "../../../store/hooks";
import useServer from "../../../api/useServerMain";
import moment from "moment";
import MultiSelect from "../../../components/forms/Multiselect";
import {
  translatePolicyFrequency,
  translatePolicyFrequencyToSp,
} from "../../config/GeneralAdjustment/resourcesTabs/DiscountPolicy";
import useServerBusiness from "../../../api/useServerBusiness";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import { ReservationPolicy } from "../../../interfaces/ServerInterfaces";
import InputColor from "../../../components/forms/InputColor";
import { formatCalendar } from "../../../utils/helpers";
import CurrencyInput from "../../../components/forms/CurrencyInput";

interface SettingProps {
  closeModal: Function;
}

const Setting = ({ closeModal }: SettingProps) => {
  const { product, deleteProduct, updateProduct, isFetching } =
    useContext(DetailProductContext);
  const { handleSubmit, control, watch, unregister, setValue } = useForm();
  const [alert, setAlert] = useState(false);
  const {
    getAllReservationPolicy,
    allReservationsPolicy,
    isLoading: isFetchingPolicy,
  } = useServerBusiness();

  //STOCK, MENU, ADDON, SERVICE, VARIATION, COMBO-------------------
  const [visibleForSale, setVisibleForSale] = useState(
    product?.showForSale ||
      product?.isPublicVisible ||
      product?.showWhenOutStock ||
      product?.showRemainQuantities ||
      product?.visibleOnline ||
      false
  );
  const [onSale, setOnSale] = useState(product?.onSale ?? false);
  const publicVisible = watch("isPublicVisible");
  const showForSale = watch("showForSale");
  const showOutStock = watch("showWhenOutStock");
  const showRemainQuant = watch("showRemainQuantities");
  const visibleOnline = watch("visibleOnline");
  const isWholesale = watch("isWholesale") ?? product?.isWholesale;

  const { business } = useAppSelector((state) => state.init);
  const { allowRoles: verifyRoles } = useServer();

  useEffect(() => {
    if (!onSale) {
      unregister("onSalePrice");
      setValue("onSalePrice", null);
    }

    if (
      publicVisible === false &&
      showForSale === false &&
      showOutStock === false &&
      showRemainQuant === false &&
      visibleOnline === false
    )
      setVisibleForSale(false);
  }, [
    onSale,
    publicVisible,
    showForSale,
    showOutStock,
    showRemainQuant,
    visibleOnline,
  ]);

  useEffect(() => {
    if (!visibleForSale) {
      setValue("showForSale", false);
      setValue("isPublicVisible", false);
      setValue("showWhenOutStock", false);
      setValue("showRemainQuantities", false);
      setValue("visibleOnline", false);
    }
  }, [visibleForSale]);

  //----------------------------------------------------------------

  //Asset products -------------------------------------------------
  const enableDepreciation =
    watch("enableDepreciation") ?? product?.enableDepreciation;

  //----------------------------------------------------------------

  const [helperState, setHelperSate] = useState(false);
  useEffect(() => {
    if (allReservationsPolicy.length > 0) {
      setHelperSate(true);
    }
  }, [allReservationsPolicy]);

  const [policysDicount, policyCancellation] = useMemo(() => {
    if (product?.type === "SERVICE" && allReservationsPolicy) {
      getAllReservationPolicy({ isActive: true });
      const discount: SelectInterface[] = [];
      const cancelation: SelectInterface[] = [];
      allReservationsPolicy?.forEach((item) => {
        if (item.type === "DISCOUNT") {
          discount.push({
            id: item.id,
            name: `${item.quantity} ${translatePolicyFrequencyToSp(
              item.frequency
            )} /${item.discount}%`,
          });
        }
        if (item.type === "CANCELATION") {
          cancelation.push({
            id: item.id,
            name: `${item.quantity} ${translatePolicyFrequencyToSp(
              item.frequency
            )} /${item.discount}%`,
          });
        }
      });
      return [discount, cancelation];
    }
    return [[], []];
  }, [helperState]);

  const [defaultPolicysDicount, defautlPolicyCancellation] = useMemo(() => {
    if (product?.type === "SERVICE" && allReservationsPolicy) {
      const discount: SelectInterface[] = [];
      const cancelation: SelectInterface[] = [];
      product.reservationPolicies?.forEach((item) => {
        if (item.type === "DISCOUNT") {
          discount.push({
            id: item.id,
            name: `${item.quantity} ${translatePolicyFrequencyToSp(
              item.frequency
            )} /${item.discount}%`,
          });
        }
        if (item.type === "CANCELATION") {
          cancelation.push({
            id: item.id,
            name: `${item.quantity} ${translatePolicyFrequencyToSp(
              item.frequency
            )} /${item.discount}%`,
          });
        }
      });
      return [discount, cancelation];
    }
    return [[], []];
  }, [helperState]);

  const [showDiscountPolicy, setShowDiscountPolicy] = useState(
    defaultPolicysDicount.length > 0
  );
  const [showCancelationPolicy, setShowCancelationPolicy] = useState(
    defautlPolicyCancellation.length > 0
  );

  useEffect(() => {
    if (!showDiscountPolicy) {
      setValue("discountPolicyId", []);
    }
    if (!showCancelationPolicy) {
      setValue("cancellationPolicyId", []);
    }
  }, [showDiscountPolicy, showCancelationPolicy]);

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    if (data.onSalePrice) {
      const onSalePrice = {
        amount: data.onSalePrice?.price,
        codeCurrency: data.onSalePrice.codeCurrency,
      };
      data = { ...data, onSalePrice };
    }

    data.policyIds = [
      ...(data.discountPolicyId ?? []),
      ...(data.cancellationPolicyId ?? []),
    ];
    const { discountPolicyId, cancellationPolicyId, ...clearData } = data;
    updateProduct!(product?.id, clearData);
  };

  const isAdmin = verifyRoles(["ADMIN"]);

  const module_booking =
    business?.configurationsKey.find((itm) => itm.key === "module_booking")
      ?.value === "true";

  return (
    <div className="border border-slate-300 rounded-md p-5 relative overflow-hidden scroll-auto scrollbar-thin h-[40rem]">
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            name="Eliminar Producto"
            icon={<TrashIcon className="h-5" />}
            color="gray-400"
            textColor="gray-400"
            colorHover="red-400"
            action={() => setAlert(true)}
            outline
          />
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        {["STOCK", "MENU", "ADDON", "SERVICE", "VARIATION", "COMBO"].includes(
          product?.type ?? ""
        ) && (
          <div className="p-5 grid grid-cols-2 items-start  overflow-auto scrollbar-thin scrollbar-thumb-slate-200">
            <div>
              <GenericToggle
                currentState={visibleForSale}
                changeState={setVisibleForSale}
                title="Visible para la venta"
              />
              {visibleForSale && (
                <div className="pl-5">
                  <Toggle
                    name="isPublicVisible"
                    control={control}
                    defaultValue={product?.isPublicVisible}
                    title="Visible carta de venta"
                  />
                  {/* {wooModule && ( */}
                  <Toggle
                    name="visibleOnline"
                    control={control}
                    defaultValue={product?.visibleOnline}
                    title="Visible para internet"
                  />
                  {/* )} */}
                  <Toggle
                    name="showForSale"
                    control={control}
                    defaultValue={product?.showForSale}
                    title="Visible punto de venta"
                  />
                  <Toggle
                    name="showWhenOutStock"
                    control={control}
                    defaultValue={product?.showWhenOutStock}
                    title="Mostrar estando agotado"
                  />
                  <Toggle
                    name="showRemainQuantities"
                    control={control}
                    defaultValue={product?.showRemainQuantities}
                    title="Mostrar cantidades disponibles"
                  />
                </div>
              )}
            </div>

            <div>
              <Toggle
                name="suggested"
                control={control}
                defaultValue={product?.suggested}
                title="Sugerencia de la casa"
              />
            </div>

            <div>
              <div className="flex flex-col gap-0">
                <Toggle
                  name="newArrival"
                  control={control}
                  defaultValue={product?.newArrival}
                  title="Nuevo arribo"
                />
                {product?.newArrival && (
                  <p className="text-xs text-gray-400">{`* Hasta: ${formatCalendar(
                    product.newArrivalAt
                  )}`}</p>
                )}
              </div>
              <Toggle
                name="onSale"
                control={control}
                defaultValue={product?.onSale}
                title="Producto en oferta"
                changeState={setOnSale}
              />

              {onSale && (
                <CurrencyInput
                  label="Precio *"
                  currencies={
                    business?.availableCurrencies.map(
                      (currency) => currency.code
                    ) ?? []
                  }
                  name="onSalePrice"
                  control={control}
                  defaultValue={{
                    price: product?.onSalePrice?.amount ?? 0,
                    codeCurrency:
                      product?.onSalePrice?.codeCurrency ??
                      business?.costCurrency ??
                      "CUP",
                  }}
                  rules={{ required: "Campo requerido" }}
                />
              )}

              {product?.type === "SERVICE" && module_booking && (
                <>
                  <div>
                    <GenericToggle
                      title="Política de descuento"
                      currentState={showDiscountPolicy}
                      changeState={() =>
                        setShowDiscountPolicy(!showDiscountPolicy)
                      }
                    />
                    {policysDicount.length > 0 && showDiscountPolicy && (
                      <MultiSelect
                        label="Política de descuento"
                        name="discountPolicyId"
                        data={policysDicount}
                        control={control}
                        byDefault={defaultPolicysDicount.map((item) => item.id)}
                        disabled={!showDiscountPolicy}
                        loading={!policysDicount}
                      />
                    )}
                  </div>
                  <div>
                    <GenericToggle
                      title="Política de cancelación"
                      currentState={showCancelationPolicy}
                      changeState={() =>
                        setShowCancelationPolicy(!showCancelationPolicy)
                      }
                    />
                    {policyCancellation.length > 0 && showCancelationPolicy && (
                      <MultiSelect
                        label="Política de cancelación"
                        name="cancellationPolicyId"
                        data={policyCancellation && policyCancellation}
                        control={control}
                        byDefault={defautlPolicyCancellation.map(
                          (item) => item.id
                        )}
                        disabled={!showCancelationPolicy}
                        loading={!policyCancellation}
                      />
                    )}
                  </div>
                </>
              )}
              {product?.type === "STOCK" && (
                <Toggle
                  name="saleByWeight"
                  title="Habilitar venta por peso"
                  control={control}
                  defaultValue={product.saleByWeight ?? false}
                />
              )}
              {["STOCK", "VARIATION"].includes(product?.type ?? "") && (
                <>
                  <Toggle
                    name="isWholesale"
                    title="Venta al por mayor"
                    control={control}
                    defaultValue={product?.isWholesale}
                  />
                  {!!isWholesale && (
                    <Input
                      name="minimunWholesaleAmount"
                      type="number"
                      control={control}
                      label="Cantidad mínima"
                      defaultValue={product?.minimunWholesaleAmount}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}
        {product?.type === "ASSET" && (
          <>
            <Toggle
              name="enableDepreciation"
              control={control}
              title="Habilitar depreciación"
              defaultValue={product.enableDepreciation}
            />
            {enableDepreciation && (
              <Input
                name="monthlyDepreciationRate"
                label={`Tasa de depreciación mensual (en ${business?.costCurrency})`}
                type="number"
                control={control}
                defaultValue={product.monthlyDepreciationRate}
              />
            )}
          </>
        )}
        <div className="flex justify-end ">
          <Button
            color="slate-600"
            name="Actualizar"
            type="submit"
            loading={isFetching}
            disabled={isFetching}
          />
        </div>
      </form>

      {alert && (
        <Modal state={alert} close={setAlert}>
          <AlertContainer
            onAction={() =>
              deleteProduct && deleteProduct(product?.id ?? null, closeModal)
            }
            onCancel={() => setAlert(false)}
            title={`Eliminar ${product?.name}`}
            text="Seguro que desea eliminar este producto?"
          />
        </Modal>
      )}
    </div>
  );
};

export default Setting;
