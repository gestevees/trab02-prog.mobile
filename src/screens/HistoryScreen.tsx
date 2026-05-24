import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity, // ADICIONADO: Para criar o efeito de clique no card
  Linking,          // ADICIONADO: Para abrir o aplicativo de mapas nativo
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";
import { JSX } from "react/jsx-runtime";

const STORE_KEY = "@scanned_qrcodes";

// Interface atualizada para conter o campo urlOriginal opcional
interface ScannedRecord {
  id: number;
  data: string;
  timestamp: string;
  urlOriginal?: string; // ADICIONADO: Mapeia o link que salvamos no ConfirmationScreen
}

type HistoryScreenProps = StackScreenProps<RootStackParamList, "History">;

export default function HistoryScreen({}: HistoryScreenProps): JSX.Element {
  const [records, setRecords] = useState<ScannedRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchRecords = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const existingData = await AsyncStorage.getItem(STORE_KEY);
      const dataArray: ScannedRecord[] = existingData
        ? JSON.parse(existingData)
        : [];
      setRecords(dataArray.sort((a, b) => b.id - a.id));
    } catch (e) {
      console.error("Erro ao carregar o histórico:", e);
      setRecords([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, []),
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchRecords();
  }, []);

  // ADICIONADO: Função responsável por disparar o app de mapas do celular
  const abrirMapaCelular = async (url?: string) => {
    if (!url) {
      Alert.alert("Aviso", "Este registro não possui coordenadas para abrir no mapa.");
      return;
    }

    try {
      const suportado = await Linking.canOpenURL(url);
      if (suportado) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Erro", "Não foi possível abrir este link de mapa no dispositivo.");
      }
    } catch (error) {
      console.error("Erro ao tentar abrir o mapa:", error);
    }
  };

  // MODIFICADO: Trocamos o <View> raiz por <TouchableOpacity> e adicionamos a estilização condicional
  const renderItem = ({ item }: { item: ScannedRecord }) => (
    <TouchableOpacity 
      onPress={() => abrirMapaCelular(item.urlOriginal)}
      activeOpacity={0.7}
    >
      <View style={styles.itemContainer}>
        {item.urlOriginal ? (
          // Layout customizado para a SUA parte de geolocalização
          <>
            <Text style={[styles.dataHeader, { color: "#28a745" }]}>
              🗺️ Localização (Toque para abrir no Mapa)
            </Text>
            <Text style={styles.dataContent}>{item.data}</Text>
          </>
        ) : (
          // Layout original mantido para o restante do grupo
          <>
            <Text style={styles.dataHeader}>Dados do QR Code:</Text>
            <Text style={styles.dataContent} numberOfLines={1}>
              {item.data}
            </Text>
          </>
        )}
        <Text style={styles.timestamp}>
          Salvo em: {new Date(item.timestamp).toLocaleDateString()} às{" "}
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && records.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Carregando Histórico...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {records.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Nenhum registro de QR Code encontrado.
          </Text>
          <Text style={styles.emptySubText}>
            Escaneie um código para começar.
          </Text>
        </View>
      ) : (
        <FlatList<ScannedRecord>
          data={records}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  listContent: {
    padding: 10,
  },
  itemContainer: {
    backgroundColor: "#ffffff",
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dataHeader: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6c757d",
    marginBottom: 4,
  },
  dataContent: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007bff",
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#6c757d",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#007bff",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#343a40",
  },
  emptySubText: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 5,
  },
});