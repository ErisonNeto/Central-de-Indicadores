# Central de Indicadores J&T

Central com SLA, T0, Shipping Time e Capotamento, resultados de ontem e do mês e detalhes expansíveis por S/C da gestão do Orlean.

## Render

Crie um **Blueprint** no Render a partir deste repositório: o `render.yaml` configura o serviço.

Para criar manualmente em **New → Web Service**:

- Repositório: `ErisonNeto/Central-de-Indicadores`
- Branch: `main`
- Runtime: Node
- Build: `npm install --include=dev && npm test && npm run build`
- Start: `npm start`
- Health check: `/api/health`
- `NODE_VERSION`: `22.22.0`

Não precisa de senha de banco. O servidor consulta as APIs dos quatro dashboards. A porta é fornecida pelo Render em `PORT`.

Esta versão no Render não usa o login do ChatGPT: o serviço web padrão permite acesso a quem tiver o link.

## Desenvolvimento

```bash
npm install
npm test
npm run dev
```

## Cálculos

- SLA: meta diária 95%, mensal 97%; resultado ponderado pelos pacotes.
- T0: meta 70%; total entregue em T0 dividido pelo total de pedidos.
- Shipping Time: horas médias das etapas 6–8, ponderadas pelos pacotes, sem meta fixa. O recorte usa códigos de bases vinculadas ao Orlean no SLA do mesmo período; depende da disponibilidade dessa origem.
- Capotamento: registros em ALERTA ou CAPOTADA divididos pelos registros de bases. Meta da central: zero. O mês considera registros diários, não bases únicas.
- S/C: pior para melhor por ontem, mês como desempate; sem dados ao final.
- Datas: America/Sao_Paulo. Mês até ontem. Atualização de 5 em 5 minutos e ao abrir os S/C.

Dados indisponíveis não são convertidos em zero. Os testes usam respostas simuladas; a conferência dos dados reais deve ser feita após o deploy. Arquivos de infraestrutura do ChatGPT e credenciais não fazem parte deste repositório.
