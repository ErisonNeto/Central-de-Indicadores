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

O servidor consulta diretamente o PostgreSQL do Supabase; não usa as APIs dos outros dashboards. Os links dos indicadores continuam disponíveis. A porta é fornecida pelo Render em `PORT`.

Configure `DATABASE_URL` com a conexão de **Supabase → Connect → Session pooler**, incluindo a senha (caracteres reservados devem ser codificados na URL). Se as tabelas estiverem em projetos diferentes, configure `SLA_DATABASE_URL`, `T0_DATABASE_URL`, `CAPOTAMENTO_DATABASE_URL` e `SHIPPING_DATABASE_URL`. Cada variável específica substitui a conexão padrão. Use somente variáveis de servidor, nunca `NEXT_PUBLIC_`.

A conexão verifica TLS. Se necessário, forneça o certificado CA do projeto em `DATABASE_CA_CERT`. As sessões são somente leitura, com até três conexões por banco e timeout de consulta de 25 segundos. Nenhuma tabela ou política é alterada.

A integração pressupõe as tabelas e colunas dos quatro repositórios originais no schema padrão. Resolve um único RM com a palavra Orlean no período. Os resultados dos cards e S/C compartilham cache por processo de três minutos, incluindo requisições simultâneas; erros não são armazenados. Não há fallback para os painéis no Render. Após reinício, a primeira consulta recalcula os resultados.

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
