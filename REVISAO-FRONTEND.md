# Revisão da Central de Indicadores — 17/11/2026

Base do projeto: main, commit f33933447297b5d1ce333ff45bf7f0854fbc1045.

## Aplicação
Este pacote contém o código-fonte completo, sem dependências instaladas, build, credenciais ou dados de demonstração. Faça backup do projeto atual e copie os arquivos mantendo sua configuração de ambiente existente. Não substitua seu .env por .env.example.

Execute `npm ci --include=dev`, `npm test` e `npm run build`. O comando de produção continua sendo `npm start`.

## Alterações
- CSS separado em foundation, indicators e monthly, importados por app/globals.css.
- Layout flexível para celular, tablet e desktop; nomes longos quebram linha e tabelas têm rolagem interna.
- Correção das camadas da tabela mensal: cabeçalho acima dos nomes fixos, inclusive no canto superior esquerdo.
- Variações inferiores a 0,005 em módulo aparecem como “menos de 0,01”, preservando a direção, em vez de “−0”.
- Hierarquia de títulos, landmarks, legendas e cabeçalhos de tabelas, navegação por teclado nas abas, foco visível e retorno do foco ao fechar o histórico.
- Requisições canceladas ao sair da aba e limite de 60 segundos por consulta; falhas são isoladas por indicador. Isso evita consultas individuais infinitas, mas não resolve indisponibilidade ou lentidão da fonte. A fila tem três consultas simultâneas.
- Atualização conserva resultados enquanto aguarda novas respostas; mudança de mês limpa os resultados anteriores.

## Validação realizada
- Todos os testes existentes (SQL, agregações, escopo, funções e mensal) passaram.
- Teste novo de formatação de variações passou.
- Build Next.js e TypeScript concluídos com sucesso.
- Prévia dos componentes reais com dados fictícios: 320, 390, 768, 1024 e aproximadamente 1348 px de largura externa. Sem overflow horizontal da página; tabela mantém sua própria rolagem.
- Cabeçalho fixo conferido após rolagem; histórico mensal abre e fecha.
- A prévia de cards foi verificada no estado de erro. Dados reais, autenticação e respostas do banco não foram validados nesta revisão. A prévia usa bundle estático de teste, porque o lançador do ambiente envia opções incompatíveis com Next dev; o build real do Next passou.

## Escopo preservado
Regras de cálculo, metas, vínculos de bases e cargos não foram alterados. Marcelo/Johan e integração futura de custo permanecem pendentes da revisão de dados. Para custo: apresentar total mensal por S/C e custo médio por pacote do mesmo escopo e período. CSAT continua indicando integração pendente, conforme o código original.
