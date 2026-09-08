import Link from 'next/link';
import { notFound } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import CustomerFundPanel from '@/components/admin/CustomerFundPanel';
import { getCustomerDetail } from '@/lib/data/customer-detail';
import styles from './page.module.css';

export const metadata = { title: 'Customer Detail — Admin — ClaimPoint Solutions' };

export default async function AdminCustomerDetailPage({ params }) {
  const { id } = await params;
  const { profile, accounts, claims, transactions, verificationSessions, profilePhotoSignedUrl, error } = await getCustomerDetail(id);

  if (!profile) notFound();

  const formatted = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

  return (
    <div className={styles.content}>
      <Link href="/cp-adm-7f92mk3x/customers" className={styles.backLink}>← Back to Customers</Link>

      <div className={styles.head}>
        {profilePhotoSignedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profilePhotoSignedUrl} alt="" className={styles.avatarPhoto} />
        ) : (
          <div className={styles.avatar}>{profile.first_name?.[0]}{profile.last_name?.[0]}</div>
        )}
        <div>
          <h1>{profile.first_name} {profile.last_name}</h1>
          <div className={styles.sub}>Joined {new Date(profile.created_at).toLocaleDateString()}</div>
        </div>
        <StatusBadge status={profile.verification_status ?? 'unverified'} />
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>Profile</h3>
          <div className={styles.row}><span>Phone</span><span>{profile.phone ?? '—'}</span></div>
          <div className={styles.row}><span>Country</span><span>{profile.country ?? '—'}</span></div>
          <div className={styles.row}><span>Street address</span><span>{profile.street_address ?? '—'}</span></div>
          <div className={styles.row}><span>Referral code</span><span>{profile.referral_code ?? '—'}</span></div>
          <div className={styles.row}><span>Verification status</span><span>{profile.verification_status ?? 'unverified'}</span></div>
        </div>

        <div className={styles.card}>
          <h3>Claims ({claims.length})</h3>
          {claims.length === 0 ? <p className={styles.muted}>No claims filed.</p> : claims.map((c) => (
            <div className={styles.row} key={c.id}><span>{c.reference}</span><StatusBadge status={c.status} /></div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h3>Verification history ({verificationSessions.length})</h3>
        {verificationSessions.length === 0 ? <p className={styles.muted}>No verification submissions yet.</p> : verificationSessions.map((v) => (
          <div className={styles.row} key={v.id}>
            <span>{v.id_type} · {new Date(v.submitted_at).toLocaleDateString()}</span>
            <StatusBadge status={v.status} />
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h3>Accounts</h3>
        {accounts.length === 0 ? <p className={styles.muted}>No accounts.</p> : (
          <div className={styles.accountsGrid}>
            {accounts.map((a) => (
              <div className={styles.accountCard} key={a.id}>
                <div className={styles.accountType}>{a.account_type.replace('_', ' ')}</div>
                <div className={styles.accountBalance}>{formatted(a.available_balance)}</div>
                <div className={styles.accountNumber}>Acct # {a.displayAccountNumber} <span className={styles.notReal}>Not a real account number</span></div>
                <CustomerFundPanel accountId={a.id} accountName={a.display_name} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h3>Recent transactions</h3>
        {transactions.length === 0 ? <p className={styles.muted}>No transactions.</p> : transactions.map((t) => (
          <div className={styles.row} key={t.id}>
            <span>{t.description ?? t.type}</span>
            <span>{formatted(t.amount)}</span>
            <StatusBadge status={t.status} />
          </div>
        ))}
      </div>
    </div>
  );
}