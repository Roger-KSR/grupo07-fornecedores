require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'aluno_unifio',
  password: process.env.DB_PASSWORD || 'abc123',
  database: process.env.DB_NAME || 'bd_fornecedores',
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  waitForConnections: true,
});

// Cria as tabelas (se não existirem) e os registros da tabela de apoio.
// Observação: a coluna "razao_social" NÃO tem índice de propósito (faz parte do trabalho).
async function inicializarBanco() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS segmentos (
      id   INT PRIMARY KEY,
      nome VARCHAR(60) NOT NULL
    )`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fornecedores (
      id        INT AUTO_INCREMENT PRIMARY KEY,
      razao_social  VARCHAR(150) NOT NULL,
      cnpj  VARCHAR(14) NOT NULL UNIQUE,
      segmento_id  INT NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_fornecedores_segmentos FOREIGN KEY (segmento_id) REFERENCES segmentos(id)
    )`);

  await pool.query(`INSERT IGNORE INTO segmentos (id, nome) VALUES (1, 'Alimentos'), (2, 'Serviços')`);
}

module.exports = { pool, inicializarBanco };
