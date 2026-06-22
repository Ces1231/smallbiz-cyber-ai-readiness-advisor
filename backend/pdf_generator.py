"""
SmallBiz Advisor — Business Plan PDF Generator
Generates a PDF from business plan content using weasyprint (primary) or reportlab (fallback).
"""
import asyncio
import structlog
from typing import Any

log = structlog.get_logger()


async def generate_pdf(
    business_plan_text: str,
    idea: dict,
    mission_vision: str,
    customer_persona: dict,
) -> bytes:
    """
    Render the business plan as a PDF and return raw bytes.
    Tries weasyprint first (HTML-to-PDF). Falls back to reportlab if unavailable.
    """
    try:
        return await asyncio.to_thread(
            _generate_with_weasyprint, business_plan_text, idea, mission_vision, customer_persona
        )
    except ImportError:
        log.warning("weasyprint_not_available_falling_back_to_reportlab")
        return await asyncio.to_thread(
            _generate_with_reportlab, business_plan_text, idea, mission_vision, customer_persona
        )
    except Exception as exc:
        log.error("weasyprint_error_falling_back", error=str(exc))
        try:
            return await asyncio.to_thread(
                _generate_with_reportlab, business_plan_text, idea, mission_vision, customer_persona
            )
        except Exception as exc2:
            log.error("reportlab_error", error=str(exc2))
            raise RuntimeError("pdf_generation_failed") from exc2


def _generate_with_weasyprint(
    business_plan_text: str,
    idea: dict,
    mission_vision: str,
    customer_persona: dict,
) -> bytes:
    """Generate PDF using weasyprint (HTML-to-PDF)."""
    from weasyprint import HTML  # type: ignore

    html_content = _render_html(business_plan_text, idea, mission_vision, customer_persona)
    pdf = HTML(string=html_content).write_pdf()
    return pdf


def _generate_with_reportlab(
    business_plan_text: str,
    idea: dict,
    mission_vision: str,
    customer_persona: dict,
) -> bytes:
    """Generate PDF using reportlab (pure Python fallback)."""
    from io import BytesIO
    from reportlab.lib.pagesizes import letter  # type: ignore
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle  # type: ignore
    from reportlab.lib.units import inch  # type: ignore
    from reportlab.lib import colors as rl_colors  # type: ignore
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable  # type: ignore

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=1 * inch, bottomMargin=1 * inch)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=24,
        spaceAfter=12,
        textColor=rl_colors.HexColor("#1a3a5c"),
    )
    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading1"],
        fontSize=14,
        spaceBefore=16,
        spaceAfter=6,
        textColor=rl_colors.HexColor("#1a3a5c"),
    )
    body_style = styles["BodyText"]
    body_style.fontSize = 11
    body_style.leading = 16

    story = []

    # Cover page
    story.append(Paragraph(idea.get("name", "Business Plan"), title_style))
    story.append(Paragraph(idea.get("description", ""), styles["Normal"]))
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph("Prepared by SmallBiz Dream-to-Launch Builder", styles["Italic"]))
    story.append(HRFlowable(width="100%", thickness=1, color=rl_colors.HexColor("#22d3ee")))
    story.append(Spacer(1, 0.2 * inch))

    # Executive Summary
    if mission_vision:
        story.append(Paragraph("Executive Summary", heading_style))
        story.append(Paragraph(mission_vision.replace("\n", "<br/>"), body_style))
        story.append(Spacer(1, 0.15 * inch))

    # Customer Persona
    if customer_persona:
        story.append(Paragraph("Customer Profile", heading_style))
        for key, val in customer_persona.items():
            if val:
                story.append(Paragraph(f"<b>{key.replace('_', ' ').title()}:</b> {val}", body_style))
        story.append(Spacer(1, 0.15 * inch))

    # Business Plan
    if business_plan_text:
        story.append(Paragraph("Business Plan", heading_style))
        for para in business_plan_text.split("\n\n"):
            if para.strip():
                story.append(Paragraph(para.strip().replace("\n", " "), body_style))
                story.append(Spacer(1, 0.08 * inch))

    # Appendix
    story.append(HRFlowable(width="100%", thickness=1, color=rl_colors.HexColor("#22d3ee")))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph("Appendix — Contact", heading_style))
    story.append(Paragraph("Champtron Systems LLC | info@champtron-systems.com | champtron.com", body_style))

    doc.build(story)
    return buffer.getvalue()


def _render_html(
    business_plan_text: str,
    idea: dict,
    mission_vision: str,
    customer_persona: dict,
) -> str:
    """Render business plan as HTML for weasyprint."""

    def esc(s: str) -> str:
        if not s:
            return ""
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")

    persona_rows = ""
    if customer_persona:
        for key, val in customer_persona.items():
            if val:
                persona_rows += f"<tr><th>{key.replace('_', ' ').title()}</th><td>{esc(str(val))}</td></tr>"

    plan_sections = ""
    if business_plan_text:
        for para in business_plan_text.split("\n\n"):
            if para.strip():
                plan_sections += f"<p>{esc(para.strip())}</p>"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11pt; color: #1a1a2e; line-height: 1.65; }}
  .cover {{ page-break-after: always; text-align: center; padding: 100px 60px; background: #07111f; color: white; }}
  .cover h1 {{ font-size: 32pt; color: #22d3ee; margin-bottom: 12px; }}
  .cover p {{ font-size: 14pt; color: #a8bdd4; margin-bottom: 8px; }}
  .cover .tagline {{ font-size: 11pt; color: #60a5fa; margin-top: 40px; }}
  .section {{ padding: 40px 60px; page-break-inside: avoid; }}
  h2 {{ font-size: 16pt; color: #1a3a5c; border-bottom: 2px solid #22d3ee; padding-bottom: 6px; margin-bottom: 14px; }}
  p {{ margin-bottom: 10px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
  th {{ text-align: left; padding: 6px 10px; background: #f0f4f8; color: #1a3a5c; font-size: 10pt; width: 35%; }}
  td {{ padding: 6px 10px; font-size: 10pt; }}
  tr:nth-child(even) td {{ background: #f8fafc; }}
  .footer {{ margin-top: 60px; padding: 20px 60px; border-top: 2px solid #22d3ee; font-size: 9pt; color: #666; text-align: center; }}
</style>
</head>
<body>

<div class="cover">
  <h1>{esc(idea.get('name', 'Business Plan'))}</h1>
  <p>{esc(idea.get('description', ''))}</p>
  <p class="tagline">Prepared by SmallBiz Dream-to-Launch Builder<br/>Champtron Systems LLC</p>
</div>

<div class="section">
  <h2>Executive Summary</h2>
  <p>{esc(mission_vision)}</p>
</div>

<div class="section">
  <h2>Business Overview</h2>
  <p><strong>{esc(idea.get('name', ''))}</strong> — {esc(idea.get('description', ''))}</p>
</div>

{"<div class='section'><h2>Market Analysis — Customer Profile</h2><table>" + persona_rows + "</table></div>" if persona_rows else ""}

<div class="section">
  <h2>Business Plan</h2>
  {plan_sections}
</div>

<div class="footer">
  Champtron Systems LLC &nbsp;|&nbsp; info@champtron-systems.com &nbsp;|&nbsp; champtron.com
</div>

</body>
</html>"""
