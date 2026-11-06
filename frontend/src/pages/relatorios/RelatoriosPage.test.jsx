import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listTurmasNotas } from '../../services/notaService';
import { getRelatorioNotas } from '../../services/relatorioService';
import { RelatoriosPage } from './RelatoriosPage';

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { tipoUsuario: 'ADMIN' } }) }));
vi.mock('../../services/notaService', () => ({ listTurmasNotas: vi.fn() }));
vi.mock('../../services/relatorioService', () => ({
  getRelatorioAvisos: vi.fn(),
  getRelatorioOcorrencias: vi.fn(),
  getRelatorioNotas: vi.fn(),
}));

const turma = { id: 't1', nome: '6º A', anoLetivo: 2026, turno: 'MATUTINO', disciplinas: [] };

/** Resposta do relatório com o corte pedido (Lara 5,5 fica abaixo de qualquer corte > 5,5). */
function relatorio({ notaCorte }) {
  return Promise.resolve({
    turma,
    notaCorte,
    totalAlunos: 1,
    disciplinas: [
      {
        disciplina: { id: 'd1', nome: 'Matemática' },
        bimestres: { 1: { lancadas: 1, media: 5.5 }, 2: { lancadas: 0, media: null }, 3: { lancadas: 0, media: null }, 4: { lancadas: 0, media: null } },
        alunosComNota: 1,
        mediaTurma: 5.5,
        abaixoDoCorte: notaCorte > 5.5 ? [{ id: 'a1', nome: 'Lara', matricula: 'A-1', media: 5.5 }] : [],
      },
    ],
  });
}

beforeEach(() => {
  vi.mocked(listTurmasNotas).mockReset().mockResolvedValue([turma]);
  vi.mocked(getRelatorioNotas).mockReset().mockImplementation(relatorio);
});

function renderNotas() {
  render(
    <MemoryRouter initialEntries={['/relatorios?aba=notas']}>
      <RelatoriosPage />
    </MemoryRouter>,
  );
}

describe('Relatório de notas', () => {
  it('usa a primeira turma e o corte padrão 6,0', async () => {
    renderNotas();
    expect(await screen.findByText('Abaixo de 6,0: 1 aluno')).toBeInTheDocument();
    expect(getRelatorioNotas).toHaveBeenCalledWith({ turmaId: 't1', notaCorte: 6 }, expect.anything());
  });

  it('corte inválido mostra erro no campo e mantém o último relatório válido', async () => {
    const user = userEvent.setup();
    renderNotas();
    const campo = await screen.findByLabelText('Nota de corte');
    await screen.findByText('Abaixo de 6,0: 1 aluno');

    await user.clear(campo);
    await user.type(campo, '5,5');
    expect(await screen.findByText('Abaixo de 5,5: nenhum aluno')).toBeInTheDocument();

    await user.clear(campo);
    await user.type(campo, '11');
    expect(screen.getByText('De 0 a 10, uma casa (ex.: 5,5).')).toBeInTheDocument();
    // O relatório da última nota de corte válida (1, digitada a caminho do "11") continua na tela.
    expect(screen.getByText(/^Abaixo de /)).toBeInTheDocument();
    const cortesPedidos = vi.mocked(getRelatorioNotas).mock.calls.map(([params]) => params.notaCorte);
    expect(cortesPedidos).not.toContain(11);
  });
});
