import { faClock, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Form, Formik, useField } from "formik";
import  { useEffect, useState } from "react";
import { toast } from "react-toastify";
import APIServer from "../../api/APIServices";
import { useNavigate, useParams } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";
import ModalAlert from "../commos/ModalAlert";
import DetailsCommon from "./DetailsCommon";

export default function Details() {
  const{ecoCycleId} = useParams()
  const navigate = useNavigate();
  const { business: myBusiness } = useAppSelector((state) => state.init);
  const [selectedEconomicCycles, setSelectedEconomicCycles] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingClose, setLoadingClose] = useState(false);
  const [inProcessOrdes, setInProcessOrdes] = useState(false);
  const [showModalInProcessOrdes, setShowModalInProcessOrdes] = useState(false);
  const [initialValues, setInitialValues] = useState();

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      Promise.all([APIServer.get(`/administration/economiccycle/${ecoCycleId}`)])
        .then((resp) => {
          setSelectedEconomicCycles(resp[0].data);
          setInitialValues({
            observations:
              resp[0].data.observations === null
                ? ""
                : resp[0].data.observations,
            systemPriceId: resp[0].data.priceSystem.id,
            priceSystemChecked: resp[0].data.priceSystem.name,
          });
          setIsLoading(false);
        })
        .catch((error) => {
          const message = error.response.data.message;
          if (message) {
            toast.error(message);
          } else {
            toast.error(
              "Ha ocurrido un error mientras se cargaba el ciclo económico"
            );
          }
          setIsLoading(false);
        });
    })();
  }, []);

  useEffect(() => {
    (() => {
      APIServer.get(`/sales/order?status=IN_PROCESS`)
        .then((ecoCycl) => {
          ecoCycl.data.items.length > 0
            ? setInProcessOrdes(true)
            : setInProcessOrdes(false);
        })
        .catch(() => {
          toast.error("Error en la conexión");
        });
    })();
  }, []);
  const handleSubmit = () => {
    let economicCyclyTem = {
      observations: initialValues.observations,
      priceSystemId: Number(initialValues.systemPriceId),
    };
    setLoading(true);
    APIServer.patch(
      `/administration/economiccycle/${selectedEconomicCycles.id}`,
      economicCyclyTem
    )
      .then(() => {
        toast.success("El ciclo económico se actualizo correctamente");
        setLoading(false);
      })
      .catch(() => {
        toast.error("Error al actualizar el ciclo económico");
        setLoading(false);
      });
  };

  const closeEconomictCycle = () => {
    setLoadingClose(true);

    APIServer.post(`/administration/economiccycle/close`)
      .then(() => {
        toast.success("El ciclo económico se cerro satisfactoriamente");
        navigate("/ecocycle");
        setLoadingClose(false);
      })
      .catch(() => {
        toast.error("Error al cerrar el ciclo económico");
        setLoadingClose(false);
        setIsLoading(false);
      });
  };
  const [modalStates, setModalStates] = useState("");
  const handleDelete = () => {
    setLoading(true);
    APIServer.deleteAPI(
      `/administration/economiccycle/${selectedEconomicCycles.id}`
    )
      .then(() => {
        navigate("/ecocycle");
      })
      .catch(() => {
        setLoading(false);
        toast.error("Error al eliminar");
      });
  };

  if (isLoading) {
    return (
      <div className="flex h-full justify-center mt-10 items-center ">
        <img
          className="h-24 w-24"
          src={require("../../assets/png/logoLoading.png")}
          alt=""
        />
        <div className="bg-orange-600 animate-ping h-5 w-5 rounded-full absolute mt-12 ml-12" />
      </div>
    );
  }

  return (
    <>
      <div className="lg:max-w-7xl grid grid-cols-1 gap-y-8 gap-x-4 items-center sm:grid-cols-12 lg:gap-x-4">
        <div className="sm:col-span-12 mt-5 lg:col-span-12 items-center">
          {selectedEconomicCycles !== null && (
            <>
              {/* <div className="relative flex items-center justify-center bg-white shadow-sm m-10">
                <div className="col-span-12 sm:col-span-7 flex flex-row justify-evenly">
                  <div className="flex flex-row justify-center items-center">
                    <FontAwesomeIcon
                      icon={faClock}
                      className="text-slate-900 h-6 m-4"
                    />
                    <h6 className="text-2xl font-medium ">
                      {moment(selectedEconomicCycles.createdAt).format("LTS")}{" "}
                    </h6>
                  </div>

                  {selectedEconomicCycles.closedDate !== null && (
                    <div className="flex flex-row justify-center items-center">
                      <FontAwesomeIcon
                        icon={faClock}
                        className={
                          selectedEconomicCycles &&
                          selectedEconomicCycles.isActive === true
                            ? "text-orange-500 h-6 m-4"
                            : "text-slate-900 h-6 m-4"
                        }
                      />

                      {selectedEconomicCycles &&
                      selectedEconomicCycles.isActive === true ? (
                        <h6 className="text-2xl font-medium text-orange-500 ">
                          {moment().format("LTS")}
                        </h6>
                      ) : (
                        <h6 className="text-2xl font-medium text-slate-900 ">
                          {selectedEconomicCycles.closedDate !== null &&
                            moment(selectedEconomicCycles.closedDate).format(
                              "LTS"
                            )}{" "}
                        </h6>
                      )}
                    </div>
                  )}
                </div>
              </div> */}
              {selectedEconomicCycles.isActive !== false && (
                <div className="">
                  <Formik
                    initialValues={{
                      observations: selectedEconomicCycles?.observations,
                      name: selectedEconomicCycles?.name,
                      priceSystemId: `${selectedEconomicCycles.priceSystemId}`,
                    }}
                    onSubmit={() =>
                      modalStates !== "ModalAlertDeleteCicle" && handleSubmit()
                    }
                    // validationSchema={Yup.object({
                    //   name: Yup.string(),
                    //   observations: Yup.string(),
                    // })}
                    // o
                  >
                    {({ values }) => (
                      <Form>
                        <div className="rounded-md">
                          <div className="bg-white">
                            <DetailsCommon
                              status="open"
                              data={selectedEconomicCycles}
                              initialValues={initialValues}
                              setInitialValues={setInitialValues}
                            />
                          </div>
                          <div className="flex justify-end item-center py-3">
                            <button
                              onClick={() =>
                                setModalStates("ModalAlertCloseCicle")
                              }
                              type="button"
                              className="inline-flex text-center justify-center py-2 mr-8 px-4 
                              border border-transparent shadow-sm text-sm font-medium 
                              rounded-md text-white bg-orange-500 hover:bg-orange-700 
                              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                            >
                              {loadingClose && (
                                <span className=" inset-y-0 flex items-center mr-2">
                                  <FontAwesomeIcon
                                    icon={faSpinner}
                                    className="h-5 w-5 animate-spin text-white group-hover:text-slate-400"
                                    aria-hidden="true"
                                  />
                                </span>
                              )}
                              Cerrar
                            </button>
                            <button
                              type="submit"
                              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                            >
                              {loading && (
                                <span className="  inset-y-0 flex items-center mr-2">
                                  <FontAwesomeIcon
                                    icon={faSpinner}
                                    className="h-5 w-5 animate-spin text-white group-hover:text-slate-400"
                                    aria-hidden="true"
                                  />
                                </span>
                              )}
                              Actualizar
                            </button>
                          </div>
                          {modalStates === "ModalAlertCloseCicle" && (
                            <ModalAlert
                              title="Cerrar ciclo económico"
                              text="Está a punto de cerrar este ciclo económico. Esta acción es definitiva y no puede ser revertida. ¿Está seguro de querer cerrar el ciclo económico?"
                              onClose={() => setModalStates("")}
                              onAccept={closeEconomictCycle}
                              isLoading={isLoading}
                            />
                          )}
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              )}

              {selectedEconomicCycles.isActive === false && (
                <div>
                  <DetailsCommon
                    status="closed"
                    data={selectedEconomicCycles}
                  />

                  <div className="flex w-full justify-end">
                    <button
                      type="button"
                      onClick={() => setModalStates("ModalAlertDeleteCicle")}
                      className="mt-6 w-42 bg-slate-600 border border-transparent rounded-md py-2 px-4 flex 
                    items-center justify-center text-base font-medium text-white
                     hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                      {loading && (
                        <span className="  inset-y-0 flex items-center mr-2">
                          <FontAwesomeIcon
                            icon={faSpinner}
                            className="h-5 w-5 animate-spin text-white group-hover:text-slate-400"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                      Eliminar
                    </button>
                  </div>
                  {modalStates === "ModalAlertDeleteCicle" && (
                    <ModalAlert
                      title="Eliminar ciclo económico"
                      text="Está a punto de eliminar este ciclo económico. Esta acción es definitiva y no puede ser revertida. ¿Está seguro de querer eliminar el ciclo económico?"
                      onClose={() => setModalStates("")}
                      onAccept={handleDelete}
                      isLoading={isLoading}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModalInProcessOrdes && (
        <div
          className="relative  z-40"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity "></div>

          <div className="fixed  z-40 inset-0 overflow-y-auto">
            <div className="flex items-end sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
              <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
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
                        className="text-lg leading-6 font-medium text-slate-900"
                        id="modal-title"
                      >
                        Atención
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-slate-500">
                          Hay Ordenes en marchas, estas seguro que quieres
                          cerrar el Ciclo Económico.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-3 sm:px-3 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={closeEconomictCycle}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    <span className="inset-y-0 flex items-center mr-2">
                      {loading && (
                        <FontAwesomeIcon
                          icon={faSpinner}
                          className="h-5 w-5 animate-spin text-white group-hover:text-slate-400"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    Si,cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModalInProcessOrdes(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
