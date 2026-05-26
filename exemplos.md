# 📸 Guia de Testes: Exemplos de QR Codes

Este guia ensina como gerar e testar os **3 principais modelos de QR Code** aceitos pelo aplicativo (`Mapa`, `Produto` e `Estoque/Patrimônio`).

---

## 🛠️ Onde gerar os QR Codes?
Para testar, você pode usar qualquer gerador de QR Code gratuito na internet. Recomendamos os seguintes:
* [QR Code Generator (br.qr-code-generator.com)](https://qr.io/pt/) — Escolha a opção **Texto** para produtos/estoque, ou **Link** para mapas.

---

## 🗺️ 1. Modelo: Mapa (Geolocalização)

O aplicativo utiliza uma expressão regular flexível que procura por coordenadas de latitude e longitude após o caractere `@` ou `=`. Qualquer link do Google Maps contendo esses caracteres será identificado e mapeado.

### 📝 Como gerar:
No gerador de QR Code, escolha a categoria **Link** ou **Texto** e insira um dos links abaixo.

### 📋 Exemplos Prontos (Copie e Cole):

* **Exemplo A (Grande Canyon - EUA):**

  https://www.google.com/maps/place/Grand+Canyon/@36.0997563,-112.1514534,14z
  
* **Exemplo B (Torre Eiffel - Paris):**

  https://www.google.com/maps/place/Torre+Eiffel/@48.8583701,2.2919064,17z
  
* **Exemplo C (Formato Alternativo com `=`):**

  https://maps.google.com/?q=-23.5505,-46.6333
  

---

## 🛒 2. Modelo: Produto

Para o aplicativo reconhecer o QR Code como um **Produto comercial** e permitir a adição ao carrinho de compras, o conteúdo gravado no código deve ser um **JSON estruturado**.

### 📝 Como gerar:
No gerador de QR Code, escolha obrigatoriamente a opção **Texto** e cole o JSON exatamente como está abaixo.

### 📋 Exemplos Prontos (Copie e Cole):

* **Exemplo A (Teclado Mecânico):**

  {"tipo":"produto","id_produto":1,"nome":"Teclado Mecânico RGB","preco":299.90}
  
* **Exemplo B (Mouse Gamer):**

  {"tipo":"produto","id_produto":2,"nome":"Mouse Gamer Wireless","preco":189.50}
  
* **Exemplo C (Monitor UltraWide):**

  {"tipo":"produto","id_produto":3,"nome":"Monitor LG UltraWide 29","preco":1249.00}
  

---

## 📦 3. Modelo: Estoque / Patrimônio

O modelo de patrimônio ativa a busca em tempo real em uma API externa (JSONPlaceholder). Para que o app identifique este fluxo, o QR Code também deve conter um **JSON estruturado**.

> [!NOTE]
> Como o app usa uma API mockada de testes, você pode usar **qualquer ID numérico de 1 a 100** para `id_equipamento`. Cada ID trará especificações técnicas diferentes vindas do servidor!

### 📝 Como gerar:
No gerador de QR Code, escolha obrigatoriamente a opção **Texto** ou **Texto Puro** e cole o JSON.

### 📋 Exemplos Prontos (Copie e Cole):

* **Exemplo A (Equipamento de TI ID #3):**

  {"tipo":"patrimonio","id_equipamento":3}
  
* **Exemplo B (Equipamento de TI ID #7):**

  {"tipo":"patrimonio","id_equipamento":7}
  
* **Exemplo C (Equipamento de TI ID #12):**

  {"tipo":"patrimonio","id_equipamento":12}
  

---

## 🚀 Como testar no Celular:
1. Abra o app **Expo Go** no celular.
2. Inicie o servidor do projeto no seu terminal do computador com `npx expo start` (ou `npm run start`).
3. Escaneie o QR Code do terminal para abrir o aplicativo.
4. No app, clique em **"Abrir Câmera para Escanear"**.
5. Aponte a câmera para os QR Codes que você gerou na tela do computador usando este guia.
6. Veja o aplicativo mudar de visual e comportamento instantaneamente para cada tipo!
