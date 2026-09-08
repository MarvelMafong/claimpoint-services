import AuthShell from '@/components/auth/AuthShell';
import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
  title: 'Create Account — ClaimPoint Solutions',
};

export default function SignupPage() {
  return (
    <AuthShell
      brandVariant="signup"
      brandTitle="Set up your account in a few minutes."
      brandBody="One account covers both sides of ClaimPoint from the start."
      legalNote="ClaimPoint Solutions provides banking and recovery services through licensed financial partners."
    >
      <SignupForm />
    </AuthShell>
  );
}