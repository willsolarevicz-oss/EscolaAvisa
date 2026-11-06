import { Link } from 'react-router';
import { INSTITUICAO } from '../../config/instituicao';
import { DocumentoLayout } from './DocumentoLayout';

/** Termos de Uso. RASCUNHO para revisão jurídica; dados da escola em config/instituicao.js. */
export function TermosPage() {
  const { nome, cnpj, endereco, contato, fornecedor } = INSTITUICAO;
  return (
    <DocumentoLayout titulo="Termos de Uso">
      <h2>1. O que é o EscolaAvis</h2>
      <p>
        Sistema de comunicação entre a escola e as famílias: avisos, ocorrências, notas, calendário e mensagens. Ao acessar,
        você concorda com estes Termos e com a <Link to="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>2. Quem oferece</h2>
      <p>
        Oferecido por {nome} (CNPJ {cnpj}), {endereco}. Contato: {contato}. Desenvolvimento e manutenção: {fornecedor}.
      </p>

      <h2>3. Quem pode usar</h2>
      <p>
        Apenas pessoas com conta criada pela escola: equipe, professores e responsáveis por alunos matriculados. Não há
        cadastro aberto ao público.
      </p>

      <h2>4. Uso gratuito</h2>
      <p>
        O uso do sistema pelos responsáveis é gratuito: não há planos, cobranças, assinaturas ou reembolsos. O sistema não
        exibe publicidade.
      </p>

      <h2>5. Suas responsabilidades</h2>
      <ul>
        <li>Manter sua senha em segredo e não compartilhar sua conta.</li>
        <li>Usar as mensagens com respeito e apenas para assuntos escolares.</li>
        <li>Não divulgar dados de outros alunos ou famílias que você vir no sistema.</li>
        <li>Não tentar acessar áreas ou dados que não são seus, nem burlar a segurança.</li>
        <li>Avisar a secretaria se perceber acesso indevido à sua conta.</li>
      </ul>

      <h2>6. Responsabilidades da escola</h2>
      <ul>
        <li>Manter os dados corretos e protegidos, conforme a Política de Privacidade.</li>
        <li>Mostrar a cada pessoa apenas o que lhe diz respeito.</li>
        <li>Atender os pedidos sobre seus dados pelo encarregado de dados.</li>
      </ul>

      <h2>7. Limites do serviço</h2>
      <ul>
        <li>
          As mensagens <strong>não são canal de emergência</strong>: em situações urgentes, ligue para a escola.
        </li>
        <li>
          O sistema pode ficar indisponível em manutenções ou falhas; a escola busca restabelecê-lo o quanto antes.
        </li>
        <li>Feriados nacionais vêm de um serviço público externo (BrasilAPI) e podem ficar indisponíveis.</li>
      </ul>

      <h2>8. Suspensão de acesso</h2>
      <p>
        A escola pode desativar contas que deixarem de ter vínculo com a instituição ou que violarem estes Termos.
      </p>

      <h2>9. Mudanças nestes Termos</h2>
      <p>Quando o texto mudar, a versão muda e o novo texto precisará ser aceito no próximo acesso.</p>

      <h2>10. Lei aplicável</h2>
      <p>
        Lei brasileira, em especial a LGPD, o Marco Civil da Internet, o Código de Defesa do Consumidor e o Estatuto da
        Criança e do Adolescente. Foro: [PREENCHER: comarca].
      </p>
    </DocumentoLayout>
  );
}
