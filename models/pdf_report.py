"""models/pdf_report.py — Generate PDF session report using ReportLab"""
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                 Table, TableStyle, HRFlowable)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from utils.config import config


def generate_report(child_name: str, session_data: dict, messages: list,
                    alert_count: int = 0) -> str:
    """
    Generate a PDF session report.
    Returns the path to the saved PDF file.
    """
    os.makedirs(config.REPORTS_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = child_name.replace(" ", "_")
    filename  = f"{config.REPORTS_DIR}/report_{safe_name}_{timestamp}.pdf"

    doc    = SimpleDocTemplate(filename, pagesize=A4,
                               rightMargin=2*cm, leftMargin=2*cm,
                               topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story  = []

    # ── Custom styles ─────────────────────────────────────────
    title_style = ParagraphStyle("Title", parent=styles["Title"],
                                  fontSize=22, textColor=colors.HexColor("#1E3A5F"),
                                  spaceAfter=6, alignment=TA_CENTER)
    sub_style   = ParagraphStyle("Sub", parent=styles["Normal"],
                                  fontSize=11, textColor=colors.HexColor("#5A7A9F"),
                                  alignment=TA_CENTER, spaceAfter=20)
    heading_style = ParagraphStyle("Heading", parent=styles["Heading2"],
                                    fontSize=13, textColor=colors.HexColor("#1E3A5F"),
                                    spaceBefore=14, spaceAfter=8)
    body_style  = ParagraphStyle("Body", parent=styles["Normal"],
                                  fontSize=10, leading=14)

    # ── Header ────────────────────────────────────────────────
    story.append(Paragraph("AAC System — Session Report", title_style))
    story.append(Paragraph(f"AI-Driven Assistive Communication for Non-Verbal Autistic Individuals", sub_style))
    story.append(HRFlowable(width="100%", thickness=2,
                             color=colors.HexColor("#1E3A5F"), spaceAfter=16))

    # ── Summary Table ─────────────────────────────────────────
    story.append(Paragraph("Session Summary", heading_style))
    duration = session_data.get("duration", "N/A")
    summary_data = [
        ["Field", "Value"],
        ["Child Name",       child_name],
        ["Session Date",     session_data.get("date", datetime.now().strftime("%d %B %Y"))],
        ["Session Time",     session_data.get("time", datetime.now().strftime("%I:%M %p"))],
        ["Duration",         str(duration)],
        ["Total Messages",   str(len(messages))],
        ["Alerts Triggered", str(alert_count)],
        ["Symbols Used",     str(session_data.get("symbols_count", 0))],
    ]
    t = Table(summary_data, colWidths=[6*cm, 10*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), colors.HexColor("#1E3A5F")),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, 0), 11),
        ("BACKGROUND",  (0, 1), (-1, -1), colors.HexColor("#F0F4FF")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1),
         [colors.HexColor("#F0F4FF"), colors.white]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#C0CDE0")),
        ("FONTSIZE",    (0, 1), (-1, -1), 10),
        ("PADDING",     (0, 0), (-1, -1), 7),
        ("FONTNAME",    (0, 1), (0, -1), "Helvetica-Bold"),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    # ── Emotion breakdown ─────────────────────────────────────
    if messages:
        story.append(Paragraph("Emotion Breakdown During Session", heading_style))
        emotion_counts: dict = {}
        for m in messages:
            emo = m.get("emotion", "neutral")
            emotion_counts[emo] = emotion_counts.get(emo, 0) + 1

        emo_data = [["Emotion", "Count", "Percentage"]]
        total    = len(messages)
        for emo, cnt in sorted(emotion_counts.items(), key=lambda x: -x[1]):
            pct = f"{round(cnt/total*100, 1)}%"
            emo_data.append([emo.title(), str(cnt), pct])

        et = Table(emo_data, colWidths=[6*cm, 5*cm, 5*cm])
        et.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
            ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1),
             [colors.HexColor("#EEF2FF"), colors.white]),
            ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#C0CDE0")),
            ("FONTSIZE",    (0, 0), (-1, -1), 10),
            ("PADDING",     (0, 0), (-1, -1), 7),
            ("ALIGN",       (1, 0), (-1, -1), "CENTER"),
        ]))
        story.append(et)
        story.append(Spacer(1, 16))

    # ── Message Log ───────────────────────────────────────────
    story.append(Paragraph("Message Log", heading_style))
    if not messages:
        story.append(Paragraph("No messages recorded in this session.", body_style))
    else:
        msg_data = [["#", "Time", "Generated Message", "Emotion", "Gesture"]]
        for i, m in enumerate(messages[:50], 1):   # cap at 50 rows
            time_str = m.get("timestamp", "")
            if hasattr(time_str, "strftime"):
                time_str = time_str.strftime("%H:%M:%S")
            msg_data.append([
                str(i),
                str(time_str)[:8],
                Paragraph(m.get("sentence", "")[:120], body_style),
                m.get("emotion", "").title(),
                m.get("gesture", "")[:30],
            ])

        mt = Table(msg_data, colWidths=[1*cm, 2.2*cm, 8.5*cm, 2.8*cm, 3*cm])
        mt.setStyle(TableStyle([
            ("BACKGROUND",     (0, 0), (-1, 0), colors.HexColor("#1E3A5F")),
            ("TEXTCOLOR",      (0, 0), (-1, 0), colors.white),
            ("FONTNAME",       (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",       (0, 0), (-1, 0), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1),
             [colors.HexColor("#F8F9FF"), colors.white]),
            ("GRID",           (0, 0), (-1, -1), 0.4, colors.HexColor("#D0D8F0")),
            ("FONTSIZE",       (0, 1), (-1, -1), 8),
            ("PADDING",        (0, 0), (-1, -1), 5),
            ("VALIGN",         (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(mt)

    # ── Footer ────────────────────────────────────────────────
    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=1,
                             color=colors.HexColor("#C0CDE0")))
    story.append(Spacer(1, 8))
    footer_style = ParagraphStyle("Footer", parent=styles["Normal"],
                                   fontSize=8, textColor=colors.grey,
                                   alignment=TA_CENTER)
    story.append(Paragraph(
        f"Generated by VoiceMe AAC System | "
        f"Phi-2 · MediaPipe · DeepFace | "
        f"{datetime.now().strftime('%d %B %Y %H:%M')}",
        footer_style
    ))

    doc.build(story)
    print(f"[PDF] Report saved → {filename}")
    return filename