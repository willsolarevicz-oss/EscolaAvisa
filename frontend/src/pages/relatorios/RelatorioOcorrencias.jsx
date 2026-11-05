import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { useRelatorio } from '../../hooks/useRelatorio';
import { getRelatorioOcorrencias } from '../../services/relatorioService';
import { formatDateOnly, tipoOcorrencia } from '../../utils/formatters';
import { formatPercent } from '../../utils/relatorios';
import listStyles from '../../styles/ListPage.module.css';
import styles from '../../styles/Relatorios.module.css';
import { BarList, Secao, StatTile } from './RelatorioPartes';

export function RelatorioOcorrencias({ periodo, isProfessor }) {
  const { data, error, loading } = useRelatorio(getRelatorioOcorrencias, periodo);

  if (!data) {
    return error ? <Alert type="error">{error}</Alert> : <p className={listStyles.muted}>Carregando relatório...</p>;
  }

  const { resumo } = data;
  return (
    <div className={`${listStyles.page} ${loading ? styles.stale : ''}`} aria-busy={loading}>
      {error && <Alert type="error">{error}</Alert>}

      <div className={styles.tiles}>
        <StatTile label={isProfessor ? 'Ocorrências registradas por você' : 'Ocorrências'} value={resumo.ocorrencias} />
        <StatTile label="Alunos envolvidos" value={resumo.alunos} />
        <StatTile
          label="Ciência dos responsáveis"
          value={formatPercent(resumo.taxaCiencia)}
          hint={`${resumo.cientes} de ${resumo.responsaveis} deram ciência`}
        />
      </div>

      <div className={styles.twoColumns}>
        <Secao titulo="Por tipo" vazio={data.porTipo.length === 0 && 'Nenhuma ocorrência no período.'}>
          <BarList
            descricao="Ocorrências por tipo"
            itens={data.porTipo.map((t) => ({ key: t.tipo, label: tipoOcorrencia(t.tipo).label, value: t.total }))}
          />
        </Secao>

        <Secao
          titulo="Por turma"
          nota="turma do aluno no ano da ocorrência"
          vazio={data.porTurma.length === 0 && 'Nenhuma ocorrência no período.'}
        >
          <div className={listStyles.tableWrap}>
            <table className={listStyles.table}>
              <thead>
                <tr>
                  <th scope="col">Turma</th>
                  <th scope="col">Ocorrências</th>
                  <th scope="col">Alunos</th>
                </tr>
              </thead>
              <tbody>
                {data.porTurma.map((t) => (
                  <tr key={t.turma?.id ?? 'sem-turma'}>
                    <td data-label="Turma">{t.turma?.nome ?? 'Sem turma no ano'}</td>
                    <td data-label="Ocorrências" className={styles.number}>
                      {t.total}
                    </td>
                    <td data-label="Alunos" className={styles.number}>
                      {t.alunos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>
      </div>

      <Secao
        titulo="Alunos com mais ocorrências"
        nota="os 10 primeiros"
        vazio={data.alunos.length === 0 && 'Nenhuma ocorrência no período.'}
      >
        <div className={listStyles.tableWrap}>
          <table className={listStyles.table}>
            <thead>
              <tr>
                <th scope="col">Aluno</th>
                <th scope="col">Turma atual</th>
                <th scope="col">Ocorrências</th>
                <th scope="col">Tipos</th>
                <th scope="col">Última</th>
              </tr>
            </thead>
            <tbody>
              {data.alunos.map((a) => (
                <tr key={a.aluno.id}>
                  <td data-label="Aluno">
                    <span className={styles.personText}>
                      <strong>{a.aluno.nome}</strong>
                      <span>Matrícula {a.aluno.matricula}</span>
                    </span>
                  </td>
                  <td data-label="Turma atual">{a.turmaAtual ?? '—'}</td>
                  <td data-label="Ocorrências" className={styles.number}>
                    {a.total}
                  </td>
                  <td data-label="Tipos">
                    <span className={styles.tags}>
                      {a.tipos.map((tipo) => (
                        <Badge key={tipo} tone={tipoOcorrencia(tipo).tone}>
                          {tipoOcorrencia(tipo).label}
                        </Badge>
                      ))}
                    </span>
                  </td>
                  <td data-label="Última">{formatDateOnly(a.ultima)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>
    </div>
  );
}
