import { StyleSheet, View } from '@react-pdf/renderer';
import Row from './Row';
import Column from './Column';
import Cell from './Cell';
import globalStyles from '../../helpers/globalStyles';
import { Style } from '@react-pdf/types';

const styles = StyleSheet.create({
  body: {
    backgroundColor: '#fff',
    width: '100%',
    color: '#000',
  },
  row: {},
});

const TableBody = ({
  values,
  widths,
  valueRowStyle,
}: {
  values: Array<Array<string>>;
  widths: Array<number>;
  valueRowStyle?: Record<number, Style>;
}) => {
  return (
    <View style={styles.body}>
      {values.map((rows, index) => {
        const maxWidthForFirstColumn =
          100 - (widths?.reduce((partialSum, a) => partialSum + a, 0) || 0);
        return (
          <Row
            style={{
              borderBottom: 1,
              borderColor: '#ccc',
              ...valueRowStyle?.[index],
            }}
            key={index}
          >
            {rows.map((column, index) => {
              const [, style] =
                typeof column === 'string' ? column.split('~') : [];
              return (
                <Column
                  style={
                    index === 0
                      ? [
                          globalStyles.firstColumn,
                          { maxWidth: maxWidthForFirstColumn + '%' },
                        ]
                      : [
                          index !== rows.length - 1
                            ? globalStyles.nColumn
                            : globalStyles.lastColumn,
                          { width: widths ? widths[index - 1] + '%' : '15%' },
                          globalStyles[style as keyof typeof globalStyles],
                        ]
                  }
                  key={index}
                >
                  <Cell data={column} />
                </Column>
              );
            })}
          </Row>
        );
      })}
    </View>
  );
};
export default TableBody;
