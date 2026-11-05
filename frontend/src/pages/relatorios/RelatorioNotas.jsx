import { Alert } from '../../components/Alert';
import { SelectField } from '../../components/SelectField';
import { TextField } from '../../components/TextField';
import { useRelatorio } from '../../hooks/useRelatorio';
import { listTurmasNotas } from '../../services/notaService';
import { getRelatorioNotas } from '../../services/relatorioService';
import { turnoLabel } from '../../utils/formatters';
import { formatNota } from '../../utils/notas';
import { corteValido } from '../../utils/relatorios';
import listStyles from '../../styles/ListPage.module.css';
import notasStyles from '../../styles/Notas.module.css';
import styles from '../../styles/Relatorios.module.css';
import { Secao, StatTile } from './RelatorioPartes';

const BIMESTRES = [1, 2, 3, 4];
const carregarTurmas = (_params, options) => listTurmasNotas(options);
const SEM_PARAMS = {};

/**
 * Notas por turma. `turmaId` vem da URL (se ausente, a primeira turma disponível).
 * A nota de corte é digitada ("6", "5,5"); `corteAplicado` é o último valor VÁLIDO, então
 * um texto inválido mostra o erro no campo sem apagar o relatório da tela.
 */
export function RelatorioNotas({ turmaIdUrl, onTurmaChange, corteTexto, corteAplicado, onCorteChange }) {
  const turmas = useRelatorio(carregarTurmas, SEM_PARAMS, 'Não foi possível carregar as turmas.');
  const listaTurmas = turmas.data ?? [];
  const turmaId = listaTurmas.some((t) => t.id === turmaIdUrl) ? turmaIdUrl : listaTurmas[0]?.id;

  const params = turmaId ? { turmaId, notaCorte: corteAplicado } : null;
  const relatorio = useRelatorio(getRelatorioNotas, params);
  const { data } = relatorio;

  return (
    <div className={listStyles.page}>
      <section className={listStyles.card} aria-label="Filtros do relatório de notas">
        <div className={styles.filters}>
          <SelectField
            label="Turma"
            name="turmaId"
            options={
              listaTurmas.length
                ? listaTurmas.map((t) => ({ value: t.id, label: `${t.nome} (${t.anoLetivo} · ${turnoLabel(t.turno)})` }))
                : [{ value: '', label: turmas.loading ? 'Carregando...' : 'Nenhuma turma' }]
            }
            value={turmaId ?? ''}
            onChange={(event) => onTurmaChange(event.target.value)}
            disabled={listaTurmas.length === 0}
          />
          <TextField
            label="Nota de corte"
            name="notaCorte"
            inputMode="decimal"
            value={corteTexto}
            onChange={(event) => onCorteChange(event.target.value)}
            error={corteValido(corteTexto) ? undefined : 'De 0 a 10, uma casa (ex.: 5,5).'}
            hint="Alunos com média abaixo dela aparecem em destaque."
          />
        </div>
      </section>

      {turmas.error && <Alert type="error">{turmas.error}</Alert>}
      {turmas.data && listaTurmas.length === 0 && (
        <p className={listStyles.muted}>Nenhuma turma com disciplinas atribuídas a professores.</p>
      )}
      {relatorio.error && <Alert type="error">{relatorio.error}</Alert>}
      {params && !data && relatorio.loading && <p className={listStyles.muted}>Carregando relatório...</p>}

      {data && (
        <div className={`${listStyles.page} ${relatorio.loading ? styles.stale : ''}`} aria-busy={relatorio.loading}>
          <div className={styles.tiles}>
            <StatTile label="Alunos com matrícula ativa" value={data.totalAlunos} />
            <StatTile label="Disciplinas" value={data.disciplinas.length} />
            <StatTile label="Nota de corte" value={formatNota(data.notaCorte)} />
          </div>

          {data.disciplinas.map((d) => (
            <Secao
              key={d.disciplina.id}
              titulo={d.disciplina.nome}
              nota={
                d.mediaTurma === null
                  ? 'sem notas lançadas'
                  : `média da turma ${formatNota(d.mediaTurma)} · ${d.alunosComNota} de ${data.totalAlunos} alunos com nota`
              }
            >
              <div className={notasStyles.scroll}>
                <table className={notasStyles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Bimestre</th>
                      {BIMESTRES.map((b) => (
                        <th key={b} scope="col">
                          {b}º
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Média da turma</th>
                      {BIMESTRES.map((b) => (
                        <td key={b} className={notasStyles.value}>
                          {formatNota(d.bimestres[b].media)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Notas lançadas</th>
                      {BIMESTRES.map((b) => (
                        <td key={b} className={notasStyles.value}>
                          {d.bimestres[b].lancadas} de {data.totalAlunos}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className={styles.belowTitle}>
                Abaixo de {formatNota(data.notaCorte)}:{' '}
                {d.abaixoDoCorte.length === 0 ? 'nenhum aluno' : `${d.abaixoDoCorte.length} ${d.abaixoDoCorte.length === 1 ? 'aluno' : 'alunos'}`}
              </p>
              {d.abaixoDoCorte.length > 0 && (
                <ul className={styles.belowList}>
                  {d.abaixoDoCorte.map((a) => (
                    <li key={a.id}>
                      <span className={styles.personText}>
                        <strong>{a.nome}</strong>
                        <span>Matrícula {a.matricula}</span>
                      </span>
                      <span className={styles.number}>média {formatNota(a.media)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Secao>
          ))}
        </div>
      )}
    </div>
  );
}
