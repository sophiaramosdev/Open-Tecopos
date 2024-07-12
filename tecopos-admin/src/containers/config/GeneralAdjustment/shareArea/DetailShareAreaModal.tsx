
import { useState } from "react";


import moment from "moment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { TrashIcon } from "@heroicons/react/24/outline";
import { ShareArea } from "../../../../interfaces/ServerInterfaces";
import { counterTimeAboutDate, formatAddressAccount, formatCurrency } from "../../../../utils/helpers";
import Modal from "../../../../components/modals/GenericModal";
import AlertContainer from "../../../../components/misc/AlertContainer";


interface FormAccountOperation {
    shareAreaData?: ShareArea | null;
    edit?: boolean;
    closeModal: Function;
    crud: { del: Function; isLoading: boolean; isFetching: boolean };
  }

const DetailShareAreaModal = ( {shareAreaData, closeModal, crud} : FormAccountOperation) => {

    const { del, isLoading, isFetching } = crud;

    const [deleteModal, setdeleteModal] = useState(false); //Modal de eliminar

  //--------------------------------------------------------------------------------------------

  return (

    <>
        {!isLoading ? (

            <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">

            {/* Account Operation Information */}  
              
              <div className="px-5 py-2 sm:px-6">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">Información del área compartida</h3>
              </div>
              <div className=" border-t border-gray-200">
                  <dl className="divide-y divide-gray-200">
                  <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-900">Área</dt>
                      <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                      {shareAreaData?.area?.name ?? '---' }
                      </dd>
                  </div>
                  <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-900">Negocio</dt>
                      <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                      {shareAreaData?.sharedBusiness?.name ?? '---' }
                      </dd>
                  </div>
                  <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-900">Compartida por</dt>
                      <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                        
                        { shareAreaData?.sharedBy?.displayName ?? '---'}, el { moment(shareAreaData?.createdAt).format("DD/MM/YYYY hh:mm A")}
                      </dd>
                  </div>                 
                  </dl>
              </div>
                  
            <div className="px-4 py-3 bg-slate-50 text-right sm:px-6">
                
                    <button
                        onClick={() => setdeleteModal(true)}
                        type="button"
                        className="inline-flex items-center rounded-md border border-red-500  bg-red-50 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-50 focus:ring-offset-2"
                        >
                        <TrashIcon className="h-5 text-red-500" />
                    </button>
            </div>
          </div>
        ) : 
        (
            <div className="text-center mt-5 pt-4">
                <FontAwesomeIcon
                    icon={faSpinner}
                    className="h-10 w-10 animate-spin text-gray-500"
                    aria-hidden="true"
                />
                <h3 className="mt-2 text-sm font-medium text-slate-500">
                    Cargando...
                </h3>
            </div>
        )
    }

        {deleteModal && (
        
            <Modal close={setdeleteModal} state={deleteModal}>
            <AlertContainer
                title={`¡Eliminar Área Compartida!`}
                onAction={() => del( shareAreaData?.id, closeModal, shareAreaData ) }
                onCancel={() => setdeleteModal(false)}
                text={`¿Seguro que desea eliminar esta área compartida`}
                loading={isFetching}
            />
            </Modal>
        )}
    </>
  );
};

export default DetailShareAreaModal;
