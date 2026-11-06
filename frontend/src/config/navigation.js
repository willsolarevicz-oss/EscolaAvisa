import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  NotebookPen,
  School,
  UserCog,
} from 'lucide-react';

/**
 * Itens da sidebar. Para liberar um módulo: crie a rota em AppRoutes,
 * preencha `to` e mude `available` para true.
 * `roles` (opcional) só esconde o item na interface; a permissão real é validada no backend.
 * `counter` (opcional): chave de /api/me/contadores mostrada como número ao lado do item.
 */
export const NAVIGATION = [
  {
    title: 'Principal',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, available: true },
      { label: 'Relatórios', to: '/relatorios', icon: ChartColumn, available: true, roles: ['ADMIN', 'PROFESSOR'] },
    ],
  },
  {
    title: 'Acadêmico',
    items: [
      { label: 'Alunos', to: '/alunos', icon: GraduationCap, available: true, roles: ['ADMIN'] },
      { label: 'Responsáveis', to: '/responsaveis', icon: HeartHandshake, available: true, roles: ['ADMIN'] },
      { label: 'Turmas', to: '/turmas', icon: School, available: true, roles: ['ADMIN'] },
      { label: 'Minhas turmas', to: '/minhas-turmas', icon: School, available: true, roles: ['PROFESSOR'] },
      { label: 'Disciplinas', to: '/disciplinas', icon: BookOpen, available: true, roles: ['ADMIN'] },
      { label: 'Notas', to: '/notas', icon: NotebookPen, available: true, roles: ['ADMIN', 'PROFESSOR'] },
      { label: 'Boletim', to: '/boletim', icon: NotebookPen, available: true, roles: ['RESPONSAVEL'] },
    ],
  },
  {
    title: 'Comunicação',
    items: [
      { label: 'Avisos', to: '/avisos', icon: Megaphone, available: true, roles: ['ADMIN', 'PROFESSOR'] },
      { label: 'Meus avisos', to: '/meus-avisos', icon: Bell, available: true, roles: ['RESPONSAVEL'], counter: 'avisosNaoLidos' },
      { label: 'Ocorrências', to: '/ocorrencias', icon: ClipboardList, available: true, roles: ['ADMIN', 'PROFESSOR'] },
      {
        label: 'Minhas ocorrências',
        to: '/minhas-ocorrencias',
        icon: ClipboardList,
        available: true,
        roles: ['RESPONSAVEL'],
        counter: 'ocorrenciasPendentes',
      },
      { label: 'Mensagens', to: '/mensagens', icon: MessageSquare, available: true, counter: 'mensagensNaoLidas' },
      { label: 'Calendário', to: '/calendario', icon: CalendarDays, available: true },
    ],
  },
  {
    title: 'Administração',
    roles: ['ADMIN'],
    items: [{ label: 'Usuários', to: '/usuarios', icon: UserCog, available: true }],
  },
];

/** Item da sidebar correspondente à URL (inclui subpáginas: /usuarios/novo → Usuários). */
export function findNavItemByPath(pathname) {
  for (const section of NAVIGATION) {
    for (const item of section.items) {
      if (item.to && (pathname === item.to || pathname.startsWith(`${item.to}/`))) return item;
    }
  }
  return null;
}
