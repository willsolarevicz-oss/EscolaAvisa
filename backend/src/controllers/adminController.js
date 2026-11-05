/**
 * Rota de verificação do RBAC: só responde 200 para usuários ADMIN.
 * Serve para confirmar (e testar) que a autorização é feita no backend.
 */
export function checkAdminAccess(req, res) {
  res.status(200).json({
    success: true,
    message: 'Acesso de administrador confirmado.',
    data: { userId: req.user.id, tipoUsuario: req.user.tipo_usuario },
  });
}
