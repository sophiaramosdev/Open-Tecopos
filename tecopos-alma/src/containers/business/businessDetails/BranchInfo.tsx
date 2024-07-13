import { useEffect, useState } from "react";
import useServerBusiness from "../../../api/useServerBusiness";
import { TrashIcon } from "@heroicons/react/24/outline";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import moment from "moment";
import Button from "../../../components/misc/Button";
import Modal from "../../../components/misc/GenericModal";
import AlertContainer from "../../../components/misc/AlertContainer";
import { useParams } from "react-router-dom";
import ImageComponent from "../../../components/Images/Image";

interface branchInfoProps {
  id: number;
  deleteBranch: {
    fetching: boolean;
    deleteAction: Function;
  };
  close: Function;
}

export default function BranchInfo({
  id,
  deleteBranch,
  close,
}: branchInfoProps) {
  const { businessId } = useParams();
  const { getBusiness, business, isLoading } = useServerBusiness();
  const [deleteModal, setDeleteModal] = useState(false);
  const { fetching, deleteAction } = deleteBranch;
  useEffect(() => {
    // @ts-ignore
    getBusiness(id);
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
      <div className="flex h-96 overflow-auto scrollbar-thin">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {business && (
            <>
              <div className="flex justify-end mr-10">
                <Button
                  color="red-600"
                  textColor="red-500"
                  action={() => setDeleteModal(true)}
                  icon={<TrashIcon className="h-5 w-5" aria-hidden="true" />}
                  outline
                />
              </div>

              <main className="relative z-0 flex-1 overflow-y-auto focus:outline-none xl:order-last">
                {/*{Profile header }*/}
                <div>
                  <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <div className="mt-3 sm:flex sm:items-end sm:space-x-5 ">
                      <div className="flex">
                        <ImageComponent
                          className="h-32 rounded-full ring-4 ring-white w-32 overflow-hidden"
                          src={business.logo?.src}
                          hash={business.logo?.blurHash}
                        />
                      </div>

                      <div className="relative sm:-top-8 sm:flex sm:min-w-0 sm:flex-1 sm:items-center sm:justify-end sm:space-x-6 sm:pb-1">
                        <div className="mt-6 min-w-0 flex-1 sm:hidden xl:block">
                          <h1 className="truncate text-2xl font-bold text-gray-900">
                            {business?.name}
                          </h1>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <hr className="mt-6" />
                <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                      <dt className="text-md font-medium text-gray-500">
                        Tipo
                      </dt>
                      <dd className="mt-1 text-md text-gray-900">
                        {business?.type}
                      </dd>
                    </div>
                    {business?.openHours ? (
                      <div className="sm:col-span-1">
                        <dt className="text-md font-medium text-gray-500">
                          Horario
                        </dt>
                        <dd className="mt-1 text-md text-gray-900">
                          {business.openHours}
                        </dd>
                      </div>
                    ) : (
                      ""
                    )}

                    <div className="sm:col-span-1">
                      <dt className="text-md font-medium text-gray-500">
                        Fecha Creado
                      </dt>
                      <dd className="mt-1 text-md text-gray-900">
                        {moment(business?.createdAt).format("ll [->] hh:mm A")}
                      </dd>
                    </div>
                  </dl>
                </div>
              </main>
            </>
          )}
        </div>
        {deleteModal && (
          <Modal state={deleteModal} close={setDeleteModal}>
            <AlertContainer
              onAction={() => deleteAction(id, businessId, close)}
              onCancel={setDeleteModal}
              title={`Eliminar ${business?.name} como negocio hijo`}
              text="Seguro que desea continuar?"
              loading={fetching}
            />
          </Modal>
        )}
      </div>
    </>
  );
}
