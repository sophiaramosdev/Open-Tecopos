import moment from 'moment';
import { IpvData } from '../interfaces/Interfaces';
import { BusinessInterface } from '../interfaces/ServerInterfaces';
import Report from './components/Report';
import Icon from './components/report/Icon';
import { translateMeasure } from '../utils/translate';
import { ProductsNormalized } from '../containers/economicCycles/InvetoriesRealTime';

/*interface IpvProductExtended extends IpvProduct {
  variations: IpvProduct[];
}*/

interface IpvDataExtended extends IpvData {
  dateFrom?: string;
  dateTo?: string;
  area: string;
}

interface InventoryStatusReportProps {
  reportName: string;
  businessData: BusinessInterface;
  reportData: {
    products: ProductsNormalized[];
    details: IpvDataExtended;
  };
}

const InventoryStatusReport = ({
  reportName,
  businessData,
  reportData,
}: InventoryStatusReportProps) => {
  const products: Array<any> = [];
  reportData.products?.forEach((item) => {
    products.push([
      item.category?.name + '~subtitle',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
    item.products?.length &&
      item.products.forEach((product) => {
        products.push([
          product.name + '~indexed',
          translateMeasure(product.measure),
          product.initial,
          product.entry,
          product.movements,
          product.outs,
          product.waste,
          product.processed,
          product.sales,
          product.inStock,
        ]);
        product.variations?.length &&
          product.variations.forEach((variation) =>
            products.push([
              '-    ' + variation.name + '~indexed',
              translateMeasure(product.measure),
              variation.initial,
              variation.entry,
              variation.movements,
              variation.outs,
              variation.waste,
              variation.processed,
              variation.sales,
              variation.inStock,
            ])
          );
      });
  });

  const subsections: Record<string, any> = {};
  if (reportData.details.dateFrom)
    subsections['Fecha desde:~subtitle'] = moment(
      reportData.details.dateFrom
    ).format('DD [de] MMMM YYYY');
  if (reportData.details.dateTo)
    subsections['Fecha hasta:~subtitle'] = moment(
      reportData.details.dateTo
    ).format('DD [de] MMMM YYYY');
  if (reportData.details.openAction?.madeBy)
    subsections['Abierto por:~subtitle'] =
      reportData.details.openAction?.madeBy;
  subsections['Área:~subtitle'] = reportData.details.area;

  const data = [
    `${reportName}~title`,
    'titleSeparator',
    {
      display: 'section',
      widths: [[25, 1]],
      subsections: [subsections],
    },
    'sectionSeparator',
    {
      display: 'table',
      widths: [8, 8, 8, 8, 8, 8, 8, 8, 8],
      headers: [
        '',
        <Icon name='scale' viewBox='0 0 640 512' />,
        <Icon name='play' viewBox='0 0 384 512' />,
        <Icon name='signIn' viewBox='0 0 512 512' />,
        <Icon name='dollyBox' viewBox='0 0 576 512' />,
        <Icon name='signOut' viewBox='0 0 512 512' />,
        <Icon name='minusSquare' viewBox='0 0 448 512' />,
        <Icon name='diagramProject' viewBox='0 0 576 512' />,
        <Icon name='cashRegister' viewBox='0 0 512 512' />,
        <Icon name='boxes' viewBox='0 0 576 512' />,
      ],
      values: products,
    },
  ];

  return (
    <Report
      reportName={reportName}
      reportData={data}
      headerData={businessData}
    />
  );
};

export default InventoryStatusReport;
