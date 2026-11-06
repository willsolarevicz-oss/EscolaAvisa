import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DOCUMENTOS_VERSAO } from '../../config/instituicao';
import { AUTH_STATUS } from '../../contexts/authContext';
import { ProtectedRoute } from '../../routes/ProtectedRoute';
import { aceitarTermos } from '../../services/lgpdService';

vi.mock('../../services/lgpdService', () => ({ aceitarTermos: vi.fn() }));

// Sessão simulada: cada teste define se a pessoa já aceitou a versão vigente.
const atualizarTermos = vi.fn();
let sessao;
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => sessao }));

function renderSistema() {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<p>Conteúdo do sistema</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function comSessao(termos) {
  sessao = {
    status: AUTH_STATUS.AUTHENTICATED,
    user: { nome: 'Rita Souza', termos },
    logout: vi.fn(),
    atualizarTermos,
  };
}

beforeEach(() => {
  vi.mocked(aceitarTermos).mockReset();
  atualizarTermos.mockReset();
});

describe('Aceite da Política e dos Termos', () => {
  it('sem aceite da versão vigente, mostra o aceite no lugar do sistema', () => {
    comSessao({ versao: DOCUMENTOS_VERSAO, aceito: false });
    renderSistema();
    expect(screen.getByRole('heading', { name: /antes de continuar, rita/i })).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo do sistema')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos');
  });

  it('só aceita depois de marcar "li e concordo" e envia a versão exibida', async () => {
    const user = userEvent.setup();
    comSessao({ versao: DOCUMENTOS_VERSAO, aceito: false });
    vi.mocked(aceitarTermos).mockResolvedValue({ versao: DOCUMENTOS_VERSAO, aceito: true });
    renderSistema();

    const aceitar = screen.getByRole('button', { name: /aceitar e continuar/i });
    expect(aceitar).toBeDisabled();
    await user.click(screen.getByLabelText(/li e concordo/i));
    await user.click(aceitar);

    expect(aceitarTermos).toHaveBeenCalledWith(DOCUMENTOS_VERSAO);
    expect(atualizarTermos).toHaveBeenCalledWith({ versao: DOCUMENTOS_VERSAO, aceito: true });
  });

  it('com o aceite em dia, o sistema aparece normalmente', () => {
    comSessao({ versao: DOCUMENTOS_VERSAO, aceito: true });
    renderSistema();
    expect(screen.getByText('Conteúdo do sistema')).toBeInTheDocument();
  });
});
