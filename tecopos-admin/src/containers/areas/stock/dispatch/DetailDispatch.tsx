import React, { useEffect, useState } from "react";
import GenericList from "../../../../components/misc/GenericList";
import useServerArea from "../../../../api/useServerArea";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import SpinnerLoading from "../../../../components/misc/SpinnerLoading";
import { CheckIcon, NoSymbolIcon } from "@heroicons/react/24/outline";
import LoadingSpin from "../../../../components/misc/LoadingSpin";
import { translateMeasure } from "../../../../utils/translate";
import { formatCalendar } from "../../../../utils/helpers";
import reportDowloadHandler from "../../../../reports/helpers/reportDownloadHandler";
import { useAppSelector } from "../../../../store/hooks";
import { FaRegFilePdf } from "react-icons/fa";
import { printPriceWithCommasAndPeriods } from "../../../../utils/functions";
import useServer from "../../../../api/useServerMain";
import MultipleActBtn, {
  BtnActions,
} from "../../../../components/misc/MultipleActBtn";
import { TbTransform } from "react-icons/tb";
import { DispatchStatus } from "../../../../interfaces/ServerInterfaces";
import Modal from "../../../../components/misc/GenericModal";
import TransformToBill from "./TransformToBill";

interface DetailProps {
  id: number | null;
  response?: (
    id: number,
    response: DispatchStatus,
    payload?: Record<string, any>
  ) => void;
  loading?: boolean;
}

const DetailDispatch = ({ id, response, loading }: DetailProps) => {
  const { allowRoles } = useServer();
  const { getDispatch, despacho, isLoading } = useServerArea();
  const { business } = useAppSelector((state) => state.init);
  const [respState, setRespState] = useState<DispatchStatus | null>(null);
  const [transform, setTransform] = useState(false);

  useEffect(() => {
    getDispatch(id!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Data for List DispatchReport ---------------------------------------------------------------------------------
  const productData: DataTableInterface[] = [];
  const products: {
    id: number;
    name: string;
    measure: string;
    quantity: number;
    variations: { id: number; name: string; quantity: number }[];
    product: {
      enableGroup: null | boolean;
      groupConvertion: number | null;
      groupName: null | string;
      id: number;
      name: string;
    };
    price: {
      amount: number;
      codeCurrency: string;
    };
  }[] = [];
  despacho?.products.forEach((prod: any) => {
    const idx = products.findIndex((elem) => elem.id === prod.productId);
    if (idx !== -1) {
      const current = products[idx];
      products.splice(idx, 1, {
        ...current,
        quantity: current.quantity + (prod?.quantity ?? 0),
        variations: prod?.variation
          ? [
              ...current.variations,
              {
                id: prod.variation.id,
                name: prod.variation.name,
                quantity: prod.quantity,
              },
            ]
          : [...current.variations],
      });
    } else {
      products.push({
        id: prod.productId,
        name: prod.name,
        quantity: prod.quantity,
        measure: prod.measure,
        variations: prod.variation
          ? [
              {
                id: prod.variation.id,
                name: prod.variation.name,
                quantity: prod.quantity,
              },
            ]
          : [],
        product: {
          enableGroup: prod?.product?.enableGroup,
          groupConvertion: prod.product?.groupConvertion,
          groupName: prod.product?.groupName,
          id: prod.product?.id,
          name: prod.product?.name,
        },
        price: {
          amount: prod?.price?.amount ?? 0,
          codeCurrency: prod?.price?.codeCurrency ?? "",
        },
      });
    }
  });

  const total = products.reduce((acc: any, item: any) => {
    const { amount, codeCurrency } = item.price;

    // Buscar si ya existe un objeto en el acumulador con la misma moneda
    const existingCurrency: any = acc.find(
      (entry: { codeCurrency: any }) => entry.codeCurrency === codeCurrency
    );

    if (existingCurrency) {
      // Si existe, sumar el monto al existente
      existingCurrency.price += amount * item.quantity;
    } else {
      // Si no existe, agregar un nuevo objeto al acumulador
      acc.push({ price: amount * item.quantity, codeCurrency });
    }

    return acc;
  }, []);

  const totalMeasure = products.reduce((acc: any, item: any) => {
    const { quantity, measure } = item;

    // Buscar si ya existe un objeto en el acumulador con la misma moneda
    const existingCurrency: any = acc.find(
      (entry: { measure: any }) => entry.measure === measure
    );

    if (existingCurrency) {
      // Si existe, sumar el monto al existente
      existingCurrency.quantity += quantity;
    } else {
      // Si no existe, agregar un nuevo objeto al acumulador
      acc.push({ quantity, measure });
    }

    return acc;
  }, []);

  products.forEach((item) => {
    const quantityByGroup: (quantity: number) => React.ReactElement | void = (
      quantity
    ) => {
      if (!!item?.product?.enableGroup) {
        const rest = quantity % item?.product?.groupConvertion!;
        return (
          <div className="flex-col">
            <div>
              {`${Math.trunc(quantity / item?.product?.groupConvertion!)} ${
                item?.product?.groupName
              }`}
            </div>
            {rest !== 0 && (
              <p>{"(+" + rest + translateMeasure(item.measure) + ")"}</p>
            )}
          </div>
        );
      }
    };

    return productData.push({
      rowId: item.id,
      payload: {
        Productos: item.name,
        "Costo unitario":
          printPriceWithCommasAndPeriods(item.price.amount) +
          " " +
          item.price.codeCurrency,
        "Costo total":
          printPriceWithCommasAndPeriods(item.price.amount * item.quantity) +
          " " +
          item.price.codeCurrency,
        Cantidades: (
          <div className="font-semibold">
            {quantityByGroup(item.quantity) ?? (
              <div>{`${item.quantity} ${translateMeasure(item?.measure)}`}</div>
            )}
          </div>
        ),
      },
      childRows:
        item.variations.length !== 0
          ? item.variations.map((variation) => ({
              payload: {
                Productos: variation.name,
                Cantidades: variation.quantity,
              },
            }))
          : undefined,
    });
  });

  productData.push({
    payload: {
      Productos: "TOTAL",
      "Costo unitario": " ",
      "Costo total": total
        .map(
          (item: { price: any; codeCurrency: any }) =>
            `${printPriceWithCommasAndPeriods(item.price)}${item.codeCurrency}`
        )
        .join("   "),
      Cantidades: (
        <div className="flex flex-col">
          {totalMeasure.map(
            (item: { quantity: any; measure: any }, idx: number) => (
              <p key={idx} className="font-semibold">
                {`${item.quantity}${translateMeasure(item.measure)}`}
              </p>
            )
          )}
        </div>
      ),
    },
    childRows: undefined,
  });

  const listHeader = { title: "Despacho" };
  let dataToDisplay: Record<string, string | number | React.ReactNode> = {
    Origen: despacho?.stockAreaFrom?.name ?? "-",
    Destino: despacho?.stockAreaTo.name,
    "Enviado por:":
      despacho?.createdBy?.displayName +
      " " +
      formatCalendar(despacho?.createdAt, true),
    "No. pedido": despacho?.id,
  };

  const actionsBtn: BtnActions[] = [];

  actionsBtn.push({
    title: "Generar PDF",
    icon: <FaRegFilePdf className="h-5 text-gray-500" />,
    action: (close) => {
      reportDowloadHandler("Despacho", "dispatch", business!, despacho);
      close();
    },
  });

  if (
    despacho?.status === "CREATED" &&
    !!response &&
    business?.id === despacho?.stockAreaTo?.business?.id
  ) {
    actionsBtn.push({
      icon:
        loading && respState === "ACCEPTED" ? (
          <LoadingSpin color="slate-600" />
        ) : (
          <CheckIcon className="h-5 text-slate-600" />
        ),
      action: () => {
        setRespState("ACCEPTED");
        response(despacho.id, "ACCEPTED");
      },
      title: "Aceptar despacho",
    });
    allowRoles(["ADMIN", "MANAGER_SALES", "MANAGER_SHIFT"]) &&
      actionsBtn.push({
        title: "Convertir en factura",
        action: (close) => {
          setRespState("BILLED");
          setTransform(true);
          close();
        },
        icon: <TbTransform />,
      });
  }

  if (
    (["CREATED", "BILLED"] as (DispatchStatus | undefined)[]).includes(
      despacho?.status
    ) &&
    !!response
  ) {
    actionsBtn.push({
      icon:
        loading && respState === "REJECTED" ? (
          <LoadingSpin color="slate-600" />
        ) : (
          <NoSymbolIcon className="h-5 text-slate-600" />
        ),
      action: () => {
        setRespState("REJECTED");
        response(id!, "REJECTED");
      },
      title: "Cancelar despacho",
    });
  }

  if (despacho?.status === "REJECTED") {
    dataToDisplay["Rechazado por"] =
      despacho.rejectedBy?.displayName +
      " " +
      formatCalendar(despacho?.rejectedAt ?? " ", true);
  }

  if (despacho?.status === "ACCEPTED") {
    dataToDisplay["Recibido por"] =
      despacho.receivedBy?.displayName +
      " " +
      formatCalendar(despacho?.receivedAt ?? " ", true);
  }

  if (despacho?.observations) {
    dataToDisplay["Observaciones"] = despacho?.observations;
  }

  dataToDisplay["Listado de Productos:"] = (
    <GenericTable
      tableTitles={
        allowRoles(["MANAGER_COST_PRICES", "OWNER"], true)
          ? ["Productos", "Costo unitario", "Costo total", "Cantidades"]
          : ["Productos", "Cantidades"]
      }
      tableData={productData}
    />
  );

  const actionToTransform = (payload: Record<string, any>) => {
    response!(id!, "BILLED", payload);
  };

  if (isLoading)
    return (
      <div className="h-96 flex flex-col justify-center items-center">
        <SpinnerLoading />
      </div>
    );
  return (
    <div className="relative h-96 overflow-auto scrollbar-none pr-5 py-5">
      <div className="absolute right-12 top-8">
        <MultipleActBtn items={actionsBtn} />
      </div>
      <GenericList header={listHeader} body={dataToDisplay} />
      {transform && (
        <Modal state={transform} close={setTransform}>
          <TransformToBill
            action={actionToTransform}
            loading={!!loading && respState === "BILLED"}
          />
        </Modal>
      )}
    </div>
  );
};

export default DetailDispatch;
