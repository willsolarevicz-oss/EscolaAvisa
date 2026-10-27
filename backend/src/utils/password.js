import bcrypt from 'bcrypt';

// Custo 12 ≈ 200-300ms por hash: lento para ataque de força bruta, aceitável no login.
const SALT_ROUNDS = 12;

export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

// Hash "falso" usado quando o e-mail não existe: o login leva o mesmo tempo
// nos dois casos, evitando descobrir e-mails cadastrados pelo tempo de resposta.
const dummyHashPromise = bcrypt.hash('escolaavis-dummy-password', SALT_ROUNDS);

export async function burnPasswordCheck(plainPassword) {
  await bcrypt.compare(plainPassword, await dummyHashPromise);
  return false;
}
