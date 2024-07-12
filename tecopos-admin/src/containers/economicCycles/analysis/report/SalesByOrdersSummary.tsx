import React, { FC } from "react";
import { ImCreditCard } from "react-icons/im";
import { BsCashCoin } from "react-icons/bs";
import GenericTable, { DataTableInterface } from "../../../../components/misc/GenericTable";


interface TransferAndCash {
    amount: number,
    codeCurrency: string,
    paymentWay?: string
}

export default function SalesByOrdersSummary(props: any) {

    let resumen: Record<string, any> = props.dataAccess;
    
    let totalVendido, totalIngresado, tips, consumoCasa, envios, descuentos, comisiones, totalCost, totalGrossRevenue, totalCouponsDiscount;
    if (resumen) {
        totalVendido = priceProcessor(resumen.totalSales);
        tips = `${formatearDinero(resumen?.totalTipsMainCurrency?.amount)} ${resumen?.totalTipsMainCurrency?.codeCurrency}`;
        consumoCasa = priceProcessor(resumen.totalHouseCosted);
        envios = priceProcessor(resumen.totalShipping);
        descuentos = priceProcessor(resumen.totalDiscounts);
        comisiones = priceProcessor(resumen.totalCommissions);
        totalCost = `${formatearDinero(resumen?.totalCost?.amount)} ${resumen?.totalCost?.codeCurrency}`;
        totalGrossRevenue = `${formatearDinero(resumen?.totalGrossRevenue?.amount)} ${resumen?.totalGrossRevenue?.codeCurrency}`;
        totalCouponsDiscount = priceProcessor(resumen.totalCouponsDiscounts);
    }
  
    let iterable = [
        { title: <p className="font-bold text-base text-lime-700">Total ingresado</p>, amount: <TotalIngresado totalIncomesNotInCash={resumen.totalIncomesNotInCash} totalIncomesInCash={resumen.totalIncomesInCash} /> },
        { title: 'Total vendido', amount: <p className="font-semibold text-base">{totalVendido}</p> },
        { title: 'Propinas', amount: <p className="font-semibold text-base">{tips}</p> },
        { title: 'Envíos', amount: <p className="font-semibold text-base">{envios}</p> },
        { title: 'Descuentos', amount: <p className="font-semibold text-base">{descuentos}</p> },
        { title: 'Comisiones', amount: <p className="font-semibold text-base">{comisiones}</p> },
        { title: 'Consumo casa', amount: <p className="font-semibold text-base">{consumoCasa}</p> },
        { title: 'Costo total', amount: <p className="font-semibold text-base">{totalCost}</p> },
        { title: 'Ganancia bruta', amount: <p className="font-semibold text-base">{totalGrossRevenue}</p> },
        { title: 'Descuento por cupones', amount: <p className="font-semibold text-base">{totalCouponsDiscount}</p> },
    ]

    const tableTitles = [
        "RESUMEN",
        "CIFRA",
    ];
    const tableData: DataTableInterface[] = [];
    iterable.forEach((elem) => {
        tableData.push({
            payload: {
                "RESUMEN": elem.title,
                "CIFRA": elem.amount,
            },
        })
    })

    return (
        <div className={props.show ? '' : 'hidden'}>

            <GenericTable
                tableTitles={tableTitles}
                tableData={tableData}
            />
        </div >
    );
}

function priceProcessor(price: TransferAndCash[]) {
    if (!Array.isArray(price)) return '0.00';
    if (price.length === 0) return '0.00';
    let result = price.map(objeto => objeto.amount === 0 ? '0,00' : `${objeto.amount} ${objeto.codeCurrency}`);
    return <StringList strings={result} />;
}

const StringList = ({ strings }: any) => {
    return (
        <div>
            {strings.map((str: any, index: any) => (
                <React.Fragment key={index}>
                    {index > 0 && <br />} {/* Agrega un salto de línea solo si no es el primer elemento */}
                    {formatearCadenaConMoneda(str)}
                </React.Fragment>
            ))}
        </div>
    );
};

function formatearCadenaConMoneda(cadena: string): string {
    // Extraer el número y la moneda de la cadena
    const match = cadena.match(/(\d+(\.\d+)?)\s*(\w+)$/);

    if (!match) {
        // Manejar caso de cadena no válida
        return cadena;
    }

    const numero = parseFloat(match[1]);
    const moneda = match[3];

    // Formatear el número con punto para dividir los millares
    let numeroFormateado = numero.toLocaleString();

    // Si el número no tiene parte decimal, agregar ",00" al final
    if (!/\.\d+$/.test(numeroFormateado)) {
        numeroFormateado += ",00";
    }

    // Combinar el número formateado con las últimas tres letras de la moneda
    const resultado = `${numeroFormateado} ${moneda}`;

    return resultado;
}

interface LineBreakComponentProps {
    totalIncomesNotInCash: string | undefined;
    totalIncomesInCash: string | undefined;
}

const TotalIngresado: FC<LineBreakComponentProps> = ({ totalIncomesNotInCash = '-', totalIncomesInCash = '-' }) => {
    let incomesNotInCash = Array.isArray(totalIncomesNotInCash) && totalIncomesNotInCash.length > 0 ? totalIncomesNotInCash.map(objeto => `${formatearDinero(objeto.amount)} ${objeto.codeCurrency}`).join(', ') : '-';
    let incomesInCash = Array.isArray(totalIncomesInCash) && totalIncomesInCash.length > 0 ? totalIncomesInCash.map(objeto => `${formatearDinero(objeto.amount)} ${objeto.codeCurrency}`).join(', ') : '-';
    
    return (
        <div className="flex flex-col justify-center items-center">
            <div className="flex">
            <p className="font-semibold text-base text-lime-700"> { incomesNotInCash }</p>
            <ImCreditCard className="text-xl mx-2 text-lime-700" />
            </div>
            <br />
            <div className="flex">
            <p className="font-semibold text-base text-lime-700"> {incomesInCash}</p>
            <BsCashCoin className="text-xl mx-2 translate-y-1 text-lime-700" />
            </div>
        </div>
    );


};

function formatearDinero(cifra: number) {
    // Verificar si la cifra tiene decimales
    if (cifra) {
    if (cifra && cifra % 1 !== 0) {
        // Si tiene decimales, simplemente formatear con toLocaleString
        return cifra.toLocaleString();
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



