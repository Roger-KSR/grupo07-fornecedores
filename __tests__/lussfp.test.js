const request = require('supertest');
const { criarApp } = require('../src/app');
const { validarLimite } = require('../src/regras');

function criarRepoMock() {
  return {
    listarSegmentos: jest.fn(),
    segmentoExiste: jest.fn(),
    buscarPorRazaoSocial: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorCnpj: jest.fn(),
    inserir: jest.fn(),
    atualizar: jest.fn(),
    excluir: jest.fn(),
  };
}

describe('Testes Unitários — Integrante 3 (Grupo 07)', () => {

  // CT03 — Conversão do limite da URL para número.
  test('CT03 deve converter o limite da URL para número', async () => {
    const repo = criarRepoMock();
    repo.buscarPorRazaoSocial.mockResolvedValue([
      { id: 1, razaoSocial: 'Alfa Distribuidora Ltda' },
    ]);
    const app = criarApp(repo);

    const res = await request(app)
      .get('/fornecedores')
      .query({ razaoSocial: 'Alfa', modo: 'prefixo', limite: '10' });

    expect(res.status).toBe(200);
    expect(repo.buscarPorRazaoSocial).toHaveBeenCalledWith('Alfa%', 10);
    expect(typeof repo.buscarPorRazaoSocial.mock.calls[0][1]).toBe('number');
  });

  // CT06 — Limites mínimo e máximo.
  test('CT06 deve aceitar os limites mínimo (1) e máximo (75)', () => {
    expect(validarLimite('1')).toBe(1);
    expect(validarLimite('75')).toBe(75);
  });

  // CT09 — ID inválido no PUT.
  test('CT09 deve retornar 400 para ID inválido sem acessar o repository', async () => {
    const repo = criarRepoMock();
    const app = criarApp(repo);

    const corpo = {
      razaoSocial: 'Alfa Distribuidora Ltda',
      cnpj: '12.345.678/0001-95',
      segmentoId: 1,
    };

    const res = await request(app).put('/fornecedores/abc').send(corpo);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: 'ID inválido' });
    expect(repo.buscarPorId).not.toHaveBeenCalled();
    expect(repo.segmentoExiste).not.toHaveBeenCalled();
    expect(repo.buscarPorCnpj).not.toHaveBeenCalled();
    expect(repo.atualizar).not.toHaveBeenCalled();
  });

  // CT12 — Normalização dos dados antes da inclusão.
  test('CT12 deve limpar razaoSocial e normalizar CNPJ antes de inserir', async () => {
    const repo = criarRepoMock();
    repo.segmentoExiste.mockResolvedValue(true);
    repo.buscarPorCnpj.mockResolvedValue(null);
    repo.inserir.mockResolvedValue(42);

    const app = criarApp(repo);

    const corpo = {
      razaoSocial: '  Alfa Distribuidora Ltda  ',
      cnpj: '12.345.678/0001-95',
      segmentoId: 1,
    };

    const res = await request(app).post('/fornecedores').send(corpo);

    const registroNormalizado = {
      razaoSocial: 'Alfa Distribuidora Ltda',
      cnpj: '12345678000195',
      segmentoId: 1,
    };

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 42, ...registroNormalizado });
    expect(repo.segmentoExiste).toHaveBeenCalledWith(1);
    expect(repo.buscarPorCnpj).toHaveBeenCalledWith('12345678000195');
    expect(repo.inserir).toHaveBeenCalledWith(registroNormalizado);
  });

  // CT15 — Erro no DELETE sem exposição de detalhes técnicos.
  test('CT15 deve retornar 500 sem expor detalhes quando repo.excluir falha', async () => {
    const repo = criarRepoMock();

    repo.excluir.mockRejectedValue(
      new Error('Detalhe interno do banco de dados')
    );

    const app = criarApp(repo);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const res = await request(app).delete('/fornecedores/4');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ erro: 'Erro interno' });
      expect(res.text).not.toContain('Detalhe interno do banco de dados');
      expect(repo.excluir).toHaveBeenCalledWith(4);
      expect(repo.excluir).toHaveBeenCalledTimes(1);
    } finally {
      consoleError.mockRestore();
    }
  });
});
