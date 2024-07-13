import { useState, useEffect } from "react";
import {
  CheckIcon,
  PencilSquareIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import moment from "moment";
import "moment/locale/es";
import UserForm from "./UsersForm";
import Modal from "../../components/misc/GenericModal";
import SpinnerLoading from "../../components/misc/SpinnerLoading";
import ImageComponent from "../../components/Images/Image";
import { UserInterface } from "../../interfaces/ServerInterfaces";
import AlertContainer from "../../components/misc/AlertContainer";
import useServerUser from "../../api/userServerUser";
import Button from "../../components/misc/Button";

interface UserInfoInterface {
  id?: number | null;
  closeModal?: Function;
  userManage: {
    get: Function;
    upd: Function;
    del: Function;
    user: UserInterface | null;
    isLoading: boolean;
    isFetching: boolean;
  };
}

export default function UserInfo({
  id,
  userManage,
  closeModal,
}: UserInfoInterface) {
  const { get, upd, del, isLoading, isFetching, user } = userManage;
  const { resetUserPsw, isFetching: loadResetPsw } = useServerUser();

  const [editState, setEditState] = useState(false);
  const [resetPswModalState, setResetPswModalState] = useState(false);

  useEffect(() => {
    get(id);
  }, []);

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <SpinnerLoading />
      </div>
    );
  }

  return (
    <>
      {resetPswModalState && (
        <Modal state={resetPswModalState} close={setResetPswModalState}>
          <AlertContainer
            onAction={() => resetUserPsw(user?.email!, ()=>setResetPswModalState(false))}
            onCancel={() => setResetPswModalState(false)}
            title="Restablecerá la contraseña del usuario"
            text="Seguro que desea continuar?"
            loading={loadResetPsw}
          />
        </Modal>
      )}

      {editState && (
        <Modal state={editState} close={() => setEditState(false)} size="m">
          {
            <UserForm
              user={user}
              userManage={{ upd, del, isFetching }}
              close={() => setEditState(false)}
              closeAll={closeModal}
            />
          }
        </Modal>
      )}

      <div className="flex h-96">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto scrollbar-thin focus:outline-none xl:order-last">
            {/*{Profile header }*/}
            <div>
              <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                <div className="mt-3 sm:flex sm:items-center sm:space-x-5">
                  <div className="flex">
                    <ImageComponent
                      className="h-36 w-36 rounded-full"
                      src={user?.avatar?.src}
                      hash={user?.avatar?.blurHash}
                    />
                  </div>

                  <div className="sm:flex sm:min-w-0 sm:flex-1 sm:items-center sm:justify-end sm:space-x-6 sm:pb-1">
                    <div className="mt-6 min-w-0 flex-1 sm:hidden xl:block">
                      <h1 className="truncate text-2xl font-bold text-gray-900">
                        {user?.displayName}
                      </h1>
                    </div>
                    <div className="justify-end mt-6 flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 flex-shrink">
                      <Button
                        color="primary"
                        textColor="primary"
                        name="Editar"
                        icon={<PencilSquareIcon className="h-5" />}
                        action={() => setEditState(true)}
                        outline
                      />
                      {user?.roles.some((role) =>
                        ["OWNER", "GROUP_OWNER"].includes(role.code)
                      ) && (
                        <Button
                          color="red-700"
                          textColor="red-700"
                          name="Restablecer Contraseña"
                          icon={<ArrowPathIcon className="h-5" />}
                          action={() => setResetPswModalState(true)}
                          outline
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <hr className="mt-6" />
            <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-md font-medium text-gray-500">Usuario</dt>
                  <dd className="mt-1 text-md text-gray-900">
                    {user?.username}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-md font-medium text-gray-500">
                    Correo Electrónico
                  </dt>
                  <dd className="mt-1 text-md text-gray-900">{user?.email}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-md font-medium text-gray-500">
                    Creado el
                  </dt>
                  <dd className="mt-1 text-md text-gray-900">
                    {moment(user?.createdAt).format(
                      `ll [a la${
                        Number(moment(user?.createdAt).format("hh")) > 1
                          ? "s"
                          : ""
                      }] hh:mm A`
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-md font-medium text-gray-500">Roles</dt>
                  {user?.roles.map((rol) => (
                    <dd key={rol.code} className="mt-1 text-md text-gray-900">
                      <span className="inline-flex gap-1 items-center">
                        <CheckIcon className="h-3" />
                        {rol.name}
                      </span>
                    </dd>
                  ))}
                </div>
              </dl>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
