# JARVIS

Nova rota `/jarvis`, sem alteração nos cálculos ou rotas existentes dos indicadores.

Configure `JARVIS_API_URL` no servidor Next.js com a origem HTTPS do gateway FastAPI. Sem essa configuração, o login informa indisponibilidade. Cada usuário usa uma chave individual criada no backend; não há chave de gestor compartilhada nem segredo NEXT_PUBLIC.

O backend e as migrações estão no pacote J-T-JARVIS entregue separadamente. Antes do merge/deploy, configurar gateway, túnel autenticado, PostgreSQL e usuários; validar dados reais e testar a interface/voz em desktop e celular.

Validação local: npm test da Central e npm run build aprovados. A conexão real com o Predator, IA externa e microfone não foi validada. O modo Interpretar pergunta exige modelo autorizado. Fontes indisponíveis não geram números fictícios.
