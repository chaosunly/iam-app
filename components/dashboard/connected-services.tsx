"use client"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Bot, Cloud, Github, Mail, Palette, Sparkles, Train } from "lucide-react"

type Service = {
  name: string
  description: string
  href: string
  icon: React.ReactNode
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
          iconBg: "bg-green-100 dark:bg-green-900/20",
          icon: (
            <svg className="w-7 h-7 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.314 4.715c3.289 0 5.956 2.66 5.963 5.944a.234.234 0 01-.234.234h-1.643a.234.234 0 01-.234-.234c-.007-2.353-1.924-4.263-4.283-4.263h-.57a.469.469 0 00-.468.469v10.67c0 .259.21.469.469.469h.569c2.359 0 4.276-1.91 4.283-4.263 0-.129.105-.234.234-.234h1.643c.129 0 .234.105.234.234-.007 3.284-2.674 5.944-5.963 5.944h-.57a2.126 2.126 0 01-2.125-2.126V6.84c0-1.173.952-2.125 2.126-2.125h.569z" />
            </svg>
          ),
        },
        {
          name: "Proton Workspace",
          description: "Email & Calendar",
          href: "https://account.proton.me",
          external: true,
          iconBg: "bg-purple-100 dark:bg-purple-900/20",
          icon: <Mail className="w-7 h-7 text-purple-600 dark:text-purple-400" />,
        },
        {
          name: "Slack",
          description: "Communication",
          href: "https://slack.com",
          external: true,
          iconBg: "bg-pink-100 dark:bg-pink-900/20",
          icon: (
            <svg className="w-7 h-7 text-pink-600 dark:text-pink-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 15a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2h2v2m1 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2a2 2 0 0 1-2-2v-5m2-8a2 2 0 0 1-2-2a2 2 0 0 1 2-2a2 2 0 0 1 2 2v2H9m0 1a2 2 0 0 1 2 2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2a2 2 0 0 1 2-2h5m8 2a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-2v-2m-1 0a2 2 0 0 1-2 2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2a2 2 0 0 1 2 2v5m-2 8a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2v-2h2m0-1a2 2 0 0 1-2-2a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-5z" />
            </svg>
          ),
        },
        {
          name: "Notion",
          description: "Documentation",
          href: "https://notion.so",
          external: true,
          iconBg: "bg-muted",
          icon: (
            <svg className="w-7 h-7 text-foreground" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.887-.748-.84l-15.177.887c-.56.047-.747.327-.747.887zm14.336.653c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
            </svg>
          ),
        },
        {
          name: "Confluence",
          description: "Wiki & Docs",
          href: "https://atlassian.com/software/confluence",
          external: true,
          iconBg: "bg-indigo-100 dark:bg-indigo-900/20",
          icon: (
            <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.87 18.257c-.248.382-.318.864-.191 1.29.127.426.413.776.767.984l5.448 3.169c.731.425 1.674.174 2.104-.558l5.615-9.573c.616-1.063.617-2.366.007-3.431L8.61 1.354c-.43-.732-1.373-.983-2.104-.558L1.058 4.065c-.354.208-.64.558-.767.984-.127.426-.057.908.191 1.29z" />
              <path d="M23.13 5.743c.248-.382.318-.864.191-1.29-.127-.426-.413-.776-.767-.984l-5.448-3.169c-.731-.425-1.674-.174-2.104.558l-5.615 9.573c-.616 1.063-.617 2.366-.007 3.431l6.01 8.784c.43.732 1.373.983 2.104.558l5.448-3.169c.354-.208.64-.558.767-.984.127-.426.057-.908-.191-1.29z" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "Dev",
      services: [
        {
          name: "GitLab",
          description: "Code Repository",
          href: "https://gitlab.com",
          external: true,
          iconBg: "bg-orange-100 dark:bg-orange-900/20",
          icon: (
            <svg className="w-7 h-7 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.889.441.516.515.658 1.258.438 1.9l2.658 2.66c.645-.223 1.387-.078 1.9.435.721.72.721 1.884 0 2.604-.719.719-1.881.719-2.6 0-.539-.541-.674-1.337-.404-1.996L12.86 8.955v6.525c.176.086.342.203.488.348.713.721.713 1.883 0 2.6-.719.721-1.889.721-2.609 0-.719-.719-.719-1.879 0-2.598.182-.18.387-.316.605-.406V8.835c-.217-.091-.424-.222-.6-.401-.545-.545-.676-1.342-.396-2.009L7.636 3.7.45 10.881c-.6.605-.6 1.584 0 2.189l10.48 10.477c.604.604 1.582.604 2.186 0l10.43-10.43c.605-.603.605-1.582 0-2.187" />
            </svg>
          ),
        },
        {
          name: "GitHub",
          description: "Code Repository",
          href: "https://github.com",
          external: true,
          iconBg: "bg-muted",
          icon: <Github className="w-7 h-7 text-foreground" />,
        },
        {
          name: "Railway",
          description: "Deployment",
          href: "https://railway.app",
          external: true,
          iconBg: "bg-violet-100 dark:bg-violet-900/20",
          icon: <Train className="w-7 h-7 text-violet-600 dark:text-violet-400" />,
        },
        {
          name: "AWS",
          description: "Cloud",
          href: "https://aws.amazon.com",
          external: true,
          iconBg: "bg-amber-100 dark:bg-amber-900/20",
          icon: <Cloud className="w-7 h-7 text-amber-600 dark:text-amber-400" />,
        },
        {
          name: "Claude Code",
          description: "AI Dev Tool",
          href: "https://claude.com/product/claude-code",
          external: true,
          iconBg: "bg-rose-100 dark:bg-rose-900/20",
          icon: <Bot className="w-7 h-7 text-rose-600 dark:text-rose-400" />,
        },
        {
          name: "Jira",
          description: "Project Management",
          href: "https://atlassian.com/software/jira",
          external: true,
          iconBg: "bg-blue-100 dark:bg-blue-900/20",
          icon: (
            <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.757a1 1 0 0 0-1-1zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z" />
            </svg>
          ),
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
          iconBg: "bg-purple-100 dark:bg-purple-900/20",
          icon: (
            <svg className="w-7 h-7 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 24c2.208 0 4-1.792 4-4v-4H8c-2.208 0-4 1.792-4 4s1.792 4 4 4z" />
              <path d="M4 12c0-2.208 1.792-4 4-4h4v8H8c-2.208 0-4-1.792-4-4z" />
              <path d="M4 4c0-2.208 1.792-4 4-4h4v8H8C5.792 8 4 6.208 4 4z" />
              <path d="M12 0h4c2.208 0 4 1.792 4 4s-1.792 4-4 4h-4V0z" />
              <path d="M20 12c0 2.208-1.792 4-4 4s-4-1.792-4-4 1.792-4 4-4 4 1.792 4 4z" />
            </svg>
          ),
        },
        {
          name: "Canva",
          description: "Design Tool",
          href: "https://canva.com",
          external: true,
          iconBg: "bg-teal-100 dark:bg-teal-900/20",
          icon: <Palette className="w-7 h-7 text-teal-600 dark:text-teal-400" />,
        },
        {
          name: "Claude Design",
          description: "AI Design",
          href: "https://claude.ai",
          external: true,
          iconBg: "bg-rose-100 dark:bg-rose-900/20",
          icon: <Sparkles className="w-7 h-7 text-rose-600 dark:text-rose-400" />,
        },
        {
          name: "Miro",
          description: "Whiteboard",
          href: "https://miro.com",
          external: true,
          iconBg: "bg-yellow-100 dark:bg-yellow-900/20",
          icon: (
            <svg className="w-7 h-7 text-yellow-600 dark:text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.392 0H13.9L17 10.444l4.262-3.642a6.94 6.94 0 0 0-.902-2.264 6.936 6.936 0 0 0-2.968-2.97A6.932 6.932 0 0 0 17.392 0zM6.608 0h3.49L7 10.444 2.739 6.802a6.94 6.94 0 0 1 .901-2.264 6.936 6.936 0 0 1 2.968-2.97A6.932 6.932 0 0 1 6.608 0zM12.955 13.887v9.448h-1.91v-9.448l-5.345-2.63v-.39L14.9 7.215l9.2 3.651v.391l-5.345 2.63v9.448h-1.91v-9.448l-3.89 1.899-3.89-1.899z" />
            </svg>
          ),
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
