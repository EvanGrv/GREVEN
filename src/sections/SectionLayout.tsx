import type { Section } from '@/data/sections';
import type { SectionContent } from '@/data/content/types';
import { Logo } from '@/components/ui/Logo/Logo';
import { Navigation } from '@/components/navigation/Navigation';
import { BackToNetwork } from '@/components/ui/BackToNetwork';
import { Kanji, Eyebrow, Heading } from '@/components/typography';
import { SectionVisual } from './visuals/SectionVisual';
import { ContactForm } from './ContactForm';
import styles from './SectionLayout.module.css';

/**
 * Shared editorial layout for every section — a distinct "region of the same
 * network". Persistent chrome (signature + vertical nav + retour au réseau)
 * frames an ML-focused visualisation and structured content. The 3D network
 * continues behind, pulled back into a calm backdrop by the CameraRig.
 */
export function SectionLayout({ section, content }: { section: Section; content: SectionContent }) {
  return (
    <main id="content" className={styles.page}>
      <header className={styles.top}>
        <Logo />
        <Navigation />
      </header>

      <div className={styles.grid}>
        <div className={styles.body}>
          <div className={styles.head}>
            <Kanji char={section.kanji} meaning={section.kanjiMeaning} size="lg" />
            <Eyebrow>{section.kanjiMeaning}</Eyebrow>
            <Heading level={1}>{section.label}</Heading>
            <p className={styles.intro}>{content.intro}</p>
            {content.placeholder && (
              <p className={styles.disclaimer}>
                Contenu de démonstration — à remplacer par du contenu réel.
              </p>
            )}
          </div>

          {content.contact ? (
            <ContactForm contact={content.contact} />
          ) : (
            <div className={styles.groups}>
              {content.emptyNote && <p className={styles.empty}>{content.emptyNote}</p>}
              {content.groups.map((group) => (
                <section key={group.heading} className={styles.group}>
                  <h2 className={styles.groupHeading}>{group.heading}</h2>
                  {group.items.length > 0 ? (
                    <ul className={styles.list}>
                      {group.items.map((item) => (
                        <li key={item} className={styles.item}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.dash} aria-hidden="true">
                      —
                    </p>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>

        <aside className={styles.visual}>
          <SectionVisual kind={content.visual} />
        </aside>
      </div>

      <footer className={styles.footer}>
        <BackToNetwork />
      </footer>
    </main>
  );
}
