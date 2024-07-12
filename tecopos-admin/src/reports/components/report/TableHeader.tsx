import { StyleSheet, View } from "@react-pdf/renderer";
import Row from "./Row";
import Column from "./Column";
import Cell from "./Cell";
import globalStyles from "../../helpers/globalStyles";
import { Style } from "@react-pdf/types";

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#000000",
    width: "100%",
    color: "#ffffff",
    minHeight: 22,
  },
});

const TableHeader = ({
  values,
  widths,
  headersStyles,
}: {
  values: Array<string>;
  widths?: Array<number>;
  headersStyles?: Array<Style | Style[]>;
}) => {
  return (
    <View style={[styles.header, globalStyles.subtitle]}>
      <Row>
        {values.map((header, index) => {
          const [, style] =
            typeof header === "string" ? header.split("~") : [null, ""];
          return (
            <Column
              key={index}
              style={
                index === 0
                  ? [globalStyles.firstColumn]
                  : [
                      index !== values.length - 1
                        ? globalStyles.nColumn
                        : globalStyles.lastColumn,
                      { width: widths ? widths[index - 1] + "%" : "15%" },
                      globalStyles[style as keyof typeof globalStyles],
                    ]
              }
            >
              <Cell data={header} />
            </Column>
          );
        })}
      </Row>
    </View>
  );
};
export default TableHeader;
