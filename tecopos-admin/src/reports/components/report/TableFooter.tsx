import { StyleSheet, View } from '@react-pdf/renderer';
import Row from './Row';
import Column from './Column';
import Cell from './Cell';
import globalStyles from '../../helpers/globalStyles';

const styles = StyleSheet.create({
  total: {
    backgroundColor: '#fff',
    width: '100%',
    color: '#000',
  },
  row: {
    borderBottom: 1,
    borderColor: '#ccc',
    minHeight: 28,
  },
});

const TableFooter = ({
  values,
  widths,
}: {
  values: Array<string>;
  widths?: Array<number>;
}) => {
  return (
    <View style={styles.total}>
      <Row style={styles.row}>
        {values.map((value, index) => {
          const [_, style] = typeof value === 'string' ? value.split('~') : [];
          return (
            <Column
              style={
                index === 0
                  ? [globalStyles.firstColumn]
                  : [
                      index !== values.length - 1
                        ? globalStyles.nColumn
                        : globalStyles.lastColumn,
                      { width: widths ? widths[index - 1] + '%' : '15%' },
                      globalStyles[style as keyof typeof globalStyles],
                    ]
              }
            >
              <Cell data={value} />
            </Column>
          );
        })}
      </Row>
    </View>
  );
};
export default TableFooter;
