import { api } from './api';

/** Retorna { api, database, timestamp }. Em 503 o backend também envia esse formato. */
export async function getHealth() {
  try {
    const { data } = await api.get('/health');
    return data.data;
  } catch (error) {
    if (error.response?.status === 503 && error.response.data?.data) {
      return error.response.data.data;
    }
    throw error;
  }
}
