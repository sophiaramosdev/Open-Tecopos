import { Form, Formik } from "formik";
import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { toast } from "react-toastify";
import APIServer from "../../api/APIServices";
import {
  selectUserSession,
  updateBusiness,
} from "../../store/userSessionSlice";
import { MyFooterForm, MyTextarea, MyTextInput } from "../.";
import { selectAllValue, updateFiles } from "../../store/imagesSlice";

export default function BusinessDetails() {
  const { business } = useAppSelector(state=>state.init);
  const free = business?.subscriptionPlan.code !== "FREE";
  // const allValues = useSelector(selectAllValue);
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState({
    name: business?.name !== null ? business?.name : "",
    description: business?.description !== null ? business?.description : "",
    openHours: business?.openHours !== null ? business?.openHours : "",
    promotionalText:
      business?.promotionalText !== null ? business?.promotionalText : "",
    footerTicket: business?.footerTicket !== null ? business?.footerTicket : "",
  });

  const handleChange = (e) => {
    const { value, name } = e.target;
    setInitialValues({ ...initialValues, [name]: value });
  };

  return (
    <main>
      <div className="sm:p-3 lg:p-8 flex-1">
        <div className="mt-5 md:mt-0 md:col-span-2">
          {business && (
            <Formik
              initialValues={initialValues}
              onSubmit={async (values) => {
                // dispatch(updateFiles({ data: initialValues, type: "form" }));
                setLoading(true);
                APIServer.patch(`/administration/business`, initialValues)
                  .then((resp) => {
                    setLoading(false);
                    toast.success("El negocio se actualizo correctamente");
                  })
                  .catch(() => {
                    setLoading(false);
                    toast.error("Error al actualizar el negocio");
                  });
              }}
            >
              {({ values }) => (
                <Form>
                  <div className="shadow sm:rounded-md sm:overflow-hidden">
                    <div className="flex flex-col p-3 gap-6 bg-white sm:p-6 ">
                      <MyTextInput
                        inputclass="w-full"
                        label="Nombre"
                        name="name"
                        type="text"
                        placeholder=""
                        onChange={(e) => handleChange(e)}
                        value={initialValues.name}
                      />
                      <MyTextInput
                        inputclass="w-full"
                        label="Slogan"
                        name="promotionalText"
                        type="text"
                        placeholder=""
                        onChange={(e) => handleChange(e)}
                        value={initialValues.promotionalText}
                      />
                      <MyTextInput
                        inputclass="w-full"
                        label="Horario"
                        name="openHours"
                        type="text"
                        placeholder=""
                        onChange={(e) => handleChange(e)}
                        value={initialValues.openHours}
                      />
                      <MyTextarea
                        row={4}
                        areaclass="w-full"
                        label="Descripción"
                        name="description"
                        type="text"
                        placeholder=""
                        onChange={handleChange}
                        value={initialValues.description}
                      />
                      {free && (
                        <MyTextarea
                          row={2}
                          areaclass="w-full"
                          label="Pie de Comprobante de pago"
                          name="footerTicket"
                          type="text"
                          placeholder=""
                          onChange={handleChange}
                          value={initialValues.footerTicket}
                        />
                      )}
                    </div>

                    <MyFooterForm loading={loading} btnText="actualizar" />
                  </div>
                </Form>
              )}
            </Formik>
          )}
        </div>
      </div>
    </main>
  );
}
