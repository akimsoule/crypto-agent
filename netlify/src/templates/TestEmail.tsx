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

export interface TestEmailProps {
  recipientEmail: string;
  testMessage?: string;
  timestamp: string;
  websiteUrl?: string;
  unsubscribeUrl?: string;
}

export const TestEmail: React.FC<TestEmailProps> = ({
  recipientEmail,
  testMessage,
  timestamp,
  websiteUrl = 'https://crypto-investors-hub.netlify.app'
}) => {
  return (
    <Html lang="fr">
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Heading style={headerTitleStyle}>
              🧪 Test Email
            </Heading>
            <Text style={headerSubtitleStyle}>
              Configuration Resend - Test de Fonctionnement
            </Text>
          </Section>

          {/* Content */}
          <Section style={contentStyle}>
            {/* Success Message */}
            <Section style={successCardStyle}>
              <Heading style={successTitleStyle}>
                ✅ Configuration Resend Fonctionnelle
              </Heading>
              <Text style={successTextStyle}>
                Cet email confirme que votre configuration Resend fonctionne correctement !
              </Text>
              {testMessage && (
                <Section style={customMessageStyle}>
                  <Text style={customMessageLabelStyle}>
                    <strong>Message de test personnalisé:</strong>
                  </Text>
                  <Text style={customMessageTextStyle}>
                    {testMessage}
                  </Text>
                </Section>
              )}
            </Section>

            {/* Technical Details */}
            <Section style={detailsCardStyle}>
              <Heading style={detailsTitleStyle}>📋 Détails Techniques</Heading>
              <Section style={detailsListStyle}>
                <Row style={detailItemStyle}>
                  <Column style={{ width: '30%' }}>
                    <Text style={detailLabelStyle}>Service:</Text>
                  </Column>
                  <Column style={{ width: '70%' }}>
                    <Text style={detailValueStyle}>Resend API</Text>
                  </Column>
                </Row>
                
                <Row style={detailItemStyle}>
                  <Column style={{ width: '30%' }}>
                    <Text style={detailLabelStyle}>Timestamp:</Text>
                  </Column>
                  <Column style={{ width: '70%' }}>
                    <Text style={detailValueStyle}>{timestamp}</Text>
                  </Column>
                </Row>
                
                <Row style={detailItemStyle}>
                  <Column style={{ width: '30%' }}>
                    <Text style={detailLabelStyle}>Destinataire:</Text>
                  </Column>
                  <Column style={{ width: '70%' }}>
                    <Text style={detailValueStyle}>{recipientEmail}</Text>
                  </Column>
                </Row>
                
                <Row style={detailItemStyle}>
                  <Column style={{ width: '30%' }}>
                    <Text style={detailLabelStyle}>Template:</Text>
                  </Column>
                  <Column style={{ width: '70%' }}>
                    <Text style={detailValueStyle}>React JSX Template v1.0</Text>
                  </Column>
                </Row>
              </Section>
            </Section>

            {/* CTA Button */}
            <Section style={{ textAlign: 'center', margin: '40px 0' }}>
              <Button style={ctaButtonStyle} href={websiteUrl}>
                🚀 Accéder au Dashboard
              </Button>
            </Section>

            {/* Next Steps */}
            <Section style={nextStepsCardStyle}>
              <Heading style={nextStepsTitleStyle}>🎯 Prochaines Étapes</Heading>
              <Text style={nextStepsTextStyle}>
                Maintenant que Resend fonctionne avec les templates JSX, vous pouvez configurer 
                l'envoi automatique de la newsletter et des alertes crypto !
              </Text>
              
              <Section style={featuresListStyle}>
                <Text style={featureItemStyle}>
                  ✅ Service d'email Resend configuré
                </Text>
                <Text style={featureItemStyle}>
                  ✅ Templates JSX React professionnels
                </Text>
                <Text style={featureItemStyle}>
                  ✅ Système de newsletter fonctionnel
                </Text>
                <Text style={featureItemStyle}>
                  🔄 Configuration des cron jobs automatiques
                </Text>
              </Section>
            </Section>

            {/* Performance Info */}
            <Section style={performanceCardStyle}>
              <Heading style={performanceTitleStyle}>⚡ Avantages de Resend</Heading>
              <Section style={benefitsListStyle}>
                <Text style={benefitItemStyle}>
                  📧 Livraison d'emails fiable et rapide
                </Text>
                <Text style={benefitItemStyle}>
                  📊 Analytics et métriques détaillées
                </Text>
                <Text style={benefitItemStyle}>
                  🎨 Templates React modernes et responsives
                </Text>
                <Text style={benefitItemStyle}>
                  🔒 Sécurité et réputation d'expéditeur optimisées
                </Text>
              </Section>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTitleStyle}>
              <strong>Crypto Investors Hub</strong>
            </Text>
            <Text style={footerSubtitleStyle}>
              Test Email - Configuration Technique
            </Text>
            
            <Text style={footerLinksStyle}>
              <Link href={websiteUrl} style={footerLinkStyle}>
                Visiter le site
              </Link>
            </Text>

            <Text style={copyrightStyle}>
              © {new Date().getFullYear()} Crypto Investors Hub. Email de test.
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

const successCardStyle = {
  background: '#eff6ff',
  border: '2px solid #3b82f6',
  borderRadius: '12px',
  padding: '20px',
  margin: '20px 0'
};

const successTitleStyle = {
  margin: '0 0 15px 0',
  color: '#1e40af',
  fontSize: '20px'
};

const successTextStyle = {
  margin: '0',
  color: '#1e3a8a'
};

const customMessageStyle = {
  marginTop: '15px',
  padding: '15px',
  background: '#f0f9ff',
  borderRadius: '8px'
};

const customMessageLabelStyle = {
  margin: '0 0 8px 0',
  color: '#0369a1',
  fontSize: '14px'
};

const customMessageTextStyle = {
  margin: '0',
  color: '#0c4a6e',
  fontStyle: 'italic'
};

const detailsCardStyle = {
  background: '#f8fafc',
  padding: '20px',
  borderRadius: '8px',
  margin: '20px 0'
};

const detailsTitleStyle = {
  margin: '0 0 15px 0',
  color: '#1e293b',
  fontSize: '18px'
};

const detailsListStyle = {
  margin: '0'
};

const detailItemStyle = {
  marginBottom: '8px'
};

const detailLabelStyle = {
  margin: '0',
  fontWeight: '600',
  color: '#475569',
  fontSize: '14px'
};

const detailValueStyle = {
  margin: '0',
  color: '#1e293b',
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
  background: '#ecfdf5',
  border: '2px solid #10b981',
  borderRadius: '12px',
  padding: '20px',
  margin: '20px 0'
};

const nextStepsTitleStyle = {
  margin: '0 0 15px 0',
  color: '#065f46',
  fontSize: '18px'
};

const nextStepsTextStyle = {
  margin: '0 0 15px 0',
  color: '#064e3b'
};

const featuresListStyle = {
  margin: '0'
};

const featureItemStyle = {
  margin: '8px 0',
  color: '#059669',
  fontSize: '14px'
};

const performanceCardStyle = {
  background: '#fef3c7',
  border: '2px solid #f59e0b',
  borderRadius: '12px',
  padding: '20px',
  margin: '20px 0'
};

const performanceTitleStyle = {
  margin: '0 0 15px 0',
  color: '#92400e',
  fontSize: '18px'
};

const benefitsListStyle = {
  margin: '0'
};

const benefitItemStyle = {
  margin: '8px 0',
  color: '#78350f',
  fontSize: '14px'
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

export default TestEmail;
