import axios from 'axios';
import { CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getApiErrorMessage } from '../services/api';
import { getProximosEventos } from '../services/eventoService';
import { periodoCurto, tipoEvento } from '../utils/calendario';
import { formatDateOnly } from '../utils/formatters';
import { Badge } from './Badge';
import styles from './ProximosEventos.module.css';

/** Painel do dashboard: próximos eventos visíveis ao usuário + próximo feriado nacional. */
export function ProximosEventos() {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    getProximosEventos(5, { signal: controller.signal })
      .then((data) => setState({ status: 'ready', data, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setState({ status: 'error', data: null, error: getApiErrorMessage(error, 'Não foi possível carregar os eventos.') });
      });
    return () => controller.abort();
  }, []);

  const { data } = state;

  return (
    <section className={styles.panel} aria-labelledby="proximos-eventos-title">
      <div className={styles.header}>
        <h3 id="proximos-eventos-title" className={styles.title}>
          Próximos eventos
        </h3>
        <Link to="/calendario" className={styles.link}>
          Ver calendário
        </Link>
      </div>

      {state.status === 'loading' && <p className={styles.empty}>Carregando...</p>}
      {state.status === 'error' && <p className={styles.empty}>{state.error}</p>}
      {data && data.eventos.length === 0 && <p className={styles.empty}>Nenhum evento agendado.</p>}

      {data && data.eventos.length > 0 && (
        <ul className={styles.list}>
          {data.eventos.map((evento) => {
            const tipo = tipoEvento(evento.tipo);
            return (
              <li key={evento.id} className={styles.item}>
                <span className={styles.date}>{periodoCurto(evento)}</span>
                <span className={styles.body}>
                  <span className={styles.eventTitle}>{evento.titulo}</span>
                  <span className={styles.meta}>{evento.turma ? `Turma ${evento.turma.nome}` : 'Escola toda'}</span>
                </span>
                <Badge tone={tipo.tone}>{tipo.label}</Badge>
              </li>
            );
          })}
        </ul>
      )}

      {data && (
        <p className={styles.foot}>
          <CalendarDays size={14} aria-hidden="true" />
          {data.proximoFeriado
            ? `Próximo feriado nacional: ${data.proximoFeriado.nome} (${formatDateOnly(data.proximoFeriado.data)})`
            : data.feriadosDisponiveis
              ? 'Sem feriados nacionais próximos.'
              : 'Feriados nacionais indisponíveis no momento.'}
        </p>
      )}
    </section>
  );
}
