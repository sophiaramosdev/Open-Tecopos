import { View, Text, StyleSheet } from "@react-pdf/renderer";

const headerStyle = StyleSheet.create({
  h1: {
    color: "#1e293b",
    fontSize: 14,
  },
  h2: {
    borderTop: "solid",
    borderTopColor: "#334155",
    borderTopWidth: 1,
    color: "#334155",
    fontSize: 10,
    marginTop:2,
    paddingTop:2,
    marginBottom: 15,
    width:"80%"
  },
});
const DocumentHeader = ({
  text,
  subtext,
}: {
  text: string;
  subtext?: string;
}) => {
  return (
    <>
      <View style={headerStyle.h1}>
        <Text>{text}</Text>
      </View>

      <View style={headerStyle.h2}>{!!subtext && <Text>{subtext}</Text>}</View>
    </>
  );
};

export default DocumentHeader;
