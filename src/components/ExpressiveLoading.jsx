import { useId } from 'react'

/** CSS-driven, Material 3 Expressive-inspired loader. Shapes are original
 * geometry, not copies of Google's proprietary design kit artwork.
 * No expensive canvas or per-frame JS while React lazy routes resolve.
 */
export default function ExpressiveLoading({kind='tasks',fullScreen=false,compact=false}) {
  const title={
    app:'Getting Daymark ready',
    tasks:'Bringing your tasks together',
    notes:'Opening your notes',
    calendar:'Finding your moments',
    settings:'Getting your preferences',
  }[kind]||'Just a moment'
  const rootId=useId()
  return <section className={'ex-loading'+(fullScreen?' ex-loading-full':'')+(compact?' ex-loading-compact':'')}
    role="status" aria-live="polite" aria-label={title}>
    <div className="ex-loading-shapes" aria-hidden="true">
      <span className="ex-shape ex-shape-star"/>
      <span className="ex-shape-exterior">
        <span className="ex-shape ex-shape-core"/>
      </span>
      <span className="ex-shape ex-shape-soft"/>
    </div>
    <div className="ex-loading-copy">
      <strong>{title}</strong>
      {!compact&&<span>Making room for your next little win.</span>}
    </div>
    <div className="ex-loading-progress" aria-hidden="true">
      {[0,1,2].map(i=><div key={i} className="ex-loading-track">
        <span className={'ex-loading-fill ex-loading-fill-'+i}/>
        <span className="ex-loading-tip"/>
      </div>)}
    </div>
    {!compact&&<div className="ex-loading-skeleton" aria-hidden="true">
      <span id={rootId+'-a'}/>
      <span/>
      <span/>
    </div>}
  </section>
}
