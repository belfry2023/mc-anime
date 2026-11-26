from docx import Document

path = r"C:\Users\belfry\workspaceRE\mc-anime\dist\给朋友\mc-anime_客户端安装配置教程.docx"
out = r"C:\Users\belfry\workspaceRE\mc-anime\tools\friend_docx_dump.txt"
doc = Document(path)
lines = []
for i, p in enumerate(doc.paragraphs):
    t = p.text.strip()
    if t:
        lines.append(f"[{i}|{p.style.name}] {t}")
lines.append("=== tables ===")
for ti, table in enumerate(doc.tables):
    lines.append(f"--- table {ti} ---")
    for row in table.rows:
        lines.append(" | ".join(c.text.strip().replace("\n", " / ") for c in row.cells))
with open(out, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print("written", out, len(lines), "lines")
