import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { faClose, faSpinner } from "@fortawesome/free-solid-svg-icons";
import {
  handleBack,
  handleClosedModal,
  handleCountSteps,
  handleNext,
  handleNextStepsForm,
  handlePrevStepsForm,
  selectModalStates,
  setAreas,
  setLicence,
} from "../../store/modalProductSlice";
import { selectUserSession } from "../../store/userSessionSlice";
import MySteps from "../commos/MySteps";
import MyNewProductSelectModal from "./MyNewProductSelectModal";
import MyNewProductForm from "./MyNewProductForm";
import { toast } from "react-toastify";
import {
  selectFormValues,
  resetForm,
} from "../../store/formModalValuesSelectProductSlice";
import { onProductImage, selectProductImage } from "../../store/imagesSlice";
import MyModalButton from "../commos/MyModalButton";
import { useServer } from "../../hooks";
import { selectNomenclator } from "../../store/nomenclatorSlice";
import useLoadData from "../../hooks/useLoadData";
import { useAppSelector } from "../../store/hooks";

const MyNewProductModal = ({ newProductLocally }) => {
  const dispatch = useDispatch();
  const modalStates = useSelector(selectModalStates);
  const { areas } = useAppSelector((state) => state.init);
  const formValues = useSelector(selectFormValues);
  const imageProduct = useSelector(selectProductImage);
  const {business} = useAppSelector(state=>state.init);
  const free = business.subscriptionPlan.code !== "FREE";
  const { error, isLoading, newProduct } = useServer({
    startLoading: false,
  });
  const steps = modalStates.actualSteps;

  useEffect(() => {
    dispatch(setLicence(business.subscriptionPlan.code));
    dispatch(
      setAreas(areas?.filter((item) => item.type === "MANUFACTURER") ?? [])
    );
  }, [modalStates.show]);

  useLoadData();

  const type = modalStates.activeStepModal;

  const renderTitle = () => {
    switch (type) {
      case "":
        return <p>Seleccione un tipo de producto</p>;
      case "READYFORSALE":
        return <p>Seleccione un formato</p>;
      case "STOCK":
      default:
        return <p>Nuevo Producto</p>;
    }
  };

  const renderContent = () => {
    switch (type) {
      case "":
      case "READYFORSALE":
        return free && <MyNewProductSelectModal />;
      default:
        return <MyNewProductForm />;
    }
  };

  const validates = () => {
    const activeSteps = modalStates.actualSteps;
    const productType = modalStates.stockTypeForMultiple;
    const index = (item) => item.status === "current";
    const indexStep = activeSteps.findIndex(index);
    const types = activeSteps[indexStep].name.toLowerCase().trim();
    switch (types) {
      case "detalles": {
        if (formValues.name === "") {
          toast.warning("Debe definir un nombre para su producto.");
          return false;
        }
        if (
          productType === "READYFORSALE" &&
          activeSteps === "VARIATION" &&
          activeSteps === "STOCK" &&
          (formValues.productCategoryId === "" ||
            formValues.productCategoryId === null ||
            formValues.productCategoryId === undefined)
        ) {
          toast.warning("Debe seleccionar una categoría general.");
          return false;
        }
        if (
          productType === "READYFORSALE" &&
          (formValues.salesCategoryId === "" ||
            formValues.salesCategoryId === null ||
            formValues.salesCategoryId === undefined)
        ) {
          toast.warning("Debe seleccionar una categoría de venta.");
          return false;
        }
        break;
      }
      case "precio": {
        if (formValues.price === "") {
          toast.warning("Debe establecer un precio.");
          return false;
        }
        break;
      }
      case "área de procesado": {
        if (activeSteps === "MENU" && formValues.areas.leng === []) {
          toast.warning("Debe seleccionar al menos un área de procesado.");
          return false;
        }
        break;
      }

      default:
        break;
    }
    return true;
  };

  const handleClose = () => {
    dispatch(onProductImage());
    dispatch(handleClosedModal());
    dispatch(resetForm());
  };

  const handlePrev = () => {
    if (type === "" || type === "READYFORSALE") dispatch(handleBack());
    else {
      if (steps.length > 0 && steps[0].status !== "complete") {
        dispatch(handleBack());
        dispatch(handleCountSteps());
        dispatch(onProductImage());
        dispatch(resetForm());
      } else {
        dispatch(handlePrevStepsForm());
        dispatch(handleCountSteps("sub"));
      }
    }
  };

  const handleNextModal = () => {
    if (type === "" || type === "READYFORSALE") {
      dispatch(handleNext());
    } else if (validates() && steps.length > 0) {
      dispatch(handleNextStepsForm());
      steps.length === modalStates.countSteps
        ? dispatch(handleCountSteps())
        : dispatch(handleCountSteps("add"));
    }
  };

  const handleSubmit = () => {
    let toValidate = {
      name: formValues.name,
      description: formValues.description,
      stockType: modalStates.activeStepModal,
    };
    if (formValues.measure !== undefined) {
      toValidate = { ...toValidate, measure: formValues.measure };
    }
    if (imageProduct.id !== undefined) {
      toValidate = { ...toValidate, images: [imageProduct.id] };
    }
    formValues.productCategoryId &&
      (toValidate = {
        ...toValidate,
        productCategoryId: formValues.productCategoryId,
      });
    if (modalStates.stockTypeForMultiple !== "READYFORSALE") {
      toValidate = {
        ...toValidate,
        type: "STOCK",
      };
    }
    if (modalStates.stockTypeForMultiple === "READYFORSALE") {
      toValidate = {
        ...toValidate,
        stockType: modalStates.stockTypeForMultiple,
        type: modalStates.actualCode,
        salesCategoryId: formValues.salesCategoryId,
        prices: [
          {
            codeCurrency: formValues.codeCurrency,
            price: formValues.price,
            systemPriceId: business.priceSystems.find((item) => item.isMain).id,
          },
        ],
        measure: "UNIT",
      };
    }
    if (
      (modalStates.actualCode === "MENU" && free) ||
      modalStates.actualCode === "SERVICE"
    ) {
      toValidate = {
        ...toValidate,
        listProductionAreas: formValues.areas.map((item) => Number(item)),
      };
    }
    newProduct(toValidate, (product) => {
      toast.success("El producto fue creado satisfactoriamente.");
      newProductLocally(product);
      handleClose();
    });
  };

  useEffect(() => {
    error !== "" && error !== undefined && toast.error(`${error}`);
  }, [error]);

  return (
    <div
      className={`${
        modalStates.show ? "fixed" : "hidden"
      } bg-gray-500/75 flex justify-center p-4 sm:p-6 items-center fixed w-full h-full top-0 left-0 z-30 select-none`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col overflow-y-auto
         bg-white rounded-md w-full sm:w-4/5 lg:w-3/5 max-h-full"
      >
        <div className="sticky gap-4 shadow-md top-0 flex flex-wrap z-50 justify-between bg-white w-full p-4">
          <FontAwesomeIcon
            onClick={() => handleClose()}
            className="text-gray-500/75 bg-white self-start z-30 absolute top-2 right-2 w-4 h-4 p-1 rounded-full hover:rotate-90 duration-150 cursor-pointer"
            icon={faClose}
          />
          <div
            className={`${
              modalStates.titleColor.name === modalStates.onFocus
                ? `${modalStates.titleColor.color}`
                : "bg-slate-500/80"
            } flex overflow-y-scroll justify-between h-fit w-fit px-2 py-1 rounded-md text-white text-xl font-semibold`}
          >
            {renderTitle()}
          </div>
          {type !== "" && type !== "READYFORSALE" && (
            <MySteps classNameBody="pr-0 md:pr-7" />
          )}
        </div>
        {renderContent()}
        <div className="sticky bottom-0 bg-white shadow-md-top p-4 flex w-full justify-between self-end">
          <MyModalButton
            text="Atrás"
            onClick={() => handlePrev()}
            disabled={
              modalStates.activeStepModal === "" ||
              (!free &&
                modalStates.activeStepModal === "MENU" &&
                modalStates.countSteps === 1)
            }
            className={`${
              modalStates.activeStepModal === "" ||
              (!free &&
                modalStates.activeStepModal === "MENU" &&
                modalStates.countSteps === 1)
                ? "opacity-0"
                : "opacity-100 duration-150"
            }   focus:ring-slate-500/80 border-slate-500/80 text-gray-900`}
          />
          <div className="flex gap-4">
            <MyModalButton
              disabled={
                modalStates.activeStepModal === "MENU" &&
                modalStates.countSteps === 4 &&
                formValues.areas.length === 0
              }
              loading={steps.length === modalStates.countSteps && isLoading}
              icon={steps.length === modalStates.countSteps && faSpinner}
              className="bg-orange-500 focus:ring-orange-500 border-transparent text-white"
              text={
                steps.length !== modalStates.countSteps
                  ? "Siguiente"
                  : "Finalizar"
              }
              onClick={() =>
                steps.length !== modalStates.countSteps
                  ? handleNextModal()
                  : validates() && handleSubmit()
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyNewProductModal;
