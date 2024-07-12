import { useContext, useState } from "react";
import { CartDigitalContext } from "../CartDigital";
import {
  CheckIcon,
  TrashIcon,
  TvIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { formatDate } from "../../../utils/helpers";
import { FaRegFilePdf } from "react-icons/fa";
import MultipleActBtn from "../../../components/misc/MultipleActBtn";
import { ModalAlert } from "../../../components";
import { IconScream } from "../IconSream";
import Modal from "../../../components/misc/GenericModal";
import DetailsTV from "../newTvSteps/DetailsTV";
import TextArea from "../../../components/forms/TextArea";
import Input from "../../../components/forms/Input";
import { useForm } from "react-hook-form";
import CheckboxInput from "../../../components/forms/CheckboxInput";
import Button from "../../../components/misc/Button";
import { Tv } from "../../../interfaces/Interfaces";
import RadioGroupForm from "../../../components/forms/RadioGroup";
import { TbVersions } from "react-icons/tb";

export default function DetailTvInfo({ closeModal }: any) {
  const {
    selectTv,
    isFetching,
    deletedTv: deletedTvAction,
    updateTv,
  } = useContext(CartDigitalContext);
  const [editTv, setEditTv] = useState(false);
  const [deletedTv, setDeletedTv] = useState(false);
  const actions = [];

  actions.push(
    {
      title: "Editar ",
      icon: <TvIcon className="h-5 text-gray-500" />,
      action: () => setEditTv(true),
    },
    {
      title: "Eliminar ",
      icon: <TrashIcon className="h-5 text-gray-500" />,
      action: () => setDeletedTv(true),
    }
  );

  return (
    <section className="w-full px-4 h-[500px] overflow-hidden scrollbar-thin scroll-auto flex flex-col gap-y-3">
      <header className="flex justify-end">
        <MultipleActBtn btnName="Acciones" items={actions} />
      </header>
      <article className="inline-flex gap-2">
        <p className="text-gray-600 font-semibold">Nombre:</p>
        <p className="text-gray-500">{selectTv?.name}</p>
      </article>

      <article className="inline-flex gap-2">
        <p className="text-gray-600 font-semibold">Código:</p>
        <p className="text-gray-500">{selectTv?.uniqueCode}</p>
      </article>

      <article className="inline-flex gap-2">
        <p className="text-gray-600 font-semibold">Activa:</p>
        <div className="flex justify-center items-center">
          {selectTv?.isActive ? (
            <CheckIcon className="w-5 text-green-500" />
          ) : (
            <XMarkIcon className="w-5 text-red-500" />
          )}
        </div>
      </article>

      <article className="inline-flex gap-2">
        <p className="text-gray-600 font-semibold">Orientación:</p>
        <p className="text-gray-500 flex gap-1 items-center">
          {selectTv?.orientation}
          <sup className="text-xs align-top">&deg;</sup>
          <IconScream className={`rotate-90`} />
        </p>
      </article>

      <article className="inline-flex gap-2">
        <p className="text-gray-600 font-semibold">Páginas:</p>
        <p className="text-gray-500">{selectTv?.pages?.length || 0}</p>
      </article>

      <article className="inline-flex gap-2">
        <p className="text-gray-600 font-semibold">Creada :</p>
        <p className="text-gray-500">
          {formatDate(selectTv?.createdAt as string)}
        </p>
      </article>

      <article className="inline-flex gap-2">
        <p className="text-gray-600 font-semibold">Secuencia :</p>
        <p className="text-gray-500">{selectTv?.sequence?.name}</p>
      </article>

      <article className="inline-flex gap-2">
        <p className="text-gray-600 font-semibold">Descripción :</p>
        <p className="text-gray-500">{selectTv?.description ?? "--"}</p>
      </article>

      {editTv && (
        <>
          <Modal state={editTv} close={setEditTv} size="m">
            <EditTvForm defaultData={selectTv} close={() => setEditTv(false)} />
          </Modal>
        </>
      )}

      {deletedTv && (
        <ModalAlert
          type="warning"
          title={`Eliminar Tv `}
          text={`¿Esta seguro de querer eliminar esta Tv?`}
          onAccept={async () =>
            deletedTvAction!(selectTv?.id as number, closeModal)
          }
          onClose={() => setDeletedTv(false)}
          isLoading={isFetching}
        />
      )}
    </section>
  );
}

interface Props {
  defaultData?: Tv | null;
  close: Function;
}

const EditTvForm = ({ defaultData, close }: Props) => {
  const { control, handleSubmit } = useForm();
  const { updateTv, isFetching } = useContext(CartDigitalContext);
  const onSubmit = (data: any) => {
    const customData = {
      name: data.name,
      description: data.description,
      orientation: data.orientation,
    };
    updateTv!(customData, defaultData?.id as number, close);
  };

  const orientations = [
    // {
    //   icon: FaLayerGroup,
    //   title: "0^",
    //   description:
    //     "Formato contable y tangible que se gestiona a través de operaciones de entradas y salidas de un área",
    //   value: 0,
    // },
    {
      icon: TbVersions,
      title: "90°",
      description:
        "Ajuste su televisor a una posición de 90 grados para disfrutar de una experiencia visual óptima. Esta orientación permite un montaje vertical perfecto, ideal para pantallas publicitarias, monitores informativos.",
      value: 90,
    },
    {
      icon: TbVersions,
      title: "270",
      description:
        "Ajuste su televisor a una posición de 90 grados para disfrutar de una experiencia visual óptima. Esta orientación permite un montaje vertical perfecto, ideal para pantallas publicitarias, monitores informativos.",
      value: 270,
    },
    // {
    //   icon: FaPallet,
    //   title: "180^",
    //   description:
    //     "Productos contables y tangibles de almacén que corresonden a una misma agrupación y que cuentan con diferentes atributos",
    //   value: "VARIATION",
    // },
    // {
    //   icon: FaPlus,
    //   title: "270^",
    //   description: "Productos que hacen función de agrego en otros productos",
    //   value: "ADDON",
    // },
  ];

  return (
    <form
      className="w-full h-full flex flex-col gap-y-3"
      onSubmit={handleSubmit(onSubmit)}
    >
      <Input
        control={control}
        name="name"
        label="Nombre"
        rules={{ required: "Campo requerido" }}
        defaultValue={defaultData?.name}
      />
      <TextArea
        name="description"
        control={control}
        label="Descripción"
        defaultValue={defaultData?.description}
      />

      <div>
        <span className="font-semibold text-xl block">Orientación: </span>
        <RadioGroupForm
          data={orientations}
          name="orientation"
          control={control}
          rules={{ required: "Campo requerido" }}
          defaultValue={defaultData?.orientation}
        />
      </div>
      <footer className="grid grid-cols-2 mt-3">
        <div></div>
        <Button
          color="slate-700"
          type="submit"
          name="Actualizar"
          disabled={isFetching}
          loading={isFetching}
        />
      </footer>
    </form>
  );
};
