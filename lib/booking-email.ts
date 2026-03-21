type BookingEmailInput = {
  customerName: string
  service: string
  date: string
  startTime: string
  endTime: string
  cancelUrl: string
  variant?: 'confirmation' | 'reminder'
}

export function buildBookingConfirmationEmail(input: BookingEmailInput) {
  const { customerName, service, date, startTime, endTime, cancelUrl, variant = 'confirmation' } = input
  const logoUrl = 'https://zetasbarbershop.it/logo.png'
  const title = variant === 'reminder' ? 'Promemoria Prenotazione' : 'Conferma Prenotazione'
  const intro =
    variant === 'reminder'
      ? 'ti ricordiamo il tuo appuntamento. Qui trovi i dettagli e il pulsante per disdire se necessario.'
      : 'la tua prenotazione e stata registrata con successo.'

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="color-scheme" content="dark" />
      <meta name="supported-color-schemes" content="dark" />
      <title>${title}</title>
      <style>
        @media only screen and (max-width: 600px) {
          .container {
            width: 100% !important;
          }

          .pad {
            padding: 18px !important;
          }

          .h1 {
            font-size: 22px !important;
          }

          .text-base {
            font-size: 15px !important;
          }

          .text-sm {
            font-size: 14px !important;
          }

          .text-xs {
            font-size: 13px !important;
          }

          .cta {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            box-sizing: border-box !important;
          }

          .cta-wrap {
            width: 100% !important;
          }
        }
      </style>
    </head>
    <body style="margin:0;padding:0;background:#09090b;font-family:Arial,Helvetica,sans-serif;" bgcolor="#09090b">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#09090b" style="background:#09090b;padding:14px;">
        <tr>
          <td align="center">
            <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#18181b" style="width:600px;max-width:600px;background:#18181b;border:1px solid #27272a;border-radius:14px;overflow:hidden;">
              <tr>
                <td class="pad" bgcolor="#0f0f10" style="padding:22px;border-bottom:1px solid #27272a;background:#0f0f10;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td width="48" valign="middle" style="width:48px;">
                        <img src="${logoUrl}" alt="Zeta's Barbershop" width="40" height="40" style="display:block;border-radius:8px;" />
                      </td>
                      <td valign="middle" style="padding-left:10px;">
                        <p class="text-xs" style="margin:0;color:#a1a1aa;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Zeta's Barbershop</p>
                        <h1 class="h1" style="margin:5px 0 0 0;color:#ef4444;font-size:24px;line-height:1.2;">${title}</h1>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td class="pad" style="padding:22px;">
                  <p class="text-base" style="margin:0 0 10px 0;color:#fafafa;font-size:16px;line-height:1.5;">Ciao ${customerName},</p>
                  <p class="text-sm" style="margin:0 0 16px 0;color:#d4d4d8;font-size:14px;line-height:1.6;">${intro}</p>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#111113" style="background:#111113;border:1px solid #3f3f46;border-radius:10px;overflow:hidden;">
                    <tr>
                      <td class="text-xs" style="padding:10px 12px;color:#a1a1aa;font-size:12px;border-bottom:1px solid #27272a;">Servizio</td>
                      <td class="text-sm" style="padding:10px 12px;color:#fafafa;font-size:13px;font-weight:700;border-bottom:1px solid #27272a;">${service}</td>
                    </tr>
                    <tr>
                      <td class="text-xs" style="padding:10px 12px;color:#a1a1aa;font-size:12px;border-bottom:1px solid #27272a;">Data</td>
                      <td class="text-sm" style="padding:10px 12px;color:#fafafa;font-size:13px;font-weight:700;border-bottom:1px solid #27272a;">${date}</td>
                    </tr>
                    <tr>
                      <td class="text-xs" style="padding:10px 12px;color:#a1a1aa;font-size:12px;">Orario</td>
                      <td class="text-sm" style="padding:10px 12px;color:#fafafa;font-size:13px;font-weight:700;">${startTime} - ${endTime}</td>
                    </tr>
                  </table>

                  <p class="text-sm" style="margin:16px 0 10px 0;color:#d4d4d8;font-size:13px;line-height:1.5;">Se non puoi venire, puoi disdire in autonomia:</p>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:6px;">
                    <tr>
                      <td align="center" style="padding:0;">
                        <!--[if mso]>
                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${cancelUrl}" style="height:46px;v-text-anchor:middle;width:280px;" arcsize="12%" strokecolor="#dc2626" fillcolor="#dc2626">
                          <w:anchorlock/>
                          <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">Disdici Appuntamento</center>
                        </v:roundrect>
                        <![endif]-->
                        <!--[if !mso]><!-- -->
                        <a
                          href="${cancelUrl}"
                          class="cta"
                          style="display:block;width:100%;max-width:280px;margin:0 auto;padding:14px 18px;font-size:15px;line-height:1.2;font-weight:700;color:#ffffff !important;text-decoration:none;text-align:center;border-radius:8px;background:#dc2626;border:1px solid #dc2626;box-sizing:border-box;"
                        >
                          Disdici Appuntamento
                        </a>
                        <!--<![endif]-->
                      </td>
                    </tr>
                  </table>

                  <p class="text-xs" style="margin:10px 0 0 0;color:#9ca3af;font-size:12px;line-height:1.45;">
                    Se il pulsante non e visibile nel tuo client email, usa questo link diretto:
                    <a href="${cancelUrl}" style="color:#ef4444;text-decoration:underline;word-break:break-all;">Disdici Appuntamento</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `
}
