"use client"

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  siNotion,
  siConfluence,
  siGitlab,
  siGithub,
  siRailway,
  siJira,
  siFigma,
  siMiro,
  siProtonmail,
  siElement,
  siClaude,
} from "simple-icons"

// Reusable brand icon component powered by simple-icons
function BrandIcon({
  icon,
  size = 28,
}: {
  icon: { svg: string; hex: string; title: string }
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={`#${icon.hex}`}
      role="img"
      aria-label={icon.title}
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  )
}

type Service = {
  name: string
  description: string
  href: string
  icon: ReactNode
  iconBg: string
  external?: boolean
}

type ServiceCategory = {
  label: string
  services: Service[]
}

type ConnectedServicesProps = {
  elementSsoUrl: string
}

export function ConnectedServices({ elementSsoUrl }: ConnectedServicesProps) {
  const categories: ServiceCategory[] = [
    {
      label: "Productivity",
      services: [
        {
          name: "Chat",
          description: "Matrix / Element",
          href: elementSsoUrl,
          iconBg: "bg-[#0DBD8B]/10 dark:bg-[#0DBD8B]/20",
          icon: <BrandIcon icon={siElement} />,
        },
        {
          name: "Proton Workspace",
          description: "Email & Calendar",
          href: "https://account.proton.me",
          external: true,
          iconBg: "bg-[#6D4AFF]/10 dark:bg-[#6D4AFF]/20",
          icon: <BrandIcon icon={siProtonmail} />,
        },
        {
          name: "Slack",
          description: "Communication",
          href: "https://slack.com",
          external: true,
          iconBg: "bg-[#4A154B]/10 dark:bg-[#4A154B]/20",
          // Slack official SVG path (not in simple-icons v14)
          icon: (
            <svg width={28} height={28} viewBox="0 0 24 24" fill="#4A154B" aria-label="Slack">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
            </svg>
          ),
        },
        {
          name: "Notion",
          description: "Documentation",
          href: "https://notion.so",
          external: true,
          iconBg: "bg-zinc-100 dark:bg-zinc-800",
          icon: <BrandIcon icon={siNotion} />,
        },
        {
          name: "Confluence",
          description: "Wiki & Docs",
          href: "https://atlassian.com/software/confluence",
          external: true,
          iconBg: "bg-[#172B4D]/10 dark:bg-[#172B4D]/30",
          icon: <BrandIcon icon={siConfluence} />,
        },
      ],
    },
    {
      label: "Dev",
      services: [
        {
          name: "GitLab",
          description: "Code Repository",
          href: "https://polis-production-1f3a.up.railway.app/api/v1/saml/idp/sso?clientID=646bbd6b7afefcb1e5d5667c03dafd211b5fecba",
          iconBg: "bg-orange-100 dark:bg-orange-900/20",
          icon: <BrandIcon icon={siGitlab} />,
        },
        {
          name: "GitHub",
          description: "Code Repository",
          href: "https://github.com",
          external: true,
          iconBg: "bg-zinc-100 dark:bg-zinc-800",
          icon: <BrandIcon icon={siGithub} />,
        },
        {
          name: "Railway",
          description: "Deployment",
          href: "https://railway.app",
          external: true,
          iconBg: "bg-zinc-100 dark:bg-zinc-800",
          icon: <BrandIcon icon={siRailway} />,
        },
        {
          name: "AWS",
          description: "Cloud",
          href: "https://aws.amazon.com",
          external: true,
          iconBg: "bg-[#FF9900]/10 dark:bg-[#FF9900]/20",
          // AWS official SVG path (not in simple-icons v14 as amazonwebservices)
          icon: (
            <svg width={28} height={28} viewBox="0 0 24 24" fill="#FF9900" aria-label="AWS">
              <path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 0 1-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 0 1-.287-.375 6.18 6.18 0 0 1-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.030-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.287 2.287 0 0 1-.28.104.488.488 0 0 1-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 0 1 .224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 0 1 1.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 0 0-.735-.136 6.02 6.02 0 0 0-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 0 1-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 0 1 .32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 0 1 .311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 0 1-.056.2l-1.923 6.17c-.048.16-.104.263-.168.311a.51.51 0 0 1-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.215-.151-.247-.223a.563.563 0 0 1-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 0 0 .42-.758.777.777 0 0 0-.215-.559c-.144-.151-.416-.287-.807-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 0 1-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.415.32-.096.655-.136 1.006-.136.175 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 0 1 .24.2.43.43 0 0 1 .071.263v.375c0 .168-.064.256-.184.256a.83.83 0 0 1-.303-.096 3.652 3.652 0 0 0-1.532-.311c-.455 0-.815.071-1.070.223-.255.152-.383.383-.383.71 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.99.44 1.237.767.247.327.367.702.367 1.117 0 .343-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.343-.886.447-.36.111-.734.167-1.142.167zM21.698 16.207c-2.626 1.940-6.442 2.970-9.722 2.970-4.598 0-8.74-1.700-11.87-4.526-.247-.223-.024-.527.27-.351 3.384 1.963 7.559 3.153 11.877 3.153 2.914 0 6.114-.607 9.06-1.852.439-.2.814.287.385.606zm1.093-1.245c-.335-.43-2.220-.207-3.074-.103-.255.032-.295-.192-.064-.36 1.502-1.053 3.967-.75 4.254-.399.287.36-.08 2.826-1.485 4.007-.215.184-.423.088-.327-.151.32-.79 1.03-2.57.696-2.994z" />
            </svg>
          ),
        },
        {
          name: "Claude",
          description: "AI Dev Tool",
          href: "https://claude.ai",
          external: true,
          iconBg: "bg-[#D97757]/10 dark:bg-[#D97757]/20",
          icon: <BrandIcon icon={siClaude} />,
        },
        {
          name: "Jira",
          description: "Project Management",
          href: "https://atlassian.com/software/jira",
          external: true,
          iconBg: "bg-[#0052CC]/10 dark:bg-[#0052CC]/20",
          icon: <BrandIcon icon={siJira} />,
        },
      ],
    },
    {
      label: "Design",
      services: [
        {
          name: "Figma",
          description: "Design Platform",
          href: "https://figma.com",
          external: true,
          iconBg: "bg-[#F24E1E]/10 dark:bg-[#F24E1E]/20",
          icon: <BrandIcon icon={siFigma} />,
        },
        {
          name: "Canva",
          description: "Design Tool",
          href: "https://canva.com",
          external: true,
          iconBg: "bg-[#00C4CC]/10 dark:bg-[#00C4CC]/20",
          // Canva official SVG path (not in simple-icons v14)
          icon: (
            <svg width={28} height={28} viewBox="0 0 24 24" fill="#00C4CC" aria-label="Canva">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.824c5.070 0 9.176 4.106 9.176 9.176S17.070 21.176 12 21.176 2.824 17.070 2.824 12 6.930 2.824 12 2.824zm-1.6 5.043c-1.232 0-2.255.388-2.933 1.116-.671.72-1.007 1.739-1.007 3.04 0 1.256.34 2.24 1.012 2.924.672.683 1.633 1.024 2.863 1.024.734 0 1.39-.118 1.95-.353a3.63 3.63 0 0 0 1.393-1.05l-1.07-.784c-.247.314-.527.548-.837.7a2.53 2.53 0 0 1-1.107.228c-.714 0-1.267-.228-1.65-.68-.385-.453-.578-1.107-.578-1.954v-.302c0-.848.193-1.497.578-1.942.383-.446.936-.67 1.65-.67.4 0 .764.08 1.089.24.326.16.607.4.842.72l1.054-.808a3.507 3.507 0 0 0-1.356-1.006 4.488 4.488 0 0 0-1.893-.443zm5.327.118v7.822h1.4V7.985h-1.4z" />
            </svg>
          ),
        },
        {
          name: "Miro",
          description: "Whiteboard",
          href: "https://miro.com",
          external: true,
          iconBg: "bg-[#050038]/10 dark:bg-[#FFD02F]/10",
          icon: <BrandIcon icon={siMiro} />,
        },
      ],
    },
  ]

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Connected Services</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {categories.map((category) => (
          <div key={category.label}>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wider">
                {category.label}
              </Badge>
              <Separator className="flex-1" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {category.services.map((service) => (
                <a
                  key={service.name}
                  href={service.href}
                  target={service.external ? "_blank" : undefined}
                  rel={service.external ? "noopener noreferrer" : undefined}
                  className="flex flex-col items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors group"
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform",
                      service.iconBg
                    )}
                  >
                    {service.icon}
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{service.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
