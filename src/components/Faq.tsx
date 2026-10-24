import { FAQS } from '../data/services'

/** Časté dotazy – nativní rozbalovací prvky (fungují i bez JavaScriptu a s klávesnicí). */
export default function Faq() {
  return (
    <section className="section" id="dotazy">
      <div className="wrap faq">
        <h2>Na co se lidé ptají</h2>
        <div className="faq-list">
          {FAQS.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
      <script
        type="application/ld+json"
        // strukturovaná data pro vyhledávače
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'FAQPage',
          mainEntity: FAQS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
        }) }}
      />
    </section>
  )
}
