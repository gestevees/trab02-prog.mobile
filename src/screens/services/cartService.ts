// ==============================================================
// SERVIÇO DE CARRINHO - cartService.ts
// ==============================================================
// Gerencia o carrinho de compras do app, persistindo os itens
// no AsyncStorage com a chave @cart_items.
// Separado do histórico de QR Codes (@scanned_qrcodes) para
// manter as responsabilidades distintas.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProdutoQRData } from './types';

const CART_KEY = '@cart_items';

// ==============================================================
// INTERFACE: CartItem
// ==============================================================
// Representa um item no carrinho. Estende os dados do QR Code
// com quantidade e timestamp de quando foi adicionado.
export interface CartItem {
  id_produto: number;
  nome: string;
  preco: number;
  quantidade: number;
  addedAt: string; // ISO timestamp
}

// ==============================================================
// FUNÇÃO: addToCart
// ==============================================================
// Adiciona um produto ao carrinho. Se o produto já existir
// (mesmo id_produto), incrementa a quantidade em vez de duplicar.
export const addToCart = async (produto: ProdutoQRData): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(CART_KEY);
    const cartArray: CartItem[] = existingData
      ? JSON.parse(existingData)
      : [];

    // Verifica se o produto já existe no carrinho
    const indexExistente = cartArray.findIndex(
      (item) => item.id_produto === produto.id_produto,
    );

    if (indexExistente >= 0) {
      // Produto já existe → incrementa quantidade
      cartArray[indexExistente].quantidade += 1;
    } else {
      // Produto novo → adiciona ao carrinho
      const newItem: CartItem = {
        id_produto: produto.id_produto,
        nome: produto.nome,
        preco: produto.preco,
        quantidade: 1,
        addedAt: new Date().toISOString(),
      };
      cartArray.push(newItem);
    }

    await AsyncStorage.setItem(CART_KEY, JSON.stringify(cartArray));
  } catch (error) {
    console.error('Erro ao adicionar ao carrinho:', error);
    throw error; // Propaga para que a tela possa tratar
  }
};

// ==============================================================
// FUNÇÃO: getCart
// ==============================================================
// Retorna todos os itens do carrinho, ordenados pelo mais recente.
export const getCart = async (): Promise<CartItem[]> => {
  try {
    const existingData = await AsyncStorage.getItem(CART_KEY);
    const cartArray: CartItem[] = existingData
      ? JSON.parse(existingData)
      : [];
    return cartArray.sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
    );
  } catch (error) {
    console.error('Erro ao carregar o carrinho:', error);
    return [];
  }
};

// ==============================================================
// FUNÇÃO: removeFromCart
// ==============================================================
// Remove um item do carrinho pelo id_produto.
export const removeFromCart = async (id_produto: number): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(CART_KEY);
    const cartArray: CartItem[] = existingData
      ? JSON.parse(existingData)
      : [];

    const filtered = cartArray.filter(
      (item) => item.id_produto !== id_produto,
    );

    await AsyncStorage.setItem(CART_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Erro ao remover do carrinho:', error);
    throw error;
  }
};

// ==============================================================
// FUNÇÃO: clearCart
// ==============================================================
// Limpa todos os itens do carrinho.
export const clearCart = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CART_KEY);
  } catch (error) {
    console.error('Erro ao limpar o carrinho:', error);
    throw error;
  }
};
