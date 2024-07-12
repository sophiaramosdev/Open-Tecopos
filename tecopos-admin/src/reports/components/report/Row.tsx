import { StyleSheet, View } from '@react-pdf/renderer';
import { ReactNode } from 'react';
import { Style } from '@react-pdf/types';

const styles = StyleSheet.create({
  row: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    //minHeight: 28,
  },
});

const Row = ({
  style,
  children,
}: {
  style?: Style;
  children: ReactNode;
}) => {
  let allStyles: Style[] = [styles.row];
  style && allStyles.push(style);
  return (
    <View style={allStyles}>
      {children}
    </View>
  );
};
export default Row;
