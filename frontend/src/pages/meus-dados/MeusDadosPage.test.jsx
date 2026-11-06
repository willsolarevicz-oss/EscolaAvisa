import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMeusDados } from '../../services/lgpdService';
import { MeusDadosPage } from './MeusDadosPage';

vi.mock('../../services/lgpdService', () => ({ getMeusDados: vi.fn() }));

const dados = {
  geradoEm: '2026-11-06T12:00:00.000Z',
  conta: { nome: 'Rita Souza', email: 'rita@familia.com', perfil: 'RESPONSAVEL', ativo: true, criadoEm: '2026-11-01T10:00:00Z' },
  responsavel: { telefone: '11999998888', cpf: '52998224725' },
  alunosVinculados: [{ nome: 'Ana' }],
  avisosRecebidos: [{}, {}],
  ocorrencias: [],
  mensagensEnviadas: [{}],
  aceitesDeTermos: [{}],
  acoesRegistradas: { observacao: '', itens: [{}, {}, {}] },
};

afterEach(() => vi.restoreAllMocks());

describe('Meus dados', () => {
  it('mostra o resumo e baixa a cópia em JSON com o nome do dia', async () => {
    const user = userEvent.setup();
    vi.mocked(getMeusDados).mockResolvedValue(dados);
    const createObjectURL = vi.fn(() => 'blob:meus-dados');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function registrar() {
      clique.baixado = this.download;
    });

    render(
      <MemoryRouter>
        <MeusDadosPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('rita@familia.com')).toBeInTheDocument();
    expect(screen.getByText('(11) 99999-8888')).toBeInTheDocument();
    expect(screen.getByText(/2 aviso\(s\) recebido\(s\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /baixar meus dados/i }));
    const blob = createObjectURL.mock.calls[0][0];
    expect(JSON.parse(await blob.text()).conta.email).toBe('rita@familia.com');
    expect(clique.baixado).toBe('escolaavisa-meus-dados-2026-11-06.json');
  });
});
