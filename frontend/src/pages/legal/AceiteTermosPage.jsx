import { Check, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { CheckboxField } from '../../components/CheckboxField';
import { Logo } from '../../components/Logo';
import { DOCUMENTOS_VERSAO } from '../../config/instituicao';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import { aceitarTermos } from '../../services/lgpdService';
import { formatDateOnly, getFirstName } from '../../utils/formatters';
import styles from '../../styles/Aceite.module.css';

/**
 * Mostrada no lugar do sistema enquanto a pessoa não aceitar a versão vigente da Política de
 * Privacidade e dos Termos (no primeiro acesso e sempre que o texto mudar).
 */
export function AceiteTermosPage() {
  const { user, logout, atualizarTermos } = useAuth();
  const [concordo, setConcordo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  async function handleAceitar() {
    setSaving(true);
    setErro('');
    try {
      atualizarTermos(await aceitarTermos(DOCUMENTOS_VERSAO));
    } catch (error) {
      setErro(getApiErrorMessage(error, 'Não foi possível registrar o aceite. Tente novamente.'));
      setSaving(false);
    }
  }

  const reaceite = user.termos?.versao && user.termos.versao !== DOCUMENTOS_VERSAO;

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="aceite-titulo">
        <Logo />
        <h1 id="aceite-titulo" className={styles.title}>
          Antes de continuar, {getFirstName(user.nome)}
        </h1>
        <p className={styles.text}>
          Leia como a escola trata os seus dados e os dos alunos e as regras de uso do sistema. Isso vale para todos os
          perfis e é pedido de novo sempre que o texto muda.
        </p>
        <ul className={styles.docs}>
          <li>
            <Link to="/privacidade" target="_blank" rel="noopener">
              Política de Privacidade
            </Link>
          </li>
          <li>
            <Link to="/termos" target="_blank" rel="noopener">
              Termos de Uso
            </Link>
          </li>
        </ul>
        <p className={styles.versao}>Versão de {formatDateOnly(DOCUMENTOS_VERSAO)}</p>

        {erro && <Alert type="error">{erro}</Alert>}
        {reaceite && <Alert type="warning">Os documentos mudaram. Recarregue a página para ver a versão atual.</Alert>}

        <CheckboxField
          label="Li e concordo com a Política de Privacidade e os Termos de Uso"
          checked={concordo}
          onChange={(event) => setConcordo(event.target.checked)}
          disabled={saving}
        />

        <div className={styles.actions}>
          <Button variant="secondary" icon={LogOut} onClick={logout} disabled={saving}>
            Sair
          </Button>
          <Button icon={Check} onClick={handleAceitar} disabled={!concordo} loading={saving} loadingText="Registrando...">
            Aceitar e continuar
          </Button>
        </div>
      </section>
    </div>
  );
}
