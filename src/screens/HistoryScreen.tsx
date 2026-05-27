import * as React from "react";
import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "../../App";

type HistoryScreenProps = StackScreenProps<RootStackParamList, "History">;

interface ScannedRecord {
  id: number;
  nome: string;
  descricao: string;
  valor: number;
  timestamp: string;
  data?: string;
}

const STORE_KEY = "@scanned_qrcodes";

// Helper: mostra confirmação no web (window.confirm) e no nativo (Alert.alert)
const confirmar = (titulo: string, mensagem: string, onConfirm: () => void) => {
  if (Platform.OS === "web") {
    if (window.confirm(`${titulo}\n\n${mensagem}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(titulo, mensagem, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", style: "destructive", onPress: onConfirm },
    ]);
  }
};

export default function HistoryScreen({}: HistoryScreenProps): JSX.Element {
  const [records, setRecords] = useState<ScannedRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Função para extrair dados do JSON do QR code
  const extrairDadosQRCode = (item: any): ScannedRecord => {
    // --- CASO 1: produto salvo pela ConfirmationScreen via handleAddToCart ---
    // O record tem tipo="produto" e campos nome/preco diretamente na raiz
    if (item.tipo === "produto") {
      // Tenta pegar nome e preco direto dos campos raiz (salvos pelo cartService)
      const nomeRaiz = item.nome || item.nomeProduto;
      const valorRaiz =
        typeof item.preco === "number"
          ? item.preco
          : typeof item.valor === "number"
            ? item.valor
            : null;

      if (nomeRaiz && valorRaiz !== null) {
        return {
          id: item.id,
          nome: nomeRaiz,
          descricao: item.id_produto ? `ID: ${item.id_produto}` : "Produto",
          valor: valorRaiz,
          timestamp: item.timestamp,
          data: item.data,
        };
      }

      // Tenta parsear o campo data como JSON (outro formato possível)
      if (item.data && typeof item.data === "string") {
        try {
          const parsed = JSON.parse(item.data);
          if (parsed.nome || parsed.preco) {
            return {
              id: item.id,
              nome: parsed.nome || "Produto sem nome",
              descricao: parsed.id_produto ? `ID: ${parsed.id_produto}` : "Produto",
              valor: typeof parsed.preco === "number" ? parsed.preco : 0,
              timestamp: item.timestamp,
              data: item.data,
            };
          }
        } catch (_) {}
      }
    }

    // --- CASO 2: item salvo com campo data como JSON do QR code ---
    if (item.data && typeof item.data === "string") {
      try {
        const parsed = JSON.parse(item.data);
        if (parsed.tipo === "produto") {
          return {
            id: item.id,
            nome: parsed.nome || "Produto sem nome",
            descricao: `ID: ${parsed.id_produto || "N/A"}`,
            valor: typeof parsed.preco === "number" ? parsed.preco : 0,
            timestamp: item.timestamp,
            data: item.data,
          };
        }
      } catch (_) {}
    }

    // --- CASO 3: fallback genérico ---
    return {
      id: item.id,
      nome: item.nome || "Sem nome",
      descricao: item.descricao || item.data || "Sem descrição",
      valor: typeof item.valor === "number" ? item.valor : 0,
      timestamp: item.timestamp,
      data: item.data,
    };
  };

  const fetchRecords = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const storedValue = await AsyncStorage.getItem(STORE_KEY);
      const parsed = storedValue ? JSON.parse(storedValue) : [];

      const converted = Array.isArray(parsed)
        ? parsed.map((item: any) => extrairDadosQRCode(item))
        : [];

      setRecords(converted.sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
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

  const deleteItem = (id: number) => {
    console.log("Deletando item com ID:", id);
    confirmar(
      "Deletar item",
      "Tem certeza que deseja deletar este item?",
      async () => {
        try {
          console.log("Confirmado delete, filtrando array...");
          const filtered = records.filter((item) => item.id !== id);
          console.log("Array após filtro:", filtered);
          setRecords(filtered);
          await AsyncStorage.setItem(STORE_KEY, JSON.stringify(filtered));
          console.log("Item deletado com sucesso");
        } catch (error) {
          console.error("Erro ao deletar item:", error);
        }
      },
    );
  };

  const clearAllItems = () => {
    confirmar(
      "Limpar Histórico",
      "Tem certeza que deseja deletar TODOS os itens?",
      async () => {
        try {
          setRecords([]);
          await AsyncStorage.setItem(STORE_KEY, JSON.stringify([]));
        } catch (error) {
          console.error("Erro ao limpar:", error);
        }
      },
    );
  };

  const calcularTotalCarrinho = () => {
    return records.reduce((soma, item) => {
      const valor = typeof item.valor === "number" ? item.valor : 0;
      return soma + valor;
    }, 0);
  };

  const renderItem = ({ item }: { item: ScannedRecord }) => {
    const valor = typeof item.valor === "number" ? item.valor : 0;
    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemContent}>
          <Text style={styles.dataHeader}>Item:</Text>
          <Text style={styles.dataContent}>{item.nome}</Text>
          <Text style={styles.descriptionText}>{item.descricao}</Text>
          <Text style={styles.valorText}>R$ {valor.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            console.log("Clicou no botão delete para ID:", item.id);
            deleteItem(item.id);
          }}
          activeOpacity={0.6}
        >
          <Text style={styles.deleteButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading && records.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Carregando histórico...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Área scrollável — ocupa todo espaço disponível */}
      <View style={styles.listArea}>
        {records.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Nenhum produto salvo.</Text>
            <Text style={styles.emptySubText}>
              Escaneie um QR Code para salvar produtos.
            </Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={clearAllItems}
            >
              <Text style={styles.clearAllButtonText}>🗑️ Limpar Histórico</Text>
            </TouchableOpacity>

            {/* FlatList com style flex:1 — essencial para scroll no Expo Web */}
            <FlatList<ScannedRecord>
              style={styles.flatList}
              data={records}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={true}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
              }
            />
          </>
        )}
      </View>

      {/* Barra do totalizador — filho normal do flex, fica sempre no rodapé */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total do carrinho</Text>
        <Text style={styles.totalValue}>
          R$ {calcularTotalCarrinho().toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    flexDirection: "column",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  // Ocupa todo o espaço vertical restante acima do totalContainer
  listArea: {
    flex: 1,
  },
  // flex:1 no próprio FlatList é obrigatório para scroll no Expo Web
  flatList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  itemContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 16,
    marginVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
    marginRight: 12,
  },
  dataHeader: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  dataContent: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 13,
    color: "#555",
    marginBottom: 8,
  },
  valorText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#28a745",
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 45,
    minHeight: 45,
  },
  deleteButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  clearAllButton: {
    backgroundColor: "#dc3545",
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  clearAllButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  // Sem position:absolute — é filho normal, sempre visível no rodapé
  totalContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#28a745",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#007bff",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },
});
