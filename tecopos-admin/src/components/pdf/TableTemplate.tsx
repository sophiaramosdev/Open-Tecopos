import { View, Text, StyleSheet } from "@react-pdf/renderer";

interface TablePdfInterface {
  tableName?: string;
  data: Record<string, string | number | (string | number)[] | React.ReactNode>[];
  containTotals?: boolean;
  displayTableTitles?: boolean;
}

const TableTemplate = ({
  data,
  tableName,
  containTotals,
  displayTableTitles
}: TablePdfInterface) => {
  let colNumber = 1;
  let titles: string[] = [];
  let body: (string | number | (string | number)[] | React.ReactNode)[][] = [];


  data.forEach((item, idx) => {
    if (idx === 0) {
      titles = Object.keys(item).map((key) => key);
      colNumber = titles.length;
    }
    body.push(Object.values(item).map((body) => body));
  });


  //Styles
  const tableStyles = StyleSheet.create({
    tableTitle: {
      marginTop: 10,
      fontSize: 13,
      fontWeight: "semibold",
      textDecoration: "underline",
    },
    table: {
      marginTop: 5,
      // border: "solid",
      // borderColor: "#9ca3af",
      // borderWidth: 1,
      // borderRadius: 3,
      paddingBottom: 10,
    },
    row: {
      display: "flex",
      flexDirection: "row",
      borderBottom: "solid",
      borderBottomColor: "#7a7a7a",
      borderBottomWidth: 1,
    },
    rowHeader: {
      // borderBottom: "solid",
      // borderBottomColor: "#9ca3af",
      // borderBottomWidth: 2,
      backgroundColor: "#000000",
      color: "#ffffff",
      fontWeight: 500
    },
    col: {
      width: `${Math.floor((1 / colNumber) * 100)}%`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
      padding: 5,
    },
    colx2: {
      width: `${Math.floor(((1 / colNumber) * 100) * 2.5)}%`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
      padding: 5,
    },
    headerText: {
      fontSize: 10,
      fontWeight: 500,
    },
    bodyText: {
      fontSize: 6,
    },
  });
  return (
    <>
      <View style={tableStyles.tableTitle} wrap={false}>
        <Text>{tableName}</Text>
      </View>
      <View style={tableStyles.table}>
        {/**header */}

        {
          (displayTableTitles === true || displayTableTitles === undefined) && (
            <View style={{ ...tableStyles.row, ...tableStyles.rowHeader }}>
              {titles.map((elem, idx) => (
                <View key={idx} style={idx === 0 ? tableStyles.colx2 : tableStyles.col}>
                  <Text style={tableStyles.headerText}>{elem}</Text>
                </View>
              ))}
            </View>
          )
        }


        {/**body */}
        {body.map((elem, idx) => (
          <View
            key={idx}
            style={
              containTotals && idx === body.length - 1
                ? { ...tableStyles.row, backgroundColor: "#cbd5e1", textAlign: "left" }
                : { ...tableStyles.row, textAlign: "left" }
            }
          >
            {elem.map((data, idx) => {
              if (Array.isArray(data)) {
                return (
                  <View key={idx} style={idx === 0 ? tableStyles.colx2 : tableStyles.col}>
                    {data.map((subitm, idx) => (
                      <Text key={idx} style={tableStyles.headerText}>
                        {subitm}
                      </Text>
                    ))}
                  </View>
                );
              }
              return (
                <View
                  key={idx}
                  style={
                    idx !== 0
                      ? { ...tableStyles.col, textAlign: "left" }
                      : { ...tableStyles.colx2, fontWeight: "ultrabold", textAlign: "left" }
                  }
                >
                  <Text style={{ ...tableStyles.headerText, textAlign: "left" }}>{data}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </>
  );
};

export default TableTemplate;
