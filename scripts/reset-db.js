// Apaga todos os registros de fornecedores e remove índices da coluna razao_social (se existirem).
// Use para recomeçar os testes de performance do zero: npm run db:reset
require('dotenv').config();
const { pool, inicializarBanco } = require('../src/db');

(async () => {
  await inicializarBanco();
  await pool.query('TRUNCATE TABLE fornecedores');

  const [indices] = await pool.query("SHOW INDEX FROM fornecedores WHERE Column_name = 'razao_social'");
  for (const nome of new Set(indices.map((i) => i.Key_name))) {
    await pool.query(`DROP INDEX \`${nome}\` ON fornecedores`);
    console.log(`Índice removido: ${nome}`);
  }

  console.log('Tabela fornecedores zerada.');
  await pool.end();
})().catch(async (err) => {
  console.error(err.message);
  await pool.end();
  process.exit(1);
});
