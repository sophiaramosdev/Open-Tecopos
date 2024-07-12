import { useAppSelector } from "../../../store/hooks";
import { SubmitHandler, useForm } from "react-hook-form";
import Toggle from "../../../components/forms/Toggle";
import Button from "../../../components/misc/Button";
import useServerBusiness from "../../../api/useServerBusiness";

const Visual = () => {
  const { configurationsKey } = useAppSelector((state) => state.init.business!);
  const { handleSubmit, control } = useForm();
  const { updateConfigs, isFetching } = useServerBusiness();

  let visual_dispatches: boolean = false;
  let visual_economic_cycles: boolean = false;
  let visual_customers: boolean = false;
  let visual_suppliers: boolean = false;
  let visual_online_shop: boolean = false;
  let visual_human_resources: boolean = false;

  //load config -------------------------------------------------------------
  configurationsKey.forEach((item) => {
    switch (item.key) {
      case "visual_dispatches":
        visual_dispatches = item.value === "true";
        break;
      case "visual_economic_cycles":
        visual_economic_cycles = item.value === "true";
        break;
      case "visual_customers":
        visual_customers = item.value === "true";
        break;
      case "visual_suppliers":
        visual_suppliers = item.value === "true";
        break;
      case "visual_online_shop":
        visual_online_shop = item.value === "true";
        break;
      case "visual_human_resources":
        visual_human_resources = item.value === "true";
        break;
    }
  });
  //--------------------------------------------------------------------------------------


  const onSubmit: SubmitHandler<Record<string, boolean>> = (data) => {
    updateConfigs(data);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="h-full bg-white rounded-md shadow-md border border-gray-200 p-5"
    >
      <div className="flex flex-col gap-y-5 pl-5">
        <Toggle
          title="Mostrar despachos"
          name="visual_dispatches"
          defaultValue={visual_dispatches}
          control={control}
        />
        <Toggle
          title="Mostrar ciclos económicos"
          name="visual_economic_cycles"
          defaultValue={visual_economic_cycles}
          control={control}
        />
        <Toggle
          title="Mostrar clientes"
          name="visual_customers"
          defaultValue={visual_customers}
          control={control}
        />
        <Toggle
          title="Mostrar proveedores"
          name="visual_suppliers"
          defaultValue={visual_suppliers}
          control={control}
        />
        <Toggle
          title="Mostrar pedidos online"
          name="visual_online_shop"
          defaultValue={visual_online_shop}
          control={control}
        />

        <Toggle
          title="Mostrar capital humano"
          name="visual_human_resources"
          defaultValue={visual_human_resources}
          control={control}
        />
      </div>
      <div className="flex justify-end py-5">
        <Button
          name="Actualizar"
          color="slate-600"
          type="submit"
          loading={isFetching}
        />
      </div>
    </form>
  );
};

export default Visual;
