export function applyGlobalCertificateLayout(html: string): string {
  const overrides = `
    .cert-header {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      margin: 0 0 10px 0 !important;
      text-align: center !important;
      position: relative;
      z-index: 1;
    }
    .cert-school-logo {
      width: 58px !important;
      height: 58px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 0 auto !important;
    }
    .logo-img {
      width: 58px !important;
      height: 58px !important;
      object-fit: contain !important;
      margin: 0 auto !important;
    }
    .cert-school-info {
      width: 100% !important;
      text-align: center !important;
      margin: 0 auto !important;
    }
    .cert-school-name {
      text-align: center !important;
      margin: 0 auto !important;
    }
  `

  if (html.includes("</style>")) {
    return html.replace("</style>", `${overrides}\n</style>`)
  }

  return html
}
