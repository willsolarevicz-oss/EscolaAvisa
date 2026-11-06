import { api } from './api';

/** Registra o aceite da versão de Política/Termos que a pessoa viu. → { versao, aceito } */
export async function aceitarTermos(versao) {
  const { data } = await api.post('/me/termos/aceite', { versao });
  return data.data.termos;
}

/** Cópia dos próprios dados (LGPD art. 18). */
export async function getMeusDados({ signal } = {}) {
  const { data } = await api.get('/me/dados', { signal });
  return data.data;
}
