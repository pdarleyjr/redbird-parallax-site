$html = Get-Content index.html -Raw
$html = $html.Replace('    <link rel="preload" as="image" href="assets/img/hero_kids_map.jpg">', '    <!-- PapaParse for robust CSV parsing -->
    <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js" defer></script>')
Set-Content index.html $html -NoNewline
