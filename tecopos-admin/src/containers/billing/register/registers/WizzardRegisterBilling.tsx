import StepsComponent from "../../../../components/misc/StepsComponent";
import { SubmitHandler } from "react-hook-form";
import { RegisterTypeStep } from "./RegisterTypeStep";
import { ClientDataStep } from "./ClientDataStep";
import { RegisterDetailsStep } from "./RegisterDetailsStep";
import { ProductsDetailsBillingStep } from "./ProductsDetailsBillingStep";
import { ShippingStep } from "./ShippingStep";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { useContext, useEffect, useState } from "react";
import { RegisterContext, RegisterContextInterface } from "../AllRegistersList";
import {
  OrderInterface,
  RegisterBillingInterface,
} from "../../../../interfaces/ServerInterfaces";
import { EditContextBilling } from "../registerDetailsTabs/RegisterDetailsTab";
import TabNav, { TabsAttr } from "../../../../components/navigation/TabNav";
import moment from "moment";
import Fetching from "../../../../components/misc/Fetching";

interface WizzardRegisterBillingInterface {
  editMode?: boolean;
  defaultValues?: RegisterBillingInterface | OrderInterface | null;
  close: Function;
}

export const WizzardRegisterBilling = ({
  editMode,
  defaultValues,
  close,
}: WizzardRegisterBillingInterface) => {
  const {
    watch,
    trigger,
    addNewBilling,
    addNewPreBilling,
    currentStep,
    setCurrentStep,
    editBilling,
    handleSubmit,
    reset,
    clearArrayOfProducts,
    setSubmit = () => {},
    setDetailsRegisterModal = () => {},
    openPayModal,
    setOpenPayModal,
    isFetching,
  } = useContext<Partial<RegisterContextInterface>>(RegisterContext);
  const {
    addedProductsArray,
    deletedProductsArray,
    setEditWizzard,
    setAddedProductsArray,
    setDeletedProductsArray,

  } = useContext(EditContextBilling);

  const [currentTab, setCurrentTab] = useState("clientDetails");
  const [updatePrice, setUpdatePrice] = useState<any>([]);

  const tabs: TabsAttr[] = [
    {
      name: "Datos del cliente",
      href: "clientDetails",
      current: currentTab === "clientDetails",
    },
    {
      name: "Detalles del registro",
      href: "registryDetails",
      current: currentTab === "registryDetails",
    },
    {
      name: "Detalles de productos",
      href: "productDetails",
      current: currentTab === "productDetails",
    },
  ];

  const stepsData: string[] = [
    "Datos del cliente",
    "Detalles del registro",
    "Detalles de productos",
  ];

  const isPreBilling = watch!("registerType") === "PRE-BILLING";

  // REGISTER MODE STEPS
  if (!editMode) {
    tabs.unshift({
      name: "Seleccionar tipo",
      href: "selectType",
      current: currentTab === "selectType",
    });
    !isPreBilling &&
      tabs.push({
        name: "Entrega",
        href: "delivery",
        current: currentTab === "delivery",
      });
  }
  // EDIT MODE STEPS
  if (editMode) {
    !defaultValues?.isPreReceipt &&
      tabs.push({
        name: "Entrega",
        href: "delivery",
        current: currentTab === "delivery",
      });
    defaultValues?.isPreReceipt && "Entrega" in tabs && tabs.pop();
  }

  // REGISTER MODE STEPS
  if (!editMode) {
    stepsData.unshift("Seleccionar tipo");
    !isPreBilling && stepsData.push("Entrega");
  }
  // EDIT MODE STEPS
  if (editMode) {
    !defaultValues?.isPreReceipt && stepsData.push("Entrega");
    defaultValues?.isPreReceipt && "Entrega" in stepsData && stepsData.pop();
  }

  const onSubmit: SubmitHandler<Record<string, any>> = async (open) => {
    const data = watch!();
    if (currentTab === "productDetails") {
      if (data?.products?.length === 0) {
        return toast.warn(
          "No puede realizar un registro sin agregar productos"
        );
      }
    }
    //if (!(await trigger!())) return;
    const productsNormalized = data?.products?.map(
      (product: any, idx: number) => ({
        productId: product?.product?.id,
        quantity: product?.quantity,
        observations: product.observations,
        // priceUnitary: {
        //   amount: product?.price?.price,
        //   codeCurrency: product?.price?.codeCurrency,
        // },
        priceUnitary:
          updatePrice.length > 0
            ? {
                amount: updatePrice[idx].amount,
                codeCurrency: updatePrice[idx].codeCurrency,
              }
            : {
                amount: product?.price?.price,
                codeCurrency: product?.price?.codeCurrency,
              },

        ...(product?.variationId && { variationId: product?.variationId }),
      })
    );
    let newRegister = {
      name: data?.name,
      products: productsNormalized,
      clientId: data?.clientId,
      managedById: data?.managedById,
      // registeredAt: data?.registeredAt,
      areaSalesId: data?.areaSalesId,
      customerNote: data?.customerNotes,
      observations:data?.observations,
      pickUpInStore: data?.shippingType === "pickUp" ? true : false,
      ...(data?.paymentDeadlineAt && {
        paymentDeadlineAt:
          (data?.timeLimit || "") !== "manual"
            ? moment(data?.paymentDeadlineAt).format("YYYY-MM-DD")
            : data?.paymentDeadlineAt ?? "",
      }),

      ...(data?.shippingType === "shipping" && { shipping: data?.shipping }),
      ...(data?.shippingType === "shipping" && { billing: data?.shipping }),
    };
    //==>> Edit Mode
    if (editMode) {
      newRegister = {
        name: data?.name,
        clientId: data?.clientId,
        managedById: data.salesBy,
        observations:data?.observations,
        // registeredAt: data?.registeredAt,
        areaSalesId: data?.areaSalesId,
        customerNote: data?.customerNotes,
        pickUpInStore: data?.shippingType === "pickUp" ? true : false,

        ...(data?.paymentDeadlineAt && {
          paymentDeadlineAt:
            data?.timeLimit !== "manual"
              ? moment(data?.paymentDeadlineAt).format("YYYY-MM-DD")
              : data?.paymentDeadlineAt,
        }),
        ...(data?.shippingType === "shipping" && { shipping: data?.shipping }),
        ...(data?.shippingType === "shipping" && { billing: data?.shipping }),
      };

      const sellProductInfo: any = [];
      data?.products?.map((item: any) => {
        const sellEdit = defaultValues?.selledProducts.find(
          (ele) => ele?.productId === item?.product?.productId
        );

        if (item.observations && item.observations !== sellEdit?.observations) {
          sellProductInfo.push({
            id: sellEdit?.id,
            observations: item.observations,
          });
        }
      });

      const comapreDate = defaultValues?.selledProducts.map((item) => item);
      let registerEdited = {
        ...newRegister,
        added: {
          products: addedProductsArray?.map((product: any) => {
            return {
              productId: product.product.id ?? product.product.productId,
              quantity: product?.quantity,
              observations: product?.observations,
              priceUnitary: {
                amount: product?.price?.price,
                codeCurrency: product?.price?.codeCurrency,
              },
              ...(product?.variationId && {
                variationId: product?.variationId,
              }),
            };
          }),
        },
        deleted: {
          products: deletedProductsArray?.map((product: any) => {
            return {
              selledProductId: product.productId,
              quantity: product?.quantity,
              ...(product?.variationId && {
                variationId: product?.variationId,
              }),
              priceUnitary: product?.priceUnitary,
              sellId:product.id
            };
          }),
        },
        sellProductInfo,
      };
      editBilling!(defaultValues?.id, registerEdited, (data: any) => {
        setEditWizzard &&
          setEditWizzard({ editMode: true, defaultValues: data });
        setDeletedProductsArray!([]);
        setAddedProductsArray!([]);
        clearArrayOfProducts!([]);
      });
      //!editMode && close();
    }

    //=>> Register Mode
    // pre-Billing
    if (!editMode && isPreBilling) {
      if (newRegister.products.length > 0) {
        setSubmit(true);
        await addNewPreBilling!(
          newRegister,
          () => {
            close();
            reset!();
            setCurrentStep!(0);
            clearArrayOfProducts!([]);
          },
          () => setSubmit(false)
        );
      } else {
        toast.warn(
          "Seleccione mínimo 1 producto para registrar la pre-factura"
        );
      }
    } else if (!editMode && !isPreBilling) {
      // billing
      setSubmit(true);
      await addNewBilling!(
        newRegister,
        (data: any) => {
          close();
          reset!();
          setCurrentStep!(0);
          clearArrayOfProducts!([]);
          //Abrir modal de pago directamente
          (open || openPayModal) &&
            setDetailsRegisterModal({ state: true, id: data });
        },
        () => {
          setSubmit(false);
        }
      );
    }
  };

  //Clear arrays with close component
  useEffect(() => {
    return () => {
      setAddedProductsArray && setAddedProductsArray!([]);
      setDeletedProductsArray && setDeletedProductsArray!([]);
    };
  }, []);
  return (
    <>
      {isFetching && <Fetching />}
      {editMode ? (
        <div>
          <TabNav action={(tab: string) => setCurrentTab(tab)} tabs={tabs} />
          <form onSubmit={handleSubmit!(onSubmit)}>
            {currentTab === "clientDetails" && <ClientDataStep />}
            {currentTab === "registryDetails" && <RegisterDetailsStep />}
            {currentTab === "productDetails" && (
              <ProductsDetailsBillingStep
                controlPrice={setUpdatePrice}
                onSubmitForm={onSubmit}
              />
            )}
            {!isPreBilling && currentTab === "delivery" && (
              <ShippingStep onSubmitForm={onSubmit} />
            )}
          </form>
        </div>
      ) : (
        <div>
          <StepsComponent current={currentStep!} titles={stepsData} />
          <form onSubmit={handleSubmit!(onSubmit)} className="">
            {currentStep === 0 && <RegisterTypeStep />}

            {/* Para no repetir peticiones de los input  */}
            <div className={`${currentStep === 1 ? "block" : "hidden"}`}>
              <ClientDataStep />
            </div>
            <div className={`${currentStep === 2 ? "block" : "hidden"}`}>
              <RegisterDetailsStep />
            </div>
            <div className={`${currentStep === 3 ? "block" : "hidden"}`}>
              <ProductsDetailsBillingStep
                controlPrice={setUpdatePrice}
                onSubmitForm={onSubmit}
              />
            </div>
            <div className={`${currentStep === 4 ? "block" : "hidden"}`}>
              <ShippingStep onSubmitForm={onSubmit} />
            </div>

            {/* {currentStep === 1 && <ClientDataStep />}
            {currentStep === 2 && <RegisterDetailsStep />}
            {currentStep === 3 && (
              <ProductsDetailsBillingStep controlPrice={setUpdatePrice} />
            )}
            {!isPreBilling && currentStep === 4 && <ShippingStep />} */}
          </form>
        </div>
      )}
    </>
  );
};
