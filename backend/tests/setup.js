// Carregado via `--import` antes de qualquer teste: garante que a config
// use TEST_DATABASE_URL (nunca o banco de desenvolvimento).
process.env.NODE_ENV = 'test';
