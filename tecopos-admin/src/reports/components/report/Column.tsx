import { StyleSheet, View } from '@react-pdf/renderer';
import { ReactNode } from 'react';
import { Style } from '@react-pdf/types';

const styles = StyleSheet.create({
  column: {
    display: 'flex',
    justifyContent: 'center',
    height: '100%',
  },
});

const Column = ({
  style,
  children,
}: {
  style: Style | Style[];
  children?: ReactNode;
}) => {
  const extraStyles = Array.isArray(style) ? style : [style];
  return (
    <View style={[...extraStyles, styles.column]}>
      {children}
    </View>
  );
};
export default Column;
