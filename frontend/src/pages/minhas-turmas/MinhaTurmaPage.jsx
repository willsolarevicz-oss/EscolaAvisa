import { ArrowLeft, ClipboardList, Megaphone, MessageSquare } from 'lucide-react';
import { useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { useEntityLoader } from '../../hooks/useEntityLoader';
import { listAlunosDaMinhaTurma } from '../../services/turmaService';
import { turnoLabel } from '../../utils/formatters';
import listStyles from '../../styles/ListPage.module.css';
import styles from '../../styles/MinhasTurmas.module.css';

/** Professor: alunos de uma turma em que leciona, com atalhos para ocorrência e mensagem. */
export function MinhaTurmaPage() {
  const { turmaId } = useParams();
  const loader = useEntityLoader(listAlunosDaMinhaTurma, turmaId, {
    errorMessage: 'Não foi possível carregar a turma.',
  });
  const data = loader.data;

  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Minhas turmas', to: '/minhas-turmas' },
    { label: data?.turma.nome ?? 'Turma' },
  ];

  if (loader.status !== 'ready') {
    return (
      <div className={listStyles.page}>
        <PageHeader title="Turma" breadcrumbs={breadcrumbs} />
        {loader.status === 'loading' ? (
          <p className={listStyles.muted}>Carregando alunos...</p>
        ) : (
          <>
            <Alert type="error">{loader.status === 'notfound' ? 'Turma não encontrada.' : loader.errorMessage}</Alert>
            <div>
              <Button to="/minhas-turmas" icon={ArrowLeft}>
                Voltar para minhas turmas
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  const { turma, alunos } = data;
  return (
    <div className={listStyles.page}>
      <PageHeader
        title={turma.nome}
        description={`${turma.anoLetivo} · ${turnoLabel(turma.turno)} · ${alunos.length} ${alunos.length === 1 ? 'aluno' : 'alunos'}`}
        breadcrumbs={breadcrumbs}
        actions={
          <Button icon={Megaphone} to={`/avisos/novo?turmaId=${turma.id}`}>
            Enviar aviso para a turma
          </Button>
        }
      />

      {!turma.ativo && <Alert type="warning">Esta turma está desativada.</Alert>}

      <section className={listStyles.card} aria-label={`Alunos da turma ${turma.nome}`}>
        {alunos.length === 0 ? (
          <p className={styles.empty}>Nenhum aluno com matrícula ativa nesta turma.</p>
        ) : (
          <div className={listStyles.tableWrap}>
            <table className={listStyles.table}>
              <thead>
                <tr>
                  <th scope="col">Aluno</th>
                  <th scope="col">Família</th>
                  <th scope="col">
                    <span className="visually-hidden">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => {
                  // Vai na navegação: o formulário já abre com o aluno escolhido.
                  const state = { aluno: { id: aluno.id, nome: aluno.nome, matricula: aluno.matricula } };
                  const semContato = aluno.responsaveisAutorizados === 0;
                  return (
                    <tr key={aluno.id}>
                      <td data-label="Aluno">
                        <span className={styles.personText}>
                          <strong>{aluno.nome}</strong>
                          <span>Matrícula {aluno.matricula}</span>
                        </span>
                      </td>
                      <td data-label="Família">
                        {semContato ? (
                          <Badge tone="warning">Sem responsável autorizado</Badge>
                        ) : (
                          `${aluno.responsaveisAutorizados} ${aluno.responsaveisAutorizados === 1 ? 'responsável' : 'responsáveis'}`
                        )}
                      </td>
                      <td className={listStyles.actionsCell}>
                        <div className={listStyles.rowActions}>
                          <Button variant="secondary" size="sm" icon={ClipboardList} to="/ocorrencias/nova" state={state}>
                            Ocorrência
                          </Button>
                          {/* Sem responsável autorizado não há com quem conversar. */}
                          {!semContato && (
                            <Button variant="secondary" size="sm" icon={MessageSquare} to="/mensagens/nova" state={state}>
                              Mensagem
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Recria a tela ao trocar de turma na URL. */
export function MinhaTurmaRoute() {
  const { turmaId } = useParams();
  return <MinhaTurmaPage key={turmaId} />;
}
