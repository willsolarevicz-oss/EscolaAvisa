import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGrade, lancarNotas } from '../../services/notaService';
import { GradeNotasPage } from './GradeNotasPage';

// API simulada: o teste verifica a TELA (o que ela mostra e o que envia), não o backend.
vi.mock('../../services/notaService', () => ({ getGrade: vi.fn(), lancarNotas: vi.fn() }));

const grade = {
  turma: { id: 't1', nome: '6º A', anoLetivo: 2026, turno: 'MATUTINO', ativo: true },
  disciplina: { id: 'd1', nome: 'Matemática' },
  alunos: [{ aluno: { id: 'a1', nome: 'Lara', matricula: 'A-1' }, notas: { 1: 7, 2: null, 3: null, 4: null }, media: 7 }],
};

function renderGrade() {
  render(
    <MemoryRouter initialEntries={['/notas/turmas/t1/disciplinas/d1']}>
      <Routes>
        <Route path="/notas/turmas/:turmaId/disciplinas/:disciplinaId" element={<GradeNotasPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(getGrade).mockReset().mockResolvedValue(grade);
  vi.mocked(lancarNotas).mockReset();
});

describe('Grade de notas', () => {
  it('nota inválida é destacada e não é enviada', async () => {
    const user = userEvent.setup();
    renderGrade();
    const celula = await screen.findByLabelText('Nota do 2º bimestre de Lara');

    await user.type(celula, '11');
    expect(celula).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('1 nota inválida');

    await user.click(screen.getByRole('button', { name: /salvar notas/i }));
    expect(screen.getByText(/corrija as notas destacadas/i)).toBeInTheDocument();
    expect(lancarNotas).not.toHaveBeenCalled();
  });

  it('aceita vírgula, recalcula a média na hora e envia só o que mudou', async () => {
    const user = userEvent.setup();
    vi.mocked(lancarNotas).mockResolvedValue({
      grade: { ...grade, alunos: [{ ...grade.alunos[0], notas: { 1: 7, 2: 8.5, 3: null, 4: null }, media: 7.8 }] },
      message: '1 alteração salva.',
    });
    renderGrade();

    await user.type(await screen.findByLabelText('Nota do 2º bimestre de Lara'), '8,5');
    expect(screen.getByRole('status')).toHaveTextContent('1 alteração não salva');
    expect(screen.getByText('7,8')).toBeInTheDocument(); // (7 + 8,5) / 2 = 7,75 → 7,8

    await user.click(screen.getByRole('button', { name: /salvar notas/i }));
    expect(lancarNotas).toHaveBeenCalledWith({ turmaId: 't1', disciplinaId: 'd1' }, [
      { alunoId: 'a1', bimestre: 2, valor: 8.5 },
    ]);
    expect(await screen.findByText('1 alteração salva.')).toBeInTheDocument();
  });

  it('turma desativada mostra as notas só para consulta', async () => {
    vi.mocked(getGrade).mockResolvedValue({ ...grade, turma: { ...grade.turma, ativo: false } });
    renderGrade();
    expect(await screen.findByText(/somente para consulta/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nota do 1º bimestre de Lara')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salvar notas/i })).not.toBeInTheDocument();
  });
});
