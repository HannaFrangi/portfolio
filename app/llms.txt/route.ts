import { education, experience, featured, person, toolkit, works } from "@/lib/content";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

/** A plain-text summary for AI assistants (llmstxt.org), built from the same content as the page. */
export function GET() {
  const projects = [featured, ...works].map((p) => {
    const link = p.href ? ` (${p.href})` : "";
    return `- **${p.name}**${link}: ${p.kind}. ${p.summary} Role: ${p.role}. Stack: ${p.stack.join(", ")}.`;
  });

  const body = `# ${person.name}

> ${person.name} is a ${person.role} based in ${person.location}, building web apps, mobile apps, admin dashboards and SaaS products for real clients, and teaching kids robotics.

## Projects

${projects.join("\n")}

## Experience

${experience.map((e) => `- ${e.role}, ${e.place} (${e.period})`).join("\n")}

## Education

${education.map((e) => `- ${e.title}, ${e.place} (${e.period})`).join("\n")}

## Skills

${toolkit.map((t) => `- ${t.group}: ${t.items.join(", ")}`).join("\n")}

## Links

- [Portfolio](${siteUrl})
- [CV (PDF)](${siteUrl}${person.cv})
- [GitHub](${person.github})
- [LinkedIn](${person.linkedin})
- Email: ${person.email}
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
