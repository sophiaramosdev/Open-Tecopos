import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";

import { SupplierInterfaces } from "../../interfaces/ServerInterfaces";

import moment from "moment";


import { TrashIcon } from "@heroicons/react/24/outline";
import TextArea from "../../components/forms/TextArea";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import Button from "../../components/misc/Button";
import Modal from "../../components/modals/GenericModal";
import AlertContainer from "../../components/misc/AlertContainer";
import Input from "../../components/forms/Input";


interface FormSupplier {
  currentSupplier: SupplierInterfaces;
  closeModal: Function;
  crud: { update: Function; del: Function; isLoading: boolean; isFetching: boolean };
  
}

const DetailSupplierModal = ({
  currentSupplier,
  closeModal,
  crud,

}: FormSupplier) => {

  const { update, del, isLoading, isFetching } = crud;

  const { handleSubmit, control } = useForm();

  const [deleteModal, setdeleteModal] = useState(false); //Modal de eliminar 

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {

    update(currentSupplier?.id, data, closeModal);
  };

  //--------------------------------------------------------------------------------------------

  return (
    <>
      {!isLoading ? (
          <form onSubmit={handleSubmit(onSubmit)}>
                  
              <div className="px-4 py-3 text-right sm:px-6">
                <button
                  onClick={() => setdeleteModal(true)}
                  type="button"
                  className="inline-flex items-center rounded-md border border-red-500  bg-red-50 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-50 focus:ring-offset-2"
                  >
                  <TrashIcon className="h-5 text-red-500" />
                </button>
              </div>
              
              <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">             
                <div className="px-5 py-2 sm:px-6">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">Información del proveedor</h3>
                </div>
                <div className=" border-t border-gray-200">
                  <dl className="divide-y divide-gray-200">
                    <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-900">Nombre</dt>
                      <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                        <div className="-mt-5">
                          <Input
                              name="name"
                              control={control}
                              defaultValue={currentSupplier.name}
                              rules={{required: "Este campo es requerido"}}
                          />
                        </div>
                      </dd>
                    </div>
                    
                    <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-900">Registrado</dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">  
                         { moment(currentSupplier?.createdAt).format("DD [de] MMMM [de] YYYY, hh:mm A")
                        }
                        </dd>
                    </div>
                    <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-900">Observación</dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          <div className="-mt-5">
                            <TextArea
                              name="observations"
                              control={control} 
                              defaultValue={currentSupplier.observations}
                            />
                          </div>
                        </dd>
                    </div>
                  </dl>
                </div>
              </div>
              <div className="px-4 py-3 mt-3 bg-slate-50 text-right sm:px-6">
                <Button 
                    color="slate-600"
                    type="submit"
                    name="Actualizar"
                    loading={isFetching}
                    disabled={isFetching}
                />
              </div>
          </form>
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
      {deleteModal &&(
        <Modal close={setdeleteModal} state={deleteModal}>
          <AlertContainer
            title={`¡Eliminar proveedor!`}
            onAction={() =>
              del(
                currentSupplier?.id,
                closeModal,
              )
            }
            onCancel={() => setdeleteModal(false)}
            text={`¿Seguro que desea eliminar este proveedor: ${currentSupplier?.name}?`}
            loading={isFetching}
          />
        </Modal>
      )}
    </>
  );
};

export default DetailSupplierModal;
