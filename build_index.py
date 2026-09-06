#!/usr/bin/env python3
"""
بيجمع partials/*.html في index.html واحد جاهز للتشغيل بالدبل كليك.
شغّله كده: python3 build_index.py
"""
import re
from datetime import datetime

PAGE_ORDER = [
    "login-page.html",
    "home-page.html",
    "cc-pulse-page.html",
    "noc-page.html",
    "unit-mapping-page.html",
    "calculator-page.html",
    "towers-page.html",
    "tech-page.html",
    "roster-page.html",
    "admin-page.html",
    "change-password-modal.html",
]

HEAD_FILE = "head.html"   # <!DOCTYPE...> لحد أول <div id="login-page"...>
TAIL_FILE = "tail.html"   # من بعد قفل آخر صفحة (الموديول) لحد نهاية الملف (السكريبتات + </html>)

INCLUDE_MARKER = '<div data-include="partials/sub-page-header.html"></div>'

# بيتغير رقم زي دا "?v=..." في كل ملفات JS/CSS تلقائيًا كل مرة تشغّل السكريبت،
# عشان أي زائر (خصوصًا على GitHub Pages) ياخد آخر نسخة دايمًا من غير Cache قديم عالق
CACHE_BUST_PATTERN = re.compile(r'\?v=[\w.\-]+')


def strip_banner(content: str) -> str:
    """يشيل أول سطر تعليق (banner) اللي بيتحط تلقائي في كل partial."""
    lines = content.splitlines(keepends=True)
    if lines and lines[0].strip().startswith("<!-- Partial:"):
        return "".join(lines[1:])
    return content


def main():
    with open("partials/sub-page-header.html", encoding="utf-8") as f:
        header_content = strip_banner(f.read())

    with open(HEAD_FILE, encoding="utf-8") as f:
        head = f.read()
    with open(TAIL_FILE, encoding="utf-8") as f:
        tail = f.read()

    middle = ""
    for name in PAGE_ORDER:
        with open(f"partials/{name}", encoding="utf-8") as f:
            content = strip_banner(f.read())
        if INCLUDE_MARKER in content:
            content = content.replace(INCLUDE_MARKER, header_content)
        middle += content

    final = head + middle + tail

    new_version = datetime.now().strftime("%Y%m%d.%H%M%S")
    final, replacements = CACHE_BUST_PATTERN.subn(f"?v={new_version}", final)

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(final)

    print(f"✅ index.html اتبنى تاني ({len(final.splitlines())} سطر)")
    print(f"🔄 اتحدث رقم الإصدار (?v=...) في {replacements} مكان لـ: {new_version}")


if __name__ == "__main__":
    main()