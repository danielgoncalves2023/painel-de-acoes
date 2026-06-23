# Plano de Implementação - Correção do Rebalanceamento Inteligente

## Descrição do Problema
Na aba de "Rebalanceamento Inteligente", ao simular um aporte (por exemplo, R$ 1.000,00), o sistema calcula as compras sugeridas de forma individual com base na meta ideal de alocação de cada ativo no novo patrimônio total. No entanto, a soma das compras sugeridas pode ultrapassar o valor do aporte informado.

## Causa
O cálculo atual utiliza:
`suggestedQuantity = Math.floor(diferencaValor / p.currentPrice)`
onde `diferencaValor = valorIdeal - p.currentValue`.
Isso assume que podemos comprar frações ideais de cada ativo para atingir a meta perfeitamente. Contudo, em rebalanceamentos passivos (sem venda de ativos sobre-alocados), o aporte é limitado e não é suficiente para cobrir os desvios de ativos que estão muito abaixo da meta, fazendo com que o algoritmo sugira compras cuja soma excede o aporte disponível.

## Solução Proposta
Implementar um **algoritmo guloso (greedy)** na simulação de aporte:
1. Inicializar as sugestões de quantidade comprada de cada ativo como 0.
2. Definir o saldo disponível como o valor do aporte.
3. Enquanto houver saldo suficiente para comprar pelo menos um ativo com meta > 0 e preço > 0:
   - Calcular o desvio atual de cada ativo em relação à sua meta de alocação ideal com base no total do portfólio simulado (Patrimônio Atual + Compras sugeridas até o momento).
   - Identificar qual ativo elegível (cujo preço é menor ou igual ao saldo restante) está mais distante (abaixo) de sua meta ideal (maior desvio positivo).
   - Incrementar em 1 a quantidade sugerida de compra para esse ativo.
   - Deduzir o preço do ativo do saldo restante e atualizar o valor simulado do portfólio.
4. Atualizar o estado das posições na interface para refletir as quantidades e valores finais sugeridos.

## Arquivos a serem modificados
- `src/components/portfolio/RebalanceTab.tsx`
