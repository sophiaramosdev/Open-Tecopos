import { StyleSheet, Text } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  pageNumber: {
    position: 'absolute',
    fontSize: 9,
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'grey',
  },
});

const Footer = () => {
  return (
    <Text
      style={styles.pageNumber}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      fixed
    />
  );
};
export default Footer;
