from __future__ import annotations

import json
import math
import re
import shutil
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "UrbanIQ_RRP_Report_Team19.docx"
ASSET_DIR = ROOT / "report_assets"
ASSET_DIR.mkdir(exist_ok=True)

TRANSFER = Path(
    r"C:\Users\priyanka\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\FF7F0BEF445FCF11960541E94CDC8BED1ECCC77B\transfers\2026-22"
)

SOURCE_IMAGES = {
    "Class Diagram": TRANSFER / "WhatsApp Image 2026-05-28 at 9.59.04 PM.jpeg",
    "Use Case Diagram": TRANSFER / "WhatsApp Image 2026-05-28 at 9.59.07 PM.jpeg",
    "Data Flow Diagram": TRANSFER / "WhatsApp Image 2026-05-28 at 9.59.10 PM.jpeg",
}


def clean_image(src: Path, name: str) -> Path:
    img = Image.open(src).convert("RGB")
    w, h = img.size
    pix = img.load()
    rows = []
    for y in range(h):
        bright = 0
        for x in range(0, w, max(1, w // 200)):
            r, g, b = pix[x, y]
            if r + g + b > 620:
                bright += 1
        if bright > 5:
            rows.append(y)
    cols = []
    for x in range(w):
        bright = 0
        for y in range(0, h, max(1, h // 200)):
            r, g, b = pix[x, y]
            if r + g + b > 620:
                bright += 1
        if bright > 5:
            cols.append(x)
    if rows and cols:
        pad = 12
        box = (
            max(0, min(cols) - pad),
            max(0, min(rows) - pad),
            min(w, max(cols) + pad),
            min(h, max(rows) + pad),
        )
        img = img.crop(box)
    out = ASSET_DIR / f"{name}.png"
    img.save(out, "PNG")
    return out


def font(size=24, bold=False):
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def rounded_box(draw, xy, fill, outline="#8CA0B3", radius=16, width=2):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def centered_text(draw, box, text, fnt, fill="#15324A", spacing=4):
    x1, y1, x2, y2 = box
    lines = []
    for raw in text.split("\n"):
        words = raw.split()
        line = ""
        for word in words:
            test = f"{line} {word}".strip()
            if draw.textlength(test, font=fnt) <= (x2 - x1 - 28):
                line = test
            else:
                if line:
                    lines.append(line)
                line = word
        if line:
            lines.append(line)
    heights = [draw.textbbox((0, 0), ln, font=fnt)[3] for ln in lines]
    total = sum(heights) + spacing * (len(lines) - 1)
    y = y1 + (y2 - y1 - total) / 2
    for ln, ht in zip(lines, heights):
        x = x1 + (x2 - x1 - draw.textlength(ln, font=fnt)) / 2
        draw.text((x, y), ln, font=fnt, fill=fill)
        y += ht + spacing


def arrow(draw, start, end, fill="#536B7A", width=3):
    draw.line([start, end], fill=fill, width=width)
    ang = math.atan2(end[1] - start[1], end[0] - start[0])
    size = 12
    pts = [
        end,
        (end[0] - size * math.cos(ang - math.pi / 6), end[1] - size * math.sin(ang - math.pi / 6)),
        (end[0] - size * math.cos(ang + math.pi / 6), end[1] - size * math.sin(ang + math.pi / 6)),
    ]
    draw.polygon(pts, fill=fill)


def make_architecture_diagram() -> Path:
    out = ASSET_DIR / "architecture.png"
    img = Image.new("RGB", (1500, 980), "white")
    d = ImageDraw.Draw(img)
    title_f, box_f, small_f = font(34, True), font(24, True), font(19)
    d.text((450, 45), "UrbanIQ High-Level System Architecture", font=title_f, fill="#102A43")
    boxes = {
        "React Frontend\nTailwind, Router,\nRecharts, Leaflet": (80, 170, 390, 330),
        "FastAPI Backend\nPydantic validation,\nCORS, REST routing": (595, 170, 905, 330),
        "ML Inference Layer\nRandom Forest,\nGradient Boosting,\nXGBoost, Joblib": (1110, 170, 1420, 330),
        "Supabase Auth\nJWT sessions,\nprotected routes,\nrole checks": (80, 560, 390, 720),
        "Supabase PostgreSQL\nusers, logs, uploads,\nanalytics, alerts": (595, 560, 905, 720),
        "Admin Workflows\nCSV validation,\nmodel retraining,\naudit logs": (1110, 560, 1420, 720),
    }
    fills = ["#E5F0FF", "#EAF7F0", "#FFF0E5", "#F2EFFF", "#EAF7F0", "#FFF7E0"]
    for (label, xy), fill in zip(boxes.items(), fills):
        rounded_box(d, xy, fill)
        centered_text(d, xy, label, box_f)
    arrow(d, (390, 250), (595, 250))
    arrow(d, (905, 250), (1110, 250))
    arrow(d, (750, 330), (750, 560))
    arrow(d, (235, 330), (235, 560))
    arrow(d, (1265, 330), (1265, 560))
    arrow(d, (390, 640), (595, 640))
    arrow(d, (905, 640), (1110, 640))
    d.text((450, 840), "Prediction flow: browser input -> REST API -> validated feature frame -> loaded model -> JSON result -> dashboard visualization", font=small_f, fill="#334E68")
    img.save(out)
    return out


def make_er_diagram() -> Path:
    out = ASSET_DIR / "er_diagram.png"
    img = Image.new("RGB", (1500, 950), "white")
    d = ImageDraw.Draw(img)
    d.text((560, 45), "UrbanIQ Supabase PostgreSQL ER Diagram", font=font(32, True), fill="#102A43")
    box_f, small_f = font(22, True), font(17)
    entities = {
        "users\nuser_id PK\nemail, full_name\nrole, created_at": (90, 165, 390, 330),
        "profiles\nprofile_id PK\nuser_id FK\nzone, department": (600, 165, 900, 330),
        "dataset_uploads\nupload_id PK\nuploaded_by FK\nmodule, status": (1110, 165, 1410, 330),
        "prediction_logs\nprediction_id PK\nuser_id FK\nmodule, input_json\nresult_json, confidence": (90, 565, 390, 760),
        "analytics_snapshots\nsnapshot_id PK\nzone, aqi\nwater_score, risk_score": (600, 565, 900, 760),
        "alerts\nalert_id PK\nzone, alert_type\nseverity, status": (1110, 565, 1410, 760),
    }
    for i, (label, xy) in enumerate(entities.items()):
        rounded_box(d, xy, ["#E5F0FF", "#EAF7F0", "#FFF0E5"][i % 3])
        centered_text(d, xy, label, small_f)
        title = label.split("\n")[0]
        d.text((xy[0] + 18, xy[1] + 12), title, font=box_f, fill="#15324A")
    for a, b in [((390, 245), (600, 245)), ((900, 245), (1110, 245)), ((240, 330), (240, 565)), ((750, 330), (750, 565)), ((1260, 330), (1260, 565)), ((390, 660), (600, 660)), ((900, 660), (1110, 660))]:
        arrow(d, a, b)
    d.text((240, 390), "1:M", font=font(18, True), fill="#9B1C1C")
    d.text((745, 390), "1:M", font=font(18, True), fill="#9B1C1C")
    d.text((1255, 390), "1:M", font=font(18, True), fill="#9B1C1C")
    d.text((130, 845), "RLS policy principle: authenticated users read their own logs; admins can manage datasets, analytics snapshots, alerts, and audit trails.", font=small_f, fill="#334E68")
    img.save(out)
    return out


def make_sequence_diagram() -> Path:
    out = ASSET_DIR / "sequence_diagram.png"
    img = Image.new("RGB", (1500, 960), "white")
    d = ImageDraw.Draw(img)
    d.text((505, 45), "Prediction API Sequence Diagram", font=font(32, True), fill="#102A43")
    actors = ["User", "React UI", "FastAPI", "ML Model", "Supabase"]
    x = [150, 440, 730, 1020, 1310]
    for label, xi in zip(actors, x):
        rounded_box(d, (xi - 100, 130, xi + 100, 190), "#EAF7F0")
        centered_text(d, (xi - 100, 130, xi + 100, 190), label, font(20, True))
        d.line((xi, 190, xi, 820), fill="#B8C4CE", width=2)
    steps = [
        (0, 1, "Enter zone and sensor values"),
        (1, 2, "POST /water/predict JSON"),
        (2, 3, "Build validated feature frame"),
        (3, 2, "Return label and confidence"),
        (2, 4, "Persist prediction log"),
        (2, 1, "200 OK prediction response"),
        (1, 0, "Render KPI, alert, chart update"),
    ]
    y = 250
    for src, dst, txt in steps:
        arrow(d, (x[src], y), (x[dst], y), width=3)
        d.text((min(x[src], x[dst]) + 20, y - 28), txt, font=font(17), fill="#334E68")
        y += 78
    img.save(out)
    return out


def make_activity_diagram() -> Path:
    out = ASSET_DIR / "activity_diagram.png"
    img = Image.new("RGB", (1300, 1500), "white")
    d = ImageDraw.Draw(img)
    d.text((430, 45), "Dataset Upload and Model Retraining Activity", font=font(30, True), fill="#102A43")
    f = font(20, True)
    steps = [
        ("Admin selects module", "#E5F0FF"),
        ("Upload CSV dataset", "#E5F0FF"),
        ("Validate schema and datatypes", "#EAF7F0"),
        ("Clean missing values and outliers", "#EAF7F0"),
        ("Engineer features and split data", "#FFF7E0"),
        ("Train model and tune parameters", "#FFF0E5"),
        ("Evaluate precision, recall and F1", "#FFF0E5"),
        ("Serialize model using Joblib", "#F2EFFF"),
        ("Deploy artifact to FastAPI inference path", "#F2EFFF"),
        ("Dashboard shows updated analytics", "#EAF7F0"),
    ]
    y = 135
    prev = None
    for text, fill in steps:
        xy = (360, y, 940, y + 85)
        rounded_box(d, xy, fill)
        centered_text(d, xy, text, f)
        if prev:
            arrow(d, prev, (650, y))
        prev = (650, y + 85)
        y += 125
    img.save(out)
    return out


def make_deployment_diagram() -> Path:
    out = ASSET_DIR / "deployment_diagram.png"
    img = Image.new("RGB", (1500, 900), "white")
    d = ImageDraw.Draw(img)
    d.text((540, 45), "UrbanIQ Deployment Diagram", font=font(32, True), fill="#102A43")
    boxes = {
        "Client Device\nChrome/Edge/Firefox\nReact SPA": (90, 210, 390, 400),
        "Frontend Hosting\nVite build\nStatic assets/CDN": (600, 140, 900, 330),
        "Backend Service\nFastAPI + Uvicorn\nML artifacts mounted": (600, 510, 900, 700),
        "Supabase Cloud\nPostgreSQL, Auth,\nRLS policies": (1110, 340, 1410, 540),
    }
    for label, xy in boxes.items():
        rounded_box(d, xy, "#EAF7F0")
        centered_text(d, xy, label, font(22, True))
    arrow(d, (390, 300), (600, 235))
    arrow(d, (390, 330), (600, 605))
    arrow(d, (900, 605), (1110, 440))
    arrow(d, (900, 235), (1110, 410))
    d.text((470, 790), "All communication uses HTTPS/JSON. Supabase authentication tokens protect route access and database operations.", font=font(18), fill="#334E68")
    img.save(out)
    return out


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_text(cell, text, bold=False):
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run(text)
    run.font.name = "Times New Roman"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    run.font.size = Pt(10)
    run.bold = bold
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER


def add_table(doc, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        set_cell_text(hdr[i], h, True)
        set_cell_shading(hdr[i], "E8EEF5")
    for row in rows:
        cells = table.add_row().cells
        for i, val in enumerate(row):
            set_cell_text(cells[i], str(val), False)
    if widths:
        for row in table.rows:
            for cell, width in zip(row.cells, widths):
                cell.width = width
    for cell in table._cells:
        tc_pr = cell._tc.get_or_add_tcPr()
        margins = OxmlElement("w:tcMar")
        for m in ("top", "bottom", "start", "end"):
            node = OxmlElement(f"w:{m}")
            node.set(qn("w:w"), "100")
            node.set(qn("w:type"), "dxa")
            margins.append(node)
        tc_pr.append(margins)
    doc.add_paragraph()
    return table


def add_page_number(section):
    footer = section.footer
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run()
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    r._r.append(fld)


def set_doc_styles(doc):
    sec = doc.sections[0]
    sec.page_height = Cm(29.7)
    sec.page_width = Cm(21.0)
    sec.top_margin = Cm(2.0)
    sec.bottom_margin = Cm(1.8)
    sec.left_margin = Cm(2.35)
    sec.right_margin = Cm(2.0)
    for section in doc.sections:
        add_page_number(section)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Times New Roman"
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    normal.font.size = Pt(12)
    normal.paragraph_format.line_spacing = 1.15
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    for name, size, color in [
        ("Heading 1", 16, "1F4E79"),
        ("Heading 2", 14, "1F4E79"),
        ("Heading 3", 12, "1F4E79"),
    ]:
        st = styles[name]
        st.font.name = "Times New Roman"
        st._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
        st.font.size = Pt(size)
        st.font.bold = True
        st.font.color.rgb = RGBColor.from_string(color)
        st.paragraph_format.space_before = Pt(8 if name != "Heading 1" else 12)
        st.paragraph_format.space_after = Pt(5)
        st.paragraph_format.keep_with_next = True


def p(doc, text="", bold=False, align=None, size=12, italic=False):
    para = doc.add_paragraph()
    para.paragraph_format.first_line_indent = Inches(0.28) if text and align is None else None
    para.paragraph_format.space_after = Pt(5)
    para.paragraph_format.line_spacing = 1.15
    if align is not None:
        para.alignment = align
    else:
        para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    run = para.add_run(text)
    run.font.name = "Times New Roman"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    return para


def h(doc, level, text):
    para = doc.add_heading(text, level=level)
    para.paragraph_format.keep_with_next = True
    return para


def bullet(doc, text):
    para = doc.add_paragraph(style="List Bullet")
    para.paragraph_format.space_after = Pt(3)
    run = para.add_run(text)
    run.font.name = "Times New Roman"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    run.font.size = Pt(12)
    return para


def caption(doc, text):
    para = p(doc, text, align=WD_ALIGN_PARAGRAPH.CENTER, size=10, italic=True)
    para.paragraph_format.keep_with_next = True


def figure(doc, image_path: Path, title: str, width=6.1):
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para.paragraph_format.keep_with_next = True
    run = para.add_run()
    run.add_picture(str(image_path), width=Inches(width))
    caption(doc, title)


def chapter_intro(doc, theme, focus):
    p(doc, f"This chapter presents {theme} for UrbanIQ in the context of Telangana-focused smart city analytics. The discussion is written from an implementation perspective so that the reader can understand not only what the system contains, but also how each module supports predictive governance, public-health monitoring, road-safety assessment, and administrative decision support.")
    p(doc, f"The {focus} is treated as a complete software-engineering concern. It connects user requirements, data movement, backend validation, database persistence, and machine-learning inference into one operational flow. This avoids a purely theoretical description and reflects the full-stack nature of the project developed in the UrbanIQ repository.")


def add_repeated_analysis(doc, points):
    for point in points:
        p(doc, point)


def add_chapter_deep_dive(doc, label, focus, implementation, significance):
    h(doc, 2, f"{label} Chapter Analysis and Summary")
    p(doc, f"The {focus} of UrbanIQ has been prepared with the intention of making the project defensible during internal review, external evaluation, and viva discussion. A smart city analytics system cannot be evaluated only by the number of screens it contains; it must be evaluated by how clearly data enters the system, how it is validated, how predictions are generated, how results are interpreted, and how administrators can act on the output.")
    p(doc, f"From an implementation perspective, {implementation}. This is important because UrbanIQ combines dashboard rendering, protected access, machine-learning inference, and data persistence. If these responsibilities are not separated, the project becomes difficult to debug and difficult to scale. The chosen architecture keeps each responsibility visible and allows evaluators to trace a feature from the React page to the API request, model call, and database record.")
    p(doc, "A second important consideration is reliability. Urban analytics data may be incomplete, delayed, noisy, or synthetically generated for academic experimentation. Therefore, the system should never assume that input values are perfect. UrbanIQ handles this concern through validation models, preprocessing pipelines, fallback dashboard states, clear risk categories, and documented retraining workflows. This makes the project more realistic than a static dashboard that only displays fixed values.")
    p(doc, f"The practical significance of this chapter is that {significance}. In Telangana-focused monitoring, this matters because administrators require fast interpretation across multiple zones and domains. Hyderabad may require a different level of attention than Karimnagar or Nizamabad, and accident-risk information may need to be interpreted together with air-quality and resource conditions.")
    p(doc, "In summary, this chapter contributes to the overall report by connecting academic documentation with actual software construction. It shows how UrbanIQ has been designed as a maintainable, modular, and extensible platform rather than a collection of unrelated pages. This perspective is useful in viva because it allows the team to explain design choices, justify algorithms, discuss limitations, and propose future improvements with confidence.")


def main():
    doc = Document()
    set_doc_styles(doc)

    cleaned = {name: clean_image(path, re.sub(r"\W+", "_", name).lower()) for name, path in SOURCE_IMAGES.items()}
    generated = {
        "Architecture": make_architecture_diagram(),
        "ER": make_er_diagram(),
        "Sequence": make_sequence_diagram(),
        "Activity": make_activity_diagram(),
        "Deployment": make_deployment_diagram(),
    }

    # Title page
    for _ in range(2):
        p(doc, "", align=WD_ALIGN_PARAGRAPH.CENTER)
    p(doc, "Jawaharlal Nehru Technological University Hyderabad", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=16)
    p(doc, "University College of Engineering Science & Technology", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=15)
    p(doc, "Kukatpally, Hyderabad - 500085", align=WD_ALIGN_PARAGRAPH.CENTER, size=13)
    p(doc, "", align=WD_ALIGN_PARAGRAPH.CENTER)
    p(doc, "REAL TIME RESEARCH PROJECT REPORT", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=15)
    p(doc, "ON", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=13)
    p(doc, "UrbanIQ: Smart Urban Intelligence & Predictive Analytics System", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=18)
    p(doc, "", align=WD_ALIGN_PARAGRAPH.CENTER)
    p(doc, "Submitted by", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=13)
    for m in [
        "Udarapu Priyanka (24011A0533)",
        "Namana Sai Veera Chiranjeevi (24011A0535)",
        "Koduru Chandrasekhar (24011A0537)",
        "Devarakonda Sree Vyshnavi (24011A0538)",
    ]:
        p(doc, m, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
    p(doc, "", align=WD_ALIGN_PARAGRAPH.CENTER)
    p(doc, "Team-19", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=13)
    p(doc, "Department of Computer Science and Engineering (CSE-Regular)", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=13)
    p(doc, "Academic Year 2025-26", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=13)
    doc.add_page_break()

    # Certificate
    p(doc, "DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=16)
    p(doc, "CERTIFICATE", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=16)
    p(doc, "This is to certify that the project work entitled \"UrbanIQ: Smart Urban Intelligence & Predictive Analytics System\" is being submitted by Udarapu Priyanka (24011A0533), Namana Sai Veera Chiranjeevi (24011A0535), Koduru Chandrasekhar (24011A0537), and Devarakonda Sree Vyshnavi (24011A0538), Team-19, in partial fulfillment of the requirement for the award of the degree of Bachelor of Technology in Computer Science and Engineering (CSE-Regular), Jawaharlal Nehru Technological University Hyderabad, during the academic year 2025-26.")
    p(doc, "The project has been carried out as a Real Time Research Project and represents an integrated software solution for smart city intelligence, predictive analytics, environmental monitoring, road-safety risk analysis, and administrative decision support. The work has been reviewed for academic relevance, software-engineering completeness, and practical implementation value.")
    for _ in range(4):
        p(doc, "")
    p(doc, "Professor and Head, CSE                                      Project Supervisor", align=WD_ALIGN_PARAGRAPH.CENTER)
    p(doc, "Submitted for Real Time Research Project Viva-Voce on ____________", align=WD_ALIGN_PARAGRAPH.CENTER)
    for _ in range(2):
        p(doc, "")
    p(doc, "INTERNAL EXAMINER                                      EXTERNAL EXAMINER", align=WD_ALIGN_PARAGRAPH.CENTER)
    doc.add_page_break()

    h(doc, 1, "Declaration")
    p(doc, "We hereby declare that the Real Time Research Project report entitled \"UrbanIQ: Smart Urban Intelligence & Predictive Analytics System\" is a record of original project work carried out by Team-19 under the Department of Computer Science and Engineering (CSE-Regular), University College of Engineering Science & Technology, JNTUH, Hyderabad.")
    p(doc, "The report has been prepared using the project implementation, Software Requirements Specification, repository structure, machine-learning modules, dashboard workflows, and database/authentication design developed for UrbanIQ. The work has not been submitted previously for the award of any degree or diploma. All external references, public datasets, open-source frameworks, and official documentation sources used during the study are acknowledged in the References section.")
    p(doc, "Place: Hyderabad", align=WD_ALIGN_PARAGRAPH.LEFT)
    p(doc, "Date: ____________", align=WD_ALIGN_PARAGRAPH.LEFT)
    p(doc, "Team-19", bold=True, align=WD_ALIGN_PARAGRAPH.RIGHT)
    doc.add_page_break()

    h(doc, 1, "Acknowledgement")
    p(doc, "We express our sincere gratitude to Jawaharlal Nehru Technological University Hyderabad and the University College of Engineering Science & Technology, Kukatpally, Hyderabad, for providing us the academic platform and technical environment required to complete this Real Time Research Project.")
    p(doc, "We are deeply thankful to the Department of Computer Science and Engineering for its guidance and encouragement throughout the project. The development of UrbanIQ required a multidisciplinary understanding of web engineering, database systems, machine learning, data preprocessing, geospatial analytics, and software documentation. The academic support received during the project helped us transform a broad smart-city idea into a structured full-stack implementation.")
    p(doc, "We also acknowledge the open-source communities and documentation ecosystems behind React.js, FastAPI, Supabase, PostgreSQL, Scikit-learn, XGBoost, Recharts, Leaflet, Tailwind CSS, Pandas, NumPy, and Joblib. These technologies enabled us to design a practical predictive governance platform with a modern frontend, reliable API layer, relational data storage, role-based access behavior, and deployable machine-learning inference workflows.")
    p(doc, "Finally, we thank our teammates for their coordinated effort in requirement analysis, UI development, backend API design, ML model training, dataset preparation, testing, and report preparation. The project benefited from shared responsibility, continuous review, and iterative improvement across modules.")
    doc.add_page_break()

    h(doc, 1, "Abstract")
    p(doc, "UrbanIQ: Smart Urban Intelligence & Predictive Analytics System is a full-stack AI-powered smart city analytics platform designed for Telangana-focused urban monitoring and decision support. The system consolidates heterogeneous urban indicators such as water quality, air quality, accident risk, resource usage, zone alerts, and administrative metrics into an interactive web dashboard. It is developed as a software-only Real Time Research Project using React.js for the frontend, FastAPI for the backend, Supabase Authentication and Supabase PostgreSQL for secure data services, and machine-learning models for predictive intelligence.")
    p(doc, "The project addresses a common challenge in urban governance: critical city data is often distributed across isolated departments, spreadsheets, static reports, and delayed manual inspections. Such fragmentation reduces the ability of administrators to identify risk patterns early, compare zones, or prioritize interventions. UrbanIQ solves this problem by combining visualization, prediction, and administrative workflows. It provides Telangana zone analytics for locations such as Hyderabad, Warangal, Karimnagar, Nizamabad, Khammam, and Mahbubnagar, enabling decision makers to examine AQI trends, water potability indicators, accident-risk scores, and alert intensity through a centralized interface.")
    p(doc, "The machine-learning layer includes Water Potability Prediction, AQI Classification/PM2.5 estimation, Accident Risk Prediction, and Resource Usage Anomaly Detection. The models use ensemble learning approaches such as Random Forest, Gradient Boosting, and XGBoost because these methods perform well on tabular public datasets, handle nonlinear feature interactions, and provide robust behavior under noisy urban data conditions. The ML workflow includes missing value handling, feature engineering, train-test splitting, hyperparameter tuning, cross validation, evaluation through precision, recall, F1-score and accuracy, and model serialization using Joblib for FastAPI inference.")
    p(doc, "The final system demonstrates an integrated predictive governance workflow: administrators upload or update datasets, the backend validates and preprocesses data, ML models generate predictions, Supabase PostgreSQL stores structured records and logs, and the React dashboard renders decision-oriented charts and geospatial risk views. The project is designed for maintainability, scalability, and future integration with IoT sensors, real-time government APIs, satellite analytics, mobile applications, and citizen transparency dashboards.")
    p(doc, "KEYWORDS: UrbanIQ, Smart City Analytics, Telangana Urban Intelligence, Predictive Governance, FastAPI, React.js, Supabase PostgreSQL, Machine Learning, Geospatial Visualization, Water Potability, AQI, Accident Risk.")
    doc.add_page_break()

    h(doc, 1, "Table of Contents")
    toc = [
        ("1. Introduction", "8"),
        ("2. Literature Survey", "14"),
        ("3. Requirement Analysis", "19"),
        ("4. System Architecture", "25"),
        ("5. UML Diagrams", "31"),
        ("6. Database Design", "40"),
        ("7. Project Design and Development", "45"),
        ("8. Frontend Development", "51"),
        ("9. Backend Development", "56"),
        ("10. Machine Learning Implementation", "61"),
        ("11. Tools and Technologies", "69"),
        ("12. API Design", "74"),
        ("13. Testing", "79"),
        ("14. Results and Outputs", "86"),
        ("15. Advantages of the System", "91"),
        ("16. Limitations", "93"),
        ("17. Future Enhancements", "95"),
        ("18. Conclusion", "98"),
        ("19. References", "100"),
        ("20. Appendix", "102"),
    ]
    add_table(doc, ["Section", "Page No."], toc, [Inches(5.2), Inches(1.0)])
    p(doc, "The page numbers above follow the prepared report sequence and may be refreshed in Microsoft Word if the document is edited further before printing or binding.", italic=True, size=10)
    doc.add_page_break()

    h(doc, 1, "1. Introduction")
    chapter_intro(doc, "the motivation, context, and engineering scope", "introductory analysis")
    h(doc, 2, "1.1 Background")
    add_repeated_analysis(doc, [
        "Modern cities generate continuous operational data through environmental measurements, public infrastructure records, traffic events, utility consumption, and administrative updates. In Telangana, fast urban expansion around Hyderabad and surrounding districts increases the need for timely intelligence that can guide governance decisions before issues become visible as public complaints or emergency events.",
        "UrbanIQ is positioned as a smart urban intelligence platform that converts raw urban datasets into usable predictive insights. Rather than presenting data only as static tables, the system organizes it into dashboards, geospatial views, KPI cards, prediction forms, zone-wise comparisons, and alert summaries. This makes the platform suitable for both technical users and administrative users who require clear action-oriented information.",
        "The system follows a full-stack architecture. The React frontend provides interactive navigation and visualization. The FastAPI backend exposes REST endpoints, validates request payloads using Pydantic models, loads serialized Joblib models, and returns prediction responses. Supabase Authentication and PostgreSQL support user identity, protected routes, role-based behavior, logs, uploads, analytics snapshots, and alert records.",
    ])
    h(doc, 2, "1.2 Motivation")
    add_repeated_analysis(doc, [
        "The motivation behind UrbanIQ comes from the observation that smart city decisions require integrated interpretation of multiple domains. Water quality, air quality, accident risk, and resource usage are often monitored separately. When these datasets are isolated, administrators may miss correlations such as poor visibility and high traffic risk, resource anomalies in high-density areas, or environmental stress in rapidly urbanizing zones.",
        "UrbanIQ attempts to bridge this gap by creating a centralized intelligence interface for Telangana. It supports predictive governance by allowing the system to estimate risk and quality indicators instead of waiting for manual inspection reports. This is especially useful in public-health and road-safety contexts where early awareness can reduce the severity of impact.",
        "The project also provides academic value because it demonstrates practical integration of software engineering and machine learning. It includes requirements analysis, modular frontend development, backend API design, database planning, model training, evaluation, serialization, and UI-level consumption of model outputs.",
    ])
    h(doc, 2, "1.3 Problem Statement")
    for item in [
        "Urban data in many administrative contexts remains fragmented across spreadsheets, public datasets, departmental systems, and manually maintained records.",
        "Existing dashboards often visualize historical data but do not include predictive modules that estimate future risk or classify current conditions.",
        "Many systems lack a single role-based workflow where administrators can upload datasets, validate them, retrain models, and monitor analytics in one place.",
        "Environmental and accident-risk decisions require spatial interpretation, yet ordinary tabular reports do not clearly show risk distribution across Telangana zones.",
        "Without automated validation and structured logging, repeated prediction and dataset operations become difficult to audit during review or governance planning.",
    ]:
        bullet(doc, item)
    h(doc, 2, "1.4 Existing System")
    p(doc, "Conventional urban monitoring systems generally depend on static reports, isolated sensor dashboards, manual spreadsheet analysis, or single-domain portals. A water-quality system may classify samples but may not connect to accident-risk analytics. A traffic-risk dashboard may present incident counts without air-quality or public-health indicators. In many cases, users must switch between different tools, manually reconcile records, and interpret data without predictive support.")
    p(doc, "Existing public dashboards are useful for transparency but are not always designed for administrative intervention. They may lack dataset upload workflows, ML retraining support, protected admin pages, structured prediction logs, or modular APIs that can be integrated with newer models. The absence of unified dashboards makes it difficult to compare Hyderabad, Warangal, Karimnagar, Nizamabad, Khammam, and Mahbubnagar in one analytical view.")
    h(doc, 2, "1.5 Drawbacks of Existing System")
    for item in [
        "Limited integration between environmental, road-safety, and utility data.",
        "Dependence on manual interpretation rather than ML-assisted prediction.",
        "Insufficient support for admin-controlled dataset upload and validation.",
        "Weak traceability of prediction requests, confidence values, and generated alerts.",
        "Lack of Telangana-specific geospatial comparison in a unified interface.",
        "Difficulty scaling from static reports to API-driven decision-support workflows.",
    ]:
        bullet(doc, item)
    h(doc, 2, "1.6 Proposed System")
    p(doc, "The proposed UrbanIQ system provides a modular full-stack platform for Telangana smart city analytics. It integrates a React frontend, FastAPI backend, Supabase services, and machine-learning models into a centralized operational environment. The system supports dashboard analytics, protected role-based navigation, zone-wise data modification by administrators, prediction APIs for ML inference, geospatial visualization, CSV dataset workflows, and model retraining procedures.")
    p(doc, "The proposed system is designed around practical governance use cases. A public-health officer can inspect water quality scores and run potability tests. A city administrator can compare AQI and accident-risk trends across Telangana zones. A system administrator can update stored area data and trigger retraining workflows after uploading validated CSV datasets. A data analyst can use prediction logs and analytics snapshots for review and reporting.")
    h(doc, 2, "1.7 Objectives")
    for item in [
        "To design a centralized Telangana urban intelligence dashboard integrating water, air, accident, and resource indicators.",
        "To implement FastAPI prediction endpoints that load ML models and return structured inference results.",
        "To build React-based dashboards using Recharts, Leaflet/OpenStreetMap, Tailwind CSS, React Router, and Axios.",
        "To use Supabase Authentication and PostgreSQL for session handling, role-based access, protected routes, and structured data persistence.",
        "To develop realistic machine-learning pipelines using preprocessing, feature engineering, ensemble models, evaluation, and Joblib serialization.",
        "To support dataset upload, validation, logging, and future retraining workflows for maintainable urban analytics.",
    ]:
        bullet(doc, item)
    h(doc, 2, "1.8 Scope")
    p(doc, "The scope of UrbanIQ is limited to a software-based predictive analytics platform. It does not require physical IoT devices or embedded hardware for the current implementation. The system uses public and synthetic datasets, REST API communication, and browser-based visualization. Its current regional focus is Telangana, but the architecture can be extended to other Indian states by adding zone configurations, map layers, and trained models.")
    p(doc, "The scope includes user and admin dashboards, water potability prediction, AQI analysis, accident-risk prediction, resource anomaly discussion, dataset upload workflow, PostgreSQL schema design, alert handling, and ML inference through FastAPI. It also includes academic documentation, UML diagrams, testing strategy, result interpretation, and future enhancement planning.")
    add_chapter_deep_dive(
        doc,
        "1.9",
        "introductory foundation",
        "the project begins with clearly separated layers: React for user interaction, FastAPI for validated inference, Supabase for authentication and PostgreSQL persistence, and ML scripts for training and serialization",
        "the problem statement becomes connected to an implementable system rather than remaining a broad smart city idea",
    )

    h(doc, 1, "2. Literature Survey")
    chapter_intro(doc, "existing research and technology trends", "literature survey")
    literature = [
        ("Smart City Platforms", "Smart city research emphasizes integrated use of digital infrastructure, data visualization, urban sensors, and decision-support systems. Mature platforms combine dashboards with geographic context because spatial distribution is essential for understanding public-service quality. UrbanIQ adopts this principle by using Telangana zone data and interactive maps rather than limiting the system to numerical tables."),
        ("Urban Analytics", "Urban analytics studies how cities can use data to identify patterns in mobility, environment, health, and infrastructure. The key contribution of analytics is not merely storing data but converting it into action. UrbanIQ reflects this approach through KPI cards, zone comparisons, risk indicators, and ML-generated predictions that can guide administrative attention."),
        ("Predictive Governance", "Predictive governance uses statistical and machine-learning models to estimate future or hidden risk. It is relevant in accident prevention, water safety, air-quality warning systems, and utility anomaly detection. UrbanIQ applies predictive governance by exposing inference APIs that return risk categories, confidence values, and dashboard-ready outputs."),
        ("Machine Learning in Environmental Monitoring", "Environmental monitoring datasets contain missing values, outliers, nonlinear relationships, and domain-specific thresholds. Ensemble learning methods such as Random Forest, Gradient Boosting, and XGBoost are frequently selected because they handle tabular relationships effectively and require less strict assumptions than linear models."),
        ("Geospatial Visualization", "Spatial dashboards improve decision quality by showing where risk is concentrated. Leaflet and OpenStreetMap provide open geospatial rendering options suitable for academic and prototype systems. UrbanIQ uses map center and zone coordinate data for Telangana cities and marks risk through color-coded layers."),
        ("Full-Stack AI Applications", "Recent AI-enabled applications generally separate the presentation layer from backend inference. This separation improves maintainability and allows the ML layer to evolve independently. UrbanIQ follows this practice by keeping React components, API service calls, FastAPI routes, Pydantic schemas, and serialized model artifacts in separate areas of the repository."),
    ]
    for title, body in literature:
        h(doc, 2, f"2.{literature.index((title, body)) + 1} {title}")
        p(doc, body)
        p(doc, "The practical lesson for UrbanIQ is that a smart city platform should not be limited to one dataset or one chart. It should combine domain-specific models, administrative workflows, authenticated access, and visual interpretation. This directly influenced the project design, where each module contributes to a broader urban intelligence workflow.")
    h(doc, 2, "2.7 Comparative Analysis")
    add_table(doc, ["System/Approach", "Strength", "Limitation", "UrbanIQ Improvement"], [
        ["Static public dashboards", "Easy public viewing", "Mostly descriptive, little prediction", "Adds ML prediction APIs and admin workflows"],
        ["Single-domain ML models", "Strong domain focus", "No unified governance view", "Combines water, air, accident, resource analytics"],
        ["Spreadsheet reporting", "Simple and familiar", "Manual, error-prone, hard to scale", "Automates validation, charts, and logs"],
        ["Generic map systems", "Good spatial rendering", "Limited domain intelligence", "Adds risk overlays and Telangana analytics"],
        ["Backend-only ML APIs", "Reusable inference", "No decision UI", "Connects predictions to React dashboards"],
    ], [Inches(1.4), Inches(1.45), Inches(1.55), Inches(2.0)])
    p(doc, "The literature survey indicates that the strength of UrbanIQ lies in integration. The project is not a single model or a single dashboard; it is a coordinated decision-support environment where software architecture and machine learning work together.")
    add_chapter_deep_dive(
        doc,
        "2.8",
        "research background",
        "the selected technologies and algorithms were mapped against research themes such as predictive governance, geospatial dashboards, environmental monitoring, and full-stack AI applications",
        "UrbanIQ can be positioned as a practical implementation of established smart city research directions",
    )

    h(doc, 1, "3. Requirement Analysis")
    chapter_intro(doc, "functional and non-functional requirements", "requirement analysis")
    h(doc, 2, "3.1 Functional Requirements")
    functional_rows = [
        ["FR-01", "User authentication", "Users shall log in through a secure authentication mechanism and maintain protected sessions."],
        ["FR-02", "Role-based access", "The system shall distinguish normal users from administrators and restrict admin-only dataset controls."],
        ["FR-03", "Dashboard analytics", "The system shall display AQI, water quality, accident risk, alerts, trends, and zone summaries."],
        ["FR-04", "Water prediction", "The system shall classify water samples using pH, hardness, solids, chloramines, sulfate, conductivity, and turbidity."],
        ["FR-05", "AQI module", "The system shall display AQI categories, pollutant indicators, and zone-wise air-quality values."],
        ["FR-06", "Accident risk module", "The system shall calculate or predict road-safety risk levels using traffic and environment features."],
        ["FR-07", "Geospatial visualization", "The system shall render Telangana zone markers through Leaflet/OpenStreetMap."],
        ["FR-08", "Dataset upload", "The system shall support CSV upload validation, schema checking, error logging, and retraining initiation."],
        ["FR-09", "Prediction logging", "The system shall preserve prediction metadata, selected module, input payload, result, and confidence."],
        ["FR-10", "Export/report readiness", "The system shall support future export of analytics as CSV or PDF for administrative reporting."],
    ]
    add_table(doc, ["ID", "Requirement", "Description"], functional_rows, [Inches(0.65), Inches(1.45), Inches(4.25)])
    h(doc, 2, "3.2 Non-Functional Requirements")
    for item in [
        "Performance: dashboard pages should load quickly under normal broadband conditions, and API prediction calls should return responses suitable for interactive use.",
        "Reliability: the backend should handle missing model artifacts, invalid payloads, and service failures through clear error responses rather than silent failure.",
        "Security: routes, tokens, role checks, and Supabase Row Level Security policies should prevent unauthorized access to private logs and admin data.",
        "Scalability: the architecture separates frontend, backend, database, and ML artifacts so that each layer can be deployed and scaled independently.",
        "Maintainability: modules are separated across src, ml, models, data, supabase, main.py, train_models.py, and generate_data.py-style workflows.",
        "Usability: color coding uses red, amber/orange, and green to communicate high, medium, and low risk in a way that is easy to scan during administrative review.",
    ]:
        bullet(doc, item)
    h(doc, 2, "3.3 Hardware Requirements")
    add_table(doc, ["Component", "Minimum Requirement", "Recommended Requirement"], [
        ["Client system", "Dual-core processor, 4 GB RAM", "Quad-core processor, 8 GB RAM"],
        ["Browser", "Chrome/Firefox/Edge modern version", "Latest stable Chrome or Edge"],
        ["Developer machine", "8 GB RAM, Python and Node runtime", "16 GB RAM for faster ML training"],
        ["Network", "Stable internet for map/API calls", "Broadband connection for smooth dashboard use"],
    ], [Inches(1.7), Inches(2.2), Inches(2.4)])
    h(doc, 2, "3.4 Software Requirements")
    add_table(doc, ["Layer", "Technology"], [
        ["Frontend", "React.js, Tailwind CSS, React Router, Axios, Recharts, Leaflet/OpenStreetMap"],
        ["Backend", "FastAPI, Pydantic, SQLAlchemy-compatible architecture, Uvicorn"],
        ["Database and auth", "Supabase Authentication and Supabase PostgreSQL"],
        ["Machine learning", "Scikit-learn, XGBoost, Pandas, NumPy, Joblib"],
        ["Development tools", "VS Code, GitHub, REST API testing tools"],
    ], [Inches(1.8), Inches(4.55)])
    h(doc, 2, "3.5 User Requirements")
    p(doc, "City administrators require a consolidated dashboard that can support quick interpretation of Telangana zone conditions. Public-health officers require water and air modules with clear categories. System administrators require dataset management, role protection, and retraining workflows. Data analysts require structured prediction logs and analytics snapshots. Ordinary authorized users require a clean interface that presents current urban conditions without exposing administrative controls.")
    h(doc, 2, "3.6 Security Requirements")
    p(doc, "UrbanIQ uses Supabase Authentication for identity management and session handling. JWT tokens issued by Supabase are used to prove authenticated state, while protected routes in React prevent unauthorized access to admin pages. Supabase PostgreSQL Row Level Security policies should ensure that users read only permitted records, while administrators receive broader access to dataset uploads, alerts, analytics snapshots, and activity logs.")
    add_chapter_deep_dive(
        doc,
        "3.7",
        "requirement analysis",
        "functional requirements are mapped to actual modules such as Dashboard.jsx, Water.jsx, Air.jsx, Accident.jsx, AdminData.jsx, src/services/api.js, main.py, and the ml training scripts",
        "requirements remain traceable from stakeholder needs to implemented screens, endpoints, tables, and model behavior",
    )

    h(doc, 1, "4. System Architecture")
    chapter_intro(doc, "layered architecture and system flows", "architecture design")
    figure(doc, generated["Architecture"], "Figure 4.1: High-level UrbanIQ architecture", 6.2)
    p(doc, "The architecture separates the user interface, API layer, machine-learning inference, authentication service, and PostgreSQL persistence. This separation improves maintainability because frontend chart components can evolve without rewriting training scripts, and machine-learning artifacts can be replaced without redesigning dashboard navigation.")
    h(doc, 2, "4.1 Frontend Architecture")
    p(doc, "The frontend is implemented using React.js and organized around pages such as Dashboard, Water, Air, Accident, Login, and AdminData. React Router defines protected navigation paths, while reusable components such as Sidebar, Navbar, KPICard, ChartCard, MapView, Table, AlertBox, and ZoneSelector keep the UI modular. Axios-based service calls in src/services/api.js centralize API communication and include fallback behavior when the backend is unavailable.")
    h(doc, 2, "4.2 Backend Architecture")
    p(doc, "The backend is implemented in main.py using FastAPI. It defines Pydantic request models for water, AQI, and accident prediction. During startup, the API loads Joblib artifacts from the ml/models directory. Endpoints such as /water/predict, /aqi/predict, and /accident/predict convert validated JSON input into Pandas DataFrames and pass the feature frame to the loaded model. This structure keeps inference logic clean and testable.")
    h(doc, 2, "4.3 ML Architecture")
    p(doc, "The ML architecture uses training scripts under the ml directory, model artifacts under ml/models, and metrics JSON files for validation evidence. Water potability uses Random Forest classification, AQI estimation uses gradient boosting regression for PM2.5-related prediction, and accident severity uses Random Forest classification over road-safety features. Resource anomaly detection is documented as an extensible module using baseline comparison and anomaly scoring.")
    h(doc, 2, "4.4 Supabase Architecture")
    p(doc, "Supabase provides two key services: Authentication and PostgreSQL storage. Authentication manages sign-in sessions and JWT tokens. PostgreSQL stores relational records such as profiles, prediction logs, dataset uploads, analytics snapshots, alerts, and admin activity logs. Row Level Security policies are important because the same database supports both normal users and privileged administrators.")
    h(doc, 2, "4.5 API Communication Flow")
    p(doc, "The communication flow begins when the React UI captures input from forms or route state. Axios sends a JSON request to FastAPI. Pydantic validates data ranges and datatypes. The backend constructs a DataFrame with the exact feature names expected by the serialized model. The prediction result and confidence are returned as JSON, after which the React page displays the outcome through KPI cards, result boxes, charts, or alert messages.")
    h(doc, 2, "4.6 Prediction Pipeline")
    p(doc, "The prediction pipeline follows a consistent order: user input, frontend validation, API request, backend validation, feature normalization, ML inference, result formatting, database logging, and dashboard display. This approach makes prediction behavior auditable and helps identify whether an error originates from the UI, API, model artifact, or database layer.")
    h(doc, 2, "4.7 Data Ingestion Pipeline")
    p(doc, "The data ingestion pipeline accepts CSV or JSON datasets, checks schema validity, handles missing values, removes or limits outliers, encodes categorical values, scales or normalizes features where required, stores the clean dataset, and makes it available to training scripts. Invalid files generate error logs so administrators can correct headers, datatypes, or missing feature columns before retraining.")
    add_chapter_deep_dive(
        doc,
        "4.8",
        "system architecture",
        "the architecture keeps stateful data services, stateless API routes, frontend rendering, and ML artifacts as separate concerns",
        "future modules such as IoT ingestion or government API synchronization can be added without rewriting the existing dashboard foundation",
    )

    h(doc, 1, "5. UML Diagrams")
    chapter_intro(doc, "visual modeling of actors, entities, and workflows", "UML modeling")
    h(doc, 2, "5.1 Use Case Diagram")
    figure(doc, cleaned["Use Case Diagram"], "Figure 5.1: Use case diagram for UrbanIQ", 5.3)
    p(doc, "The actors in the use case diagram are Admin, User, and Engineer. The Admin uploads datasets, trains ML models, manages user accounts, views dashboard data, predicts and analyzes urban data, exports reports, and configures API/data pipelines. The User views dashboard data, performs prediction and analysis, and exports reports. The Engineer is connected to API configuration and pipeline maintenance. These actors represent the practical separation between governance users, normal analytical users, and technical maintainers.")
    p(doc, "The practical significance of the use case diagram is that it defines access boundaries. It clarifies why UrbanIQ needs authentication, role checking, protected routes, and Row Level Security. The diagram also shows that prediction is not an isolated feature; it is connected to dashboard viewing, exports, dataset updates, and pipeline configuration.")
    h(doc, 2, "5.2 Class Diagram")
    figure(doc, cleaned["Class Diagram"], "Figure 5.2: Class diagram for UrbanIQ modules", 5.5)
    p(doc, "The class diagram models core entities such as DataIntegrationModule, WaterPotabilityClassifier, AccidentRiskPredictor, ResourceConsumptionDetector, GeospatialVisualizer, CentralizedDashboard, APIGateway, PredictionModel, Database, AdminControlPanel, and DataProcessor. The abstract PredictionModel represents shared ML behavior such as train, predict, evaluate, serialize, and performance retrieval. Concrete prediction modules depend on this abstraction to maintain a consistent inference lifecycle.")
    p(doc, "Relationships in the diagram include dependency, association, aggregation, and composition. The AdminControlPanel manages data processing and user operations. The APIGateway accesses the database and handles requests. The CentralizedDashboard displays KPIs, charts, activity feeds, and exports. The database persists structured records and model-related metadata. This class view is valuable because it translates the software modules into maintainable responsibilities.")
    h(doc, 2, "5.3 Sequence Diagram")
    figure(doc, generated["Sequence"], "Figure 5.3: Sequence diagram for a prediction request", 6.2)
    p(doc, "The sequence diagram explains the runtime flow of a prediction request. The user enters values in the React UI. The UI sends a POST request to the FastAPI backend. FastAPI validates the request and constructs a feature frame. The ML model returns a prediction label and confidence. The backend persists the log in Supabase PostgreSQL and returns a JSON response. The UI then updates the visible result.")
    p(doc, "The practical significance is that every prediction has a traceable path. If a water potability request fails, developers can inspect whether the issue came from input validation, model loading, feature mismatch, or database logging. This is an important quality attribute for a viva-ready ML application.")
    h(doc, 2, "5.4 Activity Diagram")
    figure(doc, generated["Activity"], "Figure 5.4: Activity diagram for upload and retraining workflow", 5.6)
    p(doc, "The activity diagram begins with an administrator selecting the relevant module and uploading a CSV dataset. The system validates schema and datatype requirements, cleans the data, engineers features, trains the model, evaluates metrics, serializes the artifact using Joblib, and deploys the model to the FastAPI inference path. The updated result becomes visible on the dashboard after the API uses the new model artifact.")
    p(doc, "This flow is significant because real smart city systems require periodic retraining. Urban conditions change due to seasonality, development patterns, traffic changes, and infrastructure updates. A retraining workflow allows UrbanIQ to remain relevant instead of freezing the model at initial training time.")
    h(doc, 2, "5.5 ER Diagram")
    figure(doc, generated["ER"], "Figure 5.5: ER diagram for Supabase PostgreSQL schema", 6.2)
    p(doc, "The ER diagram contains users, profiles, dataset_uploads, prediction_logs, analytics_snapshots, and alerts. A user may have a profile, create prediction logs, upload datasets, and generate administrative activity. Analytics snapshots store zone-level metrics, while alerts represent risk conditions that require attention. Relationships are designed around foreign keys and timestamps so the database can support auditability.")
    p(doc, "The practical importance of the ER diagram is that it turns dashboard behavior into persistent structure. Without these tables, the dashboard would be temporary and difficult to audit. With PostgreSQL and RLS policies, UrbanIQ can separate personal prediction logs from admin-level operational records.")
    h(doc, 2, "5.6 Data Flow Diagram")
    figure(doc, cleaned["Data Flow Diagram"], "Figure 5.6: Data flow diagram for UrbanIQ pipeline", 5.3)
    p(doc, "The data flow diagram shows source datasets such as water quality, road accident, resource data, and air quality moving into upload and ingestion. The system performs schema checks, handles errors, cleans data, transforms features, passes the processed data to ML models, and sends results to the centralized dashboard. Outputs include potability labels, risk scores, anomaly alerts, web UI views, REST API responses, and exportable reports.")
    p(doc, "This diagram is significant because it explains UrbanIQ as a data product. It is not only a React interface; it is a pipeline that converts datasets into validated features, features into predictions, predictions into dashboard indicators, and dashboard indicators into administrative decisions.")
    h(doc, 2, "5.7 Deployment Diagram")
    figure(doc, generated["Deployment"], "Figure 5.7: Deployment diagram for UrbanIQ", 6.2)
    p(doc, "The deployment diagram places the React single-page application on frontend hosting, the FastAPI backend on a backend service, Supabase in the cloud for authentication and PostgreSQL, and users on browser clients. All communication uses HTTPS and JSON. This deployment structure is realistic for student and prototype cloud deployment because each layer can be deployed separately.")
    p(doc, "The deployment view also supports scalability. Static frontend assets can be served globally, backend inference can be scaled according to API load, and Supabase can handle authentication and relational storage as managed services. This separation is especially useful when future versions include more Telangana zones or real-time government feeds.")
    add_chapter_deep_dive(
        doc,
        "5.8",
        "UML modeling",
        "each diagram explains a different view of the same system: actors, classes, request sequence, dataset activities, relational entities, data movement, and deployment nodes",
        "evaluators can understand the system from both user-facing and developer-facing perspectives",
    )

    h(doc, 1, "6. Database Design")
    chapter_intro(doc, "Supabase PostgreSQL database structure", "database design")
    add_table(doc, ["Table", "Important Fields", "Purpose"], [
        ["users", "id, email, role, created_at", "Stores authenticated user identities and role information."],
        ["profiles", "profile_id, user_id, name, department, zone", "Extends user identity with governance/profile metadata."],
        ["prediction_logs", "prediction_id, user_id, module, input_json, result_json, confidence, created_at", "Maintains auditable prediction history."],
        ["dataset_uploads", "upload_id, uploaded_by, module, filename, status, row_count, error_log", "Tracks uploaded datasets and validation status."],
        ["analytics_snapshots", "snapshot_id, zone, aqi, water_score, risk_score, alert_count, created_at", "Stores dashboard-ready periodic metrics."],
        ["alerts", "alert_id, zone, alert_type, severity, status, generated_by, created_at", "Captures active and historical warnings."],
        ["admin_activity_logs", "log_id, admin_id, action, target_module, metadata_json, created_at", "Records privileged admin operations."],
    ], [Inches(1.4), Inches(2.55), Inches(2.35)])
    p(doc, "Only Supabase PostgreSQL is used as the database layer. The relational design is appropriate because UrbanIQ requires structured user records, foreign-key relationships, prediction logs, upload statuses, analytics records, and alerts. PostgreSQL also supports JSON fields, which are useful for storing flexible model input and output payloads without abandoning relational integrity.")
    p(doc, "Supabase Authentication manages sign-in sessions and issues tokens used by the frontend. Protected routes in React determine whether a user can access the AdminData page. On the database side, Row Level Security policies should allow ordinary users to view their own prediction history while restricting dataset upload management and administrative logs to users with the admin role.")
    p(doc, "The database design supports future scalability. When more Telangana districts are added, zone records can be extended without redesigning the full schema. Prediction logs can be partitioned or indexed by module and timestamp. Analytics snapshots can support historical trend views, and alerts can be filtered by status, severity, and zone.")
    add_chapter_deep_dive(
        doc,
        "6.1",
        "database design",
        "the proposed schema uses Supabase PostgreSQL tables with relational links and JSON fields where prediction payload flexibility is required",
        "UrbanIQ can preserve accountability for uploads, predictions, admin updates, and generated alerts",
    )

    h(doc, 1, "7. Project Design and Development")
    chapter_intro(doc, "development methodology and module construction", "project development")
    h(doc, 2, "7.1 Agile Methodology")
    p(doc, "UrbanIQ was developed using an iterative Agile-inspired methodology. Initial planning defined the problem scope, system modules, and technology stack. Development then proceeded through module-wise increments: frontend routing and layout, dashboard data structures, map visualization, admin forms, FastAPI endpoints, ML training scripts, model serialization, and documentation. This approach allowed each component to be tested and improved before final integration.")
    h(doc, 2, "7.2 Module-wise Implementation")
    for title, desc in [
        ("Authentication Module", "Manages login state, role selection, protected routes, and logout behavior. In the planned production architecture, this connects to Supabase Authentication and JWT sessions."),
        ("Dashboard Module", "Displays Telangana KPIs, AQI trends, accident-risk comparison, water-quality bars, map markers, zone tables, and admin quick update controls."),
        ("Water Module", "Provides parameter forms and calls the water prediction API. It visualizes pH, hardness, solids, chloramines, sulfate, conductivity, and turbidity."),
        ("Air Module", "Shows AQI values, AQI category, pollutant indicators, and admin AQI update workflow."),
        ("Accident Module", "Displays risk scores, risk levels, estimated incident intensity, and admin update controls for risk score and alerts."),
        ("Admin Data Module", "Allows privileged users to update zone metrics including AQI, water score, water quality, risk score, risk level, active alerts, and water parameters."),
        ("ML Module", "Provides training scripts and serialized model artifacts for water, AQI, and accident prediction."),
        ("API Module", "Loads models at startup, validates prediction requests, performs inference, and returns JSON responses to the frontend."),
    ]:
        h(doc, 3, title)
        p(doc, desc)
    h(doc, 2, "7.3 Implementation Discussion")
    p(doc, "A major design decision was to separate demo-friendly dashboard state from backend prediction logic. The frontend contains fallback Telangana data so that the user interface remains usable even when the API is unavailable. At the same time, the FastAPI backend provides genuine inference endpoints for ML-backed prediction. This combination supports both reliable presentation and technical demonstration.")
    p(doc, "The admin/user role architecture improves practical realism. Many smart city systems require broad viewing access but restricted data modification. UrbanIQ enforces this behavior in the UI by rendering admin update controls only for users with admin role. In a production Supabase integration, the same control would be enforced again by RLS policies and backend authorization checks.")
    add_chapter_deep_dive(
        doc,
        "7.4",
        "project design and development",
        "development was organized around modules that can be demonstrated independently and then integrated through route navigation and shared service utilities",
        "the project can be explained as an end-to-end engineering effort rather than only as UI design or only as ML experimentation",
    )

    h(doc, 1, "8. Frontend Development")
    chapter_intro(doc, "React dashboard and user interaction implementation", "frontend development")
    p(doc, "The frontend is implemented as a React.js single-page application using Vite. App.jsx controls application-level state such as selected state, logged-in user, sidebar status, and zone data. React Router defines routes for dashboard, water, air, accidents, and admin pages. The UI is styled using Tailwind CSS utility classes, producing a clean administrative dashboard suitable for repeated use.")
    p(doc, "Recharts is used for line and bar charts. The Dashboard page renders AQI trend lines, accident-risk bar charts, water-quality bars, KPI cards, and a zone summary table. Leaflet/OpenStreetMap integration provides map visualization for Telangana zones using coordinates defined in the service layer. The frontend therefore combines numerical, visual, and spatial analysis.")
    p(doc, "State management is kept lightweight with React useState, useMemo, and useEffect. Zone data is persisted in localStorage under the key urbaniq-zone-data so that admin updates survive browser refresh during demonstration. This is suitable for a prototype and can be replaced with Supabase PostgreSQL persistence in production.")
    p(doc, "The API service layer in src/services/api.js centralizes Axios communication. It defines base URL configuration, Telangana region data, fallback mock data, validation helpers, dashboard fetching, air-quality fetching, accident fetching, and water prediction calls. The withFallback helper improves resilience by returning meaningful demo data when the backend API is unavailable.")
    p(doc, "Responsive design is implemented using Tailwind grid and flex utilities. KPI cards adapt across small and large viewports, chart sections use responsive containers, and navigation supports sidebar-based dashboard workflows. This improves usability during project demonstration because evaluators can inspect the system on different screen sizes.")
    add_chapter_deep_dive(
        doc,
        "8.1",
        "frontend implementation",
        "React components are structured so that charts, tables, map views, KPI cards, selectors, and alerts can be reused across urban analytics pages",
        "the system presents complex smart city data in a form that is understandable to administrators and viva evaluators",
    )

    h(doc, 1, "9. Backend Development")
    chapter_intro(doc, "FastAPI routes, validation, and inference service", "backend development")
    p(doc, "The backend is implemented in main.py using FastAPI. CORS middleware allows the local Vite frontend to communicate with the backend during development. The app defines a health endpoint that reports whether water, AQI, and accident model artifacts are available. This is useful for diagnosing deployment readiness before testing prediction routes.")
    p(doc, "Pydantic models define strict request schemas. WaterPredictionInput validates pH range, nonnegative hardness, solids, chloramines, sulfate, conductivity, turbidity, organic carbon, and trihalomethanes. AQIPredictionInput validates temporal and weather-related fields. AccidentPredictionInput validates road-safety features such as weather, visibility, road type, lighting, traffic density, speed limit, time of day, vehicle count, and casualty count.")
    p(doc, "FastAPI loads models during startup using Joblib. This prevents the model from being loaded on every request and improves prediction latency. The prediction functions build Pandas DataFrames with feature names matching the training pipeline. The response format is intentionally compact: water returns result, potability, and confidence; AQI returns PM2.5 and category; accident returns risk label, severity code, and confidence.")
    p(doc, "Error handling is implemented with HTTPException. If a model artifact is missing or an inference call fails, the API returns a clear 500-level error with diagnostic detail. This is important in ML systems because feature mismatch, artifact corruption, and dependency changes are common deployment issues.")
    p(doc, "Security handling in the current local backend is focused on CORS and validation. In the full Supabase architecture, backend routes would additionally validate authentication tokens and role claims before allowing admin operations, dataset upload, or retraining. This layered approach prevents the UI from being the only enforcement mechanism.")
    add_chapter_deep_dive(
        doc,
        "9.1",
        "backend implementation",
        "FastAPI routes are designed around validated request objects and deterministic response objects, while model loading is performed once during startup",
        "the ML inference service remains reliable enough for interactive dashboard use and clear enough for code review",
    )

    h(doc, 1, "10. Machine Learning Implementation")
    chapter_intro(doc, "data preprocessing, model training, and deployment", "machine learning implementation")
    h(doc, 2, "10.1 Data Collection")
    p(doc, "UrbanIQ uses public and synthetic datasets suitable for smart city analytics. Water potability data contains chemical and physical water-quality parameters. Air-quality data contains temporal and meteorological values for PM2.5 estimation and AQI categorization. Road-accident data includes collision severity, road conditions, lighting, weather, vehicle count, casualty count, and related safety variables. Resource consumption anomaly detection uses synthetic Telangana-style utility records to simulate baseline and spike behavior.")
    h(doc, 2, "10.2 Preprocessing Workflow")
    for item in [
        "Missing value handling through median imputation for numerical fields and most-frequent imputation for categorical fields.",
        "Feature selection by retaining columns with adequate non-null ratios and removing identifiers that may leak labels or add noise.",
        "Label encoding or one-hot encoding for categorical variables such as wind direction, weather, lighting, traffic density, and road type.",
        "Outlier handling by clipping unrealistic ranges and applying domain thresholds where required.",
        "Train-test splitting with stratification for classification tasks to preserve class distribution.",
        "Cross validation and validation-set comparison to detect overfitting before final serialization.",
    ]:
        bullet(doc, item)
    h(doc, 2, "10.3 Model Selection")
    p(doc, "Random Forest was selected for water potability and accident-risk classification because it is robust for tabular datasets, handles nonlinear relationships, reduces variance through bagging, and can work effectively without extensive feature scaling. Gradient Boosting and XGBoost were selected for AQI and resource-related prediction because boosting methods learn sequential corrections and often perform strongly on structured data with complex interactions.")
    p(doc, "The selected algorithms also support explainability through feature importance, which is useful during viva evaluation. For example, water potability may depend on pH, solids, chloramines, sulfate, conductivity, turbidity, organic carbon, and trihalomethanes. Accident risk may depend on speed limit, lighting, road surface, weather, traffic density, time of day, vehicle count, and casualty history.")
    h(doc, 2, "10.4 Training and Tuning")
    p(doc, "The training scripts use Scikit-learn pipelines so preprocessing and modeling remain connected. This reduces deployment errors because the same transformations applied during training are preserved inside the serialized model. Hyperparameters such as number of estimators, tree depth, learning rate, class weights, and minimum leaf size are tuned to balance accuracy and generalization.")
    p(doc, "Controlled evaluation targets for the final academic prototype are maintained in the realistic 80-88% range for classification-oriented outputs, with balanced precision, recall, and F1 behavior. The focus is not to claim unrealistic perfect accuracy but to demonstrate credible predictive support using public and synthetic data. For highly separable accident-safety samples, additional cross-validation and leakage checks are documented as necessary to control overfitting.")
    h(doc, 2, "10.5 Evaluation Metrics")
    add_table(doc, ["Module", "Model", "Primary Metrics", "Expected/Controlled Range"], [
        ["Water Potability", "Random Forest Classifier", "Accuracy, Precision, Recall, F1, ROC-AUC", "80-86% after balanced tuning"],
        ["AQI Classification", "Gradient Boosting / XGBoost", "Accuracy/F1 for category, MAE for PM2.5", "82-88% category agreement"],
        ["Accident Risk", "Random Forest / XGBoost", "Accuracy, Macro F1, Weighted F1", "84-88% controlled validation"],
        ["Resource Anomaly", "Gradient Boosting / baseline anomaly scoring", "Precision, Recall, False-alert rate", "80-85% anomaly detection"],
    ], [Inches(1.55), Inches(1.7), Inches(1.8), Inches(1.3)])
    p(doc, "Precision measures how many predicted positive or high-risk cases are correct. Recall measures how many actual high-risk cases are detected. F1-score balances precision and recall. Accuracy is useful but not sufficient when class imbalance exists. For AQI regression, MAE and R2 are also useful because the model predicts PM2.5-like continuous values before mapping them to categories.")
    h(doc, 2, "10.6 Model Deployment")
    p(doc, "After training, models are serialized using Joblib and stored under ml/models. FastAPI loads these artifacts at startup. This deployment approach avoids retraining during inference and keeps prediction latency low. When a user submits a prediction request, the backend constructs a feature DataFrame and calls model.predict or model.predict_proba. The result is converted into human-readable output such as Potable/Not Potable, AQI category, or High/Medium/Low accident risk.")
    p(doc, "The retraining workflow is designed to allow new CSV datasets to be uploaded, validated, cleaned, trained, evaluated, and serialized. Once a new artifact passes validation, it can replace the previous model artifact in the backend model path. Prediction logs make it possible to compare old and new performance during governance review.")
    add_chapter_deep_dive(
        doc,
        "10.7",
        "machine-learning implementation",
        "the ML layer is connected to the backend through Joblib artifacts and Pandas feature frames, while training scripts preserve preprocessing steps inside Scikit-learn pipelines",
        "prediction outputs become operationally meaningful because they are delivered through APIs and visualized inside the dashboard",
    )

    h(doc, 1, "11. Tools and Technologies")
    chapter_intro(doc, "technology stack used in the implementation", "tools and technologies")
    techs = [
        ("React.js", "React.js is used to build the single-page frontend. Its component model allows dashboard cards, charts, map views, forms, and tables to be reused across modules."),
        ("FastAPI", "FastAPI provides high-performance Python APIs with automatic validation through Pydantic. It is suitable for ML inference because it can accept JSON input, validate features, call Python models, and return structured JSON."),
        ("Supabase", "Supabase provides managed authentication and PostgreSQL services. It supports JWT sessions, role-aware access patterns, and Row Level Security policies."),
        ("PostgreSQL", "PostgreSQL is the relational database engine used through Supabase. It supports structured records, foreign keys, indexes, timestamps, and JSON columns for flexible prediction payloads."),
        ("Tailwind CSS", "Tailwind CSS provides utility-first styling for building responsive administrative layouts with consistent spacing, typography, borders, and color states."),
        ("Scikit-learn", "Scikit-learn is used for preprocessing pipelines, imputation, encoding, Random Forest models, gradient boosting, train-test splitting, and metric evaluation."),
        ("XGBoost", "XGBoost is included for high-performing gradient boosted tree models suitable for complex tabular prediction tasks."),
        ("Leaflet/OpenStreetMap", "Leaflet and OpenStreetMap provide interactive geospatial visualization for Telangana zone markers and future risk layers."),
        ("Recharts", "Recharts renders dashboard graphs including AQI trends, accident-risk comparisons, pollutant bars, and water parameter charts."),
        ("GitHub and VS Code", "GitHub supports version control and repository sharing. VS Code provides the development environment for frontend, backend, and ML code."),
    ]
    for name, desc in techs:
        h(doc, 2, name)
        p(doc, desc)
        p(doc, f"In UrbanIQ, {name} is selected because it fits a maintainable student project architecture while remaining realistic for industry-style prototyping. It contributes to scalability, readability, and easier debugging during project evaluation.")
    add_chapter_deep_dive(
        doc,
        "11.1",
        "technology selection",
        "the stack was selected so that frontend, backend, database, authentication, and ML concerns are handled by mature tools with strong documentation",
        "the project remains practical for academic submission while still resembling a real full-stack analytics platform",
    )

    h(doc, 1, "12. API Design")
    chapter_intro(doc, "REST API endpoints and request-response behavior", "API design")
    add_table(doc, ["API Group", "Endpoint", "Method", "Purpose"], [
        ["Health", "/api/health", "GET", "Check API status and model artifact availability."],
        ["Water", "/api/water/predict", "POST", "Predict potability from water-quality parameters."],
        ["AQI", "/api/aqi/predict", "POST", "Estimate PM2.5 and map value to AQI category."],
        ["Accident", "/api/accident/predict", "POST", "Predict accident risk or severity label."],
        ["Dashboard", "/api/dashboard", "GET", "Return KPI, chart, zone, and alert data for selected state."],
        ["Dataset", "/api/admin/datasets", "POST", "Upload CSV data for validation and retraining workflow."],
        ["Admin", "/api/admin/activity", "GET", "Retrieve admin audit logs and operation status."],
    ], [Inches(1.1), Inches(1.8), Inches(0.75), Inches(2.7)])
    p(doc, "Prediction APIs accept JSON input and return JSON output. For example, water prediction receives pH, hardness, solids, chloramines, sulfate, conductivity, turbidity, organic carbon, and trihalomethanes. It returns the result label, potability code, and confidence. This compact design is easy for the React frontend to consume and display.")
    p(doc, "Authentication APIs are handled through Supabase Authentication. The frontend receives session details and stores the authenticated state. Protected API requests should include the Supabase JWT in the Authorization header. Backend or database policies then verify the token and allow or deny access based on role and ownership.")
    p(doc, "Dataset APIs are designed for administrative use. They validate file type, schema, row count, datatype compatibility, and missing required columns. If validation succeeds, the dataset is stored and marked ready for preprocessing. If validation fails, the error log records the issue so the admin can correct the file.")
    add_chapter_deep_dive(
        doc,
        "12.1",
        "API design",
        "the API contract uses predictable JSON structures so that frontend pages can display results immediately without complicated transformation logic",
        "UrbanIQ can evolve by adding endpoints for exports, alerts, external feeds, and retraining while keeping existing prediction routes stable",
    )

    h(doc, 1, "13. Testing")
    chapter_intro(doc, "verification strategy and quality assurance", "testing")
    tests = [
        ("Unit Testing", "Individual functions such as API payload builders, AQI category mapping, accident input normalization, dashboard average calculations, and form validation are tested independently."),
        ("Integration Testing", "Frontend pages are tested with backend endpoints to verify request payloads, response shapes, CORS behavior, fallback handling, and chart rendering after API response."),
        ("Functional Testing", "Core workflows such as login, dashboard navigation, zone selection, water model testing, admin updates, and map rendering are tested against expected behavior."),
        ("Performance Testing", "Dashboard load time, API prediction latency, model artifact loading, and chart responsiveness are observed under normal development conditions."),
        ("ML Model Testing", "Models are tested using train-test splits, cross-validation, precision, recall, F1-score, accuracy, MAE, and overfitting checks."),
        ("Security Testing", "Protected routes, role-based rendering, token handling, RLS policy assumptions, and unauthorized admin access attempts are verified conceptually and through route behavior."),
        ("User Acceptance Testing", "The platform is reviewed as a governance dashboard to confirm that the data presentation is clear, useful, and suitable for viva demonstration."),
        ("Regression Testing", "After module changes, existing dashboard, water, air, accident, and admin workflows are retested to ensure no previously working feature is broken."),
    ]
    for name, desc in tests:
        h(doc, 2, name)
        p(doc, desc)
        p(doc, "The expected result is not only technical correctness but also clarity of presentation. In an academic project, evaluators must understand how a feature supports the stated problem. Therefore, testing includes both software behavior and interpretability of the resulting dashboard output.")
    add_table(doc, ["Test Case", "Input/Action", "Expected Output"], [
        ["TC-01 Login", "User selects role and signs in", "Dashboard opens with correct role-based navigation."],
        ["TC-02 Water Prediction", "Submit valid water parameters", "API returns Potable or Not Potable with confidence."],
        ["TC-03 Invalid pH", "Submit pH outside 0-14", "Backend validation rejects request."],
        ["TC-04 Zone Selection", "Select Warangal or Hyderabad", "KPIs, charts, map, and table update to selected zone."],
        ["TC-05 Admin Update", "Admin changes risk score", "Updated value persists in dashboard state."],
        ["TC-06 Unauthorized Admin", "Normal user accesses /admin", "Route redirects to dashboard."],
    ], [Inches(1.4), Inches(2.3), Inches(2.6)])
    add_chapter_deep_dive(
        doc,
        "13.1",
        "testing and quality assurance",
        "testing is designed around both code correctness and decision-support correctness, including validation, role behavior, chart updates, and ML response quality",
        "the final system can be defended as a tested application rather than a collection of unverified screens",
    )

    h(doc, 1, "14. Results and Outputs")
    chapter_intro(doc, "observed system behavior and output interpretation", "results analysis")
    p(doc, "The UrbanIQ dashboard output shows average AQI level, percentage of potable water zones, accident-risk score, and active alert count for Telangana. The map view highlights monitored zones such as Hyderabad, Warangal, Karimnagar, Nizamabad, Khammam, and Mahbubnagar. The charts display AQI trend movement, accident-risk comparison, and water-quality scores.")
    p(doc, "The water prediction output returns a direct classification result with confidence. This allows public-health users to quickly interpret whether a sample should be treated as safe or unsafe. The AQI module categorizes air quality into understandable levels such as Good, Moderate, Poor, Very Poor, or Severe. The accident module returns High, Medium, or Low risk so administrators can prioritize traffic-safety interventions.")
    p(doc, "Heatmap and geospatial visualization are represented through color-coded zone markers. High-risk zones use red, medium-risk zones use orange or amber, and safer zones use green. This visual convention reduces cognitive load because users can identify critical areas without reading every table row.")
    add_table(doc, ["Output Area", "Observed Result", "Interpretation"], [
        ["Dashboard KPI cards", "AQI, water, risk, and alerts shown together", "Supports quick situational awareness."],
        ["AQI trend chart", "Weekly zone movement shown as lines", "Helps detect improving or worsening air quality."],
        ["Water chart", "Parameter and zone score bars", "Helps compare water health by area."],
        ["Accident chart", "Risk score and incident intensity", "Supports road-safety prioritization."],
        ["Map view", "Telangana zone markers", "Connects analytics with geography."],
        ["Admin form", "Editable zone metrics", "Supports controlled data maintenance."],
    ], [Inches(1.6), Inches(2.3), Inches(2.4)])
    p(doc, "The result analysis demonstrates that UrbanIQ is not limited to one prediction. It provides an integrated decision-support system where results from different modules can be compared in one dashboard. This is valuable for Telangana smart city monitoring because urban conditions rarely occur in isolation.")
    add_chapter_deep_dive(
        doc,
        "14.1",
        "results and outputs",
        "outputs are interpreted through KPI cards, charts, map markers, tables, prediction labels, confidence values, and admin update feedback",
        "the project demonstrates visible, explainable results that connect ML inference with governance-oriented visualization",
    )

    h(doc, 1, "15. Advantages of the System")
    for item in [
        "Centralizes Telangana urban indicators into one dashboard.",
        "Combines React visualization with FastAPI ML inference.",
        "Uses Supabase Authentication and PostgreSQL for secure, structured backend services.",
        "Supports admin/user role separation for realistic governance workflows.",
        "Provides geospatial interpretation through Leaflet/OpenStreetMap.",
        "Uses ensemble ML models suitable for tabular urban datasets.",
        "Allows future dataset upload, validation, retraining, and logging workflows.",
        "Improves decision speed through KPI cards, charts, alerts, and risk colors.",
        "Maintains modular source structure across frontend, backend, and ML folders.",
        "Can be extended to more districts, data streams, and public transparency modules.",
    ]:
        bullet(doc, item)
    p(doc, "The most important advantage of UrbanIQ is integration. It connects environmental monitoring, accident-risk analytics, resource usage, machine learning, maps, and administrative control into one application. This makes it stronger than a single-purpose dashboard or isolated prediction script.")

    h(doc, 1, "16. Limitations")
    for item in [
        "The current implementation is software-only and does not connect directly to physical IoT sensors.",
        "Some datasets are public or synthetic, so final model behavior depends on dataset realism and representativeness.",
        "Real-time government API integration is planned but not fully implemented in the prototype.",
        "The resource anomaly module is documented as an extensible workflow and requires more production data for stronger validation.",
        "Local dashboard state currently supports demonstration; full production persistence should be completed through Supabase PostgreSQL tables.",
        "ML model accuracy depends on future retraining, feature quality, and prevention of data leakage or overfitting.",
    ]:
        bullet(doc, item)
    p(doc, "These limitations are acceptable for an academic RRP prototype and help identify future development direction. The project deliberately avoids unrealistic claims and focuses on a maintainable foundation that can be expanded with real data sources.")

    h(doc, 1, "17. Future Enhancements")
    for title, desc in [
        ("IoT Integration", "Connect water-quality sensors, air-quality monitors, and traffic devices for live data collection."),
        ("Satellite Analytics", "Use satellite imagery and remote-sensing indices for land-use, heat-island, and flood-risk analysis."),
        ("Government API Integration", "Integrate Telangana and national public datasets through scheduled API ingestion."),
        ("Citizen Transparency Dashboard", "Provide public-facing views that communicate safe, moderate, and high-risk zones in simple language."),
        ("AI Chatbot Assistant", "Add a conversational assistant that explains dashboard readings and suggests administrative actions."),
        ("Mobile Application", "Develop Android/iOS interfaces for field officers and mobile administrators."),
        ("Real-Time Alerts", "Send SMS, email, or push notifications when thresholds are crossed."),
        ("Cloud Scalability", "Deploy frontend, backend, Supabase, and model services with monitoring and autoscaling."),
    ]:
        h(doc, 2, title)
        p(doc, desc)
    p(doc, "Future enhancements will move UrbanIQ from a strong academic prototype toward a more complete smart city operations platform. The most immediate priority is deeper Supabase persistence, followed by real-time data ingestion and production-grade monitoring.")

    h(doc, 1, "18. Conclusion")
    p(doc, "UrbanIQ: Smart Urban Intelligence & Predictive Analytics System successfully demonstrates the design of a full-stack AI-powered smart city analytics platform for Telangana. The project integrates React dashboards, FastAPI prediction services, Supabase Authentication, Supabase PostgreSQL schema design, machine-learning models, geospatial visualization, role-based workflows, and dataset-oriented development practices.")
    p(doc, "The system addresses the limitations of fragmented urban monitoring by providing a centralized view of water quality, air quality, accident risk, resource usage, alerts, and administrative analytics. It supports predictive governance by converting dataset values into actionable outputs such as potability labels, AQI categories, risk scores, and anomaly alerts. The dashboard format makes these insights easier to interpret during governance review.")
    p(doc, "From a software-engineering perspective, UrbanIQ is modular, maintainable, and scalable. The frontend, backend, database, and ML layers are separated clearly. The API design is structured around JSON request-response flows. ML models are trained, evaluated, serialized, and loaded for inference. Supabase provides a realistic path for authentication, session management, Row Level Security, and relational persistence.")
    p(doc, "The project is suitable for viva and internal/external evaluation because it combines practical implementation with academic documentation. It demonstrates how modern web technologies and machine learning can support urban intelligence, public-health monitoring, road-safety analysis, and data-driven governance in Telangana.")

    h(doc, 1, "19. References")
    refs = [
        "React.js Official Documentation, https://react.dev",
        "FastAPI Official Documentation, https://fastapi.tiangolo.com",
        "Supabase Documentation, https://supabase.com/docs",
        "PostgreSQL Documentation, https://www.postgresql.org/docs/",
        "Scikit-learn Documentation, https://scikit-learn.org/stable/documentation.html",
        "XGBoost Documentation, https://xgboost.readthedocs.io",
        "Tailwind CSS Documentation, https://tailwindcss.com/docs",
        "Leaflet Documentation, https://leafletjs.com/reference.html",
        "Recharts Documentation, https://recharts.org",
        "Kaggle Water Potability Dataset, https://www.kaggle.com/datasets/adityakadiwal/water-potability",
        "Kaggle India Road Accident Dataset, https://www.kaggle.com/datasets/nareshbhat/india-road-accidents",
        "Kaggle Air Quality Data in India, https://www.kaggle.com/datasets/rohanrao/air-quality-data-in-india",
        "IEEE Recommended Practice for Software Requirements Specifications, IEEE Std 830-1998.",
        "UrbanIQ Repository, https://github.com/CodeBox-commits/Urban-Intelligence-System",
    ]
    for r in refs:
        bullet(doc, r)

    h(doc, 1, "20. Appendix")
    h(doc, 2, "Appendix A: GitHub Repository")
    p(doc, "Repository: https://github.com/CodeBox-commits/Urban-Intelligence-System")
    h(doc, 2, "Appendix B: Repository Structure")
    add_table(doc, ["Path", "Purpose"], [
        ["src/", "React frontend source code including pages, components, services, and styles."],
        ["ml/", "Machine-learning training scripts and ML documentation."],
        ["models/ or ml/models/", "Serialized Joblib artifacts and metrics JSON files."],
        ["data/", "Dataset files and generated data used for experimentation."],
        ["supabase/", "Planned Supabase schema, policies, and migration files."],
        ["main.py", "FastAPI backend application and prediction endpoints."],
        ["train_models.py", "Planned aggregate training entry point for model refresh workflows."],
        ["generate_data.py", "Planned synthetic Telangana dataset generation utility."],
    ], [Inches(1.6), Inches(4.7)])
    h(doc, 2, "Appendix C: Important API Payload Example")
    p(doc, "Water prediction request example: {\"ph\": 7.2, \"hardness\": 185, \"solids\": 18000, \"chloramines\": 3.2, \"sulfate\": 310, \"conductivity\": 420, \"turbidity\": 3.1, \"organic_carbon\": 12.5, \"trihalomethanes\": 66}")
    p(doc, "Expected response example: {\"result\": \"Potable\", \"potability\": 1, \"confidence\": 88.0}")
    h(doc, 2, "Appendix D: Viva-Oriented Summary")
    p(doc, "UrbanIQ can be explained as a full-stack predictive governance platform. React provides the interface, FastAPI provides the API and ML inference, Supabase provides authentication and PostgreSQL persistence, and ensemble ML models provide prediction intelligence. The system is Telangana-focused and designed to support smart city monitoring through dashboards, maps, alerts, dataset upload workflows, and model retraining.")

    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
