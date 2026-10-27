// Fonte única dos perfis. Deve ficar igual à CHECK constraint de usuarios.tipo_usuario.
export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  PROFESSOR: 'PROFESSOR',
  RESPONSAVEL: 'RESPONSAVEL',
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));
