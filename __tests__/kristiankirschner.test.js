const request = require('supertest');
const { criarApp } = require('../src/app');
const { validarDados, montarPadrao } = require('../src/regras');

function criarRepoMock() {
  return {
    listarSegmentos: jest.fn(),
    segmentoExiste: jest.fn(),
    buscarPorRazaoSocial: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorCnpj: jest.fn(),
    inserir: jest.fn(),
    atualizar: jest.fn(),
    excluir: jest.fn()
  };
}

describe('Testes Unitários - Integrante 2', () => {
  // CT02 - Regra: validarDados descarta campos extras e normaliza CNPJ
  test('CT02 deve retornar apenas os 3 campos válidos descartando campos extras', () => {
    const entrada = {
      razaoSocial: 'Alfa Distribuidora Ltda',
      cnpj: '12.345.678/0001-95',
      segmentoId: 1,
      id: 99,
      ativo: true
    };

    const resultado = validarDados(entrada);

    expect(resultado).toEqual({
      razaoSocial: 'Alfa Distribuidora Ltda',
      cnpj: '12345678000195',
      segmentoId: 1
    });
    expect(resultado.id).toBeUndefined();
    expect(resultado.ativo).toBeUndefined();
  });

  // CT05 - Rota: POST /fornecedores com razaoSocial curta
  test('CT05 deve retornar 400 quando razaoSocial tem menos de 3 caracteres e não chamar o repository', async () => {
    const repo = criarRepoMock();
    const app = criarApp(repo);
    const corpo = {
      razaoSocial: 'AA',
      cnpj: '12.345.678/0001-95',
      segmentoId: 1
    };

    const res = await request(app).post('/fornecedores').send(corpo);

    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('razaoSocial');
    expect(repo.segmentoExiste).not.toHaveBeenCalled();
    expect(repo.buscarPorCnpj).not.toHaveBeenCalled();
    expect(repo.inserir).not.toHaveBeenCalled();
  });

  // CT08 - Rota: POST /fornecedores com erro de banco que não é duplicidade
  test('CT08 deve retornar 500 quando repo.inserir falha com erro genérico do banco', async () => {
    const repo = criarRepoMock();
    repo.segmentoExiste.mockResolvedValue(true);
    repo.buscarPorCnpj.mockResolvedValue(null);

    const erroBanco = new Error('Lock wait timeout exceeded');
    erroBanco.code = 'ER_LOCK_WAIT_TIMEOUT';
    repo.inserir.mockRejectedValue(erroBanco);

    const app = criarApp(repo);
    const corpo = {
      razaoSocial: 'Alfa Distribuidora Ltda',
      cnpj: '12.345.678/0001-95',
      segmentoId: 1
    };

    const res = await request(app).post('/fornecedores').send(corpo);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ erro: 'Erro interno' });
    expect(repo.inserir).toHaveBeenCalledTimes(1);
  });

  // CT11 - Regra: montarPadrao recebendo número
  test('CT11 deve montar padrão corretamente quando o termo chega como número', () => {
    const resultado = montarPadrao(123, 'contem');

    expect(resultado).toBe('%123%');
  });

  // CT14 - Regra: validarDados com razaoSocial no limite mínimo (3 caracteres)
  test('CT14 deve aceitar razaoSocial com exatamente 3 caracteres', () => {
    const entrada = {
      razaoSocial: 'ABC',
      cnpj: '12.345.678/0001-95',
      segmentoId: 1
    };

    const resultado = validarDados(entrada);

    expect(resultado).toEqual({
      razaoSocial: 'ABC',
      cnpj: '12345678000195',
      segmentoId: 1
    });
  });
});