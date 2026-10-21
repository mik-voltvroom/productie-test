export function FinanceUnavailable() {
  return <main className="dashboardPage container"><h1>Finance</h1><section className="panel" role="status">
    <h2>Administratie nog niet aangesloten</h2>
    <p>Bedrijfsresultaten, facturen en bankmutaties zijn niet beschikbaar. De bestaande verkoopdossiers blijven toegankelijk via Sales.</p>
    <p>Voor activering zijn de administratiebron, btw- en margeregeling, factuurnummering en reconciliatieafspraken nodig. Er zijn hier geen financiële transacties aangemaakt.</p>
    <a href="/dashboard/deals">Open verkoopdossiers</a>
  </section></main>;
}
