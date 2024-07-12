import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  selectFormValues,
  resetForm,
} from "../../store/formModalValuesSelectProductSlice";
import {
  onProductImage,
  selectImagesIsLoading,
  selectProductImage,
} from "../../store/imagesSlice";
import {
  contentModalReadyForSale,
  defaultContentModalProducts,
  stepsNewProduct,
} from "../../utils/dummy";
import useLoadData from "../../hooks/useLoadData";
import MySteps from "../commos/MySteps";
import MyNewProductSelectModal from "./MyNewProductSelectModal";
import MyNewProductForm from "./MyNewProductForm";
import { toast } from "react-toastify";
import MyModalButton from "../commos/MyModalButton";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useServer } from "../../hooks";
import { faClose, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { selectNomenclator } from "../../store/nomenclatorSlice";
import { getNewProductTittle, isReadyForSale } from "../../utils/functions";

const NewProductModal = ({ newProduct, isLoading, show, setShow }) => {
  const dispatch = useAppDispatch();
  const {business} = useAppSelector(state=>state.init);
  const free = business?.subscriptionPlan.code === "FREE";
  const [modalState, setModalState] = useState({
    show: show,
    valuesValidates: {
      isValid: true,
      values: {
        name: {
          isValid: true,
          textError: "",
        },
        price: {
          isValid: true,
          textError: "",
        },
        areasProcesado: {
          isValid: true,
          textError: "",
        },
      },
    },
    globalSteps: [{ name: "", status: "current" }],
    activeStepModal: free ? "Detalles" : "",
    formSteps: free ? stepsNewProduct.slice(0, 3) : [],
    typeProduct: null,
    countSteps: 1,
    formCountSteps: 1,
    actualCode: null,
    avaliableForModal: "",
    contentModal: [],
    onFocus: null,
    titleColor: { color: "", name: "" },
    stockTypeForMultiple: "",
    areas: [],
    licence: "",
  });

  const { areas } = useAppSelector(selectNomenclator);
  const formValues = useAppSelector(selectFormValues);
  const imageProduct = useAppSelector(selectProductImage);
  //const { error, isLoading, newProduct, newProductLocally } = useServer({ startLoading: false });
  const imageLoading = useAppSelector(selectImagesIsLoading);
  const type = modalState.activeStepModal;
  const globalSteps = modalState.globalSteps;

  useEffect(() => {
    setLicence(business?.subscriptionPlan.code);
    setAreas(areas?.filter((item) => item.type === "MANUFACTURER") ?? []);
  }, [modalState.show]);


  useLoadData();
  const setAreas = (areas) => {
    setModalState({
      ...modalState,
      areas: areas,
    });
  };

  const isLastStep = () => {
    const last = globalSteps[globalSteps.length - 1];
    if (!free) {
      if (
        globalSteps.length > 2 &&
        last.status === "current" &&
        last.name !== "" &&
        last.name !== "READYFORSALE"
      ) {
        return true;
      } else {
        return false;
      }
    } else if (modalState.formSteps.length === modalState.countSteps) {
      return true;
    } else {
      return false;
    }
  };

  const setLicence = (licence) => {
    setModalState({
      ...modalState,
      licence: licence,
    });
  };

  const renderTitle = () => {
    const value = modalState.activeStepModal;

    switch (value) {
      case "":
        return <p>Seleccione un tipo de producto</p>;
      case "READYFORSALE":
        return <p>Seleccione un formato</p>;
      default:
        return (
          <p>
            Crear {getNewProductTittle(free ? "MENU" : modalState.typeProduct)}{" "}
          </p>
        );
    }
  };

  const renderContent = () => {
    const activeStep = free ? "GODEFAULT" : modalState.activeStepModal;
    let content;

    switch (activeStep) {
      case "":
        content = getContentTypeModal("");
        return (
          <MyNewProductSelectModal
            handleOptionsProducts={handleOptionsProducts}
            content={content}
            onFocus={modalState?.onFocus}
          />
        );
      case "READYFORSALE":
        content = getContentTypeModal("READYFORSALE");
        return (
          <MyNewProductSelectModal
            handleOptionsProducts={handleOptionsProducts}
            content={content}
            onFocus={modalState?.onFocus}
          />
        );
      default:
        return (
          <MyNewProductForm
            formSteps={modalState.formSteps}
            activeStepModal={free ? "MENU" : modalState.activeStepModal}
            validates={modalState.valuesValidates}
          />
        );
    }
  };

  const getContentTypeModal = (activeStep) => {
    let contentModal = [];
    let avaliableContent =
      business?.configurationsKey.find((item) => item.key === "type_products").value.split(",") ?? [];

    if (activeStep === "READYFORSALE") {
      contentModalReadyForSale.map((item) =>
        avaliableContent.map(
          (aval) => item.code === aval && contentModal.push(item)
        )
      );
    } else {
      avaliableContent.push("READYFORSALE");
      defaultContentModalProducts.map((item) =>
        avaliableContent.map(
          (aval) => item.code === aval && contentModal.push(item)
        )
      );
    }

    return contentModal;
  };

  const handleOptionsProducts = (option) => {
    let onFocus, actualCode, titleColor, formSteps;

    if (modalState.onFocus === option.name) {
      onFocus = null;
      actualCode = null;
    } else {
      onFocus = option.name;
      actualCode = option.code;
    }

    titleColor = {
      color: option.color,
      name: option.name,
    };

    modalState.actualCode === "SERVICE" && modalState.areas.length !== 0
      ? modalState.licence !== "FREE" &&
        (modalState.formSteps = stepsNewProduct)
      : (formSteps = stepsNewProduct.slice(0, 3));

    if (
      actualCode === "STOCK" ||
      actualCode === "COMBO" ||
      actualCode === "VARIATION"
    ) {
      formSteps = stepsNewProduct.slice(0, 3);
    }

    if (actualCode === "ADDON") {
      formSteps = stepsNewProduct;
    }

    if (actualCode === "MENU") {
      modalState.licence !== "FREE"
        ? (formSteps = stepsNewProduct)
        : (formSteps = stepsNewProduct.slice(0, 3));
    }
    if (
      actualCode === "RAW" ||
      actualCode === "MANUFACTURED" ||
      actualCode === "WASTE" ||
      actualCode === "ASSET"
    ) {
      formSteps = stepsNewProduct.slice(0, 2);
    }

    setModalState({
      ...modalState,
      onFocus: onFocus,
      actualCode: actualCode,
      formSteps: formSteps,
      titleColor: titleColor,
    });
  };

  const handleClosedModal = () => {
    setShow(false);

    setModalState({
      show: false,
      activeStepModal: free ? "Detalles" : "",
      formSteps: free ? stepsNewProduct.slice(0, 3) : [],
      avaliableForModal: "",
      contentModal: [],
      onFocus: null,
      actualCode: null,
      titleColor: { color: "", name: "" },
      globalSteps: [{ name: "", status: "current" }],
      valuesValidates: {
        isValid: true,
        values: {
          name: {
            isValid: true,
            textError: "",
          },
          price: {
            isValid: true,
            textError: "",
          },
          areasProcesado: {
            isValid: true,
            textError: "",
          },
        },
      },
      countSteps: 1,
      stockTypeForMultiple: "",
      areas: [],
      licence: "",
    });
  };

  const handleClose = () => {
    dispatch(onProductImage());
    handleClosedModal();
    dispatch(resetForm());
  };

  const handleBack = () => {
    let globalSteps = [...modalState.globalSteps];
    let formSteps = [...modalState.formSteps];
    let actualCode = modalState.actualCode;
    let activeStep = modalState.actualCode;
    const index = (item) => item.status === "current";
    const indexStep = globalSteps.findIndex(index);
    const previous = globalSteps[indexStep - 1];
    const current = globalSteps[indexStep];
    if (!free) {
      if (previous.name === "READYFORSALE") {
        globalSteps[indexStep - 1] = {
          name: globalSteps[indexStep - 1].name,
          status: "current",
        };
        globalSteps = globalSteps.slice(0, indexStep);
        actualCode = modalState.typeProduct;
        activeStep = previous.name;
      } else if (previous.name === "") {
        globalSteps[indexStep - 1] = {
          name: globalSteps[indexStep - 1].name,
          status: "current",
        };
        if (current.name === "READYFORSALE") {
          actualCode = "READYFORSALE";
        } else {
          actualCode = modalState.typeProduct;
        }
        globalSteps = globalSteps.slice(0, indexStep);
        activeStep = previous.name;
      } else {
        globalSteps[indexStep] = {
          name: globalSteps[indexStep].name,
          status: "upcoming",
        };

        globalSteps[indexStep - 1] = {
          name: globalSteps[indexStep - 1].name,
          status: "current",
        };

        const indexForm = (item) => item.name === "Detalles";
        const indexStepForm = globalSteps.findIndex(indexForm);
        formSteps = globalSteps.slice(indexStepForm);
      }

      setModalState({
        ...modalState,
        activeStepModal: activeStep,
        actualCode: actualCode,
        valuesValidates: {
          isValid: true,
          values: {
            name: {
              isValid: true,
              textError: "",
            },
            price: {
              isValid: true,
              textError: "",
            },
            areasProcesado: {
              isValid: true,
              textError: "",
            },
          },
        },
        stockTypeForMultiple: modalState.activeStepsModal,
        globalSteps: globalSteps,
        formSteps: formSteps,
        countSteps: modalState.countSteps - 1,
      });
    } else {
      const index = (item) => item.status === "current";
      const indexStep = formSteps.findIndex(index);

      formSteps[indexStep] = {
        name: formSteps[indexStep].name,
        status: "upcoming",
      };

      formSteps[indexStep - 1] = {
        name: formSteps[indexStep - 1].name,
        status: "current",
      };

      setModalState({
        ...modalState,
        formSteps: formSteps,
        valuesValidates: {
          isValid: true,
          values: {
            name: {
              isValid: true,
              textError: "",
            },
            price: {
              isValid: true,
              textError: "",
            },
            areasProcesado: {
              isValid: true,
              textError: "",
            },
          },
        },
        countSteps: modalState.countSteps - 1,
      });
    }
  };

  const handlePrev = () => {
    handleBack();
    /* 
          if (formSteps.length > 0 && formSteps[0].status !== "complete") {
               handleBack();
               handleCountSteps("sub", false);
           } else {
           //dispatch(resetForm());
           //dispatch(onProductImage());
        */
  };

  const handleNext = () => {
    const actualCode = modalState.actualCode;
    let globalSteps = [...modalState.globalSteps];
    let formSteps = [...modalState.formSteps];
    let typeProduct = modalState.typeProduct;

    if (actualCode && !free) {
      if (actualCode === "READYFORSALE") {
        globalSteps[0] = {
          name: "",
          status: "complete",
        };

        globalSteps.push({
          name: "READYFORSALE",
          status: "current",
        });
      } else if (modalState.formSteps.length) {
        if (
          modalState.activeStepModal === "READYFORSALE" ||
          modalState.activeStepModal === ""
        ) {
          globalSteps = globalSteps.concat(modalState.formSteps);
        }
        const index = (item) => item.status === "current";
        const indexStep = globalSteps.findIndex(index);

        globalSteps[indexStep] = {
          name: globalSteps[indexStep].name,
          status: "complete",
        };

        globalSteps[indexStep + 1] = {
          name: globalSteps[indexStep + 1].name,
          status: "current",
        };

        const indexForm = (item) => item.name === "Detalles";
        const indexStepForm = globalSteps.findIndex(indexForm);
        formSteps = globalSteps.slice(indexStepForm);
        typeProduct = actualCode;
      }

      setModalState({
        ...modalState,
        activeStepModal: modalState.actualCode,
        stockTypeForMultiple: modalState.activeStepsModal,
        globalSteps: globalSteps,
        formSteps: formSteps,
        typeProduct: typeProduct,
        countSteps: modalState.countSteps + 1,
      });
    } else if (free) {
      const index = (item) => item.status === "current";
      const indexStep = formSteps.findIndex(index);

      formSteps[indexStep] = {
        name: formSteps[indexStep].name,
        status: "complete",
      };

      formSteps[indexStep + 1] = {
        name: formSteps[indexStep + 1].name,
        status: "current",
      };
      setModalState({
        ...modalState,
        formSteps: formSteps,
        countSteps: modalState.countSteps + 1,
      });
    }
  };

  const handleNextModal = () => {
    const validate =
      modalState.activeStepModal !== "READYFORSALE" &&
      modalState.activeStepModal !== "";

    const valid = validates();
    const pass = validate ? valid : true;
    if (pass) {
      handleNext();
    }
  };

  const validates = () => {
    const activeSteps = modalState.formSteps;
    const index = (item) => item.status === "current";
    const indexStep = activeSteps.findIndex(index);
    const step = activeSteps[indexStep].name.toLowerCase().trim();
    let isValid = true;

    let validateValue = {
      name: {
        isValid: true,
        textError: "",
      },
      price: {
        isValid: true,
        textError: "",
      },
      areasProcesado: {
        isValid: true,
        textError: "",
      },
    };

    switch (step) {
      case "detalles": {
        if (formValues.name === "") {
          validateValue.name = {
            isValid: false,
            textError: "Debe definir un nombre.",
          };
          isValid = false;
        }
        break;
      }

      case "precio": {
        if (formValues.price === "") {
          isValid = false;
          validateValue.price.isValid = false;
          validateValue.price.textError = "Debe establecer un precio.";
        }
        break;
      }

      case "área de procesado": {
        if (
          (activeSteps === "MENU" || activeSteps === "ADDON") &&
          formValues.areas.leng === []
        ) {
          isValid = false;
          validateValue.areasProcesado.isValid = false;
          validateValue.areasProcesado.textError =
            "Debe seleccionar al menos un área de procesado.";
        }
        break;
      }

      default:
        break;
    }

    setModalState({
      ...modalState,
      valuesValidates: {
        isValid: isValid,
        values: validateValue,
      },
    });

    return isValid;
  };

  const handleSubmit = () => {
    const isReadyFS = isReadyForSale(modalState.typeProduct);
    const typeProduct = modalState.typeProduct;
    const isValid = validates();

    if (isValid) {
      let toValidate = {
        name: formValues.name,
        description: formValues?.description,
        type: free ? "MENU" : typeProduct,
      };
      if (!free) {
        if (isReadyFS) {
          if (typeProduct === "STOCK" && formValues?.productCategoryId) {
            toValidate = {
              ...toValidate,
              productCategoryId: formValues.productCategoryId,
            };
          }

          formValues?.salesCategoryId &&
            (toValidate = {
              ...toValidate,
              salesCategoryId: formValues.salesCategoryId,
            });

          formValues?.price &&
            (toValidate = {
              ...toValidate,
              price: formValues.price,
            });

          formValues?.measure &&
            (toValidate = {
              ...toValidate,
              measure: formValues?.measure,
            });

          if (
            (typeProduct === "MENU" && !free) ||
            typeProduct === "SERVICE" ||
            typeProduct === "ADDON"
          ) {
            toValidate = {
              ...toValidate,
              listProductionAreas: formValues.areas.map((item) => Number(item)),
            };
          }
        } else {
          if (formValues?.measure && typeProduct !== "ASSET") {
            toValidate = {
              ...toValidate,
              measure: formValues?.measure,
            };
          }

          if (formValues?.productCategoryId) {
            toValidate = {
              ...toValidate,
              productCategoryId: formValues.productCategoryId,
            };
          }
        }

        if (imageProduct.id !== undefined) {
          toValidate = { ...toValidate, images: [imageProduct.id] };
        }
      } else {
        if (formValues?.salesCategoryId) {
          toValidate = {
            ...toValidate,
            salesCategoryId: formValues.salesCategoryId,
            price: formValues.price,
          };
        }
      }

      newProduct(toValidate, handleClose);
    }
  };

  const isLast = isLastStep();
  const loading = isLoading || imageLoading;

  return (
    <div
      className={`${
        show ? "fixed" : "hidden"
      } bg-gray-500/75 flex justify-center p-4 sm:p-6 items-center fixed w-full h-full top-0 left-0 z-50 select-none`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col overflow-y-auto
         bg-white rounded-md w-full sm:w-4/5 lg:w-3/5 max-h-full"
      >
        <div className="sticky gap-4 shadow-md top-0 flex flex-wrap z-50 justify-between bg-white w-full p-4">
          <FontAwesomeIcon
            onClick={() => handleClose()}
            className="text-gray-500/75 bg-white self-start z-50 absolute top-2 right-2 w-4 h-4 p-1 rounded-full hover:rotate-90 duration-150 cursor-pointer"
            icon={faClose}
          />
          <div
            className={`${
              modalState.titleColor.name === modalState.onFocus
                ? `${modalState.titleColor.color}`
                : "bg-slate-500/80"
            } flex overflow-y-scroll justify-between h-fit w-fit px-2 py-1 rounded-md text-white text-xl font-semibold`}
          >
            {renderTitle()}
          </div>
          {type !== "" && type !== "READYFORSALE" && (
            <MySteps
              classNameBody="pr-0 md:pr-7"
              formSteps={modalState.formSteps}
            />
          )}
        </div>

        {renderContent()}

        <div className="sticky bottom-0 bg-white shadow-md-top p-4 flex w-full justify-between self-end">
          <MyModalButton
            text="Atrás"
            onClick={() => handlePrev()}
            disabled={
              modalState.activeStepModal === "" ||
              (free &&
                modalState.activeStepModal === "MENU" &&
                modalState.countSteps === 1)
            }
            className={`${
              modalState.activeStepModal === "" ||
              (free &&
                modalState.activeStepModal === "MENU" &&
                modalState.countSteps === 1)
                ? "opacity-0"
                : "opacity-100 duration-150"
            }   focus:ring-slate-500/80 border-slate-500/80 text-gray-900`}
          />
          <div className="flex gap-4">
            <MyModalButton
              loading={loading || isLast}
              disabled={loading}
              icon={loading && faSpinner}
              className="bg-orange-500 focus:ring-orange-500 border-transparent text-white"
              text={!isLast ? "Siguiente" : "Finalizar"}
              onClick={() => (!isLast ? handleNextModal() : handleSubmit())}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewProductModal;
