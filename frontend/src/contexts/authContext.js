import { createContext } from 'react';

// Separado do Provider para o Fast Refresh do Vite funcionar (arquivo .jsx só com componentes).
export const AuthContext = createContext(null);

export const AUTH_STATUS = Object.freeze({
  CHECKING: 'checking', // validando token salvo no navegador
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error', // não foi possível falar com o servidor para validar a sessão
});
