import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import Input from "../../components/forms/Input";
import Toggle from "../../components/forms/Toggle";
import Button from "../../components/misc/Button";
import { TrashIcon } from "@heroicons/react/24/outline";
import useServerArea from "../../api/useServerArea";
import Modal from "../../components/modals/GenericModal";
import AlertContainer from "../../components/misc/AlertContainer";
import { useNavigate, useParams } from "react-router-dom";
import Select from "../../components/forms/Select";
import { SelectInterface } from "../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../store/hooks";

interface EditArea {
  id: number;
  submit: Function;
  loading: boolean;
}

const EditAreaComponent = ({ id, submit, loading }: EditArea) => {
  const { control, handleSubmit } = useForm<Record<string, string | number>>();
  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    submit(data);
  };

  const { deleteArea, isFetching } = useServerArea();
  const { areaId } = useParams();
  const navigate = useNavigate();
  const { areas } = useAppSelector((state) => state.nomenclator);
  const currentArea = areas.find((item) => item.id === id);
  const stockAreas = areas.filter((item) => item.type === "STOCK");

  const [deleteModal, setDeleteModal] = useState(false);

  //Select asociated area data ---------------------------------------------------------------------
  const selectData: SelectInterface[] = [];
  stockAreas.map((item) => {
    selectData.push({
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

  //--------------------------------------------------------------------------------------------
  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="absolute top-4 left-6">
          <Button
            color="red-500"
            action={() => setDeleteModal(true)}
            icon={<TrashIcon className="h-5 text-red-500" />}
            outline
          />
        </div>

        <div className="mt-5 space-y-2">
          <Input
            name="name"
            control={control}
            label="Nombre del Área"
            rules={{ required: "Este Campo es Requerido" }}
            defaultValue={currentArea?.name}
          />
          <Input
            name="code"
            control={control}
            label="Código del Área"
            defaultValue={currentArea?.code}
          />
          <Toggle
            name="isActive"
            control={control}
            defaultValue={currentArea?.isActive}
            title="Activo"
          />
          {["SALE", "MANUFACTURER"].includes(currentArea?.type ?? "") && (
            <Select
              data={selectData}
              label="Almacén asociado"
              name="stockAreaId"
              control={control}
              rules={{
                required: "Seleccione un área asociada",
              }}
              defaultValue={currentArea?.stockArea.id}
            />
          )}
        </div>
        <div className="mt-5">
          {["MANUFACTURER"].includes(currentArea?.type ?? "") && (
            <Select
              data={selectModeData}
              label="Modo de visualización"
              name="productionMode"
              control={control}
              rules={{
                required: "Seleccione un modo de visualización ",
              }}
            defaultValue={currentArea?.productionMode}
            />
          )}
        </div>
        <div className="flex justify-end p-3">
          <Button
            color="slate-600"
            type="submit"
            name="Actualizar"
            loading={loading}
            disabled={loading || isFetching}
          />
        </div>
      </form>
      {deleteModal && (
        <Modal close={() => setDeleteModal(false)} state={deleteModal}>
          <AlertContainer
            title={`Eliminar Área: ${currentArea?.name}`}
            onAction={() =>
              deleteArea(areaId ?? "", () =>
                navigate("/configurations/my_areas")
              )
            }
            onCancel={() => setDeleteModal(false)}
            text="Seguro que desea eliminar esta área?"
            loading={isFetching}
          />
        </Modal>
      )}
    </>
  );
};

export default EditAreaComponent;
