// Camada de acesso a dados: só SQL, sem regra de negócio.
// Nos testes unitários esta camada deve ser substituída por um mock.

const SELECT_BASE = `
  SELECT t.id, t.razao_social AS razaoSocial, t.cnpj AS cnpj, t.segmento_id AS segmentoId, a.nome AS segmento, t.criado_em AS criadoEm
  FROM fornecedores t
  JOIN segmentos a ON a.id = t.segmento_id`;

function criarRepository(pool) {
  return {
    async listarSegmentos() {
      const [rows] = await pool.query('SELECT id, nome FROM segmentos ORDER BY id');
      return rows;
    },

    async segmentoExiste(id) {
      const [rows] = await pool.query('SELECT 1 FROM segmentos WHERE id = ?', [id]);
      return rows.length > 0;
    },

    // padrao: string usada no LIKE (ex.: "Ab%" ou "%Ab%")
    async buscarPorRazaoSocial(padrao, limite) {
      const [rows] = await pool.query(
        `${SELECT_BASE} WHERE t.razao_social LIKE ? ORDER BY t.razao_social LIMIT ?`,
        [padrao, limite]
      );
      return rows;
    },

    async buscarPorId(id) {
      const [rows] = await pool.query(`${SELECT_BASE} WHERE t.id = ?`, [id]);
      return rows[0] || null;
    },

    async buscarPorCnpj(cnpj) {
      const [rows] = await pool.query('SELECT id, cnpj AS cnpj FROM fornecedores WHERE cnpj = ?', [cnpj]);
      return rows[0] || null;
    },

    async inserir({ razaoSocial, cnpj, segmentoId }) {
      const [res] = await pool.query(
        'INSERT INTO fornecedores (razao_social, cnpj, segmento_id) VALUES (?, ?, ?)',
        [razaoSocial, cnpj, segmentoId]
      );
      return res.insertId;
    },

    async atualizar(id, { razaoSocial, cnpj, segmentoId }) {
      const [res] = await pool.query(
        'UPDATE fornecedores SET razao_social = ?, cnpj = ?, segmento_id = ? WHERE id = ?',
        [razaoSocial, cnpj, segmentoId, id]
      );
      return res.affectedRows > 0;
    },

    async excluir(id) {
      const [res] = await pool.query('DELETE FROM fornecedores WHERE id = ?', [id]);
      return res.affectedRows > 0;
    },
  };
}

module.exports = { criarRepository };
