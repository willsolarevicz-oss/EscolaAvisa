// Carregado via `--import` antes de qualquer teste: garante que a config
// use TEST_DATABASE_URL (nunca o banco de desenvolvimento).
process.env.NODE_ENV = 'test';

// Valores fixos para os testes não dependerem do .env de cada desenvolvedor
// (o dotenv não sobrescreve variáveis que já existem no ambiente).
process.env.AUTH_RATE_LIMIT_MAX = '10';
process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES = '15';
process.env.JWT_EXPIRES_IN = '8h';
process.env.TRUST_PROXY = 'false';
// Testes nunca acessam a internet: porta 9 (discard) recusa a conexão na hora.
// Os testes do calendário simulam o fetch da BrasilAPI.
process.env.BRASILAPI_URL = 'http://127.0.0.1:9/api';
