import React, { useState, useEffect, useCallback } from "react";
import { Text, View, StyleSheet } from "react-native";
import { Camera, CameraView, BarcodeScanningResult } from "expo-camera";
import { useFocusEffect } from "@react-navigation/native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";
import { JSX } from "react/jsx-runtime";
type ScannerScreenProps = StackScreenProps<RootStackParamList, "Scanner">;
export default function ScannerScreen({
  navigation,
}: ScannerScreenProps): JSX.Element {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);
  useFocusEffect(
    useCallback(() => {
      // Reseta o estado para permitir nova leitura ao focar na tela
      setScanned(false);
    }, []),
  );
  const handleBarCodeScanned = ({ data }: BarcodeScanningResult): void => {
    if (scanned) {
      return; // Evita múltiplas leituras/navegações
    }
    setScanned(true);
    navigation.navigate("Confirmation", { scannedData: data });
  };
  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Solicitando permissão para a câmera...
        </Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Acesso à câmera negado.</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    textAlign: "center",
    fontSize: 18,
  },
});
