import * as React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";
import { JSX } from "react";
type HomeScreenProps = StackScreenProps<RootStackParamList, "Home">;
export default function HomeScreen({
  navigation,
}: HomeScreenProps): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo ao Leitor de QR Code</Text>
      <Button
        title="Abrir Câmera para Escanear"
        onPress={() => navigation.navigate("Scanner")}
        color="#007bff"
      />
      <View style={styles.spacer} />
      <Button
        title="Ver Histórico de Registros"
        onPress={() => navigation.navigate("History")}
        color="#28a745"
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    marginBottom: 30,
    fontWeight: "bold",
    textAlign: "center",
  },
  spacer: {
    height: 15,
  },
});
