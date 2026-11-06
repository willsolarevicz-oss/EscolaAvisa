import { describe, expect, it } from 'vitest';
import { descreverAcao, resultadoAcao } from './auditoria';

describe('auditoria', () => {
  it('descreve ações comuns e especiais em português', () => {
    expect(descreverAcao('POST', '/api/usuarios')).toBe('Criou usuário');
    expect(descreverAcao('PUT', '/api/alunos/:id')).toBe('Editou aluno');
    expect(descreverAcao('DELETE', '/api/eventos/:id')).toBe('Excluiu evento');
    expect(descreverAcao('POST', '/api/auth/login')).toBe('Login');
    expect(descreverAcao('PATCH', '/api/usuarios/:id/ativo')).toBe('Ativou/desativou usuário');
    expect(descreverAcao('POST', '/api/me/avisos/:id/visualizar')).toBe('Leu aviso');
    expect(descreverAcao('POST', '/api/turmas/:id/alunos')).toBe('Matriculou aluno');
    expect(descreverAcao('POST', '/api/algo-novo')).toBe('Criou registro');
  });

  it('classifica o resultado pelo status', () => {
    expect(resultadoAcao(201)).toEqual({ label: 'OK', tone: 'success' });
    expect(resultadoAcao(403).label).toBe('Negado');
    expect(resultadoAcao(429).label).toBe('Bloqueado');
    expect(resultadoAcao(400).label).toBe('Recusado');
    expect(resultadoAcao(500).label).toBe('Erro');
  });
});
