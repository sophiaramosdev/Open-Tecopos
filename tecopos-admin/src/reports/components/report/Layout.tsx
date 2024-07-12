import { ReactNode } from 'react';
import Footer from './Footer';
import { Document, Font, Page, StyleSheet, View } from '@react-pdf/renderer';
import Header from './Header';
import { DocumentProps, PageProps } from '@react-pdf/types';

Font.register({
  family: 'OpenSans',
  fonts: [
    { src: require('../../assets/fonts/OpenSans/OpenSans-Regular.ttf') },
    {
      src: require('../../assets/fonts/OpenSans/OpenSans-Bold.ttf'),
      fontWeight: 'bold',
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 28.9,
    paddingBottom: 57.8,
    paddingHorizontal: 28.9,
  },
});

const Layout = ({
  reportName,
  headerData,
  children,
  reportSettings,
}: {
  reportName: string;
  headerData: any;
  children: ReactNode;
  reportSettings?: {
    document?: Partial<DocumentProps>;
    page?: Partial<PageProps>;
  };
}) => {
  return (
    <Document title={reportName} pdfVersion='1.7' {...reportSettings?.document}>
      <Page size='A4' style={styles.page} wrap {...reportSettings?.page}>
        <Header data={headerData} />
        {children}
        <Footer />
      </Page>
    </Document>
  );
};
export default Layout;
