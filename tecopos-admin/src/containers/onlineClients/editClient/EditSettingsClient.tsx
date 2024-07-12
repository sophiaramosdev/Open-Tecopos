import { TrashIcon } from "@heroicons/react/24/outline";
import Button from "../../../components/misc/Button";
import Modal from "../../../components/misc/GenericModal";
import AlertContainer from "../../../components/misc/AlertContainer";
import { useState } from "react";
import { OnlineClientInterface } from "../../../interfaces/ServerInterfaces";
import { useLocation, useNavigate } from "react-router-dom";
import { padStart } from "lodash";

interface EditSettingsClientComponent {
  client: OnlineClientInterface;
  deleteClient: Function;
  isFetching: boolean;
  callback?: (client: OnlineClientInterface) => void;
  // editClient: Function;
}

export const EditSettingsClient = ({
  deleteClient,
  client,
  callback,
  isFetching,
}: EditSettingsClientComponent) => {
  // Hooks
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Local States
  const [deleteModal, setDeleteModal] = useState(false);
  const mainPath = pathname.split("/")[1];

  const barCodeToRender = client.barCode?.split(",");

  const yearContract = new Date(client.createdAt).getFullYear();
  const formatedContract = `${yearContract}/${padStart("0", 3).concat(
    client?.contractNumber + ""
  )}`;

  return (
    <div>
      <div className="flex w-full gap-6 h-[27.1rem]">
        {/* TO RENDER barCode */}
        <div className="w-full overflow-hidden bg-white shadow sm:rounded-lg">
          <div className=" border-t border-gray-200">
            <table className="w-full">
              {barCodeToRender ? (
                barCodeToRender?.map((barCode, idx) => {
                  return (
                    <tr
                      key={idx}
                      className={`${
                        idx % 2 !== 0 && "bg-gray-100"
                      } grid px-2 py-3 sm:px-4 scrollbar-thin`}
                    >
                      {barCode}
                    </tr>
                  );
                })
              ) : (
                <tr className="bg-gray-100 grid px-2 py-3 sm:px-4 scrollbar-thin">
                  <p>No hay códigos de barra en la lista</p>
                </tr>
              )}
            </table>

            <div className="flex flex-col gap-y-2 px-3">
              {client?.codeClient && (
                <div className="inline-flex gap-2">
                  <p className="text-gray-600 font-semibold">
                    Código de cliente
                  </p>
                  <p className="text-gray-500">
                    {padStart("0", 3).concat(client?.codeClient + "")}
                  </p>
                </div>
              )}
              {client?.contractNumber && (
                <div className="inline-flex gap-2">
                  <p className="text-gray-600 font-semibold">No.contrato:</p>
                  <p className="text-gray-500">{formatedContract}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-[10%] h-fit justify-end">
          <Button
            color="red-500"
            icon={<TrashIcon className="h-5 text-red-500" />}
            action={() => setDeleteModal(true)}
            outline
          />
        </div>
      </div>

      {deleteModal && (
        <Modal state={deleteModal} close={setDeleteModal}>
          <AlertContainer
            onAction={() =>
              deleteClient(
                client.id,
                mainPath === "clients"
                  ? () => navigate("/clients/all")
                  : callback
              )
            }
            onCancel={setDeleteModal}
            text="Seguro que desea eliminar este cliente?"
            title={`Eliminar cliente: ${client.firstName}`}
            loading={isFetching}
          />
        </Modal>
      )}
    </div>
  );
};
