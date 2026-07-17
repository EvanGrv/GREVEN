'use client';

import { useState } from 'react';
import type { ContactContent } from '@/data/content/types';
import styles from './ContactForm.module.css';

/**
 * Contact block: direct links plus a small form. With no backend configured,
 * submitting composes a pre-filled email via a mailto: fallback (the address
 * comes from the content data). Fully labelled and keyboard-accessible.
 */
export function ContactForm({ contact }: { contact: ContactContent }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Contact GREVEN — ${name || 'sans nom'}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}${email ? ` (${email})` : ''}`);
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className={styles.wrap}>
      <ul className={styles.links}>
        {contact.links.map((link) => (
          <li key={link.kind}>
            <a
              className={styles.link}
              href={link.href}
              target={link.kind === 'email' ? undefined : '_blank'}
              rel={link.kind === 'email' ? undefined : 'noreferrer'}
            >
              <span className={styles.linkLabel}>{link.label}</span>
              <span className={styles.linkValue}>{link.value}</span>
            </a>
          </li>
        ))}
      </ul>

      {contact.form && (
        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.field}>
            <label htmlFor="cf-name">Nom</label>
            <input
              id="cf-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="cf-email">Email</label>
            <input
              id="cf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="cf-message">Message</label>
            <textarea
              id="cf-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <button type="submit" className={styles.submit}>
            Envoyer
          </button>
          <p className={styles.note}>Ouvre votre client mail avec un message pré-rempli.</p>
        </form>
      )}
    </div>
  );
}
