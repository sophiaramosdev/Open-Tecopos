import { EconomicCycle } from "../../interfaces/ServerInterfaces";
import GenericList from "../../components/misc/GenericList";
import Button from "../../components/misc/Button";
import { useState } from "react";
import Modal from "../../components/modals/GenericModal";
import AlertContainer from "../../components/misc/AlertContainer";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import { SubmitHandler, useForm } from "react-hook-form";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../store/hooks";
import Select from "../../components/forms/Select";
import TextArea from "../../components/forms/TextArea";
import { useNavigate, useParams } from "react-router-dom";
import { formatCalendar } from "../../utils/helpers";
import useServer from "../../api/useServerMain";

interface Detail {
  data: EconomicCycle | null;
  edit: Function;
  close: Function;
  isFetching: boolean;
}

const EcoCycleDetail = ({ data, edit, close, isFetching }: Detail) => {
  const { deleteEconomicCycle, isFetching: deleteFetching } =
    useServerEcoCycle();
  const {ecoCycleId} = useParams();
  const {allowRoles} = useServer();
  const navigate = useNavigate();
  const [closeModal, setCloseModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const dataBody = {
    "Fecha de apertura:": formatCalendar(data?.openDate),
    "Abierto por:": data?.openBy?.displayName,
    "Fecha de cierre:": formatCalendar(data?.closedDate),
    "Cerrado por:": data?.closedBy?.displayName ?? "-",
    "Sistema de precio:": data?.priceSystem.name,
    "Notas:": data?.observations ?? "-",
  };

  //closeEcocycle
  const closeEcocycle = () => {
    close(() => setCloseModal(false));
  };
  return (
    <>
      <GenericList body={dataBody} />

      {data?.isActive ? (
        <div className="flex justify-end py-5 gap-3">
          <Button
            name="Editar"
            color="slate-600"
            textColor="slate-600"
            action={() => setEditModal(true)}
            outline
          />
          <Button
            name="Cerrar"
            color="slate-600"
            action={() => setCloseModal(true)}
          />
        </div>
      ) : (
        <div className="flex justify-end py-5 gap-3">
          {allowRoles(["ADMIN"])&&<Button
            name="Eliminar"
            color="red-400"
            textColor="red-500"
            action={() => setDeleteModal(true)}
            outline
          />}
        </div>
      )}

      {edit && (
        <Modal state={editModal} close={setEditModal}>
          <EditNotes
            notes={data?.observations!}
            priceSys={data?.priceSystem.id!}
            edit={edit}
            loading={isFetching}
            closeModal={() => setEditModal(false)}
          />
        </Modal>
      )}

      {closeModal && (
        <Modal state={closeModal} close={setCloseModal}>
          <AlertContainer
            onAction={closeEcocycle}
            onCancel={() => setCloseModal(false)}
            text="Seguro que desea continuar?"
            title="Se cerrará el ciclo actual"
            loading={isFetching}
          />
        </Modal>
      )}

      {deleteModal && (
        <Modal state={deleteModal} close={setDeleteModal}>
          <AlertContainer
            onAction={()=> deleteEconomicCycle(ecoCycleId!, ()=>navigate("/ecocycle"))}
            onCancel={() => setDeleteModal(false)}
            text="Seguro que desea continuar?"
            title="Se eliminará el ciclo económico actual"
            loading={deleteFetching}
          />
        </Modal>
      )}
    </>
  );
};

//---------------------------------------------------------------------------------

interface EditInterface {
  notes: string;
  priceSys: number;
  edit: Function;
  loading: boolean;
  closeModal: Function;
}

const EditNotes = ({
  notes,
  priceSys,
  edit,
  loading,
  closeModal,
}: EditInterface) => {
  const { handleSubmit, control } = useForm();
  const { business } = useAppSelector((state) => state.init);
  const { ecoCycleId } = useParams();

  const priceSystems: SelectInterface[] =
    business?.priceSystems.map((item) => ({
      id: item.id,
      name: item.name,
    })) ?? [];

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    edit(ecoCycleId, data, closeModal);
  };
  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Select
          name="priceSystemId"
          label="Sistema de precio"
          data={priceSystems}
          defaultValue={priceSys}
          control={control}
        />
        <TextArea
          name="observations"
          label="Notas"
          control={control}
          defaultValue={notes}
        />
        <div className="flex justify-end py-2">
          <Button
            color="slate-600"
            name="Actualizar"
            type="submit"
            loading={loading}
          />
        </div>
      </form>
    </>
  );
};

export default EcoCycleDetail;
