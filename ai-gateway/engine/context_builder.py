from db.connection import fetch_one, fetch_all

async def build_context(company_id: str = None, extra: dict = None):
    parts = []

    if company_id:
        company = await fetch_one("SELECT * FROM v_company_full WHERE id = $1", (company_id,))
        if company:
            parts.append({
                "source": "company",
                "content": (
                    f"Company: {company.get('name', 'N/A')}\n"
                    f"Category: {company.get('category', 'N/A')}\n"
                    f"City: {company.get('city', 'N/A')}\n"
                    f"Website: {company.get('website', 'N/A')}\n"
                    f"Rating: {company.get('google_rating', 'N/A')} ({company.get('google_reviews_count', 0)} reviews)\n"
                    f"Status: {company.get('status', 'N/A')}"
                ),
            })

            if company.get("audit_score_global"):
                parts.append({
                    "source": "audit",
                    "content": (
                        f"Audit Score: {company['audit_score_global']}/100\n"
                        f"SEO: {company.get('score_seo', 'N/A')}/100\n"
                        f"Social: {company.get('score_social', 'N/A')}/100\n"
                        f"Marketing: {company.get('score_marketing', 'N/A')}/100\n"
                        f"Automation: {company.get('score_automation', 'N/A')}/100\n"
                        f"Opportunity: {company.get('score_global_opportunity', 'N/A')}/100"
                    ),
                })

            if company.get("ai_summary"):
                parts.append({
                    "source": "ai_analysis",
                    "content": f"Previous AI Analysis: {company.get('ai_summary', 'N/A')}",
                })

            recent = await fetch_all("""
                SELECT content FROM ai_memory
                WHERE company_id = $1 AND memory_type = 'long_term'
                ORDER BY created_at DESC LIMIT 5
            """, (company_id,))
            if recent:
                memory_text = "\n".join(m.get("content", "") for m in recent)
                parts.append({"source": "memory", "content": f"Historical context:\n{memory_text}"})

    if extra:
        parts.append({"source": "request", "content": str(extra)})

    return parts

def format_context(parts: list) -> str:
    sections = []
    for p in parts:
        sections.append(f"=== {p['source'].upper()} ===\n{p['content']}")
    return "\n\n".join(sections)
