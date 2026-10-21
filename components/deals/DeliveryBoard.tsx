import Link from "next/link";
import { dealProgress, openBalanceCents } from "@/lib/deal/business";
import { listDeliveryOverview } from "@/lib/deal/repository";
import { centsToEuros } from "@/lib/money";

export async function DeliveryBoard() {
  try {
    const { deals, tasks, payments } = await listDeliveryOverview();
    return <div className="recordGrid">{deals.map(deal => {
      const paidCents = payments.filter(payment => payment.dealId === deal.id && payment.status === "paid" && payment.type !== "refund").reduce((sum, payment) => sum + payment.amountCents, 0);
      return <Link className="panel deliveryCard" href={`/dashboard/deals/${deal.id}`} key={deal.id}><span className="eyebrow">{deal.id}</span><h3>{deal.customer.name}</h3><p>{deal.vehicleId}</p><div className="progressBar"><i style={{ width: `${dealProgress(deal, tasks)}%` }} /></div><small>{dealProgress(deal, tasks)}% gereed · € {centsToEuros(openBalanceCents(deal, paidCents)).toLocaleString("nl-NL")} open</small></Link>;
    })}</div>;
  } catch {
    return <section className="panel"><h2>Afleveringen niet beschikbaar</h2><p className="muted">De dealrepository kon niet veilig worden geladen.</p></section>;
  }
}
