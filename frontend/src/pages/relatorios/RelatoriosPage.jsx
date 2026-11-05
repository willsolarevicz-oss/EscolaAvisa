import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { PageHeader } from '../../components/PageHeader';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../hooks/useAuth';
import { parseNota } from '../../utils/notas';
import { corteValido, periodoDaUrl } from '../../utils/relatorios';
import comunicadoStyles from '../../styles/Comunicado.module.css';
import listStyles from '../../styles/ListPage.module.css';
import styles from '../../styles/Relatorios.module.css';
import { RelatorioAvisos } from './RelatorioAvisos';
import { RelatorioNotas } from './RelatorioNotas';
import { RelatorioOcorrencias } from './RelatorioOcorrencias';

const ABAS = [
  { value: 'avisos', label: 'Leitura de avisos' },
  { value: 'ocorrencias', label: 'Ocorrências' },
  { value: 'notas', label: 'Notas' },
];

/** Relatórios (ADMIN: escola toda; professor: só o que é dele). Aba e filtros ficam na URL. */
export function RelatoriosPage() {
  const { user } = useAuth();
  const isProfessor = user.tipoUsuario === 'PROFESSOR';
  const [searchParams, setSearchParams] = useSearchParams();
  const aba = ABAS.some((a) => a.value === searchParams.get('aba')) ? searchParams.get('aba') : 'avisos';
  const queryString = searchParams.toString();
  // Objeto estável por URL: o relatório só é buscado de novo quando o período muda.
  const periodo = useMemo(() => periodoDaUrl(new URLSearchParams(queryString)), [queryString]);
  const [corteTexto, setCorteTexto] = useState('6');
  const [corteAplicado, setCorteAplicado] = useState(6);

  function handleCorteChange(texto) {
    setCorteTexto(texto);
    if (corteValido(texto)) setCorteAplicado(parseNota(texto));
  }

  function updateParams(changes) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div className={listStyles.page}>
      <PageHeader
        title="Relatórios"
        description={
          isProfessor
            ? 'Seus avisos, suas ocorrências e as notas das turmas e disciplinas em que você leciona.'
            : 'Leitura de avisos, ocorrências e notas da escola.'
        }
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Relatórios' }]}
      />

      <div className={comunicadoStyles.tabs} role="group" aria-label="Escolher relatório">
        {ABAS.map((a) => (
          <button
            key={a.value}
            type="button"
            className={`${comunicadoStyles.tab} ${aba === a.value ? comunicadoStyles.tabActive : ''}`}
            aria-pressed={aba === a.value}
            onClick={() => updateParams({ aba: a.value === 'avisos' ? '' : a.value })}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba !== 'notas' && (
        // Um filtro de período, acima de tudo o que ele afeta.
        <section className={listStyles.card} aria-label="Período do relatório">
          <div className={styles.filters}>
            <TextField
              label="De"
              name="inicio"
              type="date"
              value={periodo.inicio}
              max={periodo.fim}
              onChange={(event) => updateParams({ inicio: event.target.value })}
            />
            <TextField
              label="Até"
              name="fim"
              type="date"
              value={periodo.fim}
              min={periodo.inicio}
              onChange={(event) => updateParams({ fim: event.target.value })}
            />
          </div>
        </section>
      )}

      {aba === 'avisos' && <RelatorioAvisos periodo={periodo} isProfessor={isProfessor} />}
      {aba === 'ocorrencias' && <RelatorioOcorrencias periodo={periodo} isProfessor={isProfessor} />}
      {aba === 'notas' && (
        <RelatorioNotas
          turmaIdUrl={searchParams.get('turmaId')}
          onTurmaChange={(turmaId) => updateParams({ turmaId })}
          corteTexto={corteTexto}
          corteAplicado={corteAplicado}
          onCorteChange={handleCorteChange}
        />
      )}
    </div>
  );
}
