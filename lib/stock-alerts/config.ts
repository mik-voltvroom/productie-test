import "server-only";
export function alertConfig(env:Record<string,string|undefined>=process.env) {
  const flags={signups:env.STOCK_ALERT_SIGNUPS_ENABLED==="true",matching:env.STOCK_ALERT_MATCHING_ENABLED==="true",sending:env.STOCK_ALERT_SENDING_ENABLED==="true"};
  let origin="",endpoint="";
  try {const u=new URL(env.NEXT_PUBLIC_SITE_URL??"");if((u.protocol==="https:"||env.VVOS_ENV==="local"&&u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname))&&!u.username&&!u.password&&u.pathname==="/"&&!u.search&&!u.hash)origin=u.origin;}catch{}
  try {const u=new URL(env.EMAIL_API_URL??"");if(u.protocol==="https:"&&!u.username&&!u.password&&!u.search&&!u.hash)endpoint=u.href;}catch{}
  const missing=[...(!origin?["NEXT_PUBLIC_SITE_URL (HTTPS-origin)"]:[]),...(!endpoint?["EMAIL_API_URL (HTTPS gateway)"]:[]),
    ...(!env.EMAIL_API_KEY?["EMAIL_API_KEY"]:[]),...(!/^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(env.STOCK_ALERT_FROM_EMAIL??"")?["STOCK_ALERT_FROM_EMAIL"]:[]),
    ...((env.STOCK_ALERT_TOKEN_SECRET?.length??0)<32?["STOCK_ALERT_TOKEN_SECRET (minimaal 32 tekens)"]:[]),
    ...((env.STOCK_ALERT_WORKER_SECRET?.length??0)<32?["STOCK_ALERT_WORKER_SECRET (minimaal 32 tekens)"]:[]),
    ...(env.STOCK_ALERT_EMAIL_CONTRACT!=="gateway-v1"?["STOCK_ALERT_EMAIL_CONTRACT=gateway-v1 (providercontract verifiëren)"]:[])];
  const maxVehicles=Number(env.STOCK_ALERT_MAX_VEHICLES_PER_EMAIL??5);
  if(!Number.isInteger(maxVehicles)||maxVehicles<1||maxVehicles>10)missing.push("STOCK_ALERT_MAX_VEHICLES_PER_EMAIL (1–10)");
  return {flags,origin,endpoint,key:env.STOCK_ALERT_TOKEN_SECRET??"",from:env.STOCK_ALERT_FROM_EMAIL??"",maxVehicles,
    configured:missing.length===0,missing,preview:env.VVOS_ENV==="local"&&env.STOCK_ALERT_PREVIEW==="true",
    signupsAvailable:flags.signups&&flags.matching&&flags.sending&&missing.length===0};
}
