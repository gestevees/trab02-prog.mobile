import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";
import { JSX } from "react/jsx-runtime";

// Serviços e Tipos
import { getCart, removeFromCart, clearCart, CartItem } from "./services/cartService";

type CartScreenProps = StackScreenProps<RootStackParamList, "Cart">;

export default function CartScreen({ navigation }: CartScreenProps): JSX.Element {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // -------------------------------------------------------
  // FUNÇÃO: Carregar itens do carrinho
  // -------------------------------------------------------
  const fetchCartItems = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const items = await getCart();
      setCartItems(items);
    } catch (error) {
      console.error("Erro ao carregar itens do carrinho:", error);
      Alert.alert("Erro", "Não foi possível carregar os itens do carrinho.");
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega os dados sempre que a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      fetchCartItems();
    }, []),
  );

  // -------------------------------------------------------
  // FUNÇÃO: Remover um item específico
  // -------------------------------------------------------
  const handleRemoveItem = async (idProduto: number, nome: string): Promise<void> => {
    Alert.alert(
      "Remover Item",
      `Deseja remover "${nome}" do carrinho?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            try {
              await removeFromCart(idProduto);
              await fetchCartItems(); // Recarrega os itens do carrinho
            } catch (error) {
              Alert.alert("Erro", "Não foi possível remover o item.");
            }
          },
        },
      ],
    );
  };

  // -------------------------------------------------------
  // FUNÇÃO: Zerar/Esvaziar o carrinho
  // -------------------------------------------------------
  const handleClearCart = async (): Promise<void> => {
    Alert.alert(
      "Zerar Carrinho 🛒",
      "Tem certeza de que deseja esvaziar completamente o seu carrinho de compras?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Zerar",
          style: "destructive",
          onPress: async () => {
            try {
              await clearCart();
              setCartItems([]);
              Alert.alert("Esvaziado!", "Seu carrinho de compras foi zerado.");
            } catch (error) {
              Alert.alert("Erro", "Não foi possível esvaziar o carrinho.");
            }
          },
        },
      ],
    );
  };

  // -------------------------------------------------------
  // CÁLCULO DINÂMICO DO TOTAL (Cálculos Aritméticos)
  // -------------------------------------------------------
  const calcularTotal = (): number => {
    return cartItems.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  };

  // -------------------------------------------------------
  // RENDERIZAÇÃO: Item da Lista
  // -------------------------------------------------------
  const renderItem = ({ item }: { item: CartItem }) => {
    const subtotal = item.preco * item.quantidade;
    return (
      <View style={styles.cardContainer}>
        <View style={styles.cardInfo}>
          <Text style={styles.productName}>{item.nome}</Text>
          <Text style={styles.productDetails}>
            R$ {item.preco.toFixed(2)} × {item.quantidade}
          </Text>
          <Text style={styles.subtotalText}>
            Subtotal: <Text style={styles.subtotalValue}>R$ {subtotal.toFixed(2)}</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.id_produto, item.nome)}
          activeOpacity={0.7}
        >
          <Text style={styles.removeButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading && cartItems.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ff6600" />
        <Text style={styles.loadingText}>Carregando carrinho...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {cartItems.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Seu carrinho está vazio.</Text>
          <Text style={styles.emptySubText}>
            Escaneie QR Codes de produtos comerciais para adicioná-los aqui!
          </Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate("Scanner")}
            activeOpacity={0.8}
          >
            <Text style={styles.scanButtonText}>Escanear Produto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.flexContainer}>
          {/* Cabeçalho de Ação */}
          <View style={styles.headerRow}>
            <Text style={styles.itemsCount}>
              {cartItems.length} {cartItems.length === 1 ? "produto" : "produtos"} no carrinho
            </Text>
            <TouchableOpacity
              style={styles.clearCartButton}
              onPress={handleClearCart}
              activeOpacity={0.7}
            >
              <Text style={styles.clearCartButtonText}>🗑️ Zerar Carrinho</Text>
            </TouchableOpacity>
          </View>

          {/* Listagem dos Itens */}
          <FlatList<CartItem>
            data={cartItems}
            keyExtractor={(item) => item.id_produto.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Rodapé com Cálculo Dinâmico do Total */}
          <View style={styles.footerContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Geral:</Text>
              <Text style={styles.totalPrice}>
                R$ {calcularTotal().toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.backHomeButton}
              onPress={() => navigation.popToTop()}
              activeOpacity={0.8}
            >
              <Text style={styles.backHomeButtonText}>Voltar para o Início</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  flexContainer: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#ff6600",
    fontWeight: "600",
  },
  emptyIcon: {
    fontSize: 70,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#343a40",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  scanButton: {
    backgroundColor: "#ff6600",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  scanButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  itemsCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6c757d",
  },
  clearCartButton: {
    backgroundColor: "#ffe3e3",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  clearCartButtonText: {
    color: "#dc3545",
    fontSize: 13,
    fontWeight: "bold",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  cardContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 16,
    marginVertical: 6,
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardInfo: {
    flex: 1,
    paddingRight: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 6,
  },
  subtotalText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
  },
  subtotalValue: {
    color: "#ff6600",
    fontWeight: "bold",
  },
  removeButton: {
    backgroundColor: "#f8f9fa",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  removeButtonText: {
    fontSize: 16,
  },
  footerContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#dee2e6",
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#343a40",
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ff6600",
  },
  backHomeButton: {
    backgroundColor: "#6c757d",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  backHomeButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
