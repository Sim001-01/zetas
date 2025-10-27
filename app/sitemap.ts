import type { MetadataRoute } from "next"

const getBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (envUrl) {
    return envUrl.replace(/\/$/, "")
  }
  // Fallback to the production domain when NEXT_PUBLIC_SITE_URL isn't set
  return "https://zetasbarbershop.it"
}

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl()
  const routes: Array<{ path: string; changeFrequency: ChangeFrequency; priority: number }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/admin", changeFrequency: "monthly", priority: 0.2 },
    { path: "/admin/login", changeFrequency: "monthly", priority: 0.1 },
  ]

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path === "/" ? "" : path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }))
}
