import { StyleSheet, Text, View } from '@react-pdf/renderer';
import Section from './Section';
import Table from './Table';
import globalStyles from '../../helpers/globalStyles';
import { Fragment } from 'react';

const styles = StyleSheet.create({
  body: {
    backgroundColor: '#fff',
    color: '#000',
    width: '100%',
    margin: 0,
    padding: 0,
    fontFamily: 'OpenSans',
    fontSize: 9,
    lineHeight: 1.5,
  },
});

const Body = ({ data }: { data: Array<any> }) => {
  const sections = data.map((section, idx) => {
    switch (typeof section) {
      case 'string': {
        if (
          ['titleSeparator', 'sectionSeparator'].some(
            (name) => name === section
          )
        ) {
          return (
            <View key={idx} style={globalStyles[section as keyof typeof globalStyles]} />
          );
        } else {
          const [value, style] = section.split('~');
          return (
            <Text key={idx} style={globalStyles[style as keyof typeof globalStyles]}>
              {value}
            </Text>
          );
        }
      }
      case 'object': {
        switch (section.display) {
          case 'section': {
            return (
              <Section
              key={idx}
                subsections={section.subsections}
                widths={section.widths}
              />
            );
          }
          case 'table': {
            return <Table key={idx} data={section} />;
          }
          default:
            return <Fragment key={idx}></Fragment>;
        }
      }
      default:
        return null;
    }
  });

  return <View style={styles.body}>{sections.map((section) => section)}</View>;
};
export default Body;
