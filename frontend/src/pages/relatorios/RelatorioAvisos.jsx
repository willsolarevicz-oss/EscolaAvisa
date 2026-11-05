import { Alert } from '../../components/Alert';
import { ReadProgress } from '../../components/ReadProgress';
import { useRelatorio } from '../../hooks/useRelatorio';
import { getRelatorioAvisos } from '../../services/relatorioService';
import { formatDateTime } from '../../utils/formatters';
import { formatPercent } from '../../utils/relatorios';
import listStyles from '../../styles/ListPage.module.css';
import styles from '../../styles/Relatorios.module.css';
import { Secao, StatTile } from './RelatorioPartes';

function publicoLabel(aviso) {
  if (aviso.publico === 'TURMA') return `Turma ${aviso.turmaNome}`;
  if (aviso.publico === 'ALUNO') return `Responsáveis de ${aviso.alunoNome}`;
  return 'Todos os responsáveis';
}

export function RelatorioAvisos({ periodo, isProfessor }) {
  const { data, error, loading } = useRelatorio(getRelatorioAvisos, periodo);

  if (!data) {
    return error ? <Alert type="error">{error}</Alert> : <p className={listStyles.muted}>Carregando relatório...</p>;
  }

  const { resumo } = data;
  return (
    <div className={`${listStyles.page} ${loading ? styles.stale : ''}`} aria-busy={loading}>
      {error && <Alert type="error">{error}</Alert>}

      <div className={styles.tiles}>
        <StatTile label={isProfessor ? 'Seus avisos publicados' : 'Avisos publicados'} value={resumo.avisos} />
        <StatTile label="Destinatários" value={resumo.destinatarios} hint="cada responsável conta uma vez por aviso" />
        <StatTile
          label="Leitura"
          value={formatPercent(resumo.taxaLeitura)}
          hint={`${resumo.lidos} de ${resumo.destinatarios} ${resumo.destinatarios === 1 ? 'leitura' : 'leituras'}`}
        />
      </div>

      <div className={styles.twoColumns}>
        <Secao
          titulo="Leitura por turma"
          nota="avisos enviados para a turma"
          vazio={data.porTurma.length === 0 && 'Nenhum aviso para turma no período.'}
        >
          <div className={listStyles.tableWrap}>
            <table className={listStyles.table}>
              <thead>
                <tr>
                  <th scope="col">Turma</th>
                  <th scope="col">Avisos</th>
                  <th scope="col">Leitura</th>
                </tr>
              </thead>
              <tbody>
                {data.porTurma.map((t) => (
                  <tr key={t.turma.id}>
                    <td data-label="Turma">
                      {t.turma.nome} ({t.turma.anoLetivo})
                    </td>
                    <td data-label="Avisos" className={styles.number}>
                      {t.avisos}
                    </td>
                    <td data-label="Leitura">
                      <ReadProgress lidos={t.lidos} total={t.destinatarios} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>

        <Secao
          titulo="Responsáveis com avisos não lidos"
          nota="os 10 com mais pendências"
          vazio={data.responsaveisComPendencias.length === 0 && 'Todos os responsáveis leram os avisos do período.'}
        >
          <div className={listStyles.tableWrap}>
            <table className={listStyles.table}>
              <thead>
                <tr>
                  <th scope="col">Responsável</th>
                  <th scope="col">Não lidos</th>
                  <th scope="col">Recebidos</th>
                </tr>
              </thead>
              <tbody>
                {data.responsaveisComPendencias.map((r) => (
                  <tr key={r.usuario.id}>
                    <td data-label="Responsável">
                      <span className={styles.personText}>
                        <strong>{r.usuario.nome}</strong>
                        <span>{r.usuario.email}</span>
                      </span>
                    </td>
                    <td data-label="Não lidos" className={styles.number}>
                      {r.naoLidos}
                    </td>
                    <td data-label="Recebidos" className={styles.number}>
                      {r.recebidos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>
      </div>

      <Secao
        titulo="Avisos do período"
        nota={data.avisosTruncados ? `mostrando os ${data.avisos.length} mais recentes de ${resumo.avisos}` : undefined}
        vazio={data.avisos.length === 0 && 'Nenhum aviso publicado no período.'}
      >
        <div className={listStyles.tableWrap}>
          <table className={listStyles.table}>
            <thead>
              <tr>
                <th scope="col">Aviso</th>
                <th scope="col">Publicado em</th>
                <th scope="col">Leitura</th>
              </tr>
            </thead>
            <tbody>
              {data.avisos.map((a) => (
                <tr key={a.id}>
                  <td data-label="Aviso">
                    <span className={styles.personText}>
                      <strong>{a.titulo}</strong>
                      <span>
                        {publicoLabel(a)}
                        {!isProfessor && ` · por ${a.autorNome}`}
                      </span>
                    </span>
                  </td>
                  <td data-label="Publicado em">{formatDateTime(a.publicadoEm)}</td>
                  <td data-label="Leitura">
                    <ReadProgress lidos={a.lidos} total={a.destinatarios} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>
    </div>
  );
}
