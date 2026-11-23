<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
    xmlns:html="http://www.w3.org/TR/REC-html40"
    xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>XML Sitemap | Nexus Query</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style type="text/css">
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #06090e;
            color: #f1f5f9;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 1040px;
            margin: 0 auto;
            background: #0d121d;
            border: 1px solid #1e293b;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 16px 36px -12px rgba(0, 0, 0, 0.7);
          }
          .header {
            border-bottom: 1px solid #1e293b;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          h1 {
            margin: 0 0 8px 0;
            font-size: 24px;
            font-weight: 700;
            color: #38bdf8;
            letter-spacing: -0.02em;
          }
          p.desc {
            color: #94a3b8;
            font-size: 14px;
            margin: 0 0 16px 0;
            line-height: 1.6;
          }
          .stats {
            display: inline-flex;
            align-items: center;
            background: rgba(56, 189, 248, 0.1);
            color: #38bdf8;
            border: 1px solid rgba(56, 189, 248, 0.25);
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 600;
          }
          .table-wrapper {
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 13px;
            text-align: left;
          }
          th {
            background-color: #131b2e;
            color: #cbd5e1;
            padding: 12px 16px;
            font-weight: 600;
            border-bottom: 1px solid #22304d;
          }
          th:first-child { border-top-left-radius: 8px; }
          th:last-child { border-top-right-radius: 8px; }
          td {
            padding: 14px 16px;
            border-bottom: 1px solid #162033;
            color: #cbd5e1;
            vertical-align: middle;
          }
          tr:hover td {
            background-color: rgba(56, 189, 248, 0.03);
          }
          a {
            color: #38bdf8;
            text-decoration: none;
            word-break: break-all;
            font-weight: 500;
          }
          a:hover {
            text-decoration: underline;
            color: #7dd3fc;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            background: #172033;
            color: #94a3b8;
            border: 1px solid #22304d;
          }
          .priority-badge {
            background: rgba(16, 185, 129, 0.12);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
          }
          .footer {
            margin-top: 24px;
            font-size: 12px;
            color: #64748b;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nexus Query XML Sitemap</h1>
            <p class="desc">
              This is the XML sitemap for Nexus Query, automatically generated for search engine bots (Googlebot, Bingbot) and human visitors.
            </p>
            <div class="stats">
              <span>Total Indexed URLs: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></span>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style="width: 52%;">URL Location</th>
                  <th style="width: 14%;">Priority</th>
                  <th style="width: 16%;">Change Frequency</th>
                  <th style="width: 18%;">Last Modified</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td>
                      <xsl:variable name="itemURL">
                        <xsl:value-of select="sitemap:loc"/>
                      </xsl:variable>
                      <a href="{$itemURL}" target="_blank" rel="noopener noreferrer">
                        <xsl:value-of select="sitemap:loc"/>
                      </a>
                    </td>
                    <td>
                      <span class="badge priority-badge">
                        <xsl:value-of select="sitemap:priority"/>
                      </span>
                    </td>
                    <td>
                      <span class="badge">
                        <xsl:value-of select="sitemap:changefreq"/>
                      </span>
                    </td>
                    <td>
                      <xsl:value-of select="substring(sitemap:lastmod, 1, 10)"/>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
          <div class="footer">
            Nexus Query © 2026. Search engine friendly XML Sitemap protocol 0.9.
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
