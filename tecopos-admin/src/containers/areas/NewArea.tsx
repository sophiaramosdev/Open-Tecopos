import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useAppSelector } from "../../store/hooks";
import Input from "../../components/forms/Input";
import GenericToggle from "../../components/misc/GenericToggle";
import Select from "../../components/forms/Select";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import Button from "../../components/misc/Button";

interface NewAreaProp {
  submitAction: Function;
  loading: boolean;
}

const NewArea = ({ submitAction, loading }: NewAreaProp) => {
  const { handleSubmit, control, unregister, watch } = useForm();
  const onSubmit: SubmitHandler<BasicType> = (data) => {
    submitAction(data);
  };
  const { areas } = useAppSelector((state) => state.nomenclator);
  const stockAreas = areas.filter((item) => item.type === "STOCK");

  const [newStock, setNewStock] = useState(false);
  useEffect(() => {
    if (!newStock) unregister("stockAreaId");
  }, [newStock]);

  //Area data asociated to Select ------------------------------------------------------------------
  const selectStockData: SelectInterface[] = [];
  stockAreas.map((item) => {
    selectStockData.push({
      name: item.name,
      id: item.id,
    });
  });

  const selectModeData: SelectInterface[] = [];
  [{ key: "BYORDERS", value: "Por tickets recibidos" }, { key: "PRODUCTION", value: "Proceso productivo" }].map((item) => {
    selectModeData.push({
      name: item.value,
      id: item.key,
    });
  });

  const types: SelectInterface[] = [
    { id: "STOCK", name: "Almacén" },
    { id: "SALE", name: "Punto de venta" },
    { id: "MANUFACTURER", name: "Procesado" },
    { id: "ACCESSPOINT", name: "Punto de Acceso" },
  ];

  //--------------------------------------------------------------------------------------------

  const areaType = watch("type");
  let textInfo: string = "";

  switch (areaType) {
    case "SALE":
      textInfo =
        "Las áreas de tipo Punto de venta son aquellas que se encargan de gestionar las ventas de cara al cliente. Al crear un área de este tipo, se crea automáticamente un área de almacén asociada a ella, donde podrás tener el control de los recursos que allí se venden y sus movimientos.";
      break;

    case "STOCK":
      textInfo =
        "En las áreas de tipo almacén podrás tener el control de los recursos de tu inventario y sus movimientos.";
      break;

    case "MANUFACTURER":
      textInfo =
        "Las áreas de tipo producción son aquellas donde ocurren procesos de que implican elaboración o confección de productos con mayor preparado, por ejemplo: la cocina, la parrillada, un taller, etc. De igual manera que el tipo anterior, al crear un área de producción, un almacén asociado a esta se creará automáicamente.";
      break;

    default:
      break;
  }

  return (
    <div className="md:grid-cols-3 md:grid  md:gap-6">
      <div className="md:col-span-1">
        <div className="px-4 sm:px-0">
          <h3 className="text-lg font-medium leading-6 text-slate-900">
            Nueva área
          </h3>
          <p className="mt-1 text-sm text-slate-600 text-justify">
            Crea un área para mayor organización de tu negocio, existen cuatro
            tipos de áreas: almacén, punto de venta, producción y punto de
            acceso.
          </p>
          {textInfo !== "" && <p className="mt-1 text-sm text-slate-600 text-justify font-light p-2" >{textInfo}</p>}
        </div>
      </div>
      <div className="md:col-span-2 mt-5 md:mt-0 ">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="shadow sm:rounded-md sm:overflow-visible">
            <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
              <div className="flex-col">
                <Input
                  label="Nombre"
                  name="name"
                  control={control}
                  placeholder="Nombre del área"
                  rules={{
                    required: "Este campo es requerido",
                    validate: (value) =>
                      !areas.some((area) => area.name === value) ||
                      "Nombre de área existente",
                  }}
                />
                <Input
                  label="Código"
                  name="code"
                  control={control}
                  placeholder="Código del área"
                  rules={{
                    required: "Este campo es requerido",
                    validate: (value) =>
                      !areas.some((area) => area.code === value) ||
                      "Código de área existente",
                  }}
                />
                <Select
                  name="type"
                  data={types}
                  label="Tipo de área"
                  control={control}
                  rules={{ required: "Campo requerido" }}
                />
              </div>
              {["SALE", "MANUFACTURER"].includes(areaType ?? "") && (
                <>
                  <GenericToggle
                    title="Asociar a un almacén existente"
                    currentState={newStock}
                    changeState={setNewStock}
                  />
                  {newStock && (
                    <Select
                      data={selectStockData}
                      label="Almacén asociado"
                      name="stockAreaId"
                      control={control}
                      rules={{
                        required:
                          "Seleccione un área asociada o desactive la opción",
                      }}
                    />
                  )}
                </>
              )}

              <div>
                {["MANUFACTURER"].includes(areaType ?? "") && (
                  <Select
                    data={selectModeData}
                    label="Modo de visualización"
                    name="productionMode"
                    control={control}
                    rules={{
                      required: "Seleccione un modo de visualización ",
                    }}
                  />
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  name="Crear"
                  type="submit"
                  color="slate-600"
                  loading={loading}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewArea;
