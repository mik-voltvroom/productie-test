import {Header} from "@/components/Header";
import {StockAlertForm,ConfirmedNotice} from "@/components/stock-alerts/StockAlertForm";
import {alertConfig} from "@/lib/stock-alerts/config";
import {listPublicVehicles} from "@/lib/repositories/public-vehicle-repository";
import {privateRobots} from "@/lib/seo/business";
export const dynamic="force-dynamic";
export const metadata={title:"Persoonlijke voorraadalert | Volt & Vroom",robots:privateRobots};
export default async function StockAlertPage(){
  const config=alertConfig();let options:{brand:string;model:string;bodyStyle?:string}[]=[];
  try{options=(await listPublicVehicles()).map(vehicle=>({brand:vehicle.brand,model:vehicle.model,bodyStyle:vehicle.bodyStyle}));}catch{}
  return <><Header/><main className="container legalPage"><p className="eyebrow">Persoonlijk aanbod</p><h1>Jouw volgende auto, op het juiste moment.</h1><p className="lead">Ontvang bericht zodra een auto aansluit op jouw wensen.</p><ConfirmedNotice/><StockAlertForm options={options} available={config.signupsAvailable}/></main></>;
}
