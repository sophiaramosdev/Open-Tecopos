import React from "react";
import { Formik, Form } from "formik";
import { PriceSystem } from "../../interfaces/ServerInterfaces";
import * as Yup from "yup";
import MyRadio from "../commos/MyRadio";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import MyTextInput from "../commos/MyTextInput";

interface NewEcoCycle {
  priceSystem: PriceSystem[];
  action: Function;
  loading:boolean
}

const NewEcocycleComponent = ({ priceSystem, action, loading }: NewEcoCycle) => {
  
  return (
    <div className="w-full grid grid-cols-1 gap-y-8 gap-x-4 items-center  sm:grid-cols-12 lg:gap-x-4">
      <div className="sm:col-span-12 lg:col-span-12 items-center">
        <h1 className=" text-xl font-medium text-gray-900 sm:mr-8">
          Abrir Ciclo Económico
        </h1>

        <Formik
          initialValues={{
            observations: "",
            name: "",
            priceSystemId: `${priceSystem[0].id}`,
          }}
          validationSchema={Yup.object({
            name: Yup.string(),
            observations: Yup.string(),
          })}
          onSubmit={(values) => {
            let economicCyclyTem = {
              name: values.name,
              priceSystemId: parseInt(values.priceSystemId, 10),
            };
            action(economicCyclyTem);
          }}
        >
          {({ values }) => (
            <Form>
              <div className="shadow sm:rounded-md sm:overflow-hidden mt-5">
                <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                  <div className="grid grid-cols-6 gap-6">
                    {priceSystem.length >1 && <div className="grid col-span-6 sm:col-span-6 ">
                      <label
                        htmlFor="last-name"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Seleccione un sistema de precio
                      </label>
                      <div className="grid grid-cols-3">
                        {priceSystem.map((item, index) => (
                          <div key={index} className="flex items-center mb-4">
                            <MyRadio
                              label={item.name}
                              name="priceSystemId"
                              type="radio"
                              value={`${item.id}`}
                              customFunction={() => null}
                            />
                          </div>
                        ))}
                      </div>
                    </div>}
                  </div>

                  <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6 sm:col-span-6">
                      <MyTextInput
                        label="Nombre"
                        name="name"
                        type="text"
                        placeholder=""
                        isValid={true}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-6"></div>
                </div>
                <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    disabled={loading}
                  >
                    {loading && (
                      <span className="  inset-y-0 flex items-center mr-2">
                        <FontAwesomeIcon
                          icon={faSpinner}
                          className="h-5 w-5 animate-spin text-white group-hover:text-gray-400"
                          aria-hidden="true"
                        />
                      </span>
                    )}
                    Abrir
                  </button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default NewEcocycleComponent;
