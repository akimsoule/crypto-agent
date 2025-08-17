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

export interface NewsletterEmailProps {
  recipientEmail: string;
  recipientName?: string;
  gems: Array<{
    name: string;
    symbol: string;
    score: number;
    currentPrice: number;
    priceChange24h: number;
    marketCap?: number;
    volume24h?: number;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    project?: string;
    priority?: string;
  }>;
  weeklyDate: string;
  websiteUrl?: string;
  unsubscribeUrl?: string;
}

export const NewsletterEmail: React.FC<NewsletterEmailProps> = ({
  recipientName,
  gems,
  alerts,
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
              🚀 Weekly Crypto Gems
            </Heading>
            <Text style={headerSubtitleStyle}>
              Votre rapport d'investissement crypto hebdomadaire
            </Text>
          </Section>

          {/* Content */}
          <Section style={contentStyle}>
            {/* Greeting */}
            <Text style={greetingStyle}>
              Bonjour {recipientName || 'Investisseur'} ! 👋
            </Text>

            {/* Top Gems Section */}
            <Heading style={sectionTitleStyle}>💎 Top Gems de la Semaine</Heading>
            
            {gems.length > 0 ? (
              gems.map((gem, index) => (
                <Section key={index} style={gemCardStyle}>
                  <Row>
                    <Column style={{ width: '60%' }}>
                      <Heading style={gemNameStyle}>{gem.name}</Heading>
                      <Text style={gemSymbolStyle}>{gem.symbol.toUpperCase()}</Text>
                    </Column>
                    <Column style={{ width: '40%', textAlign: 'right' }}>
                      <Text style={gemScoreStyle}>
                        Score: {gem.score}/100
                      </Text>
                    </Column>
                  </Row>
                  
                  <Row style={{ marginTop: '15px' }}>
                    <Column style={{ width: '33%' }}>
                      <Text style={statLabelStyle}>Prix Actuel</Text>
                      <Text style={statValueStyle}>
                        ${gem.currentPrice.toLocaleString()}
                      </Text>
                    </Column>
                    <Column style={{ width: '33%' }}>
                      <Text style={statLabelStyle}>Variation 24h</Text>
                      <Text 
                        style={{
                          ...statValueStyle,
                          color: gem.priceChange24h >= 0 ? '#10b981' : '#ef4444'
                        }}
                      >
                        {gem.priceChange24h >= 0 ? '+' : ''}{gem.priceChange24h.toFixed(2)}%
                      </Text>
                    </Column>
                    {gem.marketCap && (
                      <Column style={{ width: '34%' }}>
                        <Text style={statLabelStyle}>Market Cap</Text>
                        <Text style={statValueStyle}>
                          ${(gem.marketCap / 1000000).toFixed(1)}M
                        </Text>
                      </Column>
                    )}
                  </Row>
                </Section>
              ))
            ) : (
              <Text style={noDataStyle}>
                Aucun gem notable cette semaine. Le marché est en observation.
              </Text>
            )}

            {/* Alerts Section */}
            {alerts.length > 0 && (
              <>
                <Heading style={sectionTitleStyle}>🚨 Alertes Importantes</Heading>
                {alerts.map((alert, index) => (
                  <Section key={index} style={alertCardStyle}>
                    <Text style={alertTypeStyle}>{alert.type.toUpperCase()}</Text>
                    <Text style={alertMessageStyle}>{alert.message}</Text>
                    {alert.project && (
                      <Text style={alertProjectStyle}>
                        Projet: {alert.project}
                      </Text>
                    )}
                  </Section>
                ))}
              </>
            )}

            {/* CTA Button */}
            <Section style={{ textAlign: 'center', margin: '40px 0' }}>
              <Button style={ctaButtonStyle} href={websiteUrl}>
                📊 Voir le Dashboard Complet
              </Button>
            </Section>

            {/* Weekly Tip */}
            <Section style={tipCardStyle}>
              <Heading style={tipTitleStyle}>💡 Conseil de la Semaine</Heading>
              <Text style={tipTextStyle}>
                N'investissez jamais plus que ce que vous pouvez vous permettre de perdre. 
                La diversification reste la clé d'un portefeuille crypto équilibré.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTitleStyle}>
              <strong>Crypto Investors Hub</strong>
            </Text>
            <Text style={footerSubtitleStyle}>
              Votre intelligence artificielle pour l'investissement crypto
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

const greetingStyle = {
  fontSize: '16px',
  marginBottom: '20px',
  color: '#1e293b'
};

const sectionTitleStyle = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1e293b',
  margin: '30px 0 20px 0',
  paddingBottom: '10px',
  borderBottom: '2px solid #e2e8f0'
};

const gemCardStyle = {
  background: '#f8fafc',
  border: '2px solid #e2e8f0',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '20px'
};

const gemNameStyle = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#1e293b',
  margin: '0'
};

const gemSymbolStyle = {
  background: '#667eea',
  color: 'white',
  padding: '4px 12px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '600',
  display: 'inline-block',
  marginTop: '5px'
};

const gemScoreStyle = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#667eea',
  margin: '0'
};

const statLabelStyle = {
  fontSize: '12px',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: '5px',
  margin: '0 0 5px 0'
};

const statValueStyle = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#1e293b',
  margin: '0'
};

const noDataStyle = {
  fontSize: '16px',
  color: '#64748b',
  fontStyle: 'italic',
  textAlign: 'center' as const,
  padding: '20px'
};

const alertCardStyle = {
  background: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
  padding: '16px 20px',
  marginBottom: '12px',
  borderRadius: '0 8px 8px 0'
};

const alertTypeStyle = {
  fontWeight: '700',
  color: '#92400e',
  textTransform: 'uppercase' as const,
  fontSize: '12px',
  letterSpacing: '0.5px',
  margin: '0 0 8px 0'
};

const alertMessageStyle = {
  margin: '0',
  color: '#451a03'
};

const alertProjectStyle = {
  margin: '8px 0 0 0',
  fontSize: '14px',
  color: '#6b7280'
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

export default NewsletterEmail;
