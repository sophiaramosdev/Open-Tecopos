import { useContext } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import MultiSelect from "../../../components/forms/Multiselect"
import { BasicType, SelectInterface } from "../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../store/hooks";
import { DuplicatorInterface } from "../../../interfaces/ServerInterfaces";
import Select from "../../../components/forms/Select";
import Toggle from "../../../components/forms/Toggle";
import CurrencyInput from "../../../components/forms/CurrencyInput";
import Input from "../../../components/forms/Input";
import MultiSelectProducts from "../../../components/marketing/MultiSelectProducts";
import Button from "../../../components/misc/Button";
import { NewRuleContext } from "../Duplicator";
import { toast } from "react-toastify";

const AddNewDuplicatorRuleModal = ({ allDuplicatorAreaSales, isFetching }: { allDuplicatorAreaSales: SelectInterface[], isFetching: boolean }) => {

  const { setNewRule, setAllDuplications, allDuplications, availableCurrencies } =
    useContext(NewRuleContext);

  const { business } = useAppSelector((state) => state.init);
  const { areas, salesCategories } = useAppSelector((state) => state.nomenclator);

  const { handleSubmit, control, watch } = useForm();

  function validarString(input: string): number[] | string {

    // Verificar si el input contiene letras y si hay separación de números sin coma
    if (/\d\s+\d/.test(input) && /[a-zA-Z]/.test(input)) {
      return "El input *Incluir las órdenes* no puede contener letras ni separaciones de números sin coma.";
    }

    // Verificar si el input contiene letras
    if (/[a-zA-Z]/.test(input)) {
      return "El input *Incluir las órdenes* no puede contener letras.";
    }

    // Verificar si hay separación de números sin coma
    if (/\d\s+\d/.test(input)) {
      return "El input *Incluir las órdenes* no puede contener separaciones de números sin coma.";
    }



    // Eliminar espacios entre números y comas
    const numerosSinEspacios = input.replace(/\s*,\s*/g, ',');

    // Dividir el string en un arreglo de números
    const numeros = numerosSinEspacios.split(',').map(num => parseInt(num.trim(), 10));
    
    // Verificar si hay números repetidos
    const numerosSet = new Set<number>();
    for (const num of numeros) {
      if (numerosSet.has(num)) {
        return "El input *Incluir las órdenes* contiene números repetidos.";
      }
      numerosSet.add(num);
    }

    return numeros;
  }

  const onAddNewRule: SubmitHandler<BasicType> = (data: any) => {
    const {
      plannedAmount: PA,
      ordersUpTo,
      isFixedTransfers,
      isFixedMarkOrders,
      fixedCategories,
      excluedCategories,
      excludedProducts,
      keepSameData,
      limitOrders,
      categories,
      excludecategories,
      excludeProds,
      areasFromId,
      areaToId,
      // codeCurrency: CC,
      allowedPaymentCurrencies,
      selectedOrders,
      includeDeposits,
      includeExtractions,
      includeTips,
    } = data

    if (keepSameData) {
      const WhenkeepSameDataTrue: DuplicatorInterface = {
        areasFromId: areasFromId,
        areaToId: areaToId,
        keepSameData: true,
        // codeCurrency: CC,
        allowedPaymentCurrencies: allowedPaymentCurrencies?.map((element: number) => {
          return availableCurrencies?.find(e => e.id === element)?.code
        }),
      }
      setAllDuplications!([...allDuplications!, WhenkeepSameDataTrue])
      setNewRule!(false)

    } else {

      const { price, codeCurrency } = PA! as { price: number, codeCurrency: string }
      const WhenkeepSameDataFalse: DuplicatorInterface = {
        areasFromId: areasFromId,
        areaToId: areaToId,
        keepSameData: false,
        limitOrders,
        categories,
        excludecategories,
        excludeProds,
        "plannedAmount": price,
        codeCurrency,
        ordersUpTo,
        isFixedTransfers,
        isFixedMarkOrders,
        fixedCategories,
        excluedCategories,
        excludedProducts,
        allowedPaymentCurrencies: allowedPaymentCurrencies?.map((element: number) => {
          return availableCurrencies?.find(e => e.id === element)?.code
        }) ?? [],
        selectedOrders: typeof validarString(selectedOrders) === "string" ? [] : validarString(selectedOrders),
        includeDeposits,
        includeExtractions,
        includeTips,
      }

      if (selectedOrders !== undefined && typeof validarString(selectedOrders) === "string") {
        toast.error(validarString(selectedOrders))
      } else {
        setAllDuplications!([...allDuplications!, WhenkeepSameDataFalse])
        setNewRule!(false)
      }

    }
  };

  const areasSalesSelector: SelectInterface[] = areas.filter(area => area.type === "SALE").map((item) => ({
    id: item.id,
    name: item.name,
  }));


  const salesCategoriesSelector: SelectInterface[] = salesCategories.map((item) => ({
    id: item.id,
    name: item.name,
  }));

  const allCurrenciesSelector: SelectInterface[] = availableCurrencies!.map((item) => ({
    id: item.id,
    name: item.name,
  }));

  return (
    <div className="h-full p-5">
      <form
        onSubmit={handleSubmit(onAddNewRule)}
        className="flex flex-col gap-y-3 items-stretch h-full"
      >
        <div className="flex justify-between w-full">
          <div className="w-full mr-1">
            <MultiSelect
              name="areasFromId"
              data={areasSalesSelector}
              label="Areas de origen"
              control={control}
              rules={{ required: "Este campo es requerido" }}
            />
          </div>

          <div className="w-full ml-1">
            <Select
              label="Area destino"
              name="areaToId"
              data={allDuplicatorAreaSales}
              control={control}
            />
          </div>

        </div>

        <Toggle
          name="keepSameData"
          control={control}
          title="Mantener mismos datos"
        />

        {/* {
          watch("keepSameData") && (
            <div className="w-1/2">
              <Select
                label="Moneda *"
                name="codeCurrency"
                data={business?.availableCurrencies.map(
                  (currency: { id: any; code: any; }) => {
                    return {
                      id: currency.code, name: currency.code
                    }
                  }
                ) ?? []}
                control={control}
                rules={{ required: "Este campo es requerido" }}
              />
            </div>

          )
        } */}

        {!watch("keepSameData") && (
          <>
            <div className="w-full mr-1">
              <MultiSelect
                name="allowedPaymentCurrencies"
                data={allCurrenciesSelector}
                label="Incluir otras monedas de pago"
                control={control}
              />
            </div>

            <div className="w-1/2">
              <CurrencyInput
                label="Monto en ventas planificadas *"
                currencies={
                  business?.availableCurrencies.map(
                    (currency) => currency.code
                  ) ?? []
                }
                name="plannedAmount"
                control={control}
                placeholder="$0.00"
                rules={{ required: "Este campo es requerido" }}
              />
            </div>

            <Toggle
              name="limitOrders"
              control={control}
              title="Limitar monto de las órdenes"
              defaultValue={false}
            />

            {watch("limitOrders") && (
              <div className="w-1/2">
                <Input
                  label="Limite *"
                  type="number"
                  name="ordersUpTo"
                  control={control}
                  placeholder="0.00"
                  rules={{
                    required: "Este campo es requerido",
                  }}
                />
              </div>

            )}

            <div className="flex justify-between w-full">
              <div className="w-full mr-1">
                <p className="font-semibold">Mantener fijo:</p>

                <div className="ml-8">
                  <Toggle
                    name="isFixedTransfers"
                    control={control}
                    defaultValue={business?.includeShop ?? false}
                    title="Transferencias"
                  />
                  <Toggle
                    name="isFixedMarkOrders"
                    control={control}
                    defaultValue={business?.includeShop ?? false}
                    title="Ordenes marcadas"
                  />

                  <div className="w-full">
                    <Toggle
                      name="categories"
                      control={control}
                      title="Categorías"
                    />

                    {watch("categories") && (
                      <div className="-mt-4">
                        <MultiSelect
                          name="fixedCategories"
                          data={salesCategoriesSelector}
                          label=""
                          control={control}
                          rules={{ required: "Este campo es requerido" }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full ml-1">
                <p className="font-semibold">Excluir:</p>

                <div className="ml-8">
                  <div className="w-full">
                    <Toggle
                      name="excludecategories"
                      control={control}
                      title="Categorías"
                    />

                    {watch("excludecategories") && (
                      <div className="-mt-6">
                        <MultiSelect
                          name="excluedCategories"
                          data={salesCategoriesSelector}
                          label=""
                          control={control}
                          rules={{ required: "Este campo es requerido" }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="w-full">
                    <Toggle
                      name="excludeProds"
                      control={control}
                      title="Productos"
                    />

                    {watch("excludeProds") && (
                      <div className="-mt-6">
                        <MultiSelectProducts
                          label=""
                          name="excludedProducts"
                          control={control}
                          key={1}
                          rules={{ required: "Este campo es requerido" }}
                          loading={isFetching}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>


            <div className="w-full mr-1">
              <Input
                label="Incluir las órdenes"
                // type="number"
                name="selectedOrders"
                control={control}
                placeholder="Ejemplo: 157, 200, 99, 4000"
              />

              <p className="font-thin text-sm text-slate-500 p-2">*Los números de las órdenes tienen que estar separadas por comas*</p>
            </div>

            <Toggle
              name="includeDeposits"
              control={control}
              title="Incluir depósitos"
              defaultValue={false}
            />

            <Toggle
              name="includeExtractions"
              control={control}
              title="Incluir extracciones"
              defaultValue={false}
            />

            <Toggle
              name="includeTips"
              control={control}
              title="Incluir propinas"
              defaultValue={false}
            />


          </>
        )}

        <div className="flex justify-end self-end py-5">
          <Button
            color="slate-600"
            name="Añadir"
            type="submit"
            loading={isFetching}
            disabled={isFetching}
          />
        </div>
      </form>
    </div>
  )
}

export default AddNewDuplicatorRuleModal
