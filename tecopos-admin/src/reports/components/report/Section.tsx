import { StyleSheet, Text, View } from "@react-pdf/renderer";
import globalStyles from "../../helpers/globalStyles";
import { cleanArrayData, getMaxSizeOfStrings } from "../../helpers/commons";

const styles = StyleSheet.create({
  row: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
    gap: 4,
  },
  col: {
    width: "100%",
  },
});

const Section = ({
  subsections,
  widths,
}: {
  subsections: Array<Array<string> | Record<string, string>>;
  widths?: Array<number | Array<number>>;
}) => {
  return (
    <View style={[styles.row, { gap: 20 }]} wrap={false}>
      {subsections?.map((subsection, index) => {
        if (Array.isArray(subsection)) {
          // @ts-ignore
          subsection = cleanArrayData(subsection);
          // @ts-ignore
          const width = widths?.at(index) ? widths[index] : 100;
          return (
            <View
              key={index}
              style={[
                styles.col,
                width !== 1
                  ? {
                      width: `${width}%`,
                    }
                  : { flexGrow: 1 },
              ]}
            >
              {
                // @ts-ignore
                subsection?.map((item: string, idx) => {
                  const [value, customStyle] = item.split("~");
                  // @ts-ignore
                  return (
                    <Text
                      key={idx}
                      style={[
                        globalStyles[customStyle as keyof typeof globalStyles],
                        { flexWrap: "wrap", flexDirection: "row" },
                      ]}
                    >
                      {value}
                    </Text>
                  );
                })
              }
            </View>
          );
        }
        if (typeof subsection === "object") {
          //@ts-ignore
          const [titleColumnWidth, valueColumnWidth] = widths
            ? widths[index as keyof typeof widths]
            : [40, 60];
          const sub = (
            <View style={{ width: "100%" }} key={index}>
              {Object.keys(subsection)?.map((title, idx) => {
                const value = subsection[title as keyof typeof subsection];
                const values = !Array.isArray(value) ? [value] : value;
                const styledTitle = title.split("~");
                return (
                  <View style={styles.col} key={idx}>
                    <View style={[styles.row]}>
                      <Text
                        style={[
                          globalStyles[
                            styledTitle[1] as keyof typeof globalStyles
                          ],
                          { width: titleColumnWidth + "%" },
                        ]}
                      >
                        {styledTitle[0]}
                      </Text>
                      <View
                        style={[
                          styles.col,
                          valueColumnWidth !== 1
                            ? { width: valueColumnWidth + "%" }
                            : { flexGrow: 1 },
                        ]}
                      >
                        {/* @ts-ignore */}
                        {values?.map((value, index) => {
                          const styledValue =
                            typeof value === "string"
                              ? value.split("~")
                              : [value, ""];
                          return (
                            <Text
                              key={index}
                              style={[
                                globalStyles[
                                  styledValue[1] as keyof typeof globalStyles
                                ],
                              ]}
                            >
                              {styledValue[0]}
                            </Text>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
          return sub;
        }
        return subsection;
      })}
    </View>
  );
};

export default Section;
