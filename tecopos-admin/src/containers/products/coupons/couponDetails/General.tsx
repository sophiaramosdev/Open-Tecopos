import { useContext } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import Input from "../../../../components/forms/Input";
import TextArea from "../../../../components/forms/TextArea";
import Select from "../../../../components/forms/Select";
import Button from "../../../../components/misc/Button";
import { DetailCouponContext } from "./DetailsContainer";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import { getCouponTypes } from "../../../../utils/stylesHelpers";
import DateTimePicker from "../../../../components/marketing/DateTimePicker";
import { useAppSelector } from "../../../../store/hooks";
import GenericList from "../../../../components/misc/GenericList";
import CouponDiscountTypeBadge from "../../../../components/misc/badges/CouponDiscountTypeBadge";
import { formatDateTime } from "../../../../utils/functions";
interface PageProps {
  source: string | null;
}

const General = ({ source }: PageProps) => {

  const { availableCurrencies } = useAppSelector((state) => state.init.business!);

  const { coupon, updateCoupon, updateState} =
    useContext(DetailCouponContext);

  const { control, handleSubmit } = useForm();

  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    updateCoupon!(coupon?.id, data, updateState);
  };

  //Data for Select and Multiselect Components ---------------------------------------------------------------------
  const couponsTypes = getCouponTypes("PERCENT,FIXED_PRODUCT,FIXED_CART" ?? "");
  
  const selectCouponType: SelectInterface[] = couponsTypes.map((coupon) => ({
    name: coupon.title,
    id: coupon.value,
  }));

  const selectCodeCurrency: SelectInterface[] = availableCurrencies.map((currency) => ({
    name: currency.name,
    id: currency.code,
  }));

  const dataBody = {
    "Código:": coupon?.code,
    "Descripción:": coupon?.description ? coupon?.description : "-",
    "Tipo de descuento:": <CouponDiscountTypeBadge type={coupon?.discountType ?? ""} />,
    "Tipo de moneda:": coupon?.codeCurrency ? coupon?.codeCurrency : "No hay moneda seleccionada",
    "Importe:": coupon?.amount ?? "-",
    "Fecha de caducidad:": formatDateTime(coupon?.expirationAt)
  };

  return (
    <>
      {source !== "modal"
        ? <GenericList body={dataBody} />
        : <div className="min-h-96">
          <div className="content-center">
            <div className="border border-gray-300 p-2 rounded col-span-3">
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col items-stretch h-full"
              >
                <div className="">
                  <Input
                    disabled={source === "modal" ? false : true}
                    label="Código"
                    name="code"
                    control={control}
                    placeholder="Inserte el código del cupón"
                    rules={{ required: "Este campo es requerido" }}
                    defaultValue={coupon?.code}
                  />
                </div>

                <div className="">
                  <TextArea
                    disabled={source === "modal" ? false : true}
                    label="Descripción"
                    name="description"
                    control={control}
                    placeholder="Inserte la descripción del cupón"
                    defaultValue={coupon?.description}
                  />
                </div>

                {["PERCENT", "FIXED_PRODUCT", "FIXED_CART"].includes(
                  coupon?.discountType ?? ""
                ) && (
                    <Select
                      disabled={source === "modal" ? false : true}
                      label="Tipo de descuento"
                      data={selectCouponType}
                      name="discountType"
                      control={control}
                      defaultValue={coupon?.discountType}
                    />
                  )}


                {
                  availableCurrencies.filter(currency => currency.code === coupon?.codeCurrency ?? "")
                  && (
                    <Select
                      disabled={source === "modal" ? false : true}
                      label="Tipo de moneda"
                      data={selectCodeCurrency}
                      name="codeCurrency"
                      control={control}
                      defaultValue={coupon?.codeCurrency}
                    />
                  )}

                <div className="">
                  <Input
                    disabled={source === "modal" ? false : true}
                    label="Importe"
                    name="amount"
                    type="number"
                    control={control}
                    placeholder="Inserte el importe del cupón"
                    rules={{ required: "Este campo es requerido" }}
                    defaultValue={coupon?.amount}
                  />
                </div>

                <div className="">
                  <DateTimePicker
                    disabled={source === "modal" ? false : true}
                    label="Fecha de caducidad"
                    name="expirationAt"
                    control={control}
                    type="date"
                    placeholder="Inserte la fecha y tiempo de la caducidad del cupón"
                    rules={{ required: "Este campo es requerido" }}
                    defaultValue={coupon?.expirationAt}
                  />
                </div>

                {source === "modal" && (
                  <div className="flex justify-end pt-10 self-end">
                    <Button name="Actualizar" color="slate-600" type="submit" />
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

      }
    </>
  );
};

export default General;
