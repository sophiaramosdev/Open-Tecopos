import { StyleSheet, View } from '@react-pdf/renderer';
import TableHeader from './TableHeader';
import TableBody from './TableBody';
import TableFooter from './TableFooter';
import TableCharges from './TableCharges';
import { Style } from '@react-pdf/types';

const styles = StyleSheet.create({
  table: {
    width: '100%',
  },
});

interface TableProps {
  headers?: Array<string>;
  values: Array<Array<string>>;
  valueRowStyle?: Record<number, Style>;
  totals?: Array<string>;
  charges?: Array<Array<string>>;
  widths: Array<number>;
}

const Table = ({ data }: { data: TableProps }) => {
  return (
    <View style={styles.table}>
      {data.headers && (
        <TableHeader values={data.headers} widths={data.widths} />
      )}
      <TableBody
        values={data.values}
        widths={data.widths}
        valueRowStyle={data.valueRowStyle}
      />
      {data.totals && <TableFooter values={data.totals} widths={data.widths} />}
      {data.charges && (
        <TableCharges values={data.charges} widths={data.widths} />
      )}
    </View>
  );
};
export default Table;
