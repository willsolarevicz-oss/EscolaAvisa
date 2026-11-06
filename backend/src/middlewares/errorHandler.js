import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// Códigos de erro do PostgreSQL que viram respostas amigáveis.
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_ERRORS = {
  '23505': { status: 409, message: 'Já existe um registro com esses dados.' },
  '23503': { status: 409, message: 'Operação viola um relacionamento entre registros.' },
  '23514': { status: 400, message: 'Dados inválidos.' },
  '23502': { status: 400, message: 'Campo obrigatório não informado.' },
  '22P02': { status: 400, message: 'Formato de dado inválido.' },
  '22001': { status: 400, message: 'Valor maior que o tamanho permitido.' },
};

/**
 * Rota segura para o log: sem query string (buscas podem ter nomes/e-mails), sem quebras de linha
 * nem caracteres de controle (impede forjar uma linha falsa no log) e com tamanho limitado.
 */
export function rotaParaLog(url) {
  return String(url).split('?')[0].replace(/[\r\n]/g, '').replace(/\p{Cc}/gu, '').slice(0, 200);
}

export function notFoundHandler(req, _res, next) {
  next(AppError.notFound(`Rota não encontrada: ${req.method} ${req.path}`));
}

// Precisa declarar os 4 parâmetros (mesmo sem usar _next): é assim que o Express reconhece um error handler.
export function errorHandler(error, req, res, _next) {
  let status = 500;
  let message = 'Erro interno do servidor. Tente novamente mais tarde.';
  let details;

  if (error instanceof AppError) {
    status = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON inválido no corpo da requisição.';
  } else if (error.type === 'entity.too.large') {
    status = 413;
    message = 'Corpo da requisição muito grande.';
  } else if (error.code && PG_ERRORS[error.code]) {
    ({ status, message } = PG_ERRORS[error.code]);
  }

  // Erros inesperados são registrados por completo no servidor, nunca enviados ao cliente.
  // Sem a query string: buscas podem ter nomes/e-mails (o log não deve guardar dado pessoal).
  // O prefixo fixo "[erro]" é o que o monitoramento procura no log (docs/OPERACAO.md).
  if (status >= 500 && !env.isTest) {
    // Formato fixo com %s: a rota vem do cliente e não pode virar formatação nem quebrar linha no log.
    console.error('[erro] %s %s %s', new Date().toISOString(), req.method, rotaParaLog(req.originalUrl), error);
  }

  const body = { success: false, message };
  if (details) body.errors = details;
  res.status(status).json(body);
}
