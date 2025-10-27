import type { MetadataRoute } from "next"

const getBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (envUrl) {
    return envUrl.replace(/\/$/, "")
  }
  // Fallback to the production domain when NEXT_PUBLIC_SITE_URL isn't set
  return "https://zetasbarbershop.it"
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/login", "/api"],
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`],
    host: baseUrl,
  }
}
