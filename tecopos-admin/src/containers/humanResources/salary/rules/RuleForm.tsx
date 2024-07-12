import React, { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import Button from "../../../../components/misc/Button";
import { SalaryRuleInterface } from "../../../../interfaces/ServerInterfaces";
import Input from "../../../../components/forms/Input";
import Modal from "../../../../components/misc/GenericModal";
import AlertContainer from "../../../../components/misc/AlertContainer";
import { useAppSelector } from "../../../../store/hooks";
import Select from "../../../../components/forms/Select";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import Toggle from "../../../../components/forms/Toggle";
import SingleRadio from "../../../../components/forms/SingleRadio";
import MultiSelect from "../../../../components/forms/Multiselect";
import { daysOfTheWeek } from "../../../../utils/staticData";
import { convertArrayToString, convertStringToArray, getTimeArray } from "../../../../utils/helpers";

interface RuleInterface {
  rule?: SalaryRuleInterface;
  closeModal: Function;
  addRule?: Function;
  editRule?: Function;
  deleteRule?: Function;
  fetching: boolean;
}

const RuleForm = ({
  closeModal,
  rule,
  addRule,
  editRule,
  fetching,
  deleteRule,
}: RuleInterface) => {
  const { handleSubmit, control, formState, watch, setValue } = useForm();
  const { branches, business } = useAppSelector((state) => state.init);
  const { personPosts, personCategories } = useAppSelector(
    (state) => state.nomenclator
  );

  useEffect(() => {
    if (business?.mode === "SIMPLE") setValue("businessId", business.id);
  }, []);

  const branchSelector: SelectInterface[] = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
  }));

  const categoriesSelector: SelectInterface[] = personCategories.map(
    (item) => ({
      id: item.id,
      name: item.name,
    })
  );

  const postSelector: SelectInterface[] = personPosts.map((item) => ({
    id: item.id,
    name: item.name,
  }));

  const currencySelector: SelectInterface[] = business?.availableCurrencies.map(
    (item) => ({ id: item.code, name: item.code })
  )!;

  const { isSubmitting } = formState;

  const [deleteModal, setDeleteModal] = useState(false);
  const [errorCounting, seterrorCounting] = useState(false);

  const onSubmit: SubmitHandler<Record<string, any>> = async (data) => {

    if ((rule?.counting === null || rule?.counting === undefined) && (data.counting === null || data.counting === undefined)) {
      seterrorCounting(true)

      setTimeout(() => {
        seterrorCounting(false)
      }, 6000);

    } else {
      seterrorCounting(false)
      if (data.restrictedDays !== undefined) {
        data.restrictedDays = convertArrayToString(data.restrictedDays)
      }
      if (data.specialHours !== undefined) {
        data.specialHours = convertArrayToString(data.specialHours)
      }

      if (!!rule) {
        await editRule!(rule.id, data, closeModal);
      } else {
        await addRule!(data, closeModal);
      }
    }


  };

  let defaultRestrictedDays: Array<number> = []

  if (rule?.restrictedDays !== undefined && rule?.restrictedDays !== null) {
    defaultRestrictedDays = (convertStringToArray(rule?.restrictedDays))
  }

  let defaultSpecialHours: Array<number> = []

  if (rule?.specialHours !== undefined && rule?.specialHours !== null) {
    defaultSpecialHours = (convertStringToArray(rule?.specialHours))
  }


  return (
    <div>
      <h5 className="font-semibold text-xl text-gray-600 pb-5">
        {!!rule ? `Editar ${rule?.name}` : "Nueva regla"}
      </h5>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-3 pb-3">
          <Input
            name="name"
            control={control}
            label="Nombre"
            type="text"
            defaultValue={rule?.name}
            rules={{ required: "* Campo requerido" }}
          />
          {business?.mode === "GROUP" && (
            <Select
              className="w-full"
              data={branchSelector.length > 0 ? branchSelector : [
                {
                  id: business.id,
                  name: business.name,
                }
              ]}
              control={control}
              name="businessId"
              label="Negocio"
              defaultValue={rule?.business.id}
            />
          )}
          <Select
            className="w-full"
            data={postSelector}
            control={control}
            name="postId"
            label="Cargo"
            defaultValue={rule?.post?.id}
            rules={{ required: "* Campo requerido" }}
          />
          <Select
            className="w-full"
            data={categoriesSelector}
            control={control}
            name="personCategoryId"
            label="Categoría"
            defaultValue={rule?.personCategory?.id}
            rules={{ required: "* Campo requerido" }}
          />

          <h5 className="flex flex-col border-b border-gray-700 text-gray-600 font-semibold">
            Monto a pagar {errorCounting ? <span className="text-red-600 text-sm">*Debe seleccionar un monto a pagar</span> : ""}
          </h5>

          <SingleRadio
            name="counting"
            value="cycles"
            label="Por ciclos económicos"
            control={control}
            checked={rule?.counting === "cycles"}
          />

          <SingleRadio
            name="counting"
            value="days"
            label="Por días trabajados"
            control={control}
            checked={rule?.counting === "days"}
          />

          <SingleRadio
            name="counting"
            value="unique"
            label="Único"
            control={control}
            checked={rule?.counting === "unique"}
          />

          {(watch("counting") === undefined ? rule?.counting !== "unique" : !(watch("counting") === "unique")) && (
            // {(!(watch("counting") === "unique")) && (
            <>
              {/* ------------------------------------------------ */}

              <Toggle
                name="restrictionsByDays"
                control={control}
                defaultValue={rule?.restrictionsByDays}
                title="Restringir por días"
              />

              {
                (watch("restrictionsByDays") ?? rule?.restrictionsByDays) && (
                  <MultiSelect
                    name='restrictedDays'
                    data={daysOfTheWeek.map((item) => ({
                      id: item.id,
                      name: item.name,
                    }))}
                    label='Restricción por días'
                    control={control}
                    byDefault={defaultRestrictedDays}
                    rules={{ required: "* Campo requerido" }}
                  />
                )
              }

              <Toggle
                name="includeRechargeInSpecialHours"
                control={control}
                defaultValue={rule?.includeRechargeInSpecialHours}
                title="Incluir recargo en horas especiales"
              />

              {
                (watch("includeRechargeInSpecialHours") ?? rule?.includeRechargeInSpecialHours) && (
                  <>
                    <MultiSelect
                      name='specialHours'
                      data={getTimeArray()}
                      label='Horas especiales'
                      control={control}
                      rules={{ required: "* Campo requerido" }}
                      byDefault={defaultSpecialHours.map(item => JSON.stringify(item))}
                    />

                    <Input
                      name="amountSpecialHours"
                      control={control}
                      label="Monto de la hora especial"
                      type="number"
                      defaultValue={rule?.amountSpecialHours}
                    />
                  </>
                )
              }

              {/* ------------------------------------------------ */}

              <Toggle
                name="isFixedSalary"
                control={control}
                title="Salario fijo"
                defaultValue={rule?.isFixedSalary}
              />

            </>
          )}

          <div className="inline-flex w-full gap-1">
            {((watch("isFixedSalary") ?? rule?.isFixedSalary) || ((watch("counting") === "unique" ?? rule?.counting === "unique") || rule?.counting === "unique")) && (
              <Input
                name="amountFixedSalary"
                control={control}
                label="Monto"
                type="number"
                defaultValue={rule?.amountFixedSalary}
              />
            )}

            <Select
              className={`${(watch("isFixedSalary") ?? rule?.isFixedSalary) ? "" : "w-full"
                }`}
              label="Moneda"
              name="codeCurrency"
              data={currencySelector}
              control={control}
              defaultValue={rule?.codeCurrency}
            />
          </div>

          <Input
            name="percentAmountToIncrement"
            control={control}
            label="Porciento de incremento"
            type="number"
            defaultValue={rule?.percentAmountToIncrement}
          />
          <Input
            name="percentAmountToDecrement"
            control={control}
            label="Porciento de decremento"
            type="number"
            defaultValue={rule?.percentAmountToDecrement}
          />

          {!((watch("isFixedSalary") ?? rule?.isFixedSalary) || (!(watch("counting") === undefined ? rule?.counting !== "unique" : !(watch("counting") === "unique")))) && (
            <>

              <h5 className="flex border-b border-gray-700 text-gray-600 font-semibold">
                Referencia de cálculo
              </h5>

              <SingleRadio
                name="reference"
                value={"salesInPos"}
                label="Ventas en puntos de venta"
                control={control}
                checked={rule?.reference === "salesInPos"}
              />

              <SingleRadio
                name="reference"
                value={"serveOrders"}
                label="Procesados en áreas de elaboración"
                control={control}
                checked={rule?.reference === "serveOrders"}
              />

              <SingleRadio
                name="reference"
                value={"manageOrdersInZone"}
                label="Órdenes manejadas en Recursos/Zonas"
                control={control}
                checked={rule?.reference === "manageOrdersInZone"}
              />

              <SingleRadio
                name="reference"
                value={"manageOrders"}
                label="Órdenes manejadas individualmente"
                control={control}
                checked={rule?.reference === "manageOrders"}
              />

              <SingleRadio
                name="reference"
                value={"productionOrders"}
                label="Productos elaborados en Producción"
                control={control}
                checked={rule?.reference === "productionOrders"}
              />

              <SingleRadio
                name="reference"
                value={"totalSales"}
                label="Total de ventas"
                control={control}
                checked={rule?.reference === "totalSales"}
              />

              <Input
                name="referencePercent"
                control={control}
                label="Porciento de referencia"
                type="number"
                defaultValue={rule?.referencePercent}
                rules={{
                  validate: {
                    nonZero: (value) => value > 0 || "* Campo requerido",
                  },
                }}
              />

              <Toggle
                name="divideEquivalentByPost"
                control={control}
                title="Dividir a partes iguales entre los asistentes del mismo cargo"
                defaultValue={rule?.divideEquivalentByPost}
              />
            </>
          )}

          <Toggle
            name="includeTips"
            control={control}
            title="Incluir propinas"
            defaultValue={rule?.includeTips}
          />

          {(watch("includeTips") || rule?.includeTips) && (
            <>
              <SingleRadio
                name="modeTips"
                value={"percent"}
                label="Por porciento"
                control={control}
                checked={rule?.modeTips === "percent"}
              />

              {watch("modeTips") === "percent" && (
                <Input
                  name="amountTip"
                  control={control}
                  label="Porciento de referencia"
                  type="number"
                  defaultValue={rule?.referencePercent}
                />
              )}

              <SingleRadio
                name="modeTips"
                value="fixed"
                label="Monto fijo"
                control={control}
                checked={rule?.modeTips === "fixed"}
              />

              {watch("modeTips") === "fixed" && (
                <Input
                  name="amountTip"
                  control={control}
                  label="Porciento de referencia"
                  type="number"
                  defaultValue={rule?.referencePercent}
                />
              )}

              <SingleRadio
                name="modeTips"
                value="equivalent"
                label="A partes iguales"
                control={control}
                checked={rule?.modeTips === "equivalent"}
              />
            </>
          )}
        </div>
        <div className="flex justify-between pt-3">
          {rule ? (
            <Button
              name="Eliminar"
              textColor="slate-600"
              color="slate-600"
              action={() => setDeleteModal(true)}
              outline
            />
          ) : (
            <div></div>
          )}
          {errorCounting ? <span className="text-red-600 text-sm">*Debe seleccionar un monto a pagar</span> : ""}
          <Button
            name={!!rule ? "Actualizar" : "Insertar"}
            color="slate-600"
            type="submit"
            loading={fetching && isSubmitting}
            disabled={fetching}
          />
        </div>
      </form>
      {deleteModal && (
        <Modal state={deleteModal} close={setDeleteModal}>
          <AlertContainer
            onAction={() => deleteRule!(rule!.id, closeModal)}
            onCancel={() => setDeleteModal(false)}
            text="Seguro que desea continuar?"
            title={`Está intentando eliminar ${rule?.name}`}
            loading={fetching}
          />
        </Modal>
      )}
    </div>
  );
};

export default RuleForm;
