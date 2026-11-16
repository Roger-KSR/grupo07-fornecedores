// Aplicação HTTP (rotas). Usa as regras de src/regras.js e recebe o repository por parâmetro
// (injeção de dependência): nos testes, passamos um repository FALSO (mock) e nada acessa o banco.
const express = require('express');
const { ErroNegocio } = require('./erros');
const { validarId, validarDados, montarPadrao, validarLimite, LIMITE_PADRAO } = require('./regras');

function criarApp(repo) {
  const app = express();
  app.use(express.json());

  // Encapsula handlers async e repassa erros ao middleware de erro (lá embaixo)
  const rota = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

  async function garantirSegmento(id) {
    if (!(await repo.segmentoExiste(id))) {
      throw new ErroNegocio(400, 'Segmento inexistente');
    }
  }

  app.get('/segmentos', rota(async (req, res) => {
    res.json(await repo.listarSegmentos());
  }));

  // Busca: GET /fornecedores?razaoSocial=Ab&modo=prefixo&limite=20
  app.get('/fornecedores', rota(async (req, res) => {
    const { razaoSocial = '', modo = 'prefixo', limite = LIMITE_PADRAO } = req.query;
    const padrao = montarPadrao(razaoSocial, modo);
    const lim = validarLimite(limite);
    const resultados = await repo.buscarPorRazaoSocial(padrao, lim);
    res.json({ total: resultados.length, resultados });
  }));

  app.get('/fornecedores/:id', rota(async (req, res) => {
    const registro = await repo.buscarPorId(validarId(req.params.id));
    if (!registro) throw new ErroNegocio(404, 'Fornecedor não encontrado');
    res.json(registro);
  }));

  app.post('/fornecedores', rota(async (req, res) => {
    const registro = validarDados(req.body);
    await garantirSegmento(registro.segmentoId);

    if (await repo.buscarPorCnpj(registro.cnpj)) {
      throw new ErroNegocio(409, 'CNPJ já existe no cadastro');
    }

    let id;
    try {
      id = await repo.inserir(registro);
    } catch (err) {
      // Concorrência: outro request gravou o mesmo valor entre a verificação e o INSERT
      if (err && err.code === 'ER_DUP_ENTRY') throw new ErroNegocio(409, 'CNPJ já existe no cadastro');
      throw err;
    }
    res.status(201).json({ id, ...registro });
  }));

  app.put('/fornecedores/:id', rota(async (req, res) => {
    const idValido = validarId(req.params.id);
    const registro = validarDados(req.body);

    if (!(await repo.buscarPorId(idValido))) throw new ErroNegocio(404, 'Fornecedor não encontrado');
    await garantirSegmento(registro.segmentoId);

    const dono = await repo.buscarPorCnpj(registro.cnpj);
    if (dono && dono.id !== idValido) throw new ErroNegocio(409, 'CNPJ já existe no cadastro');

    await repo.atualizar(idValido, registro);
    res.json({ id: idValido, ...registro });
  }));

  app.delete('/fornecedores/:id', rota(async (req, res) => {
    const removido = await repo.excluir(validarId(req.params.id));
    if (!removido) throw new ErroNegocio(404, 'Fornecedor não encontrado');
    res.status(204).send();
  }));

  // Rota inexistente
  app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

  // Tratamento centralizado de erros
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ErroNegocio) return res.status(err.status).json({ erro: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido' });
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  });

  return app;
}

module.exports = { criarApp };
