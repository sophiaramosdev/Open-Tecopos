import { ReactNode } from 'react'
import { Document, Page } from '@react-pdf/renderer'

interface DocumentPageInterface {
  children: ReactNode;
  orientation?: any | undefined;
}

const DocumentPage = ({ children, orientation }: DocumentPageInterface) => {
  return (
    <Document>
      <Page style={{ paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 }} wrap orientation={orientation ? orientation : "portrait"}>
        {children}
      </Page>
    </Document>
  )
}

export default DocumentPage
