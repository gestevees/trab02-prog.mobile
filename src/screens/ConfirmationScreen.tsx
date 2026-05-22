import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";
import { JSX } from "react/jsx-runtime";
const STORE_KEY = "@scanned_qrcodes";
interface ScannedRecord {
  id: number;
  data: string;
  timestamp: string;
}
type ConfirmationScreenProps = StackScreenProps<
  RootStackParamList,
  "Confirmation"
>;
export default function ConfirmationScreen({
  route,
  navigation,
}: ConfirmationScreenProps): JSX.Element {
  const { scannedData } = route.params || {
    scannedData: "Dado não disponível",
  };
  const [status, setStatus] = useState<string>("Processando...");
  const storeData = async (data: string): Promise<void> => {
    try {
      const existingData = await AsyncStorage.getItem(STORE_KEY);
      const dataArray: ScannedRecord[] = existingData
        ? JSON.parse(existingData)
        : [];
      const newRecord: ScannedRecord = {
        id: Date.now(),
        data: data,
        timestamp: new Date().toISOString(),
      };

      dataArray.push(newRecord);
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(dataArray));
      setStatus("Sucesso! O dado foi guardado no armazenamento local.");
    } catch (e) {
      console.error("Erro ao guardar o dado:", e);
      setStatus("Falha ao guardar o dado.");
    }
  };
  useEffect(() => {
    if (scannedData) {
      storeData(scannedData);
    }
  }, [scannedData]);
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Resultado da Leitura</Text>
      <Text style={styles.dataLabel}>Dado Lido:</Text>
      <Text style={styles.dataText}>{scannedData}</Text>
      <View style={styles.statusBox}>
        {status === "Processando..." && (
          <ActivityIndicator size="small" color="#007bff" />
        )}
        <Text style={styles.statusText}>{status}</Text>
      </View>
      <Text style={styles.actionsHeader}>Ações Disponíveis (4 Ações)</Text>
      <Button
        title="Executar Ação 1"
        onPress={() => alert("Ação 1 executada")}
      />
      <Button
        title="Executar Ação 2"
        onPress={() => alert("Ação 2 executada")}
      />
      <Button
        title="Executar Ação 3"
        onPress={() => alert("Ação 3 executada")}
      />
      <Button
        title="Executar Ação 4"
        onPress={() => alert("Ação 4 executada")}
      />
      <View style={styles.spacer} />
      <Button
        title="Voltar para Início"
        onPress={() => navigation.popToTop()}
        color="#6c757d"
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#ffffff",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  dataLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
  },
  dataText: {
    fontSize: 16,
    marginBottom: 20,
    color: "#007bff",
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e9ecef",
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  statusText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  actionsHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 15,
  },
  spacer: {
    height: 20,
  },
});
