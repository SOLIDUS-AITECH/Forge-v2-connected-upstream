import {
  Body,
  Column,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'
import { env } from '@/lib/env'
import { getAssetUrl } from '@/lib/utils'
import { baseStyles } from './base-styles'
import EmailFooter from './footer'

interface OTPVerificationEmailProps {
  otp: string
  email?: string
  type?: 'sign-in' | 'email-verification' | 'forget-password' | 'chat-access'
  chatTitle?: string
}

const baseUrl = env.NEXT_PUBLIC_APP_URL || 'https://simstudio.ai'

const getSubjectByType = (type: string, chatTitle?: string) => {
  switch (type) {
    case 'sign-in':
      return 'Sign in to Agent Forge'
    case 'email-verification':
      return 'Verify your email for Agent Forge'
    case 'forget-password':
      return 'Reset your Agent Forge password'
    case 'chat-access':
      return `Verification code for ${chatTitle || 'Chat'}`
    default:
      return 'Verification code for Agent Forge'
  }
}

export const OTPVerificationEmail = ({
  otp,
  email = '',
  type = 'email-verification',
  chatTitle,
}: OTPVerificationEmailProps) => {
  // Get a message based on the type
  const getMessage = () => {
    switch (type) {
      case 'sign-in':
        return 'Sign in to Agent Forge'
      case 'forget-password':
        return 'Reset your password for Agent Forge'
      case 'chat-access':
        return `Access ${chatTitle || 'the chat'}`
      default:
        return 'Welcome to Agent Forge'
    }
  }

  return (
    <Html>
      <Head />
      <Body style={baseStyles.main}>
        <Preview>{getSubjectByType(type, chatTitle)}</Preview>
        <Container style={baseStyles.container}>
          <Section style={{ padding: '30px 0', textAlign: 'center' }}>
            <Row>
              <Column style={{ textAlign: 'center' }}>
                <Img
                  src={getAssetUrl('static/sim.png')}
                  width='114'
                  alt='Agent Forge'
                  style={{
                    margin: '0 auto',
                  }}
                />
              </Column>
            </Row>
          </Section>
          <Section style={baseStyles.sectionsBorders}>
            <Row>
              <Column style={baseStyles.sectionBorder} />
              <Column style={baseStyles.sectionCenter} />
              <Column style={baseStyles.sectionBorder} />
            </Row>
          </Section>
          <Section style={baseStyles.content}>
            <Text style={baseStyles.paragraph}>{getMessage()}</Text>
            <Text style={baseStyles.paragraph}>Your verification code is:</Text>
            <Section style={baseStyles.codeContainer}>
              <Text style={baseStyles.code}>{otp}</Text>
            </Section>
            <Text style={baseStyles.paragraph}>This code will expire in 15 minutes.</Text>
            <Text style={baseStyles.paragraph}>
              If you didn't request this code, you can safely ignore this email.
            </Text>
            <Text style={baseStyles.paragraph}>
              Best regards,
              <br />
              The Agent Forge Team
            </Text>
          </Section>
        </Container>

        <EmailFooter baseUrl={baseUrl} />
      </Body>
    </Html>
  )
}

export default OTPVerificationEmail
