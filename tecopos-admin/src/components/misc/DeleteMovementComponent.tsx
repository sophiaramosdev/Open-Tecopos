import React, { useState } from "react";
import moment from "moment";
import Calendar from "../calendar/Calendar";
import useServerArea from "../../api/useServerArea";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useParams } from "react-router-dom";

interface DeleteMovement {
    close: Function;
}

const DeleteMovementComponent = ({ close }: DeleteMovement) => {
    const [selectedDayMovementDelete, setSelectedDayMovementDelete] =
        useState<Date>(new Date());
    const { deleteMovements, isFetching } = useServerArea();
    const { stockId:areaId } = useParams();

    return (
        <div>
            <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-sm transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                            <svg
                                className="h-6 w-6 text-red-600"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    stroke-linecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3
                                className="text-lg leading-6 font-medium text-gray-900"
                                id="modal-title"
                            >
                                Atención
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-500">
                                    Esta acción eliminará todas las operaciones
                                    realizadas antes de{" "}
                                    {moment(selectedDayMovementDelete).format(
                                        "LL"
                                    )}
                                    . Está seguro que desea continar?
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Calendar setSelectedDayMovement={setSelectedDayMovementDelete} />

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                    type="button"
                    onClick={() =>{
                        areaId &&
                        deleteMovements(
                            areaId,
                            moment(selectedDayMovementDelete).format(
                                "YYYY-MM-DD"
                            ),
                            close
                        )}
                    }
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                    <span className="inset-y-0 flex items-center mr-2">
                        {isFetching && (
                            <FontAwesomeIcon
                                icon={faSpinner}
                                className="h-5 w-5 animate-spin text-white group-hover:text-gray-400"
                                aria-hidden="true"
                            />
                        )}
                    </span>
                    Si, eliminar
                </button>
                <button
                    type="button"
                    onClick={() => close()}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export default DeleteMovementComponent;
