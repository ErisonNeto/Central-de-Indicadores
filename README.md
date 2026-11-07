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
