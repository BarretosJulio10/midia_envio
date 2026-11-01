// Páginas públicas exigidas pela Meta para colocar o app "ao vivo":
// Política de Privacidade (/privacidade) e Exclusão de Dados (/exclusao-de-dados).
// Ficam fora do login para a Meta (e qualquer pessoa) conseguir abrir.
import type { ReactNode } from "react";

const APP_NAME = "Midia Envios";
const OPERATOR = "Julio Quintanilha";
const CONTACT_EMAIL = "julioquintanilha1@gmail.com";
const UPDATED_AT = "1 de novembro de 2026";

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14 space-y-6 leading-relaxed">
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">{APP_NAME}</p>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">Atualizada em {UPDATED_AT}</p>
        </header>
        {children}
        <footer className="border-t border-border/50 pt-6 text-sm text-muted-foreground flex flex-wrap gap-4">
          <a href="/privacidade" className="underline hover:text-foreground">Política de Privacidade</a>
          <a href="/exclusao-de-dados" className="underline hover:text-foreground">Exclusão de Dados</a>
        </footer>
      </article>
    </main>
  );
}

const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xl font-semibold pt-2">{children}</h2>
);

export function PrivacyPolicy() {
  return (
    <LegalLayout title="Política de Privacidade">
      <p>
        O {APP_NAME} é uma ferramenta de uso interno, operada por {OPERATOR}, para organizar e publicar
        conteúdo nas páginas do Facebook e contas do Instagram que o próprio operador administra. Não é um
        serviço aberto ao público e não possui cadastro de usuários externos.
      </p>

      <H2>Quais dados são usados</H2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Identificadores e nomes das páginas do Facebook e das contas do Instagram autorizadas pelo operador no login do Facebook.</li>
        <li>Os tokens de acesso dessas páginas, fornecidos pela Meta, necessários para publicar.</li>
        <li>As imagens, vídeos e legendas que o próprio operador envia para publicação.</li>
      </ul>
      <p>
        Não coletamos dados de seguidores, clientes ou visitantes das páginas, nem mensagens, comentários
        ou informações pessoais de terceiros.
      </p>

      <H2>Para que os dados são usados</H2>
      <p>
        Exclusivamente para publicar, nas páginas e contas autorizadas, o conteúdo preparado pelo operador
        e para mostrar o resultado de cada publicação (publicado, agendado ou com falha).
      </p>

      <H2>Compartilhamento</H2>
      <p>
        Os dados não são vendidos nem compartilhados com terceiros. Eles são enviados apenas à Meta
        (Facebook e Instagram), no momento da publicação, e ficam armazenados em infraestrutura de
        banco de dados protegida (Supabase), acessível somente ao operador. Os tokens de acesso são lidos
        apenas pelo servidor, nunca exibidos no navegador.
      </p>

      <H2>Por quanto tempo guardamos</H2>
      <p>
        Enquanto a página estiver vinculada à ferramenta. Ao desvincular uma página, ou ao remover o app nas
        configurações do Facebook, o token e os dados da página são apagados. Arquivos de mídia enviados
        para publicação podem ser removidos a qualquer momento pelo operador.
      </p>

      <H2>Seus direitos e exclusão</H2>
      <p>
        Você pode pedir a exclusão dos dados a qualquer momento. Veja como em{" "}
        <a href="/exclusao-de-dados" className="underline">Exclusão de Dados</a>.
      </p>

      <H2>Contato</H2>
      <p>
        Dúvidas sobre esta política: <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}

export function DataDeletion() {
  return (
    <LegalLayout title="Exclusão de Dados">
      <p>
        O {APP_NAME} guarda apenas os dados necessários para publicar nas páginas do Facebook e contas do
        Instagram autorizadas pelo operador: identificadores e nomes das páginas e os tokens de acesso
        fornecidos pela Meta. Para apagar esses dados, use uma das opções abaixo.
      </p>

      <H2>Opção 1 — Remover o app pelo Facebook</H2>
      <ol className="list-decimal pl-6 space-y-1">
        <li>No Facebook, abra <strong>Configurações e privacidade → Configurações</strong>.</li>
        <li>Vá em <strong>Apps e sites</strong> (ou <strong>Integrações comerciais</strong>, para páginas de empresas).</li>
        <li>Encontre <strong>{APP_NAME}</strong> e clique em <strong>Remover</strong>.</li>
      </ol>
      <p>
        Com isso, o acesso da ferramenta às suas páginas é cancelado imediatamente pela Meta.
      </p>

      <H2>Opção 2 — Pedir por e-mail</H2>
      <p>
        Envie um e-mail para <a href={`mailto:${CONTACT_EMAIL}?subject=Exclus%C3%A3o%20de%20dados`} className="underline">{CONTACT_EMAIL}</a>{" "}
        com o assunto <strong>"Exclusão de dados"</strong> informando o nome da página ou da conta do Instagram.
        Os dados vinculados (tokens, identificadores e histórico de publicações) são apagados em até 30 dias,
        e você recebe uma confirmação por e-mail.
      </p>
    </LegalLayout>
  );
}
