import { Br, Cut, Line, Printer, Text, Row, render, } from 'react-thermal-printer';
import moment from 'moment';
import { EconomicCycle } from '../../interfaces/Interfaces';
import { printPriceWithCommasAndPeriods } from '../../utils/functions';

interface printTicketInterface {
    cashOperation: never[];
    ecoCycle: EconomicCycle | null;
    rollSize: number;
}

export const PrintCashOperationTicket = async ({ cashOperation, ecoCycle, rollSize: paperDimension }: printTicketInterface) => {


    const width = paperDimension === 80 ? 42 : 30

    // utf8 encoding
    const receipt = (
        <Printer type="epson" width={width}>

            <Text size={{ width: 1, height: 2 }}>Operaciones de caja</Text>
            <Text >Fecha: {moment(ecoCycle?.openDate).format("DD/MM/YY")}</Text>
            <Br />

            {cashOperation.map((operation: any) => (
                <>
                    <Row left={operation?.operationNumber! ?? "-"} right={printPriceWithCommasAndPeriods(operation.amount) + " " + operation.codeCurrency} />
                    <Row left={operation.observations ?? "-"} right={" "} />
                    {/* <Text >{operation.observations}</Text> */}
                    <Line />
                </>
            ))}

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