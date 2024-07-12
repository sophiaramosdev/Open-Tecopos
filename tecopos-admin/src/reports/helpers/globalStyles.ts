import { StyleSheet } from '@react-pdf/renderer';

const globalStyles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontWeight: 'bold',
  },
  space: {
    paddingTop: 14,
  },
  negative: {
    color: 'red',
  },
  positive: {
    color: 'green',
  },
  zero: {
    color: 'gray',
  },
  titleSeparator: {
    paddingTop: 8,
  },
  sectionSeparator: {
    paddingTop: 28,
  },
  indexed: {
    marginLeft: 8,
  },
  firstColumn: {
    flexGrow: 1,
    alignItems: 'flex-start',
    paddingLeft: 8,
    textOverflow: 'ellipsis',
  },
  nColumn: {
    alignItems: 'center',
  },
  lastColumn: {
    alignItems: 'center',
    paddingRight: 8,
  },
  number: {
    alignItems: 'flex-end',
  },
});

export default globalStyles;
