import React, { useState } from "react";
import { exportExcel, formatDateForReports, generatePdf } from "../../../utils/helpers";
import { BtnActions } from "../../../components/misc/MultipleActBtn";
import Modal from "../../../components/misc/GenericModal";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import { FaRegFilePdf } from "react-icons/fa";
import SaleByOrderReport from "../../../reports/SaleByOrderReport";
import moment from "moment";
import { translateOrderState } from "../../../utils/translate";
import { useAppSelector } from "../../../store/hooks";

interface TransferCash {
  method: TransferAndCash[];
}

interface TransferAndCash {
  amount: number,
  codeCurrency: string,
  paymentWay?: string
}

interface ObjectCoupon {
  code: string;
  amount: number;
  discountType: string;
}

interface ObjectTotalToPay {
  amount: number;
  codeCurrency: string;
}

interface ObjectTable {
  discount: number;
  businessId: number;
  origin: string;
  houseCosted: boolean;
  status: string;
  currenciesPayment: TransferAndCash[];
  coupons: ObjectCoupon[];
  totalToPay: ObjectTotalToPay[];
  createdAt: string;
  paidAt: string;
  operationNumber: number;
  name: string;
  salesBy: Record<string, string>;
  managedBy: Record<string, string>;
  observations: string;
  client: Record<string, string | null> | null;
  commission: number;
  totalCost: number;
  tipPrice: TransferAndCash;
  prices: {price:number,codeCurrency: string;}[];
}

const Export = (props: any) => {

  const {salesbyOrders} = props.dataAccess;

  let resumen: Record<string, any> = salesbyOrders?.summarize;

  let totalVendido:string, totalIngresado:string, tips:string, consumoCasa:string, envios:string, descuentos:string, comisiones:string;

  const { titlesForExport } = useAppSelector( ( state ) => state.nomenclator );
  
  if (resumen){
      totalVendido = priceProcessor(resumen?.totalSales);
      totalIngresado = priceProcessor(resumen?.totalIncomes);
      tips = `${resumen?.totalTipsMainCurrency?.amount} ${resumen?.totalTipsMainCurrency?.codeCurrency}`;
      consumoCasa = priceProcessor(resumen?.totalHouseCosted);
      envios = priceProcessor(resumen?.totalShipping);
      descuentos = priceProcessor(resumen?.totalDiscounts);
      comisiones  = priceProcessor(resumen?.totalCommissions);
  }
  
  const [exportModal, setExportModal] = useState(false);

  let data = salesbyOrders?.orders.map((elem:ObjectTable) => {
    let data = {
      'Fecha de creación': moment(elem?.createdAt).format("DD/MM/YYYY hh:mm A"),
      'Fecha de pago': moment(elem?.paidAt).format("DD/MM/YYYY hh:mm A"),
      'Punto de venta': elem.businessId,
      'Cliente': elem?.client === null ? '-' : `${elem?.client.firstName} ${elem?.client.lastName}`,
      'Origen': elem?.origin === 'pos' ? 'Puntos de venta' : (elem.origin === 'online' ? 'Tienda online' : ''),
      'Consumo casa': elem?.houseCosted ? 'Si' : 'No',
      'Estado': translateOrderState(elem.status),
      'Métodos de pago': elem?.currenciesPayment?.length > 0 ? sustituirValores(elem?.currenciesPayment.map(objeto => `${objeto.paymentWay}`)).join(', ') : '-',
      'Descuentos': elem?.discount,
      'Cupones': elem?.coupons?.length > 0 ? elem?.coupons.map(objeto => `${objeto.code}`).join(', ') : '-',
      'Total':elem?.totalToPay?.length > 0 ? elem?.totalToPay.map(objeto => `${formatearDinero(objeto.amount)} ${objeto.codeCurrency}`).join(', ') : '-',
      'Total Pagado': elem?.currenciesPayment?.length > 0 ? elem?.currenciesPayment.map(objeto => `${formatearDinero(objeto.amount)} ${objeto.codeCurrency}`).join(', ') : '-',   
      'Numero de orden': elem?.operationNumber,
      'Nombre': elem?.name,
      'Contiene propina': elem?.tipPrice === null ? 'No' : `${elem?.tipPrice.amount} ${elem?.tipPrice.codeCurrency}`,
      'Vendido por': elem?.salesBy?.displayName,
      'Manejado por': elem?.managedBy?.displayName,
      'Observaciones':elem?.managedBy?.observations,
      'Comisiones': elem?.commission,
      'Costos': elem?.totalCost,
      'Subtotal': elem?.prices?.length > 0 ? elem?.prices.map(objeto => `${formatearDinero(objeto.price)} ${objeto.codeCurrency}`).join(', ') : '-',   
    };
    return data;
  })

  if (data && Array.isArray(data) && titlesForExport) data = filtrarPropiedades( data , titlesForExport );

  let dataForExcel:any
  let codeGeneratorValues:any

  if (data && Array.isArray(data) && titlesForExport) {
    dataForExcel =  procesarPropiedades(data);
    codeGeneratorValues = codeGenerator(dataForExcel);
  }

  const exportAction = (name: string) => {
    const dataToExport: Record<string, string | number>[] = codeGeneratorValues ?? [];
    exportExcel(dataToExport, name);
  };

  const actions = [
    {
      title: "Exportar reporte de ventas a pdf",
      icon: <FaRegFilePdf className="h-5 text-gray-500" />,
      action: () => {
        generatePdf(
          //@ts-ignore
          SaleByOrderReport({
            data, totalVendido, totalIngresado, tips, consumoCasa, envios, descuentos, comisiones
          })
          ,
          "Reporte de venta por ordenes"
        )
      }
    },
    {
      title: "Exportar reporte de ventas a excel",
      icon: <FaRegFilePdf className="h-5 text-gray-500" />,
      action: () => setExportModal(true)
    },
  ];

  return (
    <div className={props.show ? '' : 'hidden'}>
      <div className="grid grid-cols-2 gap-1 w-2/3">
        {
          actions.map( (action, idx ) => (
            <div className="flex items-center border-b-2 border-gray-200 bg-white py-2 my-2 cursor-pointer p-2 rounded-lg mx-4"
              onClick={action.action} key={idx}
            >
              <p className="text-sm mr-2 font-medium text-gray-500">{action.title}</p>
              {action.icon ?? ""}
            </div>
          ))
        }
      </div>

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExportModalContainer
            exportAction={exportAction}
            close={() => setExportModal(false)}
          />
        </Modal>
      )}

    </div>
  )
}

export default Export


function sustituirValores(array:string[]) {
  return array.map(valor => {
    if (valor === "CASH") {
      return "Efectivo";
    } else if (valor === "TRANSFER") {
      return "Transferencia";
    } else {
      return valor; // Mantener el valor original si no coincide con "CASH" o "TRANSFER"
    }
  });
} 

const ExportModalContainer = ({
  exportAction,
  close,
}: {
  exportAction: Function;
  close: Function;
}) => {
  const { control, handleSubmit } = useForm();
  const submit: SubmitHandler<Record<string, string>> = (data) => {
    exportAction(data.name);
    close();
  };
  return (
    <form onSubmit={handleSubmit(submit)}>
      <Input
        name="name"
        control={control}
        label="Nombre del archivo .xlsx"
        rules={{ required: "Requerido *" }}
      />
      <div className="flex justify-end py-2">
        <Button color="slate-600" name="Aceptar" type="submit" />
      </div>
    </form>
  );
};

function priceProcessor(price:TransferAndCash[]) {
  if (!Array.isArray(price)) return '0';
  if ( price.length === 0 ) return '0';
  let result = price.map(objeto => `${formatearDinero(objeto.amount)} ${objeto.codeCurrency}`).join(', ');
  return result;
}

export function filtrarPropiedades(objetos: any[], clavesPermitidas: string[]): any[] {
  return objetos.map(objeto => {
    const nuevoObjeto: any = {};

    clavesPermitidas.forEach(clave => {
      if (objeto.hasOwnProperty(clave)) {
        nuevoObjeto[clave] = objeto[clave];
      }
    });

    return nuevoObjeto;
  });
}


function formatearDinero(cifra: number) {
  // Verificar si la cifra tiene decimales
  if (cifra) {
  if (cifra && cifra % 1 !== 0) {
      // Si tiene decimales, simplemente formatear con toLocaleString
      return cifra.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  } else {
      // Si no tiene decimales, agregar ",00" y formatear
      cifra = parseFloat(cifra.toFixed(2)); // Redondear a 2 decimales
      const cifraConDecimales = cifra.toString().split('.');
      const parteEntera = cifraConDecimales[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `${parteEntera},00`;
  }
} else {
  return `0,00`
}
}

function numberFormat(cadena: string): string {
  const matches = cadena.match(/([\d,]+)\s([A-Z]+)/);

  if (matches) {
      const cantidad = parseFloat(matches[1].replace(',', ''));
      const codigoMoneda = matches[2];

      // Aplicar la función formatearDinero al número
      const cantidadFormateada = formatearDinero(cantidad);

      // Devolver la cadena formateada con el código de la moneda
      return `${cantidadFormateada} ${codigoMoneda}`;
  } else {
      // En caso de que no se encuentre un número válido, devolver la cadena original
      return cadena;
  }
}


interface ObjetoConPropiedades {
  [key: string]: string | number; // Puedes ajustar el tipo según las propiedades específicas
}

export function procesarPropiedades(arrayDeObjetos: ObjetoConPropiedades[]): ObjetoConPropiedades[] {
  // Crear un nuevo array para almacenar los objetos modificados
  const nuevoArray: ObjetoConPropiedades[] = [];

  arrayDeObjetos.forEach(objeto => {
    // Clonar el objeto para no modificar el original
    const objetoModificado: ObjetoConPropiedades = { ...objeto };

    // Ordenar alfabéticamente las propiedades del objeto
    const propiedadesOrdenadas = Object.entries(objetoModificado)
      .sort(([a], [b]) => a.localeCompare(b));

    const objetoOrdenado: ObjetoConPropiedades = Object.fromEntries(propiedadesOrdenadas);

    // Buscar las propiedades Subtotal, Total y Total Pagado
    const propiedadesAsociadas = ['Subtotal', 'Total', 'Total Pagado'];

    // Crear un nuevo objeto con las propiedades ordenadas y las asociadas
    const nuevoObjeto: ObjetoConPropiedades = {};
    propiedadesOrdenadas.forEach(([clave, valor]) => {
      nuevoObjeto[clave] = valor;
      if (propiedadesAsociadas.includes(clave)) {
        // Si es una propiedad asociada, agregar la propiedad Code justo después
        nuevoObjeto[`${clave}-moneda`] = objetoOrdenado[`${clave}-moneda`];
      }
    });

    // Agregar el objeto modificado al nuevo array
    nuevoArray.push(nuevoObjeto);
  });

  // Devolver el nuevo array
  return nuevoArray;
}

export function codeGenerator(arrayDeObjetos: ObjetoConPropiedades[]): ObjetoConPropiedades[] {
  

  const nuevoArray: ObjetoConPropiedades[] = [];

  arrayDeObjetos.forEach(objeto => {
    const objetoModificado: ObjetoConPropiedades = { ...objeto };

    ['Subtotal', 'Total', 'Total Pagado'].forEach(prop => {
      if (objetoModificado.hasOwnProperty(prop)) {
        let valorOriginal = objetoModificado[prop] as string;

        valorOriginal = extraerNumeroYLetras(valorOriginal);
        const matches = valorOriginal.match(/([\d,]+)\s([A-Z]+)/);

        if (matches) {
          const cantidad = parseFloat(matches[1].replace(',', ''));
          const codigoMoneda = matches[2];

          objetoModificado[prop] = cantidad;
          objetoModificado[`${prop}-moneda`] = codigoMoneda;
        }
      }
    });

    nuevoArray.push(objetoModificado);
  });

  return nuevoArray;
}


function extraerNumeroYLetras(valor:string) {
  // Extraer solo dígitos y comas antes de convertir a número
  const soloDigitos = valor.match(/[\d,]+/g);
  // Unir los dígitos y reemplazar las comas antes de convertir a número
  const valorLimpio = soloDigitos ? soloDigitos.join('').replace(',', '.') : '';
  // Conservar las letras al final
  const letras = valor.replace(/[.\d, ]+/g, '').trim();
  // Convertir a número
  const numero = parseFloat(valorLimpio);
  return `${numero} ${letras}`;
}





