import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Quem decide o que fazer num 401 é o AuthProvider (limpar sessão e ir para o login).
// Fica registrado aqui para o api.js não depender do React.
let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // O próprio login responde 401 para senha errada: isso não é "sessão expirada".
    const skip = error.config?.skipAuthHandler;
    if (status === 401 && !skip && unauthorizedHandler) {
      unauthorizedHandler(error.response?.data?.message);
    }
    return Promise.reject(error);
  },
);

/** Extrai uma mensagem amigável de um erro do Axios. */
export function getApiErrorMessage(error, fallback = 'Ocorreu um erro inesperado. Tente novamente.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ECONNABORTED') return 'O servidor demorou para responder. Tente novamente.';
  if (error?.request && !error.response) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  }
  return fallback;
}
