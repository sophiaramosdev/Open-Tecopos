import { Br, Cut, Line, Printer, Text, Row, render } from 'react-thermal-printer';
import moment from 'moment';
import { EconomicCycle } from '../../interfaces/Interfaces';
import { PriceInvoiceInterface, SelledProducts, SelledReport } from '../../interfaces/ServerInterfaces';
import { formatCurrency } from '../../utils/helpers';

interface printTicketInterface {
    selledReport: SelledReport | null;
    totales: {
        quantity: number;
        totalCost: PriceInvoiceInterface;
        totalSales: PriceInvoiceInterface[];
    };
    ecoCycle: EconomicCycle | null;
    rollSize: number;
}

export const PrintSelledReportTicket = async ({ selledReport, totales, ecoCycle, rollSize: paperDimension }: printTicketInterface) => {


    const width = paperDimension === 80 ? 42 : 30

    // utf8 encoding
    const receipt = (
        <Printer type="epson" width={width}>

            <Text size={{ width: 1, height: 2 }}>Venta por productos</Text>
            <Text >Fecha: {moment(ecoCycle?.openDate).format("DD/MM/YY")}</Text>
            <Br />

            {
                selledReport?.products.map((prod: SelledProducts) => {

                    const totalSale = prod.totalSales.map((sale: { amount: number; codeCurrency: string | null | undefined; }) => {
                        return formatCurrency(sale.amount, sale.codeCurrency)
                    }).join(", ")

                    return (
                        <>
                            <Row
                                left={prod.quantitySales + "U " + (prod.name ?? "-") + " "}
                                right={" " + totalSale}
                            />
                        </>
                    )
                })
            }

            <Line />

            <Row
                left={"Total"}
                right={totales.totalSales.map((sale: { amount: number; codeCurrency: string | null | undefined; }) => {
                    return formatCurrency(sale.amount, sale.codeCurrency)
                }).join(", ")}
            />

            <Br />

            <Cut />

        </Printer>
    );
    const data: Uint8Array = await render(receipt);

    let port = null;


    // Verificar si el puerto ya está abierto
    // @ts-ignore
    const existingPorts = await navigator.serial.getPorts();
    if (existingPorts.length > 0) {
        port = existingPorts[0];
        // toast.warning("El puerto ya está abierto:", port);
    } else {
        // Si el puerto no está abierto, solicitarlo
        //@ts-ignore
        port = await window.navigator.serial.requestPort();
    }

    // Si tenemos un puerto válido, continuar con la escritura
    if (port) {
        if (!port.readable || !port.writable) {
            // Si el puerto no es legible o escribible, abrirlo
            await port.open({ baudRate: 9600 });
        }

        const writer = port.writable?.getWriter();
        if (writer != null) {
            await writer.write(data);
            writer.releaseLock();
        }
    }

}