// localStorage mantém a sessão ao recarregar a página e entre abas.
// Trade-off documentado em PROGRESSO.md (risco de XSS vs. cookie httpOnly).
export const TOKEN_STORAGE_KEY = 'escolaavis.token';

export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      // Navegação privada / storage bloqueado: segue sem sessão persistida.
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (error) {
      console.warn('Não foi possível salvar a sessão no navegador.', error);
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Nada a limpar se o storage estiver indisponível.
    }
  },
};
