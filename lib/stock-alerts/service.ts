import "server-only";
import {listPublishedVehicleRecords} from "@/lib/repositories/public-vehicle-repository";
import {publicVehicleProjection} from "@/lib/vehicle/editorial";
import type {Vehicle} from "@/types";
import {alertConfig} from "./config";
import {localClock,matchesAlert} from "./business";
import {gatewayMailer,type AlertMailer} from "./provider";
import {renderAlertMail} from "./email";
import * as repository from "./repository";

export interface WorkerDependencies {inventory:()=>Promise<Vehicle[]>;mailer:AlertMailer;now:()=>number}
export async function runAlertWorker(deps:WorkerDependencies={inventory:listPublishedVehicleRecords,mailer:gatewayMailer,now:Date.now}){
  const config=alertConfig(),started=deps.now(),deadline=started+40_000,clock=localClock(new Date(started));
  if(!config.flags.matching&&!config.flags.sending)return {paused:true,cleaned:await repository.cleanup(started)};
  if(config.flags.matching&&(config.key.length<32||!config.origin))throw new Error("Alert matching configuration incomplete");
  if(config.flags.sending&&!config.configured)throw new Error("Alert configuration incomplete");
  let subscriptions=0,accepted=0,held=0;
  const inventory=await deps.inventory();
  if(inventory.length>1000||deps.now()>deadline)throw new Error("Alert inventory exceeds worker budget");
  if(config.flags.matching){
    const checkpoint=await repository.readCheckpoint();
    const page=await repository.activePage(typeof checkpoint?.cursor==="string"?checkpoint.cursor:undefined);
    for(const subscription of page.rows){
      if(deps.now()>deadline)throw new Error("Alert worker deadline reached");
      const matches=inventory.filter(vehicle=>matchesAlert(vehicle,subscription.criteria));
      await repository.reconcileSubscription(subscription,matches,deps.now(),clock.day,clock.digestDue,{now:deps.now,deadline});subscriptions++;
    }
    await repository.checkpoint(page.cursor,deps.now());
  }
  if(config.flags.sending)for(const id of await repository.dueJobIds(deps.now())){
    if(deps.now()>deadline)break;
    const job=await repository.claimJob(id,deps.now());if(!job)continue;
    const context=await repository.jobContext(job,deps.now());
    if(!context){await repository.suppressJob(job,"inactive_or_expired");continue;}
    let vehicles:Vehicle[]=[];
    if(job.kind==="digest"){
      if(!config.flags.matching||!clock.digestDue||job.day!==clock.day){await repository.suppressJob(job,"outside_digest_day");continue;}
      const candidates=await repository.pendingCandidates(job.subscriptionId,job.revision);
      // Re-read the canonical public repository immediately before preparing this send.
      const fresh=await deps.inventory();if(fresh.length>1000)throw new Error("Alert inventory exceeds worker budget");
      vehicles=await repository.unseenVehicles(job.subscriptionId,fresh.filter(vehicle=>candidates.some(candidate=>candidate.vehicleId===vehicle.id&&candidate.revision===job.revision)&&matchesAlert(vehicle,context.subscription.criteria)));
      // Avoid duplicate physical identities within the same mail too; canonical inventory already deduplicates.
      vehicles=vehicles.slice(0,config.maxVehicles);
      if(!vehicles.length){await repository.suppressJob(job,"no_matches");continue;}
    }
    if(deps.now()>deadline){await repository.suppressJob(job,"worker_deadline");break;}
    const freshClock=localClock(new Date(deps.now()));
    if(job.kind==="digest"&&(!freshClock.digestDue||freshClock.day!==job.day)){await repository.suppressJob(job,"outside_digest_day");continue;}
    const mail=renderAlertMail({to:context.subscription.email,origin:config.origin,reference:job.id,kind:job.kind,
      criteria:job.kind==="confirmation"?context.subscription.proposed!:context.subscription.criteria,tokens:context.tokens,vehicles:vehicles.map(publicVehicleProjection)});
    if(!await repository.beginDispatch(job,vehicles,deps.now())){await repository.suppressJob(job,"changed_before_dispatch");continue;}
    // Never transform an exception after this boundary into a blind retry.
    let result;try{result=await deps.mailer.send(mail);}catch{result={outcome:"unknown" as const};}
    await repository.finishJob(job,result,vehicles,deps.now());
    if(result.outcome==="accepted")accepted++;else held++;
  }
  const cleaned=await repository.cleanup(deps.now());
  await repository.workerSuccess(deps.now(),{subscriptions,accepted,held,cleaned});
  return {paused:false,subscriptions,accepted,held,cleaned};
}
