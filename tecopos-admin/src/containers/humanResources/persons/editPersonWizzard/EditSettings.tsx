import Button from "../../../../components/misc/Button";
import { PersonInterface } from "../../../../interfaces/ServerInterfaces";
import { useState } from "react"
import Modal from "../../../../components/misc/GenericModal";
import AlertContainer from "../../../../components/misc/AlertContainer";
import TextArea from "../../../../components/forms/TextArea";
import { useForm } from "react-hook-form";

interface EditPostInterface {
    person: PersonInterface | null;
    deletePerson: Function;
    isFetching: boolean;
    closeModal: Function;
}

const EditSettings = ({ person, deletePerson, isFetching, closeModal }: EditPostInterface) => {

    const [delAction, setDelAction] = useState(false);

    const { control, watch } = useForm()


    return (
        <>
            <div className="flex flex-col gap-3 h-96 pt-3">

                <div className="col-span-2">
                    <Button
                        name="Causar baja"
                        color="red-600"
                        textColor="slate-600"
                        loading={isFetching}
                        disabled={isFetching}
                        outline
                        action={() => setDelAction(true)}
                    />
                </div>

            </div>

            {delAction && (
                <Modal state={delAction} close={setDelAction}>

                    <AlertContainer
                        onAction={async () => {
                            await deletePerson(person?.id, () => setDelAction(false), watch("observations"))
                            closeModal()
                        }}
                        onCancel={setDelAction}
                        title={`Causar de baja a ${person?.firstName}`}
                        text="¿Seguro que desea completar el proceso de baja de este usuario del sistema?"
                        loading={isFetching}
                    />

                    <TextArea
                        name="observations"
                        control={control}
                        label="Observaciones"
                    />

                </Modal>
            )}
        </>
    );
};

export default EditSettings;
