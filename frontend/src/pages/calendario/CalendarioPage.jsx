import axios from 'axios';
import { ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { getApiErrorMessage } from '../../services/api';
import { getCalendario } from '../../services/eventoService';
import {
  DIAS_SEMANA,
  eventoNoDia,
  isMesValido,
  mesAtual,
  nomeDoMes,
  periodoCurto,
  semanasDoMes,
  somarMeses,
  tipoEvento,
} from '../../utils/calendario';
import listStyles from '../../styles/ListPage.module.css';
import styles from '../../styles/Calendario.module.css';

// Quantos itens cabem numa célula da grade antes do "+N".
const MAX_CHIPS = 3;

const DESCRICAO_POR_PERFIL = {
  ADMIN: 'Eventos da escola e das turmas, com os feriados nacionais.',
  PROFESSOR: 'Eventos da escola e das suas turmas, com os feriados nacionais.',
  RESPONSAVEL: 'Provas, reuniões e eventos da escola e da turma dos seus filhos, com os feriados nacionais.',
};

/** Feriados e eventos do mês numa lista só, em ordem de data. */
function itensDoMes(data) {
  const feriados = data.feriados.map((f) => ({ key: `f-${f.data}`, data: f.data, feriado: f }));
  const eventos = data.eventos.map((e) => ({ key: `e-${e.id}`, data: e.dataInicio, evento: e }));
  return [...feriados, ...eventos].sort((a, b) => a.data.localeCompare(b.data));
}

export function CalendarioPage() {
  const { user } = useAuth();
  const podeCriar = user.tipoUsuario === 'ADMIN' || user.tipoUsuario === 'PROFESSOR';
  const [flash, setFlash] = useFlashMessage();

  // O mês fica na URL: voltar da edição de um evento (ou recarregar) mantém o mês aberto.
  const [searchParams, setSearchParams] = useSearchParams();
  const mesParam = searchParams.get('mes');
  const mes = isMesValido(mesParam) ? mesParam : mesAtual();
  const hoje = new Date().toLocaleDateString('sv-SE');

  // `key` identifica a requisição (mês + tentativa). "Carregando" = a resposta guardada é de outra key;
  // assim não precisamos de setState síncrono no efeito.
  const [tentativa, setTentativa] = useState(0);
  const requestKey = `${mes}#${tentativa}`;
  const [result, setResult] = useState({ key: null, data: null, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    getCalendario(mes, { signal: controller.signal })
      .then((data) => setResult({ key: requestKey, data, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setResult({ key: requestKey, data: null, error: getApiErrorMessage(error, 'Não foi possível carregar o calendário.') });
      });
    return () => controller.abort();
  }, [mes, requestKey]);

  const loading = result.key !== requestKey;
  const error = loading ? '' : result.error;
  // Só usa os dados se forem do mês aberto (evita mostrar o mês anterior durante a troca).
  const data = result.data?.mes === mes ? result.data : null;
  const semanas = useMemo(() => semanasDoMes(mes), [mes]);
  const itens = useMemo(() => (data ? itensDoMes(data) : []), [data]);

  const irPara = (novoMes) => setSearchParams(novoMes === mesAtual() ? {} : { mes: novoMes });

  function chipsDoDia(dia) {
    const feriados = data.feriados.filter((f) => f.data === dia).map((f) => ({ key: f.data, label: f.nome, className: styles.holiday }));
    const eventos = data.eventos
      .filter((e) => eventoNoDia(e, dia))
      .map((e) => ({ key: e.id, label: e.titulo, className: styles[`tone_${tipoEvento(e.tipo).tone}`] }));
    return [...feriados, ...eventos];
  }

  return (
    <div className={listStyles.page}>
      <PageHeader
        title="Calendário"
        description={DESCRICAO_POR_PERFIL[user.tipoUsuario]}
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Calendário' }]}
        actions={
          podeCriar && (
            <Button icon={Plus} to="/calendario/eventos/novo">
              Novo evento
            </Button>
          )
        }
      />

      {flash && (
        <Alert type={flash.type} onClose={() => setFlash(null)}>
          {flash.message}
        </Alert>
      )}

      {data && !data.feriadosDisponiveis && (
        <Alert type="warning">
          Os feriados nacionais estão indisponíveis no momento (BrasilAPI fora do ar). Os eventos da escola estão atualizados.
        </Alert>
      )}

      <section className={listStyles.card} aria-label="Calendário do mês">
        <div className={styles.toolbar}>
          <div className={styles.monthNav}>
            <Button variant="ghost" size="sm" icon={ChevronLeft} aria-label="Mês anterior" onClick={() => irPara(somarMeses(mes, -1))} />
            <h2 className={styles.monthTitle} aria-live="polite">
              {nomeDoMes(mes)}
            </h2>
            <Button variant="ghost" size="sm" icon={ChevronRight} aria-label="Próximo mês" onClick={() => irPara(somarMeses(mes, 1))} />
          </div>
          <Button variant="secondary" size="sm" onClick={() => irPara(mesAtual())} disabled={mes === mesAtual()}>
            Hoje
          </Button>
        </div>

        {error ? (
          <div className={styles.emptyList}>
            <Alert type="error">{error}</Alert>
            <Button variant="secondary" size="sm" onClick={() => setTentativa((n) => n + 1)}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <table className={styles.table} aria-busy={!data}>
            <caption className="visually-hidden">Calendário de {nomeDoMes(mes)}</caption>
            <thead>
              <tr>
                {DIAS_SEMANA.map((dia) => (
                  <th key={dia} scope="col">
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {semanas.map((semana) => (
                <tr key={semana.find(Boolean).data}>
                  {semana.map((celula, index) => {
                    if (!celula) return <td key={`vazio-${index}`} className={styles.outside} />;
                    const chips = data ? chipsDoDia(celula.data) : [];
                    return (
                      <td key={celula.data} className={celula.data === hoje ? styles.today : undefined}>
                        <span className={styles.dayNumber}>{celula.dia}</span>
                        {chips.length > 0 && (
                          <div className={styles.chips}>
                            {chips.slice(0, MAX_CHIPS).map((chip) => (
                              <span key={chip.key} className={`${styles.chip} ${chip.className}`} title={chip.label}>
                                {chip.label}
                              </span>
                            ))}
                            {chips.length > MAX_CHIPS && <span className={styles.more}>+{chips.length - MAX_CHIPS}</span>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={listStyles.card} aria-labelledby="lista-mes-title">
        <h2 id="lista-mes-title" className={styles.listTitle}>
          Neste mês
        </h2>
        {!data && loading && <p className={styles.emptyList}>Carregando...</p>}
        {data && itens.length === 0 && <p className={styles.emptyList}>Nenhum evento ou feriado neste mês.</p>}
        {itens.length > 0 && (
          <ul className={styles.list}>
            {itens.map((item) =>
              item.feriado ? (
                <li key={item.key} className={styles.item}>
                  <span className={styles.date}>{periodoCurto({ dataInicio: item.data, dataFim: item.data })}</span>
                  <div className={styles.itemBody}>
                    <span className={styles.itemTitle}>
                      {item.feriado.nome} <Badge tone="neutral">Feriado nacional</Badge>
                    </span>
                  </div>
                </li>
              ) : (
                <EventoItem key={item.key} evento={item.evento} mes={mes} />
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

function EventoItem({ evento, mes }) {
  const tipo = tipoEvento(evento.tipo);
  return (
    <li className={styles.item}>
      <span className={styles.date}>{periodoCurto(evento)}</span>
      <div className={styles.itemBody}>
        <span className={styles.itemTitle}>
          {evento.titulo} <Badge tone={tipo.tone}>{tipo.label}</Badge>
        </span>
        <span className={styles.itemMeta}>
          {evento.turma ? `Turma ${evento.turma.nome}` : 'Escola toda'} · por {evento.autor.nome}
        </span>
        {evento.descricao && <p className={styles.itemDescription}>{evento.descricao}</p>}
      </div>
      {evento.podeEditar && (
        <div className={styles.itemActions}>
          <Button variant="secondary" size="sm" icon={Pencil} to={`/calendario/eventos/${evento.id}/editar?voltar=${mes}`}>
            Editar
          </Button>
        </div>
      )}
    </li>
  );
}
