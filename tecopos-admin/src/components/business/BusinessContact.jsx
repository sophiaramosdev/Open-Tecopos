import { Form, Formik } from "formik";
import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { toast } from "react-toastify";
import APIServer from "../../api/APIServices";
import {
  updateBusiness,
} from "../../store/userSessionSlice";
import {
  MyFooterForm,
  MySeparatorForm,
  MyTextarea,
  MyTextInput,
  MyButton,
  MySelectWhithSearch,
} from "../.";
import {
  selectMunicipality,
  selectProvince,
} from "../../store/selectDataSlice";
import { useControlInputs } from "../../hooks/";
export default function BusinessContact() {
  const dispatch = useAppDispatch();
  const {business} = useAppSelector(state=>state.init);
  const [phonesValues, setPhonesValues] = useState(
    business.phones.length !== 0
      ? business.phones
      : [{ number: "", description: "" }]
  );
  const [initialValue, setInitialValue] = useState({
    street: business.address
      ? business.address.street !== null
        ? business.address.street
        : ""
      : "",
    locality: business.address
      ? business.address.locality !== null
        ? business.address.locality
        : ""
      : "",
    municipalityValue: business.address
      ? business.address?.municipality.id !== null
        ? business.address.municipality.id
        : ""
      : "",
    provinceValue: business.address
      ? business.address?.province.id !== null
        ? business.address.province.id
        : ""
      : "",
    descriptionArea: business.address
      ? business.address.description !== null
        ? business.address.description
        : ""
      : "",
    email: business.email !== null ? business.email : "",
  });
  const [show, setShow] = useState(false);
  const { handleChange, isValid, typeOnShow, handleChangeSelect } =
    useControlInputs({
      phonesValues,
      initialValue,
      setPhonesValues,
      setInitialValue,
    });
  const municipalityOptions = useAppSelector(selectMunicipality);
  const ProvinceOptions = useAppSelector(selectProvince);
  const [loading, setLoading] = useState(false);
  const [handleSocialNetworks, setHandleSocialNetworks] = useState(
    business.socialNetworks
      ? business.socialNetworks
      : [
          {
            user: "",
            type: "INSTAGRAM",
          },
          { user: "", type: "FACEBOOK" },
        ]
  );
  const handleChangeSocialN = (e, index) => {
    const { value } = e.target;
    const newData = [...handleSocialNetworks];
    newData[index] = { ...newData[index], user: value };
    setHandleSocialNetworks(newData);
  };
  const handleSubmit = async (values) => {
    isValid ? setShow(false) : setShow(true);
    if (isValid) {
      setLoading(true);
      phonesValues.length > 1 &&
        phonesValues.map(
          (item) =>
            (item.number === null || item.number === "") &
              (item.description === null || item.description === "") &&
            phonesValues.splice(phonesValues.indexOf(item), 1)
        );
      let businessTemp = {
        address: {
          street: initialValue.street,
          locality: initialValue.locality,
          description: initialValue.descriptionArea,
          municipalityId: initialValue.municipalityValue,
          provinceId: initialValue.provinceValue,
        },
        phones: phonesValues,
        email: initialValue.email === null ? "" : initialValue.email,
        socialNetworks: handleSocialNetworks,
      };
      APIServer.patch(`/administration/business`, businessTemp)
        .then((resp) => {
          setLoading(false);
          toast.success("El negocio se actualizo correctamente");
          dispatch(updateBusiness(resp.data));
        })
        .catch(() => {
          setLoading(false);
          toast.error("Error al actualizar el negocio");
        });
    }
  };
  const [onPaintingPhone, setOnPaintingPhone] = useState(false);
  const handleAddPhones = (e, index) => {
    phonesValues[index] !== "" &&
      setPhonesValues([...phonesValues, { number: "", description: "" }]);
    setOnPaintingPhone(!onPaintingPhone);
  };
  const handleDelPhones = (e, index) => {
    const copyPhones = [...phonesValues];
    copyPhones.length > 1 &&
      copyPhones.splice(copyPhones.indexOf(copyPhones[index]), 1);
    setPhonesValues(copyPhones);
    setOnPaintingPhone(!onPaintingPhone);
  };
  return (
    <main>
      <div className="sm:p-3 lg:p-8 flex-1">
        <div className="mt-5 md:mt-0 md:col-span-2">
          {business && (
            <Formik
              initialValues={initialValue}
              onSubmit={(values) => handleSubmit(values)}
            >
              <Form>
                <div className="shadow sm:rounded-md sm:overflow-hidden">
                  <div className="flex flex-col p-3 gap-6 bg-white sm:p-6 ">
                    <MySeparatorForm initial={true} text="dirección" />
                    <div className="w-full gap-4 flex flex-col lg:flex-row">
                      <MyTextInput
                        inputclass="w-full"
                        label="Calle"
                        name="street"
                        type="text"
                        placeholder=""
                        value={initialValue.street}
                        onChange={(e) => handleChange(e)}
                      />
                      <MyTextInput
                        inputclass="w-full"
                        label="Localidad"
                        name="locality"
                        type="text"
                        placeholder=""
                        value={initialValue.locality}
                        onChange={(e) => handleChange(e)}
                      />
                    </div>
                    <div className="w-full gap-4 flex flex-col lg:flex-row">
                      <MySelectWhithSearch
                        label="Municipio"
                        name="municipalityValue"
                        displayValue={business.address?.municipality.name}
                        value={initialValue.municipalityValue}
                        onChange={handleChangeSelect}
                        dataFilter={municipalityOptions}
                      />

                      <MySelectWhithSearch
                        label="Provincia"
                        name="provinceValue"
                        displayValue={business.address?.province.name}
                        value={initialValue.provinceValue}
                        onChange={handleChangeSelect}
                        dataFilter={ProvinceOptions}
                      />
                    </div>
                    <MyTextarea
                      row={4}
                      areaclass="w-full"
                      label="Descripción"
                      name="descriptionArea"
                      type="text"
                      placeholder=""
                      value={initialValue.descriptionArea}
                      onChange={(e) => handleChange(e)}
                    />
                    <MySeparatorForm text="teléfonos" />

                    {phonesValues?.map((item, index) => (
                      <div
                        key={index}
                        className="flex  flex-col justify-end gap-2 items-end"
                      >
                        <MyButton
                          hiddenOnCondition={index === 0 ? false : true}
                          ClassColor="bg-primary"
                          text="Agregar"
                          customFunc={(e) => handleAddPhones(e, index)}
                        />
                        <div className="flex flex-wrap sm:flex-nowrap justify-end items-end w-full gap-4">
                          <div className="flex w-full gap-4">
                            <MyTextInput
                              id="phones"
                              onChange={(e) => handleChange(e, index)}
                              inputclass="w-full"
                              label="Número"
                              name="number"
                              type="number"
                              placeholder=""
                              value={item.number}
                              isValid={isValid}
                              show={show}
                              typeOnShow={typeOnShow}
                            />
                            <MyTextInput
                              id="phones"
                              onChange={(e) => handleChange(e, index)}
                              inputclass="w-full"
                              label="Descripción"
                              name="description"
                              type="text"
                              placeholder=""
                              value={item.description}
                            />
                          </div>

                          <MyButton
                            ClassColor="bg-secondary"
                            ClassName="hover:bg-secondary/90 h-10"
                            text="Eliminar"
                            customFunc={(e) => handleDelPhones(e, index)}
                          />
                        </div>
                      </div>
                    ))}

                    <MySeparatorForm text="correo" />

                    <MyTextInput
                      inputclass="w-full"
                      label="Correo electrónico"
                      name="email"
                      type="email"
                      id="email"
                      placeholder=""
                      typeOnShow={typeOnShow}
                      value={initialValue.email}
                      onChange={(e) => handleChange(e)}
                      loading={loading}
                      isValid={isValid}
                      show={show}
                    />
                    <MySeparatorForm text="redes sociales" />
                    {handleSocialNetworks.map((item, index) => (
                      <div key={index} className="">
                        <MyTextInput
                          onChange={(e) => handleChangeSocialN(e, index)}
                          inputclass="w-full"
                          label={item.type.toLowerCase()}
                          name={item.type}
                          type="text"
                          placeholder=""
                          value={item.user}
                        />
                      </div>
                    ))}
                  </div>

                  <MyFooterForm loading={loading} btnText="actualizar" />
                </div>
              </Form>
            </Formik>
          )}
        </div>
      </div>
    </main>
  );
}
