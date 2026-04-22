import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Lock, BookOpen, Users, Check } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-background/85 backdrop-blur-md border-b border-border">
        <a
          href="#hero"
          className="flex items-center gap-2.5 font-bold text-sm tracking-tight text-foreground no-underline"
        >
          <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center text-background text-[10px] font-extrabold shrink-0">
            RI
          </div>
          REXFORM IAM
        </a>
        <ul className="hidden md:flex gap-8 list-none m-0 p-0">
          {[
            ["Home", "#hero"],
            ["Mission", "#mission"],
            ["Vision", "#vision"],
            ["Services", "#services"],
            ["Pricing", "#pricing"],
          ].map(([label, href]) => (
            <li key={label}>
              <a
                href={href}
                className="text-muted-foreground text-sm hover:text-foreground transition-colors no-underline"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <Button asChild size="sm" className="rounded-lg">
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </nav>

      {/* ── HERO ── */}
      <section
        id="hero"
        className="crosshatch relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-20 bg-muted/40"
      >
        <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-5">
          Identity &amp; Access Management
        </p>
        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground max-w-3xl mb-5 leading-[1.06]">
          Secure access. Trusted by organizations.
        </h1>
        <p className="text-base text-muted-foreground max-w-md leading-relaxed mb-9">
          A privacy-centered IAM platform built for modern organizations —
          powered by open standards and human-centered design.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button asChild size="lg" className="rounded-lg">
            <Link href="/auth/registration">Get started for free</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-lg">
            <a href="#mission">Learn more</a>
          </Button>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section id="mission" className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-24 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              Our Mission
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4 leading-tight">
              Inclusive innovation for every organization.
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              We promote inclusive innovation by delivering affordable,
              accessible, and secure technology-driven solutions that enhance
              efficiency, effectiveness, and the well-being of individuals and
              organizations through human-centered digital transformation and
              knowledge-driven practices.
            </p>
          </div>
          <div className="relative rounded-xl h-64 overflow-hidden border border-border">
            <Image
              src="/mission.png"
              alt="Human-Centered Security"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── VISION ── */}
      <section id="vision" className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-24 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="relative rounded-xl h-64 overflow-hidden border border-border order-last md:order-first">
            <Image
              src="/vision.jpg"
              alt="Global Digital Inclusion"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              Our Vision
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4 leading-tight">
              Equitable access to technology for all.
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              We envision a society where individuals have equitable access to
              technological opportunities and high-quality work environments,
              enabling organizations and communities to achieve sustainable
              economic growth and positive social development.
            </p>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-24">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
            Services
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-12 leading-tight">
            Everything your organization needs.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                Icon: Lock,
                title: "Secure Software & Integration",
                desc: "Privacy-centered information and knowledge management solutions built on open standards.",
              },
              {
                Icon: BookOpen,
                title: "Professional Development",
                desc: "CPD programs that enhance human resource capacity and leadership capabilities.",
              },
              {
                Icon: Users,
                title: "Consultancy",
                desc: "Bridging human-driven activities with technology-driven solutions to improve efficiency and adaptability.",
              },
            ].map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="bg-muted/40 border border-border rounded-xl p-6 hover:border-foreground/20 transition-colors"
              >
                <Icon className="w-5 h-5 mb-3 text-foreground" />
                <p className="text-sm font-semibold text-foreground mb-2">
                  {title}
                </p>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-24">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
            Pricing
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-12 leading-tight">
            Simple, transparent pricing.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {/* Starter */}
            <div className="border border-border rounded-xl p-8">
              <p className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-3">
                Starter
              </p>
              <p className="text-4xl font-bold tracking-tight text-foreground mb-1">
                Free
              </p>
              <p className="text-sm text-muted-foreground mb-6">/ forever</p>
              <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
                For small teams getting started with identity management.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Up to 10 users",
                  "Basic SSO",
                  "Community support",
                  "Audit logs (30 days)",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-[13px] text-muted-foreground"
                  >
                    <Check className="w-3 h-3 text-foreground shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full rounded-lg">
                <Link href="/auth/registration">Get started</Link>
              </Button>
            </div>

            {/* Professional — featured */}
            <div className="relative border border-foreground bg-foreground rounded-xl p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background text-foreground text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-border whitespace-nowrap">
                Most Popular
              </div>
              <p className="text-[11px] font-semibold tracking-[0.15em] text-background/60 uppercase mb-3">
                Professional
              </p>
              <p className="text-4xl font-bold tracking-tight text-background mb-1">
                €49
              </p>
              <p className="text-sm text-background/60 mb-6">/ mo</p>
              <p className="text-[13px] text-background/70 mb-6 leading-relaxed">
                For growing organizations that need robust access control.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Unlimited users",
                  "Advanced SSO & MFA",
                  "RBAC & group management",
                  "Priority support",
                  "Audit logs (1 year)",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-[13px] text-background/80"
                  >
                    <Check className="w-3 h-3 text-background shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="w-full rounded-lg bg-background text-foreground hover:bg-background hover:opacity-90"
              >
                <Link href="/auth/registration">Get started</Link>
              </Button>
            </div>

            {/* Enterprise */}
            <div className="border border-border rounded-xl p-8">
              <p className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-3">
                Enterprise
              </p>
              <p className="text-4xl font-bold tracking-tight text-foreground mb-1">
                Custom
              </p>
              <p
                className="text-sm text-muted-foreground mb-6"
                aria-hidden="true"
              >
                &nbsp;
              </p>
              <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
                For large organizations with custom compliance and integration
                needs.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Everything in Pro",
                  "Custom integrations",
                  "SLA & dedicated support",
                  "On-premise option",
                  "Compliance reporting",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-[13px] text-muted-foreground"
                  >
                    <Check className="w-3 h-3 text-foreground shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full rounded-lg">
                <Link href="/auth/registration">Contact us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="crosshatch bg-muted/40 border-t border-b border-border text-center px-6 py-24">
        <h2 className="text-2xl lg:text-4xl font-bold tracking-tight text-foreground mb-3">
          Ready to secure your organization?
        </h2>
        <p className="text-[15px] text-muted-foreground mb-7">
          Create with confidence. Bring your team&apos;s access management to
          life.
        </p>
        <Button asChild size="lg" className="rounded-lg">
          <Link href="/auth/registration">Get started for free</Link>
        </Button>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2.5 font-bold text-sm mb-3">
                <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center text-background text-[10px] font-extrabold shrink-0">
                  RI
                </div>
                REXFORM IAM
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed max-w-50">
                Inclusive innovation through secure, human-centered digital
                transformation.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-4">
                Company
              </p>
              <ul className="space-y-2.5">
                {[
                  ["About", "#"],
                  ["Services", "#services"],
                  ["Privacy Policy", "#"],
                  ["Terms of Use", "#"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-[13px] text-muted-foreground hover:text-foreground transition-colors no-underline"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-4">
                Platform
              </p>
              <ul className="space-y-2.5">
                {[
                  ["Sign In", "/auth/login"],
                  ["Sign Up", "/auth/registration"],
                  ["Documentation", "#"],
                  ["Support", "#"],
                ].map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith("/") ? (
                      <Link
                        href={href}
                        className="text-[13px] text-muted-foreground hover:text-foreground transition-colors no-underline"
                      >
                        {label}
                      </Link>
                    ) : (
                      <a
                        href={href}
                        className="text-[13px] text-muted-foreground hover:text-foreground transition-colors no-underline"
                      >
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <p className="text-[12px] text-muted-foreground/50">
              © 2026 All Rights Reserved. REXFORM Solutions KFT
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
