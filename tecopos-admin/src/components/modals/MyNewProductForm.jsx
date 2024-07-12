import { Form, Formik } from "formik";
import React from "react";
import { useAppSelector } from "../../store/hooks";
import {
  MyTextInput,
  MyTextarea,
  MySelectWhithSearch,
  MySelectInput,
  MySelectCurrency,
  MyChecked,
  MyNoneItems,
} from "../";
import { useControlInputs, useDropImage } from "../../hooks/index";
import {
  selectFormValues,
  setFormValues,
  addAreas,
  removeAreas,
} from "../../store/formModalValuesSelectProductSlice";
import {
  selectImagesIsLoading,
  selectProductImage,
} from "../../store/imagesSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImages } from "@fortawesome/free-solid-svg-icons";
import { selectUserSession } from "../../store/userSessionSlice";
import { selectProduct } from "../../store/productSlice";
import { isReadyForSale } from "../../utils/functions";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const MyNewProductForm = ({ formSteps, activeStepModal, validates }) => {
  const formValues = useAppSelector(selectFormValues);
  const productImage = useAppSelector(selectProductImage);
  const loading = useAppSelector(selectImagesIsLoading);
  const product = useAppSelector(selectProduct);
  const { productCategories, salesCategories, areas, business } =
    useAppSelector((state) => state.init);


  const manufacturerAreas =
    areas?.filter((item) => item.type === "MANUFACTURER") ?? [];
  const { getRootProps, getInputProps, toastOnError } = useDropImage({
    multiple: false,
    maxSize: 250,
    type: "productImage",
  });
  const { handleChange, handleChangeSelect } = useControlInputs({
    global: true,
    reducer: setFormValues,
    toFind: [
      { productCategoryId: productCategories },
      { salesCategoryId: salesCategories },
    ],
  });

  const renderBody = () => {
    const index = (item) => item.status === "current";
    const activeSteps = formSteps;
    const indexStep = activeSteps.findIndex(index);
    const types = activeSteps[indexStep].name.toLowerCase().trim();
    const isReadyForSales = isReadyForSale(activeStepModal);
    const STOCK = activeStepModal === "STOCK";

    switch (types) {
      case "detalles":
        return (
          <div className="flex flex-col gap-4 min-h-[250px]">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <MyTextInput
                type="text"
                inputclass="w-full"
                isValid={validates.values.name.isValid}
                textError={validates.values.name.textError}
                name="name"
                label="Nombre (*)"
                value={formValues.name}
                onChange={handleChange}
              />
              {(STOCK || !isReadyForSales) && (
                <MySelectWhithSearch
                  name="productCategoryId"
                  dataFilter={productCategories}
                  label="Categoría de almacén"
                  value={formValues.productCategoryId}
                  onChange={handleChangeSelect}
                />
              )}
            </div>
            {isReadyForSales && (
              <MySelectWhithSearch
                name="salesCategoryId"
                dataFilter={salesCategories}
                label="Categoría general de venta"
                value={formValues.salesCategoryId}
                onChange={handleChangeSelect}
              />
            )}
            {!isReadyForSales && activeStepModal !== "ASSET" && (
              <MySelectInput
                name="measure"
                options={product.allMeasure}
                label="Unidad de medida"
                value={formValues.measure}
                onChange={handleChange}
              />
            )}
            <MyTextarea
              name="description"
              value={formValues.description}
              onChange={handleChange}
              label="Descripción"
            />
          </div>
        );
      case "imagen":
        return (
          <div className="flex items-center justify-center w-full h-full relative">
            <span className="hidden">{toastOnError()}</span>
            <div
              className={`${
                productImage.length === 0 ? "" : "absolute cursor-pointer"
              } flex w-full h-full z-50 items-center justify-center`}
              {...getRootProps()}
            >
              {productImage.length === 0 &&
                (!loading ? (
                  <div className="flex items-center flex-col justify-center cursor-pointer border-dashed border border-primary rounded-lg w-full h-40">
                    <input {...getInputProps()} />
                    <FontAwesomeIcon
                      className="h-10 w-10 text-primary"
                      icon={faImages}
                    />
                    <div className="text-center text-gray-500">
                      <h4>Sube un archivo, o arrástrelo hasta aquí</h4>{" "}
                      <p className="text-primary opacity-90">
                        JPG, PNG, JPGE hasta 400 Kb
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center mt-5">
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="h-10 w-10 animate-spin text-orange-500"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium text-gray-500 mt-3">
                      Cargando imagen...
                    </h3>
                  </div>
                ))}
            </div>
            {productImage.length !== 0 && (
              <div className="overflow-hidden flex items-center justify-center min-w-[200px] max-w-[450px] min-h-[200px] max-h-[450px]">
                <img
                  className="object-cover rounded-md"
                  src={productImage.src}
                  alt={productImage.id}
                />
              </div>
            )}
          </div>
        );
      case "precio":
        return (
          <div className="min-h-[100px] flex flex-col">
            <div className="mt-1 relative rounded-md">
              <MyTextInput
                inputclass="w-full"
                label="Precio *"
                name="price"
                isValid={validates.values.price.isValid}
                textError={validates.values.price.textError}
                type="number"
                placeholder="$"
                onChange={handleChange}
                value={formValues.price}
              />
              <MySelectCurrency
                className="top-[34px] h-1/2"
                name="codeCurrency"
                onChange={handleChange}
                value={formValues.codeCurrency}
              >
                {business.availableCurrencies.map((item, index) => (
                  <option name="codeCurrency" key={index} value={item.code}>
                    {item.code}
                  </option>
                ))}
              </MySelectCurrency>
            </div>
          </div>
        );
      case "área de procesado":
        return (
          <div className="w-full h-full flex flex-col justify-start items-start gap-8">
            {manufacturerAreas.length !== 0 ? (
              <h3 className="font-semibold">
                Seleccione al menos un área donde puede ser procesado el
                producto
              </h3>
            ) : (
              <MyNoneItems
                title="No tiene áreas de Procesados disponibles"
                subtitle="Por favor adicione una
              primero antes de crear el producto"
              />
            )}

            <div className="flex gap-6 items-start flex-wrap">
              {manufacturerAreas.map((item, index) => (
                <div key={index} className="">
                  <MyChecked
                    label={item.name}
                    name="areas"
                    value={item.id}
                    reducerAdd={addAreas}
                    reducerRemove={removeAreas}
                    booleanToCheckInArr={formValues.areas}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      default:
        break;
    }
  };

  return (
    <Formik>
      <Form className="flex flex-col w-full h-full p-6 gap-4">
        {renderBody()}
      </Form>
    </Formik>
  );
};

export default MyNewProductForm;
