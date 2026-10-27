import {
  BookOpen,
  CalendarDays,
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
 */
export const NAVIGATION = [
  {
    title: 'Principal',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, available: true }],
  },
  {
    title: 'Acadêmico',
    items: [
      { label: 'Alunos', icon: GraduationCap, available: false },
      { label: 'Responsáveis', icon: HeartHandshake, available: false },
      { label: 'Turmas', icon: School, available: false },
      { label: 'Disciplinas', icon: BookOpen, available: false },
      { label: 'Notas', icon: NotebookPen, available: false },
    ],
  },
  {
    title: 'Comunicação',
    items: [
      { label: 'Avisos', icon: Megaphone, available: false },
      { label: 'Ocorrências', icon: ClipboardList, available: false },
      { label: 'Mensagens', icon: MessageSquare, available: false },
      { label: 'Calendário', icon: CalendarDays, available: false },
    ],
  },
  {
    title: 'Administração',
    roles: ['ADMIN'],
    items: [{ label: 'Usuários', icon: UserCog, available: false }],
  },
];
