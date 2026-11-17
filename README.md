# Central de Indicadores J&T

Central com SLA, T0, Shipping Time e Capotamento, resultados de ontem e do mês e detalhes expansíveis por S/C da gestão do Orlean.

## Render

Crie um **Blueprint** no Render a partir deste repositório: o `render.yaml` configura o serviço.

Para criar manualmente em **New → Web Service**:

- Repositório: `ErisonNeto/Central-de-Indicadores`
- Branch: `main`
- Runtime: Node
- Build: `npm ci --include=dev && npm test && npm run build`
- Start: `npm start`
- Health check: `/api/health`
- `NODE_VERSION`: `22.22.0`

A Central consulta o PostgreSQL da VM pelo endpoint HTTPS `POST /query` da API J&T. Em Environment no Render, configure `JT_API_KEY` com a mesma chave usada pelo importador T0. O endereço padrão de `JT_API_URL` é `https://jt-api.rockettechbr.com.br`. A resposta de /api/indicator informa `source: jt-api`. Os períodos e S/C compartilham cache de três minutos.

Esta versão no Render não usa o login do ChatGPT: o serviço web padrão permite acesso a quem tiver o link.

## Desenvolvimento

```bash
npm ci
npm test
npm run dev
```

## Cálculos

- SLA: meta diária 95%, mensal 97%; resultado ponderado pelos pacotes.
- T0: meta 70%; total entregue em T0 dividido pelo total de pedidos.
- Shipping Time: horas médias das etapas 6–8, ponderadas pelos pacotes, sem meta fixa. O recorte usa códigos de bases vinculadas ao Orlean no SLA do mesmo período; consulta diretamente a tabela `entregas` para esse vínculo, sem arredondar as etapas antes de ponderar.
- Capotamento: registros em ALERTA ou CAPOTADA divididos pelos registros de bases. Meta da central: zero. O mês considera registros diários, não bases únicas.
- S/C: pior para melhor por ontem, mês como desempate; sem dados ao final.
- Datas: America/Sao_Paulo. Mês até ontem. Atualização de 5 em 5 minutos e ao abrir os S/C.

Dados indisponíveis não são convertidos em zero. Os testes cobrem respostas simuladas e executam as consultas SQL em PostgreSQL embarcado (PGlite), com dados de teste. A conferência das tabelas, permissões e resultados reais no Supabase precisa ser feita antes de ativar esta versão em produção. Arquivos de infraestrutura do ChatGPT e credenciais não fazem parte deste repositório.

## Qualidade 1BD e 5CD

A Central consulta `jt_1bd_registros`, `jt_5cd_registros` e `jt_1bd_gestao` pela mesma API J&T autenticada. As tabelas precisam estar disponíveis nessa API. O vínculo de bases usa `base_chave` e o RM exato de Orlean na gestão atual.

Referência D-2 em São Paulo. Semanas de segunda a domingo relativas ao dia de referência, mês até D-2. 1BD usa soma de `entregue` / avaliações, com referência de 80%. 5CD usa contagem diária e média dos snapshots disponíveis nos períodos, sem meta percentual. Cards e S/C incluem D-7 e semana anterior.

## Avaria, Extravio e PNR

Consulta direta à tabela `public.jt_arbitragem_ocorrencias` via API J&T. Cada card apresenta quantidade e valor dos estados Processo encerrado e Arbitragem finalizada. Demais estados aparecem separadamente em conferência, sem classificação de meta. A data é fechamento, com fallback para declaração e data legada. Semanas fixas de segunda a domingo, semana e mês atuais parciais até hoje. S/C ordenados pelo maior valor finalizado na semana, com desempate pelo mês. Funções não são somáveis entre si. Períodos sem registros não são tratados como zero comprovado.

## Recorte da equipe

Darley Wallace Cunha Quaresma (Middle Mile) é excluído dos 11 indicadores da Central antes das agregações, usando os campos de responsáveis disponíveis em cada origem. A comparação do nome completo ignora maiúsculas e espaços repetidos. Registros vinculados a ele como coordenador, supervisor ou S/C não entram nos totais nem nos históricos. O cruzamento de bases do Shipping também usa o SLA filtrado. Nenhum registro é apagado do banco. Indicadores externos mantêm seus próprios filtros.

## Aba Mensal por S/C

A aba **Indicadores** permanece como visualização inicial. A nova aba **Mensal por S/C** consulta `/api/monthly?kind=...&month=YYYY-MM` sob demanda, com três consultas simultâneas no cliente e cache de três minutos por indicador/mês no servidor. Atualiza a cada cinco minutos e não depende dos painéis externos. As consultas usam a mesma API J&T, filtros de Orlean e exclusão de Middle Mile já existentes.

Cada fonte é lida uma vez para o mês (Shipping também lê o vínculo de bases no SLA), e os acumulados de cada dia são calculados em memória usando as agregações ponderadas existentes. Percentuais mostram diferenças em pontos percentuais; outras unidades mostram diferença absoluta e percentual relativo quando a base anterior não é zero. A comparação diária só existe quando os dois dias consecutivos possuem registros. Em dias sem novos registros, mantém-se o acumulado anterior com data explícita, sem alegar movimento zero. O histórico completo é acessível clicando na célula.

O mês atual fecha em D-1, exceto Qualidade em D-2. Meses anteriores usam o mês completo, respeitada a mesma defasagem. O mês nunca inclui dias de outro mês, inclusive nos primeiros dias do calendário. Nomes completos são conciliados sem acento, caixa ou espaços repetidos; duplicidades de função na mesma fonte são sinalizadas como ambíguas, nunca somadas. S/C sem valores no mês não entram na lista daquela fonte. Falhas são isoladas por indicador; respostas do banco e credenciais permanecem no servidor.

As metas e unidades são as vigentes no projeto, não as simuladas no HTML de teste: SLA 97%, T0 70%, 1BD 80% e Capotamento 0%. Shipping e 5CD não têm meta. Sem Mov e Retidos mantêm contagens de snapshots acima de 3 e 10 dias, sem taxa percentual. Avaria, Extravio e PNR mantêm valor finalizado/quantidade e conferência separada, sem meta nem PPM; seus valores mensais nesta aba fecham em D-1. O CSAT aparece como **não integrado**. Pontuação, alteração de metas e novos denominadores não fazem parte desta entrega.

Validação: testes SQL com PGlite para ponderação, calendário, lacunas, snapshots, arbitragem, nomes e exclusão de Middle Mile; testes anteriores preservados; build TypeScript/Next. Não houve consulta autenticada à produção durante esta alteração. A prévia visual no navegador não pôde ser executada porque o serviço de preview injeta flags `--host`/`--strictPort` incompatíveis com `next dev`.

## CSAT na Central

O card CSAT e a aba Mensal por S/C consultam `public.jt_csat_registros` diretamente pela JT API (`/query`), sem replicar avaliações ou expor tickets/tracking. A tabela deve existir no PostgreSQL `jt_indicadores`, com permissão SELECT para a conta da API.

Taxa = avaliações positivas (`avaliacao=1`) / total (`0` e `1`). Dia e mês seguem data da avaliação (coluna H), referência D-2. Semanas oficiais por `semana_id` da coluna D, independentemente da semana da coluna H. Sem meta definida: dados ausentes aparecem como indisponíveis, nunca 0%. Escopo R/M Orlean com exclusão Darley/Middle Mile e S/C registrado na importação.

## SLA — fonte única Resumo JMS (17/11/2026)

O indicador SLA na Central e na aba Mensal por S/C consulta apenas `public.sla_resumo_diario` (colunas `qtd_no_prazo` [N], `qtd_a_entregar` [K], `data_sla`, `sc`, `rm`). Calcula `100*SUM(qtd_no_prazo)/SUM(qtd_a_entregar)`; nunca usa média simples de percentuais, contagem de linhas ou a tabela antiga `entregas`. O Shipping também obtém dessa tabela os códigos de bases do Orlean para o vínculo regional. Não existe fallback automático: se a tabela estiver indisponível na API J&T, o indicador sinaliza falha.

Conferência de referência (01–16/11/2026, painel oficial): 1.053.660 no prazo / 1.099.337 a entregar = 95,85%. O recorte da Central continua sendo R/M Orlean e exclui Middle Mile. Em caso de diferença, conferir se o filtro do painel oficial também está em Orlean.
