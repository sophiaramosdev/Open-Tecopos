import { StyleSheet, View } from '@react-pdf/renderer';
import Row from './Row';
import Column from './Column';
import Cell from './Cell';
import globalStyles from '../../helpers/globalStyles';

const styles = StyleSheet.create({
  body: {
    backgroundColor: '#fff',
    width: '100%',
    color: '#000',
  },
  row: {
    minHeight: 22,
  },
  firstColumn: {
    flex: 1,
  },
  spanColumns: {
    borderTop: 1,
    borderColor: '#ccc',
    width: '20%',
  },
  lastSpanColumns: {
    borderTop: 2,
    borderBottom: 2,
    borderColor: '#000',
    width: '20%',
  },
});

const TableCharges = ({
  values,
  widths,
}: {
  values: Array<Array<string>>;
  widths?: Array<number>;
}) => {
  return (
    <View style={[styles.body, globalStyles.space]}>
      {values.map((rows, rowNumber) => (
        <Row style={styles.row} key={rowNumber}>
          {rows.map((column, colNumber) => {
            let columnStyles = {};
            if (colNumber < rows.length - 2) columnStyles = styles.firstColumn;
            else {
              if (rowNumber !== values.length - 1) {
                columnStyles = {
                  ...styles.spanColumns,
                  ...globalStyles.number,
                };
              } else {
                columnStyles = {
                  ...styles.lastSpanColumns,
                  ...globalStyles.number,
                };
              }
              if (colNumber === rows.length - 1)
                columnStyles = {
                  ...columnStyles,
                  alignItems: 'flex-end',
                  paddingRight: 8,
                };

              columnStyles = {
                ...columnStyles,
                width: widths ? widths[colNumber - 1] + '%' : '15%',
              };
            }

            return (
              <Column style={columnStyles} key={colNumber}>
                <Cell data={column} />
              </Column>
            );
          })}
        </Row>
      ))}
    </View>
  );
};

export default TableCharges;
