import React, { useRef, useState } from "react";
import styles from "../../styles/components/EmailConfirmPopup.module.css";

export default function EmailConfirmPopup({ email, onSubmit, onResend, resendTimer }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const inputs = useRef([]);

  const handleChange = (e, idx) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    const newCode = [...code];
    if (val) {
      newCode[idx] = val[0];
      setCode(newCode);
      if (idx < 5) inputs.current[idx + 1].focus();
    } else {
      newCode[idx] = "";
      setCode(newCode);
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace") {
      if (code[idx]) {
        const newCode = [...code];
        newCode[idx] = "";
        setCode(newCode);
        e.preventDefault();
      } else if (idx > 0) {
        inputs.current[idx - 1].focus();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(code.join(""));
    setSubmitting(false);
  };

  return (
    <div className={styles.popup + " " + styles.animated}>
      <div className={styles.header}>
        <span className={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{verticalAlign:'middle',marginRight:8}}>
            <rect width="28" height="28" rx="8" fill="#6b5eff"/>
            <path d="M7 10.5L14 16L21 10.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="7" y="8" width="14" height="12" rx="3" stroke="#fff" strokeWidth="2"/>
          </svg>
          AI-ассистент
        </span>
      </div>
      <h2 className={styles.title}>Подтверждение Email</h2>
      <div className={styles.subtitle}>
        Мы отправили 6-значный код на <b>{email}</b>
      </div>
      <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
        <div className={styles.codeInputs}>
          {code.map((digit, idx) => (
            <input
              key={idx}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className={styles.codeInput}
              value={digit}
              onChange={(e) => handleChange(e, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              ref={el => inputs.current[idx] = el}
              autoFocus={idx === 0}
              aria-label={`Код ${idx+1}`}
            />
          ))}
        </div>
        <button className={styles.submitBtn} type="submit" disabled={code.some(d => !d) || submitting}>
          {submitting ? <span className={styles.loader}></span> : 'Подтвердить'}
        </button>
      </form>
      <div className={styles.resendRow}>
        <button
          className={styles.resendBtn}
          onClick={onResend}
          disabled={resendTimer > 0}
        >
          {resendTimer > 0
            ? `Отправить ещё код (00:${resendTimer.toString().padStart(2, "0")})`
            : 'Отправить ещё код'}
        </button>
      </div>
      <div className={styles.hint}>Код действителен 15 минут</div>
    </div>
  );
}