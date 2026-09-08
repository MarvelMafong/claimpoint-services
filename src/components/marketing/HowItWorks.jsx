import styles from './HowItWorks.module.css';

const steps = [
  { num: '01', title: 'Tell us what happened', body: 'Answer questions specific to your case type and upload supporting evidence.' },
  { num: '02', title: 'We review and investigate', body: 'Your case moves into review, and we request anything further we need.' },
  { num: '03', title: 'We pursue recovery', body: 'Through the appropriate channels for your case, with status updates at each stage.' },
  { num: '04', title: 'Funds land in your account', body: 'Recovered funds are deposited directly, ready to manage or grow.' },
];

export default function HowItWorks() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>How a claim moves</span>
          <h2>From submission to resolution, in view the whole time</h2>
        </div>

        <div className={styles.steps}>
          {steps.map((step) => (
            <div className={styles.step} key={step.num}>
              <div className={styles.stepNum}>{step.num}</div>
              <h4>{step.title}</h4>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}