import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPendenciasResponsaveis, listResponsaveis } from '../../services/responsavelService';
import { ResponsaveisListPage } from './ResponsaveisListPage';

vi.mock('../../services/responsavelService', () => ({
  listResponsaveis: vi.fn(),
  getPendenciasResponsaveis: vi.fn(),
}));

const conceicao = {
  usuario: { id: 'u1', nome: 'Conceição Souza', email: 'conceicao@resp.com', ativo: true },
  telefone: '11999998888',
  alunos: [
    { id: 'a1', nome: 'Ana', matricula: 'RS-1', ativo: true, parentesco: 'Mãe', principal: true, autorizado: true },
    { id: 'a2', nome: 'Bia', matricula: 'RS-2', ativo: true, parentesco: 'Avó', principal: false, autorizado: false },
  ],
};
const joaquim = { usuario: { id: 'u2', nome: 'Joaquim Lima', email: 'joaquim@resp.com', ativo: true }, telefone: null, alunos: [] };
const pagina = (items) => ({ items, pagination: { page: 1, pageSize: 10, total: items.length, totalPages: 1 } });

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/responsaveis']}>
      <ResponsaveisListPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(listResponsaveis).mockReset().mockResolvedValue(pagina([conceicao, joaquim]));
  vi.mocked(getPendenciasResponsaveis).mockReset().mockResolvedValue({ total: 0, alunos: [] });
});

describe('Responsáveis', () => {
  it('mostra os alunos de cada responsável com parentesco e situação do vínculo', async () => {
    renderPage();
    const linha = (await screen.findByText('Conceição Souza')).closest('tr');
    expect(within(linha).getByText('(11) 99999-8888')).toBeInTheDocument();
    expect(within(linha).getByRole('link', { name: 'Ana' })).toHaveAttribute('href', '/alunos/a1/editar');
    expect(within(linha).getByText('Principal')).toBeInTheDocument();
    expect(within(linha).getByText('Não recebe comunicações')).toBeInTheDocument();
    expect(within(linha).getByRole('link', { name: 'Editar dados de Conceição Souza' })).toHaveAttribute(
      'href',
      '/usuarios/u1/editar',
    );
    const semAluno = screen.getByText('Joaquim Lima').closest('tr');
    expect(within(semAluno).getByText('Nenhum aluno vinculado')).toBeInTheDocument();
  });

  it('filtro "Sem aluno vinculado" vai para a API', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Conceição Souza');
    await user.selectOptions(screen.getByLabelText('Vínculos'), 'true');
    expect(vi.mocked(listResponsaveis).mock.calls.at(-1)[0]).toMatchObject({ semAluno: 'true' });
  });

  it('alerta de alunos sem responsável autorizado aparece só quando há pendência', async () => {
    const user = userEvent.setup();
    vi.mocked(getPendenciasResponsaveis).mockResolvedValue({
      total: 2,
      alunos: [
        { id: 'a2', nome: 'Bia', matricula: 'RS-2', turmaAtual: '6º A', totalVinculos: 1 },
        { id: 'a4', nome: 'Davi', matricula: 'RS-4', turmaAtual: null, totalVinculos: 0 },
      ],
    });
    renderPage();
    expect(await screen.findByText(/2 alunos ativos não têm responsável/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Davi' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver alunos' }));
    expect(screen.getByRole('link', { name: 'Davi' })).toHaveAttribute('href', '/alunos/a4/editar');
    expect(screen.getByText(/sem turma · nenhum responsável vinculado/)).toBeInTheDocument();
  });

  it('sem pendências, não mostra alerta', async () => {
    renderPage();
    await screen.findByText('Conceição Souza');
    expect(screen.queryByText(/não têm responsável/)).not.toBeInTheDocument();
  });
});
