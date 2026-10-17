import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from "next";
import { privateRobots } from "@/lib/seo/business";
export const metadata: Metadata = { title: "Inloggen | VVOS", robots: privateRobots };
export default function LoginPage() { return <main className="loginPage"><LoginForm /></main>; }
