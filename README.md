# Grupo 07 — API de Fornecedores

API REST em **Node.js + Express + MySQL** para o trabalho de Verificação e Validação de Software.
Leia o **enunciado do seu grupo** antes de começar: ele define o que cada integrante entrega.

## Rodando (siga o passo a passo completo na seção 3 do enunciado)

**1. Banco de dados: escolha UMA opção** (as duas usam a porta 3306; não use as duas ao mesmo tempo). Na dúvida, use a Opção A.

Opção A: MySQL instalado. No Workbench, logado como root:
```sql
CREATE DATABASE bd_fornecedores;
CREATE USER 'aluno_unifio'@'localhost' IDENTIFIED BY 'abc123';
GRANT ALL PRIVILEGES ON bd_fornecedores.* TO 'aluno_unifio'@'localhost';
FLUSH PRIVILEGES;
```
Opção B: MySQL no Docker. Exige o Docker Desktop instalado e aberto (no Windows: WSL 2 ativo e virtualização ligada na BIOS). O banco e o usuário são criados automaticamente:
```bash
docker compose up -d
```

**2. Configuração e execução**
```bash
copy .env.example .env         # Windows (Prompt). PowerShell: Copy-Item .env.example .env | Linux/macOS: cp .env.example .env
npm install
npm start                      # deve mostrar: API de fornecedores rodando em http://localhost:3007
```
Confira no navegador: `http://localhost:3007/segmentos` deve listar 1 – Alimentos e 2 – Serviços.
Em outro terminal: `npm test` (o teste de exemplo deve passar, mesmo com o banco desligado).

A aplicação cria as tabelas `segmentos` e `fornecedores` ao subir. A coluna `razao_social` é criada **sem índice** de propósito.

## Endpoints
| Método | Rota | Sucesso | Erros |
|---|---|---|---|
| GET | `/segmentos` | 200 | — |
| GET | `/fornecedores?razaoSocial=Ab&modo=prefixo&limite=20` | 200 | 400 |
| GET | `/fornecedores/:id` | 200 | 400, 404 |
| POST | `/fornecedores` | 201 | 400, 409 |
| PUT | `/fornecedores/:id` | 200 | 400, 404, 409 |
| DELETE | `/fornecedores/:id` | 204 | 400, 404 |

- `modo`: `prefixo` (padrão, `LIKE 'Ab%'`) ou `contem` (`LIKE '%Ab%'`); `limite`: 1 a 75 (padrão 20)
- Corpo do POST/PUT: `{ "razaoSocial": "Alfa Distribuidora Ltda", "cnpj": "12.345.678/0001-95", "segmentoId": 1 }`
- Regras: `razaoSocial` com 3 a 150 caracteres; `cnpj`: 14 dígitos; pontuação é removida (ex.: 12.345.678/0001-95), único; `segmentoId` deve existir.

## Arquitetura
```
src/regras.js      regras de negócio (funções puras) -> testadas direto, sem mock
src/app.js         rotas HTTP, usa as regras           -> recebe o repository por parâmetro
src/repository.js  SQL (mysql2)        -> recebe o pool por parâmetro
src/db.js          pool + criação das tabelas
src/server.js      monta tudo e sobe o servidor
```
Nos testes unitários, teste as funções de `src/regras.js` diretamente; para as rotas, passe um repository **falso** (`jest.fn()`) para `criarApp` e faça as requisições com o supertest. Veja `__tests__/exemplo.test.js`.

## Comandos
```bash
npm test                              # testes unitários
npm run test:coverage                 # com cobertura
npm run verificar -- --aluno SEU_LOGIN   # confere o formato da sua entrega
npm run db:reset                      # zera a tabela e remove índices de razao_social
```
