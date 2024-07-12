import { useState } from "react";
import Input from "../../../../components/forms/Input";
import Button from "../../../../components/misc/Button";
import {
  cleanObj,
  validateEmail,
  validateUserChar,
} from "../../../../utils/helpers";
import Toggle from "../../../../components/forms/Toggle";
import { SubmitHandler, useForm } from "react-hook-form";
import useServerUsers from "../../../../api/useServerUsers";
import { UserInterface } from "../../../../interfaces/ServerInterfaces";
import { TrashIcon } from "@heroicons/react/24/outline";
import Modal from "../../../../components/modals/GenericModal";
import AlertContainer from "../../../../components/misc/AlertContainer";
import { BasicType } from "../../../../interfaces/InterfacesLocal";
import GenericImageDrop from "../../../../components/misc/Images/GenericImageDrop";

interface EditInterface {
  user: UserInterface | null;
  editUser: Function;
  deleteUser: Function;
  closeModal: Function;
  isFetching: boolean;
}

const DetailUserEditComponent = ({
  editUser,
  deleteUser,
  user,
  closeModal,
  isFetching,
}: EditInterface) => {
  const { control, handleSubmit, watch, reset, formState } = useForm<BasicType>(
    {
      mode: "onChange",
      defaultValues: {
        displayName: user?.displayName,
        username: user?.username,
        email: user?.email,
        password: undefined,
        pinPassword: undefined,
        isActive: user?.isActive,
      },
      resetOptions: {
        keepDefaultValues: true,
      },
    }
  );
  const { resetPsw, isFetching: loadingPsw } = useServerUsers();
  const { checkUser, isFetching: fetchingUser } = useServerUsers();
  const { checkEmail, isFetching: fetchingMail } = useServerUsers();
  const [delAction, setDelAction] = useState(false);

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    editUser(user?.id, cleanObj(data), reset());
  };

  const email = watch("email") ?? user?.email ?? null;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="h-96 overflow-auto scrollbar-thin scrollbar-thumb-slate-100 pr-5 pl-2">
          <div className="flex justify-end">
            <Button
              icon={<TrashIcon className="h-5 text-red-500" />}
              color="red-500"
              action={() => setDelAction(true)}
              outline
            />
          </div>
          <GenericImageDrop
            className="h-40 w-40 rounded-full border border-gray-400 m-auto overflow-hidden object-cover"
            control={control}
            name="avatarId"
            defaultValue={user?.avatarId}
            previewDefault={user?.avatar?.src}
            previewHash={user?.avatar?.blurHash}
          />
          <Input
            name="displayName"
            label="Nombre"
            control={control}
            rules={{ required: "Campo requerido" }}
          />
          <Input
            name="username"
            label="Usuario"
            control={control}
            rules={{
              required: "Campo requerido",
              validate: {
                validateChar: (value) =>
                  validateUserChar(value) ||
                  "El usuario no puede contener espacios ni caracteres especiales excepto - _ .",
                checkUser: async (value) => {
                  if (formState.dirtyFields.username) {
                    return (await checkUser(value)) || "Usuario en uso";
                  } else {
                    return true;
                  }
                },
              },
            }}
          />
          <div className="grid grid-cols-2 gap-5">
            <Input
              name="email"
              label="Correo electrónico"
              control={control}
              rules={{
                validate: {
                  validateEmail: (value) =>
                    validateEmail(value) || "Dirección de correo inválida",
                  checkEmail: async (value) => {
                    if (formState.dirtyFields.email) {
                      return (
                        (await checkEmail(value)) ||
                        "Dirección de correo en uso"
                      );
                    } else {
                      return true;
                    }
                  },
                },
              }}
            />
            <div className="flex items-end pb-2">
              <Button
                name="Restablecer contraseña"
                color="slate-500"
                textColor="slate-600"
                action={() => resetPsw({ email })}
                loading={loadingPsw}
                disabled={loadingPsw}
                outline
                full
              />
            </div>
          </div>

          <Input
            name="password"
            label="Nueva contraseña"
            type="password"
            control={control}
          />

          <Input
            name="pinPassword"
            control={control}
            label="Nuevo PIN"
            rules={{
              maxLength: {
                value: 6,
                message: "El PIN no puede exceder los 6 dígitos",
              },
            }}
            textAsNumber
          />
          <Toggle
            name="isActive"
            control={control}
            defaultValue={user?.isActive}
            title="Activo"
          />
        </div>
        <div className="flex justify-end mt-5">
          <Button
            name="Actualizar"
            color="slate-600"
            type="submit"
            loading={isFetching}
            disabled={isFetching || loadingPsw}
          />
        </div>
      </form>

      {delAction && (
        <Modal state={delAction} close={setDelAction}>
          <AlertContainer
            onAction={() => deleteUser(user?.id, closeModal)}
            onCancel={setDelAction}
            title={`Eliminar ${user?.username}`}
            text="¿Seguro que desea eliminar este usuario del sistema?"
            loading={isFetching}
          />
        </Modal>
      )}
    </>
  );
};

export default DetailUserEditComponent;
