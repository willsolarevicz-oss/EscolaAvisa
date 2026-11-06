import { Link } from 'react-router';
import { INSTITUICAO } from '../../config/instituicao';
import styles from '../../styles/Documento.module.css';
import { DocumentoLayout } from './DocumentoLayout';

/**
 * Política de Privacidade (LGPD). RASCUNHO: bases legais e prazos são sugestões técnicas e
 * precisam de revisão jurídica. Dados da escola vêm de config/instituicao.js.
 */
export function PrivacidadePage() {
  const { nome, cnpj, endereco, contato, encarregado, hospedagem } = INSTITUICAO;
  return (
    <DocumentoLayout titulo="Política de Privacidade">
      <h2>1. Quem trata os seus dados</h2>
      <p>
        A <strong>controladora</strong> dos dados é {nome} (CNPJ {cnpj}), {endereco}. Contato: {contato}.
      </p>
      <p>
        <strong>Encarregado de dados (DPO):</strong> {encarregado.nome} — {encarregado.email}. É com essa pessoa que você
        exerce seus direitos e tira dúvidas sobre privacidade.
      </p>

      <h2>2. De quem são os dados</h2>
      <p>
        De responsáveis (pais, mães e demais responsáveis legais), professores e equipe da escola e, principalmente, de{' '}
        <strong>alunos, que são crianças e adolescentes</strong>. Os dados deles são tratados sempre no seu melhor
        interesse (art. 14 da LGPD) e só pela escola e pelos responsáveis vinculados.
      </p>

      <h2>3. Quais dados tratamos</h2>
      <table className={styles.tabela}>
        <thead>
          <tr>
            <th scope="col">Categoria</th>
            <th scope="col">Exemplos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Conta de acesso</td>
            <td>Nome, e-mail, perfil e senha (guardada só em forma irreversível, nunca o texto da senha)</td>
          </tr>
          <tr>
            <td>Responsável</td>
            <td>Telefone e CPF (opcionais), vínculo com o aluno (parentesco, principal, autorização para comunicações)</td>
          </tr>
          <tr>
            <td>Aluno</td>
            <td>Nome, data de nascimento, matrícula, turma, notas, ocorrências e eventos da turma</td>
          </tr>
          <tr>
            <td>Comunicação</td>
            <td>Avisos recebidos e lidos, ciência de ocorrências, mensagens trocadas com a escola</td>
          </tr>
          <tr>
            <td>Registros técnicos</td>
            <td>Endereço IP e data das ações que alteram dados e das tentativas de login; data de aceite destes termos</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Dados sensíveis:</strong> ocorrências do tipo “Saúde” podem conter informação de saúde do aluno (dado
        sensível, art. 11 da LGPD). A escola deve registrar apenas o necessário para cuidar do aluno e informar a família.
      </p>
      <p>Não coletamos dados para publicidade e não traçamos perfil de comportamento.</p>

      <h2>4. Para que usamos e com qual base legal</h2>
      <p>
        <em>Bases legais sugeridas — confirmar com a assessoria jurídica da escola.</em>
      </p>
      <table className={styles.tabela}>
        <thead>
          <tr>
            <th scope="col">Finalidade</th>
            <th scope="col">Base legal (LGPD)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Prestar o serviço educacional: matrícula, turmas, notas, boletim, calendário</td>
            <td>Execução de contrato (art. 7º, V) e cumprimento de obrigação legal/regulatória (art. 7º, II)</td>
          </tr>
          <tr>
            <td>Comunicação entre escola e família: avisos, ocorrências, mensagens</td>
            <td>Execução de contrato (art. 7º, V); dados de alunos no melhor interesse da criança e do adolescente (art. 14)</td>
          </tr>
          <tr>
            <td>Informações de saúde registradas em ocorrências</td>
            <td>Proteção da vida ou da incolumidade física e tutela da saúde (art. 11, II, “e” e “f”)</td>
          </tr>
          <tr>
            <td>Segurança: controle de acesso, auditoria, prevenção de fraude e abuso</td>
            <td>Legítimo interesse (art. 7º, IX) e guarda de registros de acesso (Marco Civil da Internet, art. 15)</td>
          </tr>
        </tbody>
      </table>

      <h2>5. Com quem compartilhamos</h2>
      <ul>
        <li>
          <strong>Não vendemos</strong> dados e não os compartilhamos para publicidade.
        </li>
        <li>Hospedagem do sistema (operadora de dados): {hospedagem}.</li>
        <li>
          O calendário consulta feriados nacionais na BrasilAPI enviando <strong>apenas o ano</strong> (nenhum dado
          pessoal).
        </li>
        <li>Autoridades públicas, quando exigido por lei ou ordem judicial.</li>
      </ul>

      <h2>6. Cookies e armazenamento no navegador</h2>
      <p>
        O sistema <strong>não usa cookies</strong> nem ferramentas de rastreamento ou análise. Usa o armazenamento do
        próprio navegador apenas para funcionar:
      </p>
      <ul>
        <li>
          <strong>localStorage</strong>: o token da sua sessão e quando ela expira (apagado ao sair).
        </li>
        <li>
          <strong>sessionStorage</strong>: os filtros das listas, para voltar a elas como estavam (apagado ao fechar a aba).
        </li>
      </ul>

      <h2>7. Por quanto tempo guardamos</h2>
      <p>
        <em>Prazos sugeridos — confirmar com a assessoria jurídica e as normas educacionais aplicáveis.</em>
      </p>
      <table className={styles.tabela}>
        <thead>
          <tr>
            <th scope="col">Dados</th>
            <th scope="col">Prazo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Histórico escolar (matrícula, notas)</td>
            <td>Pelo prazo exigido pela legislação educacional [PREENCHER: prazo confirmado]</td>
          </tr>
          <tr>
            <td>Comunicações (avisos, ocorrências, mensagens)</td>
            <td>Enquanto o aluno estiver matriculado e por mais [PREENCHER: prazo] após a saída</td>
          </tr>
          <tr>
            <td>Registros de acesso e auditoria</td>
            <td>1 ano (o Marco Civil exige no mínimo 6 meses)</td>
          </tr>
          <tr>
            <td>Conta de acesso</td>
            <td>Enquanto houver vínculo com a escola; depois é desativada e pode ser anonimizada a pedido</td>
          </tr>
        </tbody>
      </table>

      <h2>8. Seus direitos (art. 18 da LGPD)</h2>
      <ul>
        <li>
          <strong>Acesso e portabilidade:</strong> em <Link to="/meus-dados">Meus dados</Link> você vê e baixa uma cópia dos
          seus dados (formato JSON).
        </li>
        <li>
          <strong>Correção:</strong> peça à secretaria para corrigir dados incompletos ou errados.
        </li>
        <li>
          <strong>Anonimização ou eliminação:</strong> peça ao encarregado. Dados do histórico escolar que a lei obriga a
          guardar não podem ser apagados enquanto durar essa obrigação.
        </li>
        <li>
          <strong>Informação</strong> sobre com quem os dados são compartilhados e sobre as consequências de não fornecer
          dados opcionais.
        </li>
        <li>
          <strong>Reclamação</strong> à Autoridade Nacional de Proteção de Dados (ANPD).
        </li>
      </ul>
      <p>Respondemos aos pedidos em até [PREENCHER: prazo, ex.: 15 dias].</p>

      <h2>9. Segurança</h2>
      <p>
        Conexão criptografada (HTTPS), senhas guardadas de forma irreversível, acesso por perfil (cada pessoa vê só o que
        lhe diz respeito), registro de quem altera dados, limite de tentativas de login e testes automatizados de
        segurança a cada mudança do sistema.
      </p>
      <p>
        Se houver um incidente de segurança que possa causar risco ou dano relevante, a escola comunicará a ANPD e as
        pessoas afetadas, como exige a LGPD (art. 48).
      </p>

      <h2>10. Uso de inteligência artificial</h2>
      <p>
        O sistema <strong>não usa inteligência artificial</strong> para tomar decisões sobre alunos ou famílias e não
        envia dados pessoais a serviços de IA. O código do sistema foi desenvolvido com o auxílio de uma ferramenta de IA,
        com revisão e testes automatizados.
      </p>

      <h2>11. Mudanças nesta política</h2>
      <p>
        Quando este texto mudar, a versão (no topo) também muda e você precisará ler e aceitar a nova versão no próximo
        acesso. Veja também os <Link to="/termos">Termos de Uso</Link>.
      </p>
    </DocumentoLayout>
  );
}
