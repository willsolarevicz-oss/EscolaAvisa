import axios from 'axios';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { getApiErrorMessage } from '../../services/api';
import { listOcorrencias } from '../../services/ocorrenciaService';
import { formatDateOnly, tipoOcorrencia } from '../../utils/formatters';
import formStyles from '../../styles/FormPage.module.css';
import styles from '../../styles/RelationSection.module.css';

const LIMITE = 5;

/** Últimas ocorrências do aluno, com atalho para registrar uma nova já com o aluno selecionado. */
export function AlunoOcorrenciasSection({ alunoId }) {
  const [state, setState] = useState({ status: 'loading', items: [], total: 0, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    listOcorrencias({ alunoId, pageSize: LIMITE }, { signal: controller.signal })
      .then((data) => setState({ status: 'ready', items: data.items, total: data.pagination.total, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setState({ status: 'error', items: [], total: 0, error: getApiErrorMessage(error, 'Não foi possível carregar as ocorrências.') });
      });
    return () => controller.abort();
  }, [alunoId]);

  return (
    <section className={formStyles.card} aria-labelledby="aluno-ocorrencias-title">
      <div className={formStyles.cardHeader}>
        <h3 id="aluno-ocorrencias-title" className={formStyles.cardTitle}>
          Ocorrências {state.status === 'ready' && `(${state.total})`}
        </h3>
        <Button size="sm" icon={Plus} to={`/ocorrencias/nova?alunoId=${alunoId}`}>
          Registrar ocorrência
        </Button>
      </div>
      <div className={styles.body}>
        {state.status === 'loading' && <p className={formStyles.muted}>Carregando...</p>}
        {state.status === 'error' && <Alert type="error">{state.error}</Alert>}
        {state.status === 'ready' && state.items.length === 0 && (
          <p className={formStyles.muted}>Nenhuma ocorrência registrada para este aluno.</p>
        )}
        {state.items.length > 0 && (
          <ul className={styles.list}>
            {state.items.map((o) => {
              const tipo = tipoOcorrencia(o.tipo);
              return (
                <li key={o.id} className={styles.item}>
                  <div className={styles.itemMain}>
                    <div className={styles.personText}>
                      <Link to={`/ocorrencias/${o.id}`}>
                        <strong>{formatDateOnly(o.dataOcorrencia)}</strong>
                      </Link>
                      <span>
                        {o.descricao.length > 120 ? `${o.descricao.slice(0, 120)}…` : o.descricao}
                      </span>
                      <div className={styles.tags}>
                        <Badge tone={tipo.tone}>{tipo.label}</Badge>
                        {!o.ativo && <Badge tone="neutral">Arquivada</Badge>}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {state.total > LIMITE && (
          <Link to={`/ocorrencias?alunoId=${alunoId}`}>Ver todas as {state.total} ocorrências</Link>
        )}
      </div>
    </section>
  );
}
