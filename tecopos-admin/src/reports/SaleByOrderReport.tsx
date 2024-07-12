import DocumentPage from "../components/pdf/DocumentPage";
import TableTemplate from "../components/pdf/TableTemplate";
import { StyleSheet, View, Text } from "@react-pdf/renderer";
import {  SalaryReportPersons } from "../interfaces/ServerInterfaces";

interface PdfOrderInterface {
  data: SalaryReportPersons[];
  codeCurrency: string;
  totalVendido: string;
  totalIngresado: string; 
  tips: string; 
  consumoCasa: string; 
  envios: string; 
  descuentos: string; 
  comisiones: string;
}


const styles = StyleSheet.create({
  nowrap: {
    display: "flex",
    flexWrap: "nowrap",
    marginBottom: 1,
    marginTop: 1,
  },
  flexCol: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start"
  },
  subtotalRow: {
    color: "#ffffff",
    backgroundColor: "#777777",
    padding: 2
  },
  h2: {
    fontSize: 12,
  },
  width: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  }

});

const SaleByOrderReport = ({ data, totalVendido, totalIngresado, tips, consumoCasa, envios, descuentos, comisiones }: any) => {

  return (
    <DocumentPage orientation={"landscape"}>

      <View>
        <Text>Reporte de Ventas</Text>
        <Text> </Text>
        <Text style={styles.h2}>Total vendido: {totalVendido}   </Text>
        <Text style={styles.h2}>Total Ingresado: {totalIngresado}   </Text>
        <Text style={styles.h2}>Propinas: {tips}</Text>
        <Text style={styles.h2}>Consumo casa: {consumoCasa}</Text>
        <Text style={styles.h2}>Envios: {envios}</Text>
        <Text style={styles.h2}>Descuentos: {descuentos}</Text>
        <Text style={styles.h2}>Comisiones: {comisiones}</Text>
      </View>

      <View>
        <TableTemplate
          data={data || []}
        />
      </View>

    </DocumentPage>
  )
}

export default SaleByOrderReport
