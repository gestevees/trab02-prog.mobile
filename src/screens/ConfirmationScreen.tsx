import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";
import { JSX } from "react/jsx-runtime";

// Importamos o seu serviço de geolocalização
import { extrairCoordenadas } from "../screens/services/geoService";

// Importamos a função de busca e a interface do arquivo de serviço.
import {
  buscarDadosEstoque,
  Equipamento,
} from "../screens/services/apiService";

const STORE_KEY = "@scanned_qrcodes";

interface ScannedRecord {
  id: number;
  data: string;
  timestamp: string;
  urlOriginal?: string; 
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
  const [loadingAPI, setLoadingAPI] = useState<boolean>(false);
  const [equipamentoDados, setEquipamentoDados] = useState<Equipamento | null>(
    null,
  );

  // -------------------------------------------------------
  // ESTADO NOVO: Controla se o QR Code lido é uma Geolocalização
  // -------------------------------------------------------
  const [isGeoLocation, setIsGeoLocation] = useState<boolean>(false);

  // -------------------------------------------------------
  // FUNÇÃO: storeData (Mantida intacta)
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // FUNÇÃO NOVA: storeGeoData
  // Salva o histórico estruturado especificamente para a Geolocalização [cite: 535]
  // -------------------------------------------------------
  const storeGeoData = async (data: string, lat: string, lng: string): Promise<void> => {
    try {
      const existingData = await AsyncStorage.getItem(STORE_KEY);
      const dataArray: ScannedRecord[] = existingData ? JSON.parse(existingData) : [];

      const newRecord: ScannedRecord = {
        id: Date.now(),
        data: `Latitude: ${lat}\nLongitude: ${lng}`,
        urlOriginal: data, // Salva o link completo para reabrir no histórico [cite: 566]
        timestamp: new Date().toISOString(),
      };

      dataArray.push(newRecord);
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(dataArray));
      setStatus("Localização mapeada e salva offline!"); 
    } catch (e) {
      console.error("Erro ao guardar geolocalização:", e);
      setStatus("Erro ao processar coordenadas."); 
    }
  };

  // -------------------------------------------------------
  // useEffect adaptado com segurança
  // -------------------------------------------------------
  useEffect(() => {
    const processarLeitura = async () => {
      if (!scannedData) return;

      try {
        // Fluxo original do grupo para tentar ler JSON
        const objetoDados = JSON.parse(scannedData);

        if (objetoDados.tipo === "patrimonio" && objetoDados.id_equipamento) {
          setStatus("Buscando dados no sistema de inventário externo...");
          setLoadingAPI(true);

          const resultado = await buscarDadosEstoque(objetoDados.id_equipamento);

          if (resultado) {
            setEquipamentoDados(resultado);
            setStatus("Sucesso! Dados recuperados via API Externa.");
          } else {
            setStatus("Erro: Equipamento não localizado na API de estoque.");
          }

          setLoadingAPI(false);
          return;
        }

        await storeData(scannedData);
      } catch (error) {
        // -------------------------------------------------------
        // INTERCEPÇÃO DA ATIVIDADE 1 - GEOLOCALIZAÇÃO
        // Se o JSON.parse falhar, significa que é texto corrido (pode ser a URL do mapa) [cite: 705]
        // -------------------------------------------------------
        const coords = extrairCoordenadas(scannedData);

        if (coords) {
          // Identificou que é um endereço válido pelo seu geoService!
          setIsGeoLocation(true);
          await storeGeoData(scannedData, coords.latitude, coords.longitude);
        } else {
          // Se não for JSON e nem Mapa, segue o comportamento padrão original do catch
          await storeData(scannedData);
        }
      }
    };

    processarLeitura();
  }, [scannedData]);

  // -------------------------------------------------------
  // RENDERIZAÇÃO (JSX)
  // -------------------------------------------------------
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Resultado da Leitura</Text>

      <View style={styles.statusBox}>
        {(status === "Processando..." || loadingAPI) && (
          <ActivityIndicator size="small" color="#007bff" />
        )}
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {equipamentoDados ? (
        // Componente original do grupo (Ficha técnica)
        <View style={styles.estoqueContainer}>
          <Text style={styles.sectionHeader}>
            📦 Ficha Técnica do Equipamento (API)
          </Text>

          <View style={styles.cardInfo}>
            <Text style={styles.infoLabel}>Identificação:</Text>
            <Text style={styles.infoValue}>{equipamentoDados.title}</Text>

            <Text style={styles.infoLabel}>Código de Patrimônio:</Text>
            <Text style={styles.patrimonioBadge}>
              {equipamentoDados.patrimonio}
            </Text>

            <Text style={styles.infoLabel}>Especificação Técnica:</Text>
            <Text style={styles.infoValueDesc}>{equipamentoDados.body}</Text>
          </View>

          <Text style={styles.actionsHeader}>Ações de Estoque Disponíveis</Text>
          <Button
            title="Conferir Equipamento (API)"
            onPress={() =>
              alert(
                `Inventário confirmed para o patrimônio: ${equipamentoDados.patrimonio}`,
              )
            }
            color="#28a745"
          />
        </View>
      ) : isGeoLocation ? (
        // -------------------------------------------------------
        // RENDERIZAÇÃO DA SUA PARTE (Caso o QR Code seja Geolocalização)
        // -------------------------------------------------------
        <View>
          <Text style={styles.dataLabel}>Coordenadas da Entrega / Ponto Turístico:</Text>
          <Text style={styles.dataText}>{scannedData}</Text>

          <Text style={styles.actionsHeader}>Ações de Geolocalização</Text>
          <Text style={{ fontSize: 14, color: "#6c757d", marginBottom: 15 }}>
            O endereço foi identificado com sucesso. Você pode retornar ao início e acessar o Histórico para abrir a rota em tempo real.
          </Text>
        </View>
      ) : (
        // Componente genérico original do grupo (Texto simples / 4 ações)
        <View>
          <Text style={styles.dataLabel}>Dado Bruto Lido:</Text>
          <Text style={styles.dataText}>{scannedData}</Text>

          <Text style={styles.actionsHeader}>Ações Padrão (4 Ações)</Text>
          <Button
            title="Executar Ação 1"
            onPress={() => alert("Ação 1 executada")}
          />
          <View style={styles.miniSpacer} />
          <Button
            title="Executar Ação 2"
            onPress={() => alert("Ação 2 executada")}
          />
          <View style={styles.miniSpacer} />
          <Button
            title="Executar Ação 3"
            onPress={() => alert("Ação 3 executada")}
          />
          <View style={styles.miniSpacer} />
          <Button
            title="Executar Ação 4"
            onPress={() => alert("Ação 4 executada")}
          />
        </View>
      )}

      <View style={styles.spacer} />
      <Button
        title="Voltar para Início"
        onPress={() => navigation.popToTop()}
        color="#6c757d"
      />
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#ffffff" },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 20, color: "#212529" },
  dataLabel: { fontSize: 16, fontWeight: "600", marginTop: 10 },
  dataText: { fontSize: 15, marginBottom: 20, color: "#007bff", backgroundColor: "#f8f9fa", padding: 10, borderRadius: 5, fontFamily: "monospace" },
  statusBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#e9ecef", padding: 12, borderRadius: 6, marginBottom: 20 },
  statusText: { marginLeft: 10, fontSize: 15, fontWeight: "500", color: "#495057" },
  actionsHeader: { fontSize: 18, fontWeight: "bold", marginVertical: 15, color: "#343a40" },
  estoqueContainer: { backgroundColor: "#fff" },
  sectionHeader: { fontSize: 18, fontWeight: "bold", color: "#007bff", marginBottom: 12 },
  cardInfo: { backgroundColor: "#f8f9fa", borderWidth: 1, borderColor: "#dee2e6", borderRadius: 8, padding: 15, marginBottom: 15 },
  infoLabel: { fontSize: 13, fontWeight: "700", color: "#6c757d", textTransform: "uppercase", marginTop: 8 },
  infoValue: { fontSize: 16, fontWeight: "600", color: "#212529", marginBottom: 4 },
  infoValueDesc: { fontSize: 14, color: "#495057", fontStyle: "italic", lineHeight: 20 },
  patrimonioBadge: { fontSize: 15, fontWeight: "bold", color: "#ffffff", backgroundColor: "#17a2b8", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, alignSelf: "flex-start", marginVertical: 4 },
  miniSpacer: { height: 8 },
  spacer: { height: 30 },
  bottomSpacer: { height: 50 },
});