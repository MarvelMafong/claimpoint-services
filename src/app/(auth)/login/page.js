import AuthShell from '@/components/auth/AuthShell';
import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Log In — ClaimPoint Solutions',
};

export default function LoginPage() {
  return (
    <AuthShell
      brandTitle="One login. Your claims and your account, together."
      brandBody="Check on a recovery case, move money, or both, without switching between separate systems."
      legalNote="ClaimPoint Solutions provides banking and recovery services through licensed financial partners. Recovery outcomes are not guaranteed."
    >
      <LoginForm />
    </AuthShell>
  );
}