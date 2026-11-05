import { ArrowLeft, CheckCheck, RefreshCw, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { TextAreaField } from '../../components/TextAreaField';
import { useAuth } from '../../hooks/useAuth';
import { useEntityLoader } from '../../hooks/useEntityLoader';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { getApiErrorMessage } from '../../services/api';
import { enviarMensagem, getConversa, marcarConversaLida } from '../../services/conversaService';
import { formatDateTime } from '../../utils/formatters';
import { canalLabel, outroLado } from '../../utils/mensagens';
import listStyles from '../../styles/ListPage.module.css';
import styles from '../../styles/Mensagens.module.css';

const MAX_CONTEUDO = 5000;

/** Marca como lida ao abrir. Se falhar, a conversa continua utilizável (só segue contando como nova). */
function marcarLidaSePreciso(conversa) {
  if (conversa.naoLidas === 0) return;
  marcarConversaLida(conversa.id).catch((error) => {
    console.warn('[mensagens] não foi possível marcar a conversa como lida:', getApiErrorMessage(error));
  });
}

export function ConversaPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [flash, setFlash] = useFlashMessage();
  const loader = useEntityLoader(getConversa, id, {
    onLoad: marcarLidaSePreciso,
    errorMessage: 'Não foi possível carregar a conversa.',
  });
  const conversa = loader.data;

  const [texto, setTexto] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);

  // Leva até a última mensagem ao abrir e ao chegar mensagem nova.
  const fimRef = useRef(null);
  const totalMensagens = conversa?.mensagens.length ?? 0;
  useEffect(() => {
    if (totalMensagens > 0) fimRef.current?.scrollIntoView({ block: 'end' });
  }, [totalMensagens]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending) return;
    const conteudo = texto.trim();
    if (!conteudo) {
      setSendError('Escreva a mensagem.');
      return;
    }
    setSending(true);
    setSendError('');
    try {
      loader.setData(await enviarMensagem(id, conteudo));
      setTexto('');
    } catch (error) {
      setSendError(getApiErrorMessage(error, 'Não foi possível enviar a mensagem.'));
    } finally {
      setSending(false);
    }
  }

  // Ctrl+Enter (ou Cmd+Enter) envia; Enter sozinho quebra linha.
  function handleKeyDown(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) handleSubmit(event);
  }

  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Mensagens', to: '/mensagens' },
    { label: conversa?.assunto ?? 'Conversa' },
  ];

  if (loader.status !== 'ready') {
    return (
      <div className={listStyles.page}>
        <PageHeader title="Conversa" breadcrumbs={breadcrumbs} />
        {loader.status === 'loading' ? (
          <p className={listStyles.muted}>Carregando conversa...</p>
        ) : (
          <>
            <Alert type="error">{loader.status === 'notfound' ? 'Conversa não encontrada.' : loader.errorMessage}</Alert>
            <div>
              <Button to="/mensagens" icon={ArrowLeft}>
                Voltar para mensagens
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  const isResponsavel = user.tipoUsuario === 'RESPONSAVEL';
  const descricao = [
    `Com ${outroLado(conversa, user.tipoUsuario)}`,
    `Aluno: ${conversa.aluno.nome}`,
    !isResponsavel && canalLabel(conversa.canal),
  ]
    .filter(Boolean)
    .join(' · ');
  const lidaAte = conversa.lidaPeloOutroLadoEm;

  return (
    <div className={listStyles.page}>
      <PageHeader
        title={conversa.assunto}
        description={descricao}
        breadcrumbs={breadcrumbs}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={loader.reload}>
            Atualizar
          </Button>
        }
      />

      {flash && (
        <Alert type={flash.type} onClose={() => setFlash(null)}>
          {flash.message}
        </Alert>
      )}

      <section className={listStyles.card} aria-label="Mensagens da conversa">
        <ol className={styles.thread}>
          {conversa.mensagens.map((mensagem) => (
            <li key={mensagem.id} className={`${styles.message} ${mensagem.minha ? styles.mine : ''}`}>
              <div className={styles.bubble}>{mensagem.conteudo}</div>
              <span className={styles.messageMeta}>
                {!mensagem.minha && <span className={styles.author}>{mensagem.autor.nome}</span>}
                <time dateTime={mensagem.enviadaEm}>{formatDateTime(mensagem.enviadaEm)}</time>
                {mensagem.minha && lidaAte && lidaAte >= mensagem.enviadaEm && (
                  <span className={styles.read}>
                    <CheckCheck size={14} aria-hidden="true" /> Lida
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
        <div ref={fimRef} />

        <form className={styles.composer} onSubmit={handleSubmit} noValidate>
          {sendError && <Alert type="error">{sendError}</Alert>}
          <TextAreaField
            label="Responder"
            name="conteudo"
            placeholder="Escreva sua mensagem"
            value={texto}
            onChange={(event) => {
              setTexto(event.target.value);
              setSendError('');
            }}
            onKeyDown={handleKeyDown}
            disabled={sending}
            maxLength={MAX_CONTEUDO}
            rows={3}
          />
          <div className={styles.composerActions}>
            <span className={styles.hint}>Ctrl + Enter para enviar</span>
            <Button type="submit" icon={Send} loading={sending} loadingText="Enviando...">
              Enviar
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

/** Recria a tela ao trocar de conversa na URL (zera o texto digitado). */
export function ConversaRoute() {
  const { id } = useParams();
  return <ConversaPage key={id} />;
}
