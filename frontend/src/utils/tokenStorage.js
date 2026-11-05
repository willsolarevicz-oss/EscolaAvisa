// localStorage mantém a sessão ao recarregar a página e entre abas.
// Trade-off documentado em PROGRESSO.md (risco de XSS vs. cookie httpOnly).
export const TOKEN_STORAGE_KEY = 'escolaavis.token';
// Momento (relógio LOCAL, em ms) em que a sessão expira. Calculado no login a partir do
// `expiresIn` do servidor, para não depender de o relógio do PC bater com o do servidor.
const EXPIRES_AT_STORAGE_KEY = 'escolaavis.tokenExpiresAt';

// Avisa no console UMA vez: get() roda a cada render/requisição e não deve inundar o log.
let avisouStorageIndisponivel = false;
function avisarStorageIndisponivel(acao, error) {
  if (avisouStorageIndisponivel) return;
  avisouStorageIndisponivel = true;
  console.warn(`Armazenamento do navegador indisponível (${acao}); a sessão não fica salva.`, error);
}

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    // Navegação privada / storage bloqueado: segue sem sessão persistida.
    avisarStorageIndisponivel('leitura', error);
    return null;
  }
}

export const tokenStorage = {
  get() {
    return read(TOKEN_STORAGE_KEY);
  },
  /** @returns {number|null} null se desconhecido (sessão antiga, salva antes deste campo existir) */
  getExpiresAt() {
    const value = Number(read(EXPIRES_AT_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  },
  set(token, expiresAt) {
    try {
      // Grava a expiração antes do token: outras abas reagem à mudança do token
      // (evento "storage") e já encontram a expiração correspondente.
      localStorage.setItem(EXPIRES_AT_STORAGE_KEY, String(expiresAt));
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (error) {
      console.warn('Não foi possível salvar a sessão no navegador.', error);
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(EXPIRES_AT_STORAGE_KEY);
    } catch (error) {
      // Se o storage está indisponível, não há sessão salva para limpar; só registramos.
      avisarStorageIndisponivel('limpeza', error);
    }
  },
};
