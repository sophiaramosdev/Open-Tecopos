import Body from './report/Body';
import Layout from './report/Layout';
import { DocumentProps, PageProps } from '@react-pdf/types';

interface ReportProps {
  reportName: string;
  headerData: Record<string, any>;
  reportData: Array<any>;
  reportSettings?: {
    document?: Partial<DocumentProps>;
    page?: Partial<PageProps>;
  };
}

const Report = ({
  reportName,
  headerData,
  reportData,
  reportSettings,
}: ReportProps) => {
  return (
    <Layout
      reportName={reportName}
      reportSettings={reportSettings}
      headerData={headerData}
    >
      <Body data={reportData} />
    </Layout>
  );
};

export default Report;
