import { NextResponse } from "next/server";
import { z } from "zod";
import { responseDeadline, scoreLead } from "@/lib/sales-engine";
const schema=z.object({name:z.string().min(1),email:z.string().email().optional(),phone:z.string().optional(),vehicleId:z.string().optional(),channel:z.enum(["website","whatsapp","phone","merchant","other"]),message:z.string().optional(),consent:z.boolean(),budgetEur:z.number().optional(),financingNeeded:z.boolean().optional(),hasTradeIn:z.boolean().optional()});
export async function POST(req:Request){const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"Ongeldige lead",issues:parsed.error.flatten()},{status:400});const result=scoreLead(parsed.data);return NextResponse.json({...result,responseDueAt:responseDeadline(result.score)})}
