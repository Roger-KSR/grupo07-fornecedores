// VVS — Grupo 07, integrante 1 (líder) — Rogério Vieira Manzano
// Cenários da versão 2 (05/11/2026) para grupo com 3 integrantes:
// CT01, CT04, CT07, CT10 e CT13.
// Execute na raiz do projeto: npm test -- --runInBand __tests__/roger-ksr.test.js

const request = require('supertest');
const { criarApp } = require('../src/app');
const { validarId, validarDados } = require('../src/regras');
const { ErroNegocio } = require('../src/erros');

// A API real recebe este repository simulado: nenhum teste acessa o MySQL.
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

const dadosValidos = {
  razaoSocial: 'Alfa Distribuidora Ltda',
  cnpj: '12.345.678/0001-95',
  segmentoId: 1,
};

describe('Grupo 07 — Integrante 1 (líder)', () => {
  test('CT01 deve rejeitar modo de busca exato e não consultar o repository', async () => {
    // Preparar: nenhum método precisa de retorno, pois a validação deve barrar a busca.
    const repo = criarRepoMock();
    const app = criarApp(repo);

    // Agir: "exato" não é um modo de busca aceito.
    const res = await request(app)
      .get('/fornecedores')
      .query({ razaoSocial: 'Ab', modo: 'exato' });

    // Conferir: erro específico, e nada é consultado no banco.
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      erro: 'Modo de busca inválido. Use: prefixo ou contem',
    });
    expect(repo.buscarPorRazaoSocial).not.toHaveBeenCalled();
    expect(Object.values(repo).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  test('CT04 deve devolver 404 para PATCH /fornecedores/1 sem atualizar', async () => {
    const repo = criarRepoMock();
    const app = criarApp(repo);

    // PATCH não existe no contrato da API; somente PUT altera o registro.
    const res = await request(app)
      .patch('/fornecedores/1')
      .send(dadosValidos);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: 'Rota não encontrada' });
    expect(repo.atualizar).not.toHaveBeenCalled();
    expect(Object.values(repo).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  test('CT07 deve rejeitar ID vazio e nulo com o erro de negócio correto', () => {
    // O teste cobre as DUAS entradas previstas no enunciado.
    for (const id of ['', null]) {
      let erroCapturado;
      try {
        validarId(id);
      } catch (erro) {
        erroCapturado = erro;
      }

      expect(erroCapturado).toBeInstanceOf(ErroNegocio);
      expect(erroCapturado.status).toBe(400);
      expect(erroCapturado.message).toBe('ID inválido');
    }
  });

  test('CT10 deve normalizar o CNPJ antes de procurar seu dono no PUT /fornecedores/4', async () => {
    const repo = criarRepoMock();
    // O registro já existe, o segmento é válido e o CNPJ não pertence a outro fornecedor.
    repo.buscarPorId.mockResolvedValue({ id: 4, ...dadosValidos });
    repo.segmentoExiste.mockResolvedValue(true);
    repo.buscarPorCnpj.mockResolvedValue(null);
    repo.atualizar.mockResolvedValue(true);
    const app = criarApp(repo);

    const res = await request(app)
      .put('/fornecedores/4')
      .send(dadosValidos);

    const dadosNormalizados = {
      razaoSocial: 'Alfa Distribuidora Ltda',
      cnpj: '12345678000195',
      segmentoId: 1,
    };

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 4, ...dadosNormalizados });
    expect(repo.buscarPorId).toHaveBeenCalledTimes(1);
    expect(repo.buscarPorId).toHaveBeenCalledWith(4);
    expect(repo.segmentoExiste).toHaveBeenCalledTimes(1);
    expect(repo.segmentoExiste).toHaveBeenCalledWith(1);
    expect(repo.buscarPorCnpj).toHaveBeenCalledTimes(1);
    expect(repo.buscarPorCnpj).toHaveBeenCalledWith('12345678000195');
    expect(repo.atualizar).toHaveBeenCalledTimes(1);
    expect(repo.atualizar).toHaveBeenCalledWith(4, dadosNormalizados);
    expect(repo.inserir).not.toHaveBeenCalled();
    expect(repo.excluir).not.toHaveBeenCalled();
  });

  test('CT13 deve validar razaoSocial após remover espaços nas pontas', () => {
    // " AA " tem quatro caracteres brutos, porém somente dois depois do trim().
    const entrada = { ...dadosValidos, razaoSocial: ' AA ' };
    let erroCapturado;

    try {
      validarDados(entrada);
    } catch (erro) {
      erroCapturado = erro;
    }

    expect(erroCapturado).toBeInstanceOf(ErroNegocio);
    expect(erroCapturado.status).toBe(400);
    expect(erroCapturado.message).toBe(
      'Campo razaoSocial deve ter entre 3 e 150 caracteres'
    );
  });
});
