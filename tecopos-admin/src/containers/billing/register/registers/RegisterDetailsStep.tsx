import React, { useContext, useEffect } from "react";
import Input from "../../../../components/forms/Input";
import Select from "../../../../components/forms/Select";
import DateInput from "../../../../components/forms/DateInput";
import Button from "../../../../components/misc/Button";
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import TextArea from "../../../../components/forms/TextArea";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import Toggle from "../../../../components/forms/Toggle";
import { RegisterContext } from "../AllRegistersList";
import { EditContextBilling } from "../registerDetailsTabs/RegisterDetailsTab";
import { useAppSelector } from "../../../../store/hooks";
import { getDaysDifference } from "../../../../utils/helpers";
import moment from "moment";

export const RegisterDetailsStep = () => {
  const { user } = useAppSelector((store) => store.init);
  const {
    control,
    setCurrentStep,
    currentStep,
    setValue,
    trigger,
    watch,
    clearErrors,
    isLoading,
    isFetching
  } = useContext(RegisterContext);
  const { defaultValues, editMode } = useContext(EditContextBilling);

  const paymentsDeadlineSelect: SelectInterface[] = [
    {
      id: 7,
      name: "07 días",
    },
    {
      id: 15,
      name: "15 días",
    },
    {
      id: 30,
      name: "30 días",
    },
    {
      id: 45,
      name: "45 días",
    },
    {
      id: 60,
      name: "60 días",
    },
    {
      id: "manual",
      name: "Manual",
    },
  ];

  const timeLimit = watch!("timeLimit");
  const paymentDeadline = watch!("paymentDeadlineAt");
  const name = watch!("name");
  const managedById = watch!("managedById");
  const currencyBilling = watch!("currencyBilling");
  const havePaymentDeadline = watch!("havePaymentDeadline");

  const handlerDueDate = () => {
    if (timeLimit !== "manual" && timeLimit !== undefined) {
      let date = new Date();
      let newDate = new Date(date.getTime());
      newDate.setDate(newDate.getDate() + timeLimit);
      setValue!("paymentDeadlineAt", newDate);
    }
  };

  const onSubmit = async () => {
    if (
      await trigger!([
        "paymentDeadlineAt",
        "name",
        "managedById",
        "salesBy",
        "currencyBilling",
        "registeredAt",
      ])
    ) {
      // setValue!('registeredAt', registeredAt)
      setValue!("timeLimit", timeLimit);
      setValue!("name", name);
      setValue!("managedById", managedById);
      setValue!("currencyBilling", currencyBilling);
      setValue!("paymentDeadlineAt", paymentDeadline);
      setValue!("havePaymentDeadline", havePaymentDeadline);

      setCurrentStep!(currentStep! + 1);
    }
  };

  useEffect(() => {
    handlerDueDate();
  }, [timeLimit]);

  const registeredAt = moment(defaultValues?.registeredAt ?? "").startOf("day");
  const paymentDeadlineAt = moment(defaultValues?.paymentDeadlineAt ?? "").startOf("day");

  const differenceInDays = paymentDeadlineAt?.diff(registeredAt, "days")

  return (
    <div>
      <div className="grid gap-4 px-8 items-center min-h-[25rem]">
        {/* first Row */}
        <div className="grid  grid-cols-2 gap-2 items-center">
          {/* Titulo */}
          <div className="col-span-2">
            <Input
              label="Título"
              name="name"
              control={control}
              defaultValue={editMode && defaultValues?.name}
            />
          </div>

          {/* Comercial */}
          <div className="col-span-2">
            <AsyncComboBox
              label="Comercial que atiende "
              dataQuery={{
                url: "/security/users",
                defaultParams: {
                  isActive: true,
                },
              }}
              normalizeData={{ id: "id", name: "displayName" }}
              name="managedById"
              control={control}
              defaultValue={editMode ? defaultValues?.managedBy?.id : user?.id}
              placeholder={user?.username}
            />
          </div>
        </div>
        {/* Secound Row */}
        <div className="grid grid-cols-2 gap-2 items-center">
          {/* Fecha de emision */}
          <div className="col-span-2">
            <Toggle
              title="Establecer plazo de pago"
              control={control}
              name="havePaymentDeadline"
              defaultValue={
                typeof defaultValues?.paymentDeadlineAt === "string" ||
                watch!("havePaymentDeadline")
              }
            />
          </div>
          {havePaymentDeadline && (
            <>
              <div>
                <Select
                  label="Plazo de pago"
                  data={paymentsDeadlineSelect}
                  name="timeLimit"
                  control={control}
                  placeholder={
                    defaultValues !== undefined
                      ? `${differenceInDays} días`
                      : "Seleccione"
                  }
                  rules={{
                    onChange: (e) => {
                      if (e.target.value !== "manual") {
                        clearErrors!("paymentDeadlineAt");
                      }
                    },
                  }}
                />
              </div>
              <div className="pt-1">
                <DateInput
                  label="Fecha de vencimiento (*)"
                  name="paymentDeadlineAt"
                  control={control}
                  disabled={timeLimit !== "manual"}
                  fromToday
                  defaultValue={
                    editMode ? defaultValues?.paymentDeadlineAt : ""
                  }
                  rules={{
                    required: "Este campo es requerido",
                    onChange: (e) => clearErrors!("paymentDeadlineAt"),
                  }}
                />
              </div>
            </>
          )}
        </div>
        <div className="grid">
          <TextArea
            label="Observaciones"
            name="observations"
            control={control}
            defaultValue={editMode && defaultValues?.observations}
          />
        </div>
        <div className="flex w-full row-span-2 items-end">
          {!editMode ? (
            <div className="grid grid-cols-2 w-full gap-3 pt-2 ">
              <Button
                name="Atras"
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
                name="Continuar"
                color="slate-700"
                type="button"
                action={onSubmit}
                full
              />
            </div>
          ) : (
            <div></div>
          )}
        </div>

        {editMode && (
          <div className="flex w-full row-span-2 items-end justify-end">
            <div className="grid">
              <Button
                name={editMode ? "Actualizar" : `Registrar`}
                color="slate-700"
                type="submit"
                full
                loading={isFetching}
                disabled={isFetching}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
