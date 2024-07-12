import React, { useState, FC } from "react";
import GenericTable, {
    DataTableInterface,
} from "../../../components/misc/GenericTable";
import { BasicNomenclator } from "../../../interfaces/ServerInterfaces";
import OrderStatusBadge from "../../../components/misc/badges/OrderStatusBadge";
import { ImCreditCard } from "react-icons/im";
import { BsCashCoin, BsCurrencyDollar } from "react-icons/bs";
import CouponDiscountTypeBadge from "../../../components/misc/badges/CouponDiscountTypeBadge";
import moment from "moment";
import { translateOrderState } from "../../../utils/translate";
import { useAppSelector } from "../../../store/hooks";
import { Tooltip as ReactTooltip } from 'react-tooltip'


export default function Results(props: any) {

    const { areas } = useAppSelector(
        (state) => state.nomenclator
    );


    const { salesbyOrders, isLoading } = props.dataAccess;
    const [orderByCreatedDate, setOrderByCreatedDate] = useState(0);
    const [orderByPaidDate, setOrderByPaidDate] = useState(0);
    const [orderByPaidTotal, setOrderByPaidTotal] = useState(0);
    const [groupBy, setGroupBy] = useState(0);

    let arrayOrdenado: any[] = [];

    if (salesbyOrders && salesbyOrders?.orders.length > 0) {
        arrayOrdenado = [...salesbyOrders?.orders];
    }

    let paymentWayTotal = [];
    let paymentWayTotalResults: PaymentObject[] = [];
    if (Array.isArray(arrayOrdenado) && arrayOrdenado.length > 0) {
        paymentWayTotal = arrayOrdenado.map(objeto => ({ currenciesPayment: objeto.currenciesPayment })).map(objeto => objeto.currenciesPayment).flat();
        paymentWayTotalResults = calcularTotales(paymentWayTotal);
    }

    //Logica de ordenamiento_____________________________________________________________________________

    //Ordenamiento por fecha de creacion
    if (orderByCreatedDate === 1 || orderByCreatedDate === 2) {
        if (orderByCreatedDate === 1) {
            arrayOrdenado = salesbyOrders?.orders.sort(comparadorFechas('createdAt', 'des'));
        } else if (orderByCreatedDate === 2) {
            arrayOrdenado = salesbyOrders?.orders.sort(comparadorFechas('createdAt', 'asc'));
        }
    }
    //Ordenamiento por fecha de pago
    if (orderByPaidDate === 1 || orderByPaidDate === 2) {
        if (orderByPaidDate === 1) {
            arrayOrdenado = salesbyOrders?.orders.sort(comparadorFechas('paidAt', 'des'));
        } else if (orderByPaidDate === 2) {
            arrayOrdenado = salesbyOrders?.orders.sort(comparadorFechas('paidAt', 'asc'));
        }
    }
    //Ordenamiento por total de pago
    if (orderByPaidTotal === 1 || orderByPaidTotal === 2) {
        if (orderByPaidTotal === 1) {
            arrayOrdenado = salesbyOrders?.orders.sort(compararPorTotalToPay('des'));
        } else if (orderByPaidTotal === 2) {
            arrayOrdenado = salesbyOrders?.orders.sort(compararPorTotalToPay('asc'));
        }
    }

    //Logica de agrupamiento_____________________________________________________________________________

    let iterableObject: any[] = [];
    let unicos: string[] = [];
    let subtotales: any[] = subtotalCalculator([arrayOrdenado]);
    let totales: any = totalCalculator(subtotales);

    //Agrupar por Status
    if (groupBy === 1) {
        unicos = obtenerEstadosUnicos(arrayOrdenado);
        iterableObject = agruparPorStatus(arrayOrdenado, unicos);
        subtotales = subtotalCalculator(iterableObject);
        iterableObject = checkorder(iterableObject, subtotales);
        unicos = checkorderLabel(unicos, subtotales);
        subtotales = checkorderSubTotal(subtotales);
        totales = totalCalculator(subtotales);
    }
    //Agrupar por Clientes
    if (groupBy === 2) {
        unicos = obtenerClientesUnicos(arrayOrdenado);
        moverSinNombreAlFinal(unicos);
        iterableObject = agruparPorCliente(arrayOrdenado, unicos);
        subtotales = subtotalCalculator(iterableObject);
        iterableObject = checkorder(iterableObject, subtotales);
        unicos = checkorderLabel(unicos, subtotales);
        subtotales = checkorderSubTotal(subtotales);
        totales = totalCalculator(subtotales);
    }
    //Agrupar por Coupones
    if (groupBy === 3) {
        unicos = obtenerCouponesUnicos(arrayOrdenado);
        moverSinCouponAlFinal(unicos);
        iterableObject = agruparPorCoupon(arrayOrdenado, unicos);
        subtotales = subtotalCalculator(iterableObject);
        iterableObject = checkorder(iterableObject, subtotales);
        unicos = checkorderLabel(unicos, subtotales);
        subtotales = checkorderSubTotal(subtotales);
        totales = totalCalculator(subtotales);
    }



    function checkorder(iterableObject: any, subtotales: any) {
        let arrayDeArrays = [...iterableObject];
        let orden = subtotales.map((obj: any) => obj?.total[0]?.amount);
        const arrayConCorrespondencia = orden.map((numero: number, indice: number) => ({ numero, array: arrayDeArrays[indice] }));

        if (orderByPaidTotal === 1) {
            let array = [...arrayConCorrespondencia];
            array.sort((a: any, b: any) => b.numero - a.numero);
            const nuevoArrayDeArrays = array.map((item: any) => item.array);
            return nuevoArrayDeArrays;
        } else if (orderByPaidTotal === 2) {
            let array = [...arrayConCorrespondencia];
            array.sort((a: any, b: any) => a.numero - b.numero);
            const nuevoArrayDeArrays = array.map((item: any) => item.array);
            return nuevoArrayDeArrays;
        } else {
            return iterableObject
        }
    }

    function checkorderLabel(unicos: any, subtotales: any) {
        let arrayDeArrays = [...unicos];
        let orden = subtotales.map((obj: any) => obj?.total[0]?.amount);
        const arrayConCorrespondencia = orden.map((numero: number, indice: number) => ({ numero, array: arrayDeArrays[indice] }));
        arrayConCorrespondencia.sort((a: any, b: any) => b.numero - a.numero);
        if (orderByPaidTotal === 1) {
            arrayConCorrespondencia.sort((a: any, b: any) => b.numero - a.numero);
            const nuevoArrayDeArrays = arrayConCorrespondencia.map((item: any) => item.array);
            return nuevoArrayDeArrays;
        } else if (orderByPaidTotal === 2) {
            arrayConCorrespondencia.sort((a: any, b: any) => a.numero - b.numero);
            const nuevoArrayDeArrays = arrayConCorrespondencia.map((item: any) => item.array);
            return nuevoArrayDeArrays;
        } else {
            return unicos
        }
    }

    function checkorderSubTotal(subtotales: any) {
        let arrayDeArrays = [...subtotales];
        let orden = subtotales.map((obj: any) => obj?.total[0]?.amount);
        const arrayConCorrespondencia = orden.map((numero: number, indice: number) => ({ numero, array: arrayDeArrays[indice] }));
        arrayConCorrespondencia.sort((a: any, b: any) => b.numero - a.numero);
        if (orderByPaidTotal === 1) {
            arrayConCorrespondencia.sort((a: any, b: any) => b.numero - a.numero);
            const nuevoArrayDeArrays = arrayConCorrespondencia.map((item: any) => item.array);
            return nuevoArrayDeArrays;
        } else if (orderByPaidTotal === 2) {
            arrayConCorrespondencia.sort((a: any, b: any) => a.numero - b.numero);
            const nuevoArrayDeArrays = arrayConCorrespondencia.map((item: any) => item.array);
            return nuevoArrayDeArrays;
        } else {
            return subtotales
        }
    }
    //Data for table ----------------------------------------------------------------------------

    const tableTitles = [
        "Fecha de creación",
        "Fecha de pago",
        "Punto de venta",
        "Origen",
        "Consumo casa",
        "Cliente",
        "Cupones",
        "Comisiones",
        "Estado",
        "Manejado por",
        "Vendido por",
        "Métodos de pago",
        "Descuentos",
        "Nombre",
        "Observaciones",
        "Numero de orden",
        "Costos",
        "Contiene propina",
        "Subtotal",
        "Total Pagado",
        "Total",
    ];

    const tableData: DataTableInterface[] = [];


    if (groupBy) {
        iterableObject.forEach((elem: any, idx: number) => {
            tableData.push({
                borderTop: true,
                payload: {
                    'Fecha de creación': <p className="font-bold text-base text-red-400">{unicos[idx]}</p>,
                },
            });
            elem.forEach((elem: ObjectTable) => {
                tableData.push({
                    payload: {
                        'Punto de venta': <p className="font-semibold">{areas?.find(area => area.id === elem?.areaSalesId)?.name}</p>,
                        'Origen': <p className="font-semibold">{elem?.origin === 'pos' ? 'Puntos de venta' : (elem.origin === 'online' ? 'Tienda online' : '')}</p>,
                        'Consumo casa': <ConsumoCasaBadge flag={elem?.houseCosted} />,
                        'Estado': <OrderStatusBadge status={elem?.status} />,
                        'Métodos de pago': <MetodoPagoBadge method={elem?.currenciesPayment} />,
                        'Descuentos': elem?.couponDiscountPrice !== null ? <DiscountPrice descuento={elem?.couponDiscountPrice} /> : elem?.discount > 0 ? <LineBreakComponent strings={discountPercent(elem?.discount, elem?.prices)} /> : '-',
                        'Cupones': elem?.coupons.length > 0 ? <CouponDiscountTypeBadge type={elem?.coupons[0]?.discountType} /> : '-',
                        'Fecha de creación': <p className="font-semibold pl-5">{moment(elem?.createdAt).format("DD/MM/YYYY hh:mm A")}</p>,
                        'Fecha de pago': <p className="font-semibold">{moment(elem?.paidAt).format("DD/MM/YYYY hh:mm A")}</p>,
                        'Numero de orden': <p className="font-semibold">{elem?.operationNumber}</p>,
                        'Nombre': <p className="font-semibold">{elem?.name}</p>,
                        'Contiene propina': elem?.tipPrice === null ? <ConsumoCasaBadge flag={false} /> : <p className="font-semibold">{`${elem?.tipPrice?.amount} ${elem?.tipPrice?.codeCurrency}`}</p>,
                        'Vendido por': <p className="font-semibold">{elem?.salesBy?.displayName}</p>,
                        'Manejado por': <p className="font-semibold">{elem?.managedBy?.displayName}</p>,
                        'Observaciones': <p className="font-semibold">{elem?.managedBy?.observations}</p>,
                        'Cliente': elem?.client === null ? '-' : <p className="font-semibold">{`${elem?.client?.firstName} ${elem?.client?.lastName}`}</p>,
                        'Comisiones': <p className="font-semibold">{elem.commission}</p>,
                        'Subtotal': priceCalculator(elem?.prices) === '-' ? priceCalculator(elem?.prices) : <LineBreakComponent strings={priceCalculator(elem?.prices)} />,
                        'Total': (Array.isArray(elem?.totalToPay) && elem?.totalToPay?.length > 0) ? <LineBreakComponent strings={priceProcessor(elem?.totalToPay)} /> : '-',
                        'Total Pagado': <LineBreakComponentPlus payments={elem?.currenciesPayment} />,
                        "Costos": <p className="font-semibold">{elem?.totalCost}</p>,
                    },
                })
            });
            tableData.push({
                payload: {
                    'Fecha de creación': <p className="font-semibold text-base text-lime-700">Subtotales</p>,
                    "Comisiones": <p className="font-semibold text-base text-lime-700">{subtotales[idx]?.comisiones}</p>,
                    "Costos": <p className="font-semibold text-base text-lime-700">{subtotales[idx]?.costos}</p>,
                    "Subtotal": <LineBreakComponentPlus payments={subtotales[idx]?.subtotal} styles={'font-semibold text-base text-lime-700'} />,
                    "Total Pagado": <LineBreakComponentPlus payments={subtotales[idx]?.totalPagado} styles={'font-semibold text-base text-lime-700'} />,
                    "Total": <LineBreakComponentPlus payments={subtotales[idx]?.total} styles={'font-semibold text-base text-lime-700'} />,
                    "Contiene propina": <LineBreakComponentPlus payments={[subtotales[idx]?.propina]} styles={'font-semibold text-base text-lime-700'} />,
                    "Descuentos": <LineBreakComponentPlus payments={subtotales[idx]?.descuento} styles={'font-semibold text-base text-lime-700'} />,

                },
            });

        })

        tableData.push({
            borderTop: true,
            payload: {
                'Fecha de creación': <p className="font-bold text-base text-orange-800">Totales</p>,
                "Comisiones": <p className="font-bold text-base text-orange-800">{totales?.comisiones}</p>,
                "Descuentos": <LineBreakComponentPlus payments={totales?.descuento} styles={'font-bold text-base text-orange-800'} />,
                "Contiene propina": <LineBreakComponentPlus payments={totales?.propina} styles={'font-bold text-base text-orange-800'} />,
                "Subtotal": <LineBreakComponentPlus payments={totales?.subtotal} styles={'font-bold text-base text-orange-800'} />,
                "Total Pagado": <LineBreakComponentPlus payments={paymentWayTotalResults} styles={'font-bold text-base text-orange-800'} iconCreditCard={'text-orange-800 translate-y-0.5'} iconCash={'text-orange-800 translate-y-1'} />,
                "Total": <LineBreakComponentPlus payments={totales?.total} styles={'font-bold text-base text-orange-800'} />,
                "Costos": <p className="font-bold text-base text-orange-800">{totales?.costos}</p>,
            },
        });

    } else {
        arrayOrdenado.forEach((elem: ObjectTable) => {
            tableData.push({
                payload: {
                    'Punto de venta': <p className="font-semibold">{areas?.find(area => area.id === elem?.areaSalesId)?.name}</p>,
                    'Origen': <p className="font-semibold">{elem?.origin === 'pos' ? 'Puntos de venta' : (elem.origin === 'online' ? 'Tienda online' : '')}</p>,
                    'Consumo casa': <ConsumoCasaBadge flag={elem?.houseCosted} />,
                    'Estado': <OrderStatusBadge status={elem?.status} />,
                    'Métodos de pago': <MetodoPagoBadge method={elem?.currenciesPayment} />,
                    'Descuentos': elem?.couponDiscountPrice !== null ? <DiscountPrice descuento={elem?.couponDiscountPrice} /> : elem?.discount > 0 ? <LineBreakComponent strings={discountPercent(elem?.discount, elem?.prices)} /> : '-',
                    'Cupones': elem?.coupons.length > 0 ? <CouponDiscountTypeBadge type={elem?.coupons[0]?.discountType} /> : '-',
                    'Fecha de creación': <p className="font-semibold pl-5">{moment(elem?.createdAt).format("DD/MM/YYYY hh:mm A")}</p>,
                    'Fecha de pago': <p className="font-semibold">{moment(elem?.paidAt).format("DD/MM/YYYY hh:mm A")}</p>,
                    'Numero de orden': <p className="font-semibold">{elem?.operationNumber}</p>,
                    'Nombre': <p className="font-semibold">{elem?.name}</p>,
                    'Contiene propina': elem?.tipPrice === null ? <ConsumoCasaBadge flag={false} /> : <p className="font-semibold">{`${elem?.tipPrice?.amount} ${elem?.tipPrice?.codeCurrency}`}</p>,
                    'Vendido por': elem?.salesBy?.displayName ? <p className="font-semibold">{elem?.salesBy?.displayName}</p> : '-',
                    'Manejado por': elem?.managedBy?.displayName ? <p className="font-semibold">{elem?.managedBy?.displayName}</p> : '-',
                    'Observaciones': <p className="font-semibold">{elem?.managedBy?.observations}</p>,
                    'Cliente': elem?.client === null ? '-' : <p className="font-semibold">{`${elem?.client?.firstName} ${elem?.client?.lastName}`}</p>,
                    'Comisiones': <p className="font-semibold">{elem.commission}</p>,
                    'Subtotal': priceCalculator(elem?.prices) === '-' ? priceCalculator(elem?.prices) : <LineBreakComponent strings={priceCalculator(elem?.prices)} />,
                    'Total': (Array.isArray(elem?.totalToPay) && elem?.totalToPay?.length > 0) ? <LineBreakComponent strings={priceProcessor(elem?.totalToPay)} /> : '-',
                    'Total Pagado': <LineBreakComponentPlus payments={elem?.currenciesPayment} />,
                    "Costos": <p className="font-semibold">{elem?.totalCost}</p>,
                },
            })
        });

        tableData.push({
            borderTop: true,
            payload: {
                'Fecha de creación': <p className="font-bold text-base text-orange-800">Totales</p>,
                "Comisiones": <p className="font-bold text-base text-orange-800">{totales?.comisiones}</p>,
                "Descuentos": <LineBreakComponentPlus payments={totales?.descuento} styles={'font-bold text-base text-orange-800'} />,
                "Contiene propina": <LineBreakComponentPlus payments={totales?.propina} styles={'font-bold text-base text-orange-800'} />,
                "Subtotal": <LineBreakComponentPlus payments={totales?.subtotal} styles={'font-bold text-base text-orange-800'} />,
                "Total Pagado": <LineBreakComponentPlus payments={paymentWayTotalResults} styles={'font-bold text-base text-orange-800'} iconCreditCard={'text-orange-800 translate-y-0.5'} iconCash={'text-orange-800 translate-y-1'} />,
                "Total": <LineBreakComponentPlus payments={totales?.total} styles={'font-bold text-base text-orange-800'} />,
                "Costos": <p className="font-bold text-base text-orange-800">{totales?.costos}</p>,
            },
        });
    }


    //-----------------------------------------------------------------------------

    let availableFiltersByOrder: ExtendedNomenclator[] = [
        {
            id: 1,
            name: "Fecha de creación",
            availableOptions: [{ name: 'Ascendente', id: 1 }, { name: 'Descendente', id: 2 }],
            action: (data: number) => data ? setOrderByCreatedDate(data) : setOrderByCreatedDate(0),
            reset: () => setOrderByCreatedDate(0),
        },
        {
            id: 2,
            name: "Fecha de pago",
            availableOptions: [{ name: 'Ascendente', id: 1 }, { name: 'Descendente', id: 2 }],
            action: (data: number) => data ? setOrderByPaidDate(data) : setOrderByPaidDate(0),
            reset: () => setOrderByPaidDate(0),
        },
        {
            id: 3,
            name: "Total",
            availableOptions: [{ name: 'De mayor a menor', id: 1 }, { name: 'De menor a mayor', id: 2 }],
            action: (data: number) => data ? setOrderByPaidTotal(data) : setOrderByPaidTotal(0),
            reset: () => setOrderByPaidTotal(0),
        },
        {
            id: 4,
            name: "Estado",
            availableOptions: [{ name: 'De mayor a menor', id: 1 }, { name: 'De menor a mayor', id: 2 }],
            action: () => { },
            reset: () => { },
        }
    ]

    let availableFiltersByGroup: ExtendedNomenclator[] = [
        {
            id: 1,
            name: "Estado",
            availableOptions: [],
            action: (idx) => setGroupBy(idx),
            reset: () => setGroupBy(0),
        },
        {
            id: 2,
            name: "Clientes",
            availableOptions: [],
            action: (idx) => setGroupBy(idx),
            reset: () => setGroupBy(0),
        },
        {
            id: 3,
            name: "Cupones",
            availableOptions: [],
            action: (idx) => setGroupBy(idx),
            reset: () => setGroupBy(0),
        }
    ]

    return (
        <div className={props.show ? '' : 'hidden'}>
            <GenericTable
                tableTitles={tableTitles}
                tableData={tableData}
                loading={isLoading}
                showSpecificColumns={true}
                orderBy={{ availableFilters: availableFiltersByOrder }}
                groupBy={{ availableFilters: availableFiltersByGroup }}
            />

            <ReactTooltip place="top" id="my-tooltip" />
        </div>
    );
}



//Logica externa al componente

interface ExtendedNomenclator extends BasicNomenclator {
    action?: (data: number) => void;
    availableOptions: OptionsNomenclator[];
    reset: () => void;
}

interface OptionsNomenclator {
    name: string;
    id: number;
}

function ConsumoCasaBadge(props: any) {

    return (
        <div className="flex-col">
            <div className="text-xs font-semibold">
                <div>
                    {props.flag ? (
                        <div
                            className={
                                "inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium md:mt-2 lg:mt-0 bg-blue-100 text-blue-800"
                            }
                        >
                            Si
                        </div>
                    ) : (
                        <div
                            className={
                                "inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium md:mt-2 lg:mt-0 bg-red-100 text-red-800"
                            }
                        >
                            No
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function MetodoPagoBadge(props: TransferCash) {
    //props.method = currenciesPayment

    const hasTransferAndCash = props.method.some((transaction: TransferAndCash) => {
        return transaction.paymentWay === "TRANSFER";
    }) && props.method.some((transaction: TransferAndCash) => {
        return transaction.paymentWay === "CASH";
    });

    if (hasTransferAndCash) {
        return (
            <div className="flex gap-0.5 justify-center">
                <div data-tooltip-id="my-tooltip" data-tooltip-content={"Transferencia"}>
                    <ImCreditCard className="text-xl" />
                </div>
                <div data-tooltip-id="my-tooltip" data-tooltip-content={"Efectivo"}>
                    <BsCashCoin className="text-xl translate-y-0.5" />
                </div>
            </div>
        )
    }

    if (props !== undefined && props.method.length > 0) {
        return (
            <div className="flex justify-center items-center">
                {props.method[0].paymentWay === "TRANSFER" ? (
                    <div data-tooltip-id="my-tooltip" data-tooltip-content={"Transferencia"}>
                        <ImCreditCard className="text-xl" />
                    </div>
                ) : props.method[0].paymentWay === "CASH" ? (
                    <div data-tooltip-id="my-tooltip" data-tooltip-content={"Efectivo"}>
                        <BsCashCoin className="text-xl translate-y-0.5" />
                    </div>
                ) : props.method[0].paymentWay === "TROPIPAY" ? (
                    <div data-tooltip-id="my-tooltip" data-tooltip-content={"TropiPay"}>
                        <BsCurrencyDollar className="text-xl translate-y-0.5" />
                    </div>
                ) : (
                    "-"
                )}


            </div>
        )
    } else {
        return (
            <div className="flex justify-center items-center">
                "-"
            </div>
        )
    }


}

const comparadorFechas = (nombrePropiedad: any, orden: string) => (objetoA: any, objetoB: any) => {
    const valorA = moment(objetoA[nombrePropiedad]);
    const valorB = moment(objetoB[nombrePropiedad]);
    if (orden === 'asc') {
        if (valorA.isBefore(valorB)) {
            return -1;
        } else if (valorA.isAfter(valorB)) {
            return 1;
        } else {
            return 0; // Los valores son iguales
        }
    }
    if (orden === 'des') {
        if (valorA.isAfter(valorB)) {
            return -1;
        } else if (valorA.isBefore(valorB)) {
            return 1;
        } else {
            return 0; // Los valores son iguales
        }
    }
};

const compararPorTotalToPay = (orden: string) => (objetoA: any, objetoB: any) => {
    if (orden === 'asc') {
        const valorA = objetoA.totalToPay[0]?.amount !== undefined ? objetoA.totalToPay[0]?.amount : Infinity;
        const valorB = objetoB.totalToPay[0]?.amount !== undefined ? objetoB.totalToPay[0]?.amount : Infinity;
        return valorA - valorB;
    } else if (orden === 'des') {
        const valorA = objetoA.totalToPay[0]?.amount !== undefined ? objetoA.totalToPay[0]?.amount : -Infinity;
        const valorB = objetoB.totalToPay[0]?.amount !== undefined ? objetoB.totalToPay[0]?.amount : -Infinity;
        return valorB - valorA;
    }
};

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
    paymentWay?: string;
}

interface ObjectPrices {
    price: number;
    codeCurrency: string;
}

interface ObjectTable {
    areaSalesId: number;
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
    prices: ObjectPrices[];
    couponDiscountPrice: ObjectTotalToPay;
}

function priceProcessor(price: TransferAndCash[]) {
    if (!Array.isArray(price)) return '-';
    if (price.length === 0) return '-';
    let result: TransferAndCash[] | string[];
    result = price.filter(obj => typeof obj.amount === 'number' && obj.amount !== 0);
    result = price.map(objeto => `${formatearDinero(objeto.amount)} ${objeto.codeCurrency}`);
    return result;
}


interface LineBreakComponentProps {
    strings: string[] | string;
    clases?: any;
}

const LineBreakComponent: FC<LineBreakComponentProps> = ({ strings, clases }) => {
    if (Array.isArray(strings)) {
        return (
            <div>
                {strings.map((str, index) => (
                    <React.Fragment key={index}>
                        <p className={clases}> {str}</p>
                        {index < strings.length - 1 && <br />}
                    </React.Fragment>
                ))}
            </div>
        );
    } else {
        return (
            <p>'-'</p>
        )
    }

};

interface LineBreakComponentPlusProps {
    payments: Record<string, any>[] | string;
    styles?: string;
    iconCreditCard?: string;
    iconCash?: string;
}

const LineBreakComponentPlus: FC<LineBreakComponentPlusProps> = ({ payments, styles, iconCreditCard, iconCash }) => {
    if (Array.isArray(payments)) {
        return (
            <div>
                {payments.map((obj, index) => (
                    <div key={index} className="flex justify-center">
                        <p className={styles}>{`${formatearDinero(obj.amount)} ${obj.codeCurrency}`}</p>
                        {obj.paymentWay == 'TRANSFER' && <ImCreditCard className={`text-xl pl-1 ${iconCreditCard}`} />}
                        {obj.paymentWay == 'CASH' && <BsCashCoin className={`text-xl pl-1 translate-y-0.5 ${iconCash}`} />}
                    </div>
                ))}
            </div>
        );
    } else {
        return (
            <p>'-'</p>
        )
    }

};

function obtenerClientesUnicos(arrayDeObjetos: any) {
    const clientesUnicos: any[] = [];

    arrayDeObjetos.forEach((objeto: any) => {
        const cliente = objeto?.client;

        let nombreCompleto = '';
        if (cliente?.firstName && cliente?.lastName) {
            nombreCompleto = `${cliente.firstName} ${cliente.lastName}`;
        } else if (cliente?.firstName) {
            nombreCompleto = `${cliente.firstName}`;
        } else if (cliente?.lastName) {
            nombreCompleto = `${cliente.lastName}`;
        } else {
            nombreCompleto = 'Sin nombre';
        }

        if (cliente) {
            // Si el cliente no es null ni undefined

            if (!clientesUnicos.includes(nombreCompleto)) {
                clientesUnicos.push(nombreCompleto);
            }
        } else {
            // Si el cliente es null o undefined
            if (!clientesUnicos.includes('Sin nombre')) {
                clientesUnicos.push('Sin nombre');
            }
        }
    });

    return clientesUnicos;
}

function moverSinNombreAlFinal(arrayDeStrings: string[]) {
    const indexSinNombre = arrayDeStrings.findIndex(str => str === 'Sin nombre');

    if (indexSinNombre !== -1) {
        // Si se encuentra 'Sin nombre', lo elimina y lo agrega al final
        const sinNombre = arrayDeStrings.splice(indexSinNombre, 1)[0];
        arrayDeStrings.push(sinNombre);
    }

    return arrayDeStrings;
}

function nameFormat(nombre: string, apellido: string): string | null {
    let nombreCompleto: string | null = (nombre && apellido) ? `${nombre} ${apellido}` : (nombre || apellido) || null;
    return nombreCompleto;
}

function agruparPorCliente(objetos: any, valoresClientes: string[]) {
    const resultados: any = [];

    valoresClientes.forEach((cliente) => {
        let objetosConCliente: any = [];

        if (cliente === 'Sin nombre') {
            // Agrupa los valores null y undefined bajo 'Sin nombre'
            objetosConCliente = objetos.filter((objeto: any) => objeto.client === null || objeto.client === undefined);
        } else {
            // Agrupa por el valor del cliente normalmente
            objetosConCliente = objetos.filter((objeto: any) => nameFormat(`${objeto?.client?.firstName}`, `${objeto?.client?.lastName}`) === cliente);
        }

        resultados.push(objetosConCliente);
    });

    return resultados;
}

function obtenerEstadosUnicos(arrayDeObjetos: any) {
    let estadosUnicos: any[] = [];

    arrayDeObjetos.forEach((objeto: any) => {
        const estado = objeto.status;
        if (!estadosUnicos.includes(estado)) {
            estadosUnicos.push(estado);
        }
    });
    estadosUnicos = estadosUnicos.map(translateOrderState);
    return estadosUnicos;
}

function agruparPorStatus(objetos: any, valoresStatus: string[]) {
    const resultados: any = [];
    valoresStatus.forEach((status) => {
        const objetosConStatus = objetos.filter((objeto: any) => translateOrderState(objeto.status) === status);
        resultados.push(objetosConStatus);
    });

    return resultados;
}

type TransformedObject = {
    amount: number | string;
    codeCurrency: string;
};

function subtotalCalculator(arrays: any,) {
    const resultados: Record<string, any>[] = [];
    arrays.map((array: any) => {

        let comisiones, propina, subtotal, total, totalPagado, costos;
        let descuento: any[] = [];

        //costos
        costos = array.reduce((acumulador: number, objeto: any) => {
            const valorCosto = parseFloat(objeto?.totalCost);

            // Verificar si el valor es un número antes de sumarlo
            if (!isNaN(valorCosto)) {
                return acumulador + valorCosto;
            } else {
                return acumulador;
            }
        }, 0);

        //comisiones
        comisiones = array.reduce((acumulador: number, objeto: any) => {
            const valorCosto = parseFloat(objeto?.comission);

            // Verificar si el valor es un número antes de sumarlo
            if (!isNaN(valorCosto)) {
                return acumulador + valorCosto;
            } else {
                return acumulador;
            }
        }, 0);

        //propina
        propina = array.filter((objeto: any) => objeto.tipPrice !== null);
        propina = propina.reduce((acumulador: number, objeto: any) => {
            const valorCosto = objeto?.tipPrice?.amount;
            // Verificar si el valor es un número antes de sumarlo
            if (!isNaN(valorCosto)) {
                return acumulador + valorCosto;
            } else {
                return acumulador;
            }
        }, 0);
        propina = { amount: propina, codeCurrency: 'CUP' };

        //discount
        array.forEach((objeto: any) => {
            if (objeto?.couponDiscountPrice !== null) {
                descuento.push({ amount: `${objeto?.couponDiscountPrice?.amount}`, codeCurrency: `${objeto?.couponDiscountPrice?.codeCurrency}` });
            } else if (objeto?.discount > 0) {
                let porcientosAplicados = aplicarPorcentaje(objeto?.prices, objeto?.discount);
                let arrayPrices = transformArray(porcientosAplicados);
                descuento.push(arrayPrices);
            }
        }, 0);
        descuento = groupAndSumByCurrency(descuento);

        //Subtotal
        subtotal = array.map((objeto: any) => transformArray(objeto?.prices));
        subtotal = groupAndSumByCurrency(subtotal.flat());

        //total
        total = array.map((objeto: any) => objeto?.totalToPay);
        total = groupAndSumByCurrency(total.flat());

        //Total Pagado
        totalPagado = array.map((objeto: any) => objeto?.currenciesPayment);
        totalPagado = groupAndSumByCurrency(totalPagado.flat());

        resultados.push({ comisiones, propina, descuento, subtotal, total, totalPagado, costos });

    })

    return resultados;
}

type OriginalObject = {
    price: number;
    codeCurrency: string;
};


function transformArray(originalArray: OriginalObject[]): TransformedObject[] {
    return originalArray.map((originalObject) => {
        const { price, codeCurrency } = originalObject;
        return { amount: price, codeCurrency };
    });
}

function priceCalculator(price: ObjectPrices[]) {
    if (!Array.isArray(price)) return '-';
    if (price.length === 0) return '-';
    let result = price.map(objeto => `${formatearDinero(Number(objeto.price))} ${objeto.codeCurrency}`);
    return result;
}

function aplicarPorcentaje(array: ObjetoMoneda[], porcentaje: number): ObjetoMoneda[] {
    const nuevoArray: ObjetoMoneda[] = [];

    for (const objeto of array) {
        const nuevoPrecio = objeto.price * (1 + porcentaje / 100);
        const nuevoObjeto: ObjetoMoneda = {
            price: nuevoPrecio,
            codeCurrency: objeto.codeCurrency
        };
        nuevoArray.push(nuevoObjeto);
    }

    return nuevoArray;
}

type CurrencyObject = {
    amount: number;
    codeCurrency: string;
};


function groupAndSumByCurrency(objects: CurrencyObject[]): CurrencyObject[] {
    const grouped: { [key: string]: number } = {};

    if (Array.isArray(objects) && objects.length > 0) {

        objects.forEach((obj) => {
            const { amount, codeCurrency } = obj;

            if (!isNaN(Number(amount))) {
                grouped[codeCurrency] = (grouped[codeCurrency] || 0) + Number(amount);
            }
        });
    }

    let result: CurrencyObject[] | string[] = Object.keys(grouped).map((codeCurrency) => ({
        amount: grouped[codeCurrency],
        codeCurrency: codeCurrency,
    }));
    result = result.filter(obj => typeof obj.amount === 'number' && obj.amount !== 0);
    //result = result.map((obj)=> `${obj.amount} ${obj.codeCurrency}`)

    return result;
}


interface discountProps {
    descuento: ObjectTotalToPay;
}

const DiscountPrice: FC<discountProps> = ({ descuento }) => {
    // Extraer el número y la moneda de la cadena
    return (
        <p className="font-semibold">
            {`${formatearDinero(descuento?.amount)} ${descuento?.codeCurrency}`}
        </p>
    )
}

interface discountPercentProps {
    price: number,
    codeCurrency: string;
}

const discountPercent = (descuento: number, prices: discountPercentProps[]) => {
    // Extraer el número y la moneda de la cadena
    //prices = {price: 1000, codeCurrency: 'CUP'} []
    let porcientosAplicados = aplicarPorcentaje(prices, descuento);
    //porcientosAplicados = {price: 500, codeCurrency: 'CUP'} []
    let arrayPrices = priceCalculator(porcientosAplicados);
    return (
        arrayPrices
    )
}

interface ObjetoMoneda {
    price: number;
    codeCurrency: string;
}


function obtenerCouponesUnicos(arrayDeObjetos: any) {
    let couponesUnicos: any[] = [];

    arrayDeObjetos.forEach((objeto: any) => {
        const coupon = objeto.coupons;

        if (coupon) {
            // Si el coupon no es null ni undefined
            const nombreCompleto = Array.isArray(coupon) && coupon.length > 0 ? getCouponesUnicos(coupon) : 'Sin Coupon'
            if (!couponesUnicos.includes(nombreCompleto)) {
                if (Array.isArray(nombreCompleto)) {
                    couponesUnicos = couponesUnicos.concat(nombreCompleto);
                } else {
                    couponesUnicos.push(nombreCompleto);
                }

            }
        } else {
            // Si el coupon es null o undefined
            if (!couponesUnicos.includes('Sin Coupon')) {
                couponesUnicos.push('Sin Coupon');
            }
        }
    });

    couponesUnicos = couponesUnicos.filter((valor, indice) => {
        return couponesUnicos.indexOf(valor) === indice;
    });

    return couponesUnicos;
}

function getCouponesUnicos(arrayDeObjetos: any) {
    const couponesUnicos: string[] = [];
    arrayDeObjetos.forEach((objeto: any) => {
        if (objeto.code) {
            couponesUnicos.push(objeto.code);
        }
    });

    return couponesUnicos;
}

function moverSinCouponAlFinal(arrayDeStrings: string[]) {
    const indexSinNombre = arrayDeStrings.findIndex(str => str === 'Sin Coupon');

    if (indexSinNombre !== -1) {
        // Si se encuentra 'Sin nombre', lo elimina y lo agrega al final
        const sinNombre = arrayDeStrings.splice(indexSinNombre, 1)[0];
        arrayDeStrings.push(sinNombre);
    }

    return arrayDeStrings;
}

function agruparPorCoupon(objetos: any, valoresCoupones: string[]) {
    const resultados: any = [];

    valoresCoupones.forEach((code) => {
        let objetosConCoupon: any = [];

        if (code === 'Sin Coupon') {
            // Agrupa los valores null y undefined bajo 'Sin nombre'
            objetosConCoupon = objetos.filter((objeto: any) => objeto.coupons.length === 0);
        } else {
            // Agrupa por el valor del cliente normalmente
            objetosConCoupon = objetos.filter((objeto: any) => existeCodigoEnArray(objeto?.coupons, code));
        }

        resultados.push(objetosConCoupon);
    });

    return resultados;
}

interface ObjetoConCode {
    code: string;
    // Otras propiedades si las tienes
}

function existeCodigoEnArray(array: ObjetoConCode[], codigoBuscado: string): boolean {
    return array.some(objeto => objeto.code === codigoBuscado);
}



function totalCalculator(subtotals: any) {
    let comisiones, propina: any, descuento: any, subtotal: any, total: any, totalPagado: any, costos: any;

    //comisiones
    comisiones = subtotals.reduce((acumulador: number, objeto: any) => {
        const valorCosto = parseFloat(objeto.comisiones);

        // Verificar si el valor es un número antes de sumarlo
        if (!isNaN(valorCosto)) {
            return acumulador + valorCosto;
        } else {
            return acumulador;
        }
    }, 0);

    //costos
    costos = subtotals.reduce((acumulador: number, objeto: any) => {
        const valorCosto = parseFloat(objeto.costos);

        // Verificar si el valor es un número antes de sumarlo
        if (!isNaN(valorCosto)) {
            return acumulador + valorCosto;
        } else {
            return acumulador;
        }
    }, 0);


    //discount
    descuento = [];
    subtotals.forEach((objeto: any) => descuento.push(objeto.descuento));
    descuento = descuento.flat();
    descuento = groupAndSumByCurrency(descuento);


    //propina
    propina = [];
    subtotals.forEach((objeto: any) => propina.push(objeto.propina));
    propina = groupAndSumByCurrency(propina);

    //Subtotal

    //Subtotal
    subtotal = [];
    subtotals.forEach((objeto: any) => subtotal.push(objeto.subtotal));
    subtotal = subtotal.flat();
    subtotal = groupAndSumByCurrency(subtotal);


    //total
    total = [];
    subtotals.forEach((objeto: any) => total.push(objeto.total));
    total = total.flat();
    total = groupAndSumByCurrency(total);


    //Total Pagado
    totalPagado = [];
    subtotals.forEach((objeto: any) => totalPagado.push(objeto.totalPagado));
    totalPagado = totalPagado.flat();
    totalPagado = groupAndSumByCurrency(totalPagado);

    return { comisiones, propina, descuento, subtotal, total, totalPagado, costos };
}

interface PaymentObject {
    amount: number;
    codeCurrency: string;
    paymentWay: string;
}

function calcularTotales(arrayOriginal: PaymentObject[]): PaymentObject[] {
    // Objeto para almacenar los totales
    let totales: { [clave: string]: PaymentObject } = {};

    // Iterar sobre el array original y calcular los totales
    arrayOriginal.forEach(objeto => {
        // Crear una clave única basada en codeCurrency y paymentWay
        const clave: string = `${objeto.codeCurrency}-${objeto.paymentWay}`;

        // Si la clave ya existe, sumar el amount al total existente
        if (totales[clave]) {
            totales[clave].amount += objeto.amount;
        } else {
            // Si la clave no existe, crear un nuevo objeto en totales
            totales[clave] = {
                amount: objeto.amount,
                codeCurrency: objeto.codeCurrency,
                paymentWay: objeto.paymentWay,
            };
        }
    });

    // Convertir el objeto de totales de nuevo a un array
    let resultado: PaymentObject[] = Object.values(totales);

    return resultado;
}

function formatearDinero(cifra: number): string {
    // Verificar si la cifra tiene decimales
    if (cifra % 1 !== 0) {
        return cifra.toLocaleString();
    } else {
        return `${cifra.toLocaleString()},00`;
    }
}
















