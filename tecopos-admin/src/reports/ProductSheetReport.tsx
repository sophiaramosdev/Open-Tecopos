import {
  BusinessInterface,
  ProductInterface,
} from '../interfaces/ServerInterfaces';
import { productTypes } from '../utils/staticData';
import { formatCurrency } from '../utils/helpers';
import { translateMeasure } from '../utils/translate';
import Report from './components/Report';

interface ProductSheetReportProps {
  reportName: string;
  businessData: BusinessInterface;
  reportData: ProductInterface;
}

const ProductSheetReport = ({
  reportName,
  businessData,
  reportData,
}: ProductSheetReportProps) => {
  const subsection: Record<string, any> = {
    'Nombre:': reportData.name,
  };
  reportData.description &&
    (subsection['Descripción:'] = reportData.description);
  reportData.salesCategory &&
    (subsection['Categoría de venta:'] = reportData.salesCategory.name);
  reportData.productCategory &&
    (subsection['Categoría de almacén:'] = reportData.productCategory.name);
  reportData.prices.length &&
    (subsection['Precios:'] = reportData.prices.map((price) =>
      formatCurrency(price.price, price.codeCurrency)
    ));

  let totalRawMaterialCosts = 0;
  const rawMaterialCosts = reportData.supplies.length
    ? reportData.supplies.map((supply) => {
        const unitCost = supply.supply.averageCost * supply.quantity;
        totalRawMaterialCosts += unitCost;
        return [
          supply.supply.name,
          //@ts-ignore
          productTypes.find((type) => {
            return type.id === supply.supply.type;
          }).name,
          supply.quantity.toString(),
          translateMeasure(supply.supply.measure),
          formatCurrency(unitCost, businessData.costCurrency ?? 'CUP'),
        ];
      })
    : [];

  let totalFixedCosts = 0;
  const fixedCosts = reportData.fixedCosts.length
    ? reportData.fixedCosts.map((cost) => {
        totalFixedCosts += cost.costAmount;
        return [
          cost.description,
          formatCurrency(cost.costAmount, businessData.costCurrency ?? 'CUP'),
        ];
      })
    : [];

  let data: Array<any> = [
    `${reportName}~title`,
    'titleSeparator',
    {
      display: 'section',
      widths: [[25, 1]],
      subsections: [subsection],
    },
  ];
  data = rawMaterialCosts.length
    ? data.concat([
        'sectionSeparator',
        'COSTO TOTAL: ' +
          formatCurrency(
            totalRawMaterialCosts,
            businessData.costCurrency ?? 'CUP'
          ),
        'titleSeparator',
        'Costos de materia prima',
        'titleSeparator',
        {
          display: 'table',
          widths: [15, 15, 10, 15],
          headers: ['Producto', 'Tipo', 'Cantidad', 'U/M', ''],
          values: rawMaterialCosts,
          totals: totalRawMaterialCosts && [
            'Subtotal~subtitle',
            '',
            '',
            '',
            formatCurrency(
              totalRawMaterialCosts,
              businessData.costCurrency ?? 'CUP'
            ) + '~number',
          ],
        },
      ])
    : data;

  data = fixedCosts.length
    ? data.concat([
        'sectionSeparator',
        'Costos fijos',
        'titleSeparator',
        {
          display: 'table',
          widths: [15],
          headers: ['Descripción', 'Monto'],
          values: fixedCosts,
          totals: totalFixedCosts && [
            'Subtotal',
            formatCurrency(
              totalFixedCosts,
              businessData.costCurrency ?? 'CUP'
            ) + '~number',
          ],
          rawMaterialCosts,
        },
      ])
    : data;

  return (
    <Report
      reportName={reportName}
      headerData={businessData}
      reportData={data}
    />
  );
};
export default ProductSheetReport;
