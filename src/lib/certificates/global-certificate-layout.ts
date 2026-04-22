export function applyGlobalCertificateLayout(html: string): string {
  const overrides = `
    .cert-page .cert-header {
      display: grid !important;
      grid-template-columns: 1fr !important;
      place-items: center !important;
      gap: 6px !important;
      width: 100% !important;
      margin: 12mm 0 10px 0 !important;
      text-align: center !important;
      position: relative !important;
      z-index: 2 !important;
    }
    .cert-page .cert-header > * {
      justify-self: center !important;
      align-self: center !important;
    }
    .cert-page .cert-school-logo {
      width: 58px !important;
      height: 58px !important;
      min-width: 58px !important;
      min-height: 58px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 0 auto !important;
      float: none !important;
    }
    .cert-page .logo-img {
      width: 58px !important;
      height: 58px !important;
      object-fit: contain !important;
      margin: 0 auto !important;
      display: block !important;
    }
    .cert-page .cert-school-info {
      width: 100% !important;
      flex: none !important;
      text-align: center !important;
      margin: 0 auto !important;
    }
    .cert-page .cert-school-name,
    .cert-page .cert-school-subtitle {
      width: 100% !important;
      text-align: center !important;
      margin: 0 auto !important;
    }
  `

  if (html.includes("</style>")) {
    return html.replace("</style>", `${overrides}\n</style>`)
  }

  return html
}
