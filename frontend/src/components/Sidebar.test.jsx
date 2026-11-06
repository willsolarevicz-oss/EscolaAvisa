import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Sidebar } from './Sidebar';

function renderSidebar(tipoUsuario, contadores) {
  render(
    <MemoryRouter>
      <Sidebar id="menu" open={false} onClose={() => {}} tipoUsuario={tipoUsuario} contadores={contadores} />
    </MemoryRouter>,
  );
}

const link = (nome) => screen.getByRole('link', { name: new RegExp(`^${nome}`) });

describe('Sidebar', () => {
  it('mostra os contadores do responsável; zero não aparece e mais de 99 vira "99+"', () => {
    renderSidebar('RESPONSAVEL', { mensagensNaoLidas: 3, avisosNaoLidos: 0, ocorrenciasPendentes: 120 });
    expect(within(link('Mensagens')).getByText('3')).toBeInTheDocument();
    expect(within(link('Minhas ocorrências')).getByText('99+')).toBeInTheDocument();
    expect(link('Meus avisos')).toHaveTextContent(/^Meus avisos$/);
  });

  it('cada perfil vê só os itens dele', () => {
    renderSidebar('PROFESSOR', {});
    expect(link('Minhas turmas')).toBeInTheDocument();
    expect(link('Relatórios')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /meus avisos/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /usuários/i })).not.toBeInTheDocument();
  });
});
