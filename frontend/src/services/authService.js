import { api } from './api';

export async function login(email, senha) {
  const { data } = await api.post('/auth/login', { email, senha }, { skipAuthHandler: true });
  return data.data; // { token, tokenType, expiresIn, user }
}

/** `skipAuthHandler`: na checagem inicial o próprio AuthProvider trata o 401. */
export async function getMe({ skipAuthHandler = false } = {}) {
  const { data } = await api.get('/auth/me', { skipAuthHandler });
  return data.data.user;
}
