#!/usr/bin/env python3
import markdown
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
import os

# Read the markdown file
with open('TECHNICAL_REQUIREMENTS.md', 'r', encoding='utf-8') as f:
    md_content = f.read()

# Convert markdown to HTML
html_content = markdown.markdown(
    md_content,
    extensions=['tables', 'fenced_code', 'codehilite', 'toc']
)

# Create a complete HTML document with styling
full_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Technical Requirements - Income Tax Tracker</title>
    <style>
        @page {{
            size: A4;
            margin: 2cm;
            @bottom-center {{
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10pt;
                color: #666;
            }}
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            font-size: 11pt;
            max-width: 100%;
        }}

        h1 {{
            color: #1a1a1a;
            font-size: 24pt;
            border-bottom: 3px solid #4F46E5;
            padding-bottom: 10px;
            margin-top: 30px;
            page-break-after: avoid;
        }}

        h2 {{
            color: #2563EB;
            font-size: 18pt;
            margin-top: 25px;
            page-break-after: avoid;
            border-bottom: 2px solid #E5E7EB;
            padding-bottom: 5px;
        }}

        h3 {{
            color: #3B82F6;
            font-size: 14pt;
            margin-top: 20px;
            page-break-after: avoid;
        }}

        h4 {{
            color: #60A5FA;
            font-size: 12pt;
            margin-top: 15px;
            page-break-after: avoid;
        }}

        p {{
            margin: 10px 0;
            text-align: justify;
        }}

        ul, ol {{
            margin: 10px 0;
            padding-left: 30px;
        }}

        li {{
            margin: 5px 0;
        }}

        code {{
            background-color: #F3F4F6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 10pt;
            color: #DC2626;
        }}

        pre {{
            background-color: #1F2937;
            color: #F9FAFB;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 9pt;
            line-height: 1.4;
            page-break-inside: avoid;
        }}

        pre code {{
            background-color: transparent;
            color: #F9FAFB;
            padding: 0;
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            page-break-inside: avoid;
            font-size: 10pt;
        }}

        th {{
            background-color: #4F46E5;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: 600;
        }}

        td {{
            padding: 8px;
            border: 1px solid #E5E7EB;
        }}

        tr:nth-child(even) {{
            background-color: #F9FAFB;
        }}

        strong {{
            color: #1F2937;
            font-weight: 600;
        }}

        hr {{
            border: none;
            border-top: 2px solid #E5E7EB;
            margin: 20px 0;
        }}

        blockquote {{
            border-left: 4px solid #4F46E5;
            padding-left: 15px;
            margin: 15px 0;
            color: #6B7280;
            font-style: italic;
        }}

        .page-break {{
            page-break-before: always;
        }}
    </style>
</head>
<body>
    {html_content}
</body>
</html>
"""

# Generate PDF
font_config = FontConfiguration()
html = HTML(string=full_html)
html.write_pdf(
    'TECHNICAL_REQUIREMENTS.pdf',
    font_config=font_config
)

print("PDF generated successfully: TECHNICAL_REQUIREMENTS.pdf")
