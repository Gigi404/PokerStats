import { Fragment, useState } from 'react'
import Theory from '../components/Theory.jsx'
import { Fold } from '../components/ui.jsx'
import usePractise from '../hooks/usePractise.js'
import { leakParts, SHOWN_LEAKS } from '../lib/leaks.js'
import { lessonText } from '../lib/recap.js'

/*
  Your leaks, costliest first (Phase 8, density pass): what My game opens on.
  The top one is told in full; the rest are one line each and open to the same
  detail. Each leak carries the idea behind it, a way to practise it, and the
  cards that used to sit on the page as equals. Older files have no play.leaks,
  and My game then starts at Progress.
*/

const title = 'mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint'

/**
 * @param {{leaks: object, overall: object, parts: Object<string, JSX.Element>}} props
 *   leaks: summary.play.leaks; overall: play.progress.overall;
 *   parts: My game's cards by key.
 */
export default function Leaks({ leaks, overall, parts }) {
  const [all, setAll] = useState(false)
  const items = leaks?.items || []
  if (!items.length) return null
  const [top, ...rest] = items
  const shown = all ? rest : rest.slice(0, SHOWN_LEAKS - 1)
  return (
    <>
      <div className="card-hero p-4">
        <div className={title}>Your biggest leak</div>
        <LeakHead leak={top} big />
        <p className="num mt-1 text-[13px] text-muted">
          {top.share_pct}% of the {leaks.cost_bb}bb your mistakes gave away
        </p>
        <LeakDetail leak={top} parts={parts} />
        {overall?.accuracy != null && (
          <p className="num mt-3 border-t border-white/5 pt-2 text-[12px] text-faint">
            Overall {overall.accuracy}%{overall.grade ? ` · ${overall.grade}` : ''} over {overall.graded.toLocaleString('en-CA')} decisions
          </p>
        )}
      </div>

      {rest.length > 0 && (
        <div>
          <div className={`${title} px-1`}>Then</div>
          <div className="card divide-y divide-white/5 px-3.5">
            {shown.map((l) => (
              <Fold key={l.lesson} plain title={<LeakHead leak={l} />}>
                <LeakDetail leak={l} parts={parts} />
              </Fold>
            ))}
          </div>
          {rest.length > shown.length && (
            <button type="button" onClick={() => setAll(true)} className="mt-2 w-full py-1 text-[13px] font-semibold text-accent">
              See all {items.length} leaks
            </button>
          )}
        </div>
      )}
    </>
  )
}

function LeakHead({ leak, big = false }) {
  const t = lessonText(leak)
  return (
    <span className="block min-w-0">
      <span className={`block font-semibold ${big ? 'text-xl' : 'text-[15px]'}`}>{t.title}</span>
      <span className="num block text-[13px] font-normal text-muted">{t.detail}</span>
    </span>
  )
}

function LeakDetail({ leak, parts }) {
  const practise = usePractise()
  const n = practise?.count([leak.lesson]) || 0
  const cards = leakParts(leak.lesson)
  return (
    <div className="mt-1">
      <Theory lesson={leak.lesson} />
      {n > 0 && (
        <button type="button" onClick={() => practise.start([leak.lesson])} className="btn-gold mt-2.5 min-h-11 w-full rounded-2xl text-[14px] font-semibold">
          Practise this · {n} puzzle{n === 1 ? '' : 's'}
        </button>
      )}
      {cards.length > 0 && (
        <Fold plain title={<span className="text-[12.5px] font-semibold text-accent">See the numbers</span>}>
          <div className="space-y-4">
            {cards.map((k) => (
              <Fragment key={k}>{parts[k]}</Fragment>
            ))}
          </div>
        </Fold>
      )}
    </div>
  )
}
