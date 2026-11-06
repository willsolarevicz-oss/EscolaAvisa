import { Download, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { INSTITUICAO } from '../../config/instituicao';
import { useRelatorio } from '../../hooks/useRelatorio';
import { getMeusDados } from '../../services/lgpdService';
import { formatDateTime, maskCpf, maskTelefone, roleLabel } from '../../utils/formatters';
import listStyles from '../../styles/ListPage.module.css';
import formStyles from '../../styles/FormPage.module.css';
import styles from '../../styles/MeusDados.module.css';

const carregar = (_params, options) => getMeusDados(options);
const SEM_PARAMS = {};

/** Gera o arquivo JSON no próprio navegador (os dados já vieram da API; nada sai daqui). */
function baixar(dados) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `escolaavisa-meus-dados-${dados.geradoEm.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** LGPD art. 18: ver e baixar uma cópia dos próprios dados. */
export function MeusDadosPage() {
  const { data, error, loading } = useRelatorio(carregar, SEM_PARAMS, 'Não foi possível carregar seus dados.');

  return (
    <div className={formStyles.page}>
      <PageHeader
        title="Meus dados"
        description="O que o sistema guarda sobre você. Baixe uma cópia completa quando quiser (LGPD, art. 18)."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Meus dados' }]}
        actions={
          <Button icon={Download} onClick={() => baixar(data)} disabled={!data}>
            Baixar meus dados (JSON)
          </Button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}
      {loading && !data && (
        <p className={listStyles.loadingText}>
          <RefreshCw size={16} className="spin" aria-hidden="true" /> Carregando...
        </p>
      )}

      {data && (
        <>
          <section className={formStyles.card} aria-labelledby="conta-title">
            <div className={formStyles.cardHeader}>
              <h3 id="conta-title" className={formStyles.cardTitle}>
                Sua conta
              </h3>
            </div>
            <div className={formStyles.form}>
              <dl className={`${formStyles.grid} ${styles.dados}`}>
                <div>
                  <dt>Nome</dt>
                  <dd>{data.conta.nome}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>{data.conta.email}</dd>
                </div>
                <div>
                  <dt>Perfil</dt>
                  <dd>{roleLabel(data.conta.perfil)}</dd>
                </div>
                <div>
                  <dt>Conta criada em</dt>
                  <dd>{formatDateTime(data.conta.criadoEm)}</dd>
                </div>
                {data.responsavel && (
                  <>
                    <div>
                      <dt>Telefone</dt>
                      <dd>{data.responsavel.telefone ? maskTelefone(data.responsavel.telefone) : '—'}</dd>
                    </div>
                    <div>
                      <dt>CPF</dt>
                      <dd>{data.responsavel.cpf ? maskCpf(data.responsavel.cpf) : '—'}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          </section>

          <section className={formStyles.card} aria-labelledby="resumo-title">
            <div className={formStyles.cardHeader}>
              <h3 id="resumo-title" className={formStyles.cardTitle}>
                O que mais está guardado
              </h3>
            </div>
            <div className={formStyles.form}>
              <ul className={styles.resumo}>
                {data.responsavel && <li>{data.alunosVinculados.length} aluno(s) vinculado(s) a você</li>}
                <li>{data.avisosRecebidos.length} aviso(s) recebido(s), com a data de leitura</li>
                <li>{data.ocorrencias.length} ocorrência(s) com o seu registro de ciência</li>
                <li>{data.mensagensEnviadas.length} mensagem(ns) escrita(s) por você</li>
                <li>{data.aceitesDeTermos.length} aceite(s) da Política de Privacidade e dos Termos</li>
                <li>{data.acoesRegistradas.itens.length} ação(ões) registrada(s) na auditoria (com o IP de origem)</li>
              </ul>
              <p className={formStyles.muted}>Tudo isso, com os detalhes, está no arquivo para baixar.</p>
            </div>
          </section>

          <Alert type="info">
            Para <strong>corrigir</strong> algum dado, fale com a secretaria ({INSTITUICAO.contato}). Para pedir{' '}
            <strong>anonimização ou exclusão</strong>, fale com o encarregado de dados: {INSTITUICAO.encarregado.nome} (
            {INSTITUICAO.encarregado.email}). Saiba mais na <Link to="/privacidade">Política de Privacidade</Link>.
          </Alert>
        </>
      )}
    </div>
  );
}
