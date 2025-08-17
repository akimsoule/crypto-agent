import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Link,
  Column,
  Row,
  Button
} from '@react-email/components';

export interface WelcomeEmailProps {
  recipientEmail: string;
  recipientName?: string;
  websiteUrl?: string;
  unsubscribeUrl?: string;
  confirmationUrl?: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  recipientName,
  websiteUrl = 'https://crypto-investors-hub.netlify.app',
  unsubscribeUrl
}) => {
  return (
    <Html lang="fr">
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Heading style={headerTitleStyle}>
              🎉 Bienvenue !
            </Heading>
            <Text style={headerSubtitleStyle}>
              Merci de rejoindre Crypto Investors Hub
            </Text>
          </Section>

          {/* Content */}
          <Section style={contentStyle}>
            {/* Welcome Message */}
            <Section style={welcomeCardStyle}>
              <Heading style={welcomeTitleStyle}>
                ✅ Inscription Confirmée
              </Heading>
              <Text style={welcomeTextStyle}>
                Félicitations {recipientName || 'Investisseur'} ! Vous faites maintenant partie 
                de notre communauté d'investisseurs crypto intelligents.
              </Text>
            </Section>

            {/* Features Section */}
            <Heading style={sectionTitleStyle}>🚀 Ce que vous allez recevoir</Heading>
            
            <Section style={featureListStyle}>
              <Section style={featureItemStyle}>
                <Row>
                  <Column style={{ width: '60px' }}>
                    <Text style={featureIconStyle}>💎</Text>
                  </Column>
                  <Column>
                    <Heading style={featureTitleStyle}>
                      Rapports Hebdomadaires
                    </Heading>
                    <Text style={featureDescStyle}>
                      Analyse des meilleures opportunités crypto avec notre IA propriétaire
                    </Text>
                  </Column>
                </Row>
              </Section>

              <Section style={featureItemStyle}>
                <Row>
                  <Column style={{ width: '60px' }}>
                    <Text style={featureIconStyle}>🚨</Text>
                  </Column>
                  <Column>
                    <Heading style={featureTitleStyle}>
                      Alertes en Temps Réel
                    </Heading>
                    <Text style={featureDescStyle}>
                      Notifications instantanées sur les mouvements de marché importants
                    </Text>
                  </Column>
                </Row>
              </Section>

              <Section style={featureItemStyle}>
                <Row>
                  <Column style={{ width: '60px' }}>
                    <Text style={featureIconStyle}>📊</Text>
                  </Column>
                  <Column>
                    <Heading style={featureTitleStyle}>
                      Analyses Détaillées
                    </Heading>
                    <Text style={featureDescStyle}>
                      Métriques avancées et scoring propriétaire pour chaque projet
                    </Text>
                  </Column>
                </Row>
              </Section>
            </Section>

            {/* CTA Button */}
            <Section style={{ textAlign: 'center', margin: '40px 0' }}>
              <Button style={ctaButtonStyle} href={websiteUrl}>
                🚀 Découvrir le Dashboard
              </Button>
            </Section>

            {/* Next Steps */}
            <Section style={nextStepsCardStyle}>
              <Heading style={nextStepsTitleStyle}>🔔 Première Newsletter</Heading>
              <Text style={nextStepsTextStyle}>
                Votre premier rapport hebdomadaire sera envoyé le prochain lundi. 
                En attendant, explorez notre dashboard pour découvrir les gems du moment !
              </Text>
            </Section>

            {/* Investment Tip */}
            <Section style={tipCardStyle}>
              <Heading style={tipTitleStyle}>💡 Conseil d'Expert</Heading>
              <Text style={tipTextStyle}>
                Bienvenue dans le monde passionnant des cryptomonnaies ! Commencez toujours 
                par vous former et n'investissez que de petites sommes au début.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTitleStyle}>
              <strong>Crypto Investors Hub</strong>
            </Text>
            <Text style={footerSubtitleStyle}>
              L'intelligence artificielle au service de vos investissements crypto
            </Text>
            
            <Text style={footerLinksStyle}>
              {unsubscribeUrl && (
                <>
                  <Link href={unsubscribeUrl} style={footerLinkStyle}>
                    Se désabonner
                  </Link>
                  {' | '}
                </>
              )}
              <Link href={websiteUrl} style={footerLinkStyle}>
                Visiter le site
              </Link>
            </Text>

            <Text style={copyrightStyle}>
              © {new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const bodyStyle = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  lineHeight: '1.6',
  color: '#333333',
  margin: '0',
  padding: '0',
  backgroundColor: '#f8fafc'
};

const containerStyle = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden'
};

const headerStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  padding: '40px 30px',
  textAlign: 'center' as const
};

const headerTitleStyle = {
  margin: '0',
  fontSize: '28px',
  fontWeight: '700'
};

const headerSubtitleStyle = {
  margin: '10px 0 0 0',
  fontSize: '16px',
  opacity: '0.9'
};

const contentStyle = {
  padding: '40px 30px'
};

const welcomeCardStyle = {
  background: '#ecfdf5',
  border: '2px solid #10b981',
  borderRadius: '12px',
  padding: '20px',
  margin: '20px 0'
};

const welcomeTitleStyle = {
  margin: '0 0 15px 0',
  color: '#065f46',
  fontSize: '20px'
};

const welcomeTextStyle = {
  margin: '0',
  color: '#064e3b'
};

const sectionTitleStyle = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1e293b',
  margin: '30px 0 20px 0',
  paddingBottom: '10px',
  borderBottom: '2px solid #e2e8f0'
};

const featureListStyle = {
  margin: '20px 0'
};

const featureItemStyle = {
  marginBottom: '20px'
};

const featureIconStyle = {
  fontSize: '24px',
  margin: '0'
};

const featureTitleStyle = {
  margin: '0 0 10px 0',
  color: '#1e293b',
  fontSize: '18px'
};

const featureDescStyle = {
  margin: '0',
  color: '#64748b',
  fontSize: '14px'
};

const ctaButtonStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  textDecoration: 'none',
  padding: '16px 32px',
  borderRadius: '8px',
  fontWeight: '600',
  display: 'inline-block'
};

const nextStepsCardStyle = {
  background: '#eff6ff',
  border: '2px solid #3b82f6',
  borderRadius: '12px',
  padding: '20px',
  margin: '20px 0'
};

const nextStepsTitleStyle = {
  margin: '0 0 15px 0',
  color: '#1e40af',
  fontSize: '18px'
};

const nextStepsTextStyle = {
  margin: '0',
  color: '#1e3a8a'
};

const tipCardStyle = {
  background: '#f8fafc',
  padding: '20px',
  borderRadius: '8px',
  margin: '30px 0'
};

const tipTitleStyle = {
  margin: '0 0 15px 0',
  color: '#1e293b',
  fontSize: '18px'
};

const tipTextStyle = {
  margin: '0',
  color: '#64748b'
};

const footerStyle = {
  background: '#f1f5f9',
  padding: '30px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e2e8f0'
};

const footerTitleStyle = {
  margin: '0 0 5px 0',
  fontSize: '16px',
  color: '#1e293b'
};

const footerSubtitleStyle = {
  margin: '0 0 20px 0',
  fontSize: '14px',
  color: '#64748b'
};

const footerLinksStyle = {
  margin: '0 0 15px 0',
  fontSize: '14px'
};

const footerLinkStyle = {
  color: '#667eea',
  textDecoration: 'none'
};

const copyrightStyle = {
  fontSize: '12px',
  color: '#64748b',
  margin: '0'
};

export default WelcomeEmail;
