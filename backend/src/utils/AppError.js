/**
 * Erro "esperado" da aplicação: a mensagem é segura para ir ao cliente.
 * Qualquer outro erro vira 500 com mensagem genérica no errorHandler.
 */
export class AppError extends Error {
  constructor(message, statusCode = 400, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = 'Autenticação necessária.') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Você não tem permissão para acessar este recurso.') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Recurso não encontrado.') {
    return new AppError(message, 404);
  }

  static conflict(message) {
    return new AppError(message, 409);
  }
}
