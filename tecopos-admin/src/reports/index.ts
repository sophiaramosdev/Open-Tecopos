import DispatchReport from './DispatchReport';
import BillReport from './BillReport';
import BillFromPosReport from './BillFromPosReport';
import DeliveryReport from './DeliveryReport';
import FinancialStateReport from './FinancialStateReport';
import FinanceReport from './FinanceReport';
import ProductSheetReport from './ProductSheetReport';
import InventoryStatusReport from './InventoryStatusReport';
import OrderListReport from './OrderListReport';

const Reports = {
  dispatch: DispatchReport, //Despacho
  bill: BillReport, //Factura
  bill_pos: BillFromPosReport, //Factura From POS
  delivery: DeliveryReport, //Albarán
  financial_state: FinancialStateReport, //Estado financiero
  finance: FinanceReport, //Finanza
  product_sheet: ProductSheetReport, //Ficha de producto
  inventory_status: InventoryStatusReport, //Estado de inventario
  order_list: OrderListReport, //Listado de Órdenes
};
export default Reports;
