import { StyleSheet, Text, View } from '@react-pdf/renderer';
import globalStyles from '../../helpers/globalStyles';

const styles = StyleSheet.create({
  cell: {
    marginHorizontal: 0,
    marginVertical: 4,
    alignItems: 'flex-end',
  },
});

const Cell = ({ data }: { data: string | Record<string, any> }) => {
  const items = !Array.isArray(data) ? [data] : data;
  return (
    <View style={styles.cell}>
      {items.map((item: any, idx) => {
        if (typeof item === 'string') {
          const [value, style] = item.split('~');
          return (
            <Text
            key={idx}
              style={[
                globalStyles[style as keyof typeof globalStyles],
                { textOverflow: 'ellipsis' },
              ]}
            >
              {value}
            </Text>
          );
        } else if (typeof item === 'number') {
          return <Text key={idx}>{item}</Text>;
        }
        return item;
      })}
    </View>
  );
};
export default Cell;
