import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

// `login` só registra as chamadas; o resultado (sucesso/erro) vem de `respostaDoLogin`, uma
// função comum: um vi.fn que LANÇA erro é relatado pelo Vitest como falha do teste, mesmo
// quando a tela captura o erro com try/catch.
const login = vi.fn();
let respostaDoLogin = async () => ({});
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: (...args) => {
      login(...args);
      return respostaDoLogin(...args);
    },
    notice: null,
    clearNotice: () => {},
  }),
}));

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>Página do dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  login.mockReset();
  respostaDoLogin = async () => ({});
});

describe('Login', () => {
  it('valida os campos antes de chamar a API', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(screen.getByText('Informe o e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('E-mail'), 'nao-e-email');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('entra com e-mail sem espaços e vai para o dashboard', async () => {
    const user = userEvent.setup();
    respostaDoLogin = async () => ({ nome: 'Ana' });
    renderLogin();
    await user.type(screen.getByLabelText('E-mail'), '  ana@escola.com ');
    await user.type(screen.getByLabelText('Senha'), 'Senha@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(login).toHaveBeenCalledWith('ana@escola.com', 'Senha@123');
    expect(await screen.findByText('Página do dashboard')).toBeInTheDocument();
  });

  it('mostra a mensagem de erro da API', async () => {
    const user = userEvent.setup();
    // Igual ao axios: um Error com a resposta do servidor em `response`.
    const erroDaApi = Object.assign(new Error('Request failed with status code 401'), {
      response: { status: 401, data: { message: 'E-mail ou senha inválidos.' } },
    });
    respostaDoLogin = async () => {
      throw erroDaApi;
    };
    renderLogin();
    await user.type(screen.getByLabelText('E-mail'), 'ana@escola.com');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument();
  });
});
