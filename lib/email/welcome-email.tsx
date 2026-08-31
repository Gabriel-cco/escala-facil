import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Section,
} from "@react-email/components";

interface WelcomeEmailProps {
  nome: string;
  linkApp: string;
}

export function WelcomeEmail({ nome, linkApp }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#FAFAFA",
          fontFamily: "Inter, sans-serif",
          margin: 0,
          padding: "32px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "8px",
            padding: "32px",
            maxWidth: "480px",
            margin: "0 auto",
          }}
        >
          <Heading
            style={{
              color: "#171717",
              fontSize: "22px",
              fontWeight: 600,
              marginBottom: "16px",
            }}
          >
            Bem-vindo(a) ao Escala Fácil!
          </Heading>

          <Text style={{ color: "#171717", fontSize: "16px", lineHeight: "1.6" }}>
            Olá, {nome}!
          </Text>

          <Text style={{ color: "#171717", fontSize: "16px", lineHeight: "1.6" }}>
            É com alegria que damos as boas-vindas ao Escala Fácil — a ferramenta
            criada para organizar, de forma simples, as escalas de serviço da nossa
            paróquia.
          </Text>

          <Text
            style={{
              color: "#171717",
              fontSize: "16px",
              lineHeight: "1.6",
              fontWeight: 600,
            }}
          >
            A partir de agora, você pode:
          </Text>
          <Text style={{ color: "#171717", fontSize: "15px", lineHeight: "1.7" }}>
            • Acompanhar sua escala a qualquer momento, direto do celular
            <br />
            • Receber um aviso automático quando for a sua vez de servir
            <br />
            • Solicitar e aceitar trocas com outros membros do grupo
            <br />• Se você coordena um grupo: montar a escala do mês em poucos
            cliques
          </Text>

          <Section style={{ textAlign: "center", margin: "24px 0" }}>
            <Button
              href={linkApp}
              style={{
                backgroundColor: "#4F46E5",
                color: "#FFFFFF",
                padding: "12px 28px",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Acessar o Escala Fácil
            </Button>
          </Section>

          <Text style={{ color: "#6B7280", fontSize: "14px", lineHeight: "1.6" }}>
            Entre com sua conta Google — não é preciso criar senha. Assim que você
            entrar, um tour rápido te mostra tudo.
          </Text>

          <Hr style={{ borderColor: "#E5E7EB", margin: "24px 0" }} />

          <Text style={{ color: "#9CA3AF", fontSize: "13px" }}>
            Qualquer dúvida, é só chamar.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
