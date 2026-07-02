interface InteractiveDemoEmailProps {
  companyName: string
  contactName?: string | null
  suburbs: string[]
  openUrl: string
  demoUrl: string
  unsubscribeUrl: string
  appUrl?: string
}

export function buildInteractiveDemoEmail(props: InteractiveDemoEmailProps): { subject: string; html: string } {
  const { companyName, contactName, suburbs, openUrl, demoUrl, unsubscribeUrl, appUrl = 'https://roweo.com.au' } = props
  const greeting = contactName ? contactName.split(' ')[0] : null
  const suburbList = suburbs.slice(0, 2).join(' & ') || 'your area'

  const subject = greeting
    ? `${greeting}, Roweo prepared something for you`
    : `Roweo prepared something for ${companyName}`

  const nameFontSize = companyName.length > 32 ? '16px' : companyName.length > 22 ? '19px' : '22px'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#EDEAE3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EDEAE3">
  <tr>
    <td align="center" style="padding:48px 16px 56px;">
      <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">

        <!-- Roweo logo -->
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <img src="${appUrl}/logo.png" alt="Roweo" height="28" style="height:28px;width:auto;display:block;"/>
          </td>
        </tr>

        <!-- Intro text -->
        <tr>
          <td align="center" style="padding-bottom:4px;">
            <p style="margin:0;font-size:14px;color:#7A6E62;font-family:Georgia,serif;letter-spacing:0.01em;">Roweo prepared a personal letter for</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <h1 style="margin:0;font-size:27px;font-weight:700;color:#1C1208;font-family:Georgia,serif;font-style:italic;">${companyName}</h1>
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background:#1B2A4A;border-radius:6px;mso-padding-alt:0;">
                  <a href="${openUrl}" style="display:block;padding:15px 52px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.1em;text-transform:uppercase;white-space:nowrap;font-family:Arial,sans-serif;">
                    Open Your Letter
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HTML Envelope (clickable) -->
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <a href="${openUrl}" style="display:block;text-decoration:none;width:100%;">

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
                max-width:520px;
                background:linear-gradient(160deg,#F7F3EA 0%,#EDE8DC 60%,#E5DFD0 100%);
                border:1px solid rgba(0,0,0,0.14);
                border-radius:3px;
                box-shadow:0 8px 32px rgba(0,0,0,0.18),0 2px 8px rgba(0,0,0,0.1),inset 0 1px 0 rgba(255,255,255,0.5);
              ">

                <!-- Envelope flap V shape at top -->
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;" height="88">
                    <!-- Left half of V -->
                    <table width="50%" cellpadding="0" cellspacing="0" border="0" style="float:left;display:inline-block;">
                      <tr><td style="
                        width:0;height:0;
                        border-right:260px solid transparent;
                        border-top:88px solid #DDD7C8;
                        line-height:0;font-size:0;display:block;
                      "></td></tr>
                    </table>
                    <!-- Right half of V -->
                    <table width="50%" cellpadding="0" cellspacing="0" border="0" style="float:right;display:inline-block;">
                      <tr><td style="
                        width:0;height:0;
                        border-left:260px solid transparent;
                        border-top:88px solid #DDD7C8;
                        line-height:0;font-size:0;display:block;
                      "></td></tr>
                    </table>
                  </td>
                </tr>

                <!-- Envelope face -->
                <tr>
                  <td style="padding:20px 28px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">

                      <!-- Top row: return address + postmark + stamp -->
                      <tr>
                        <td valign="top" style="padding-bottom:24px;">
                          <!-- Return address -->
                          <p style="margin:0;font-size:9px;color:rgba(0,0,0,0.32);letter-spacing:1px;text-transform:uppercase;line-height:1.8;font-family:Arial,sans-serif;">
                            ROWEO PTY LTD<br/>SYDNEY NSW 2000
                          </p>
                        </td>

                        <!-- Postmark -->
                        <td valign="top" align="center" width="60" style="padding-bottom:24px;padding-right:8px;">
                          <div style="
                            width:52px;height:52px;
                            border-radius:50%;
                            border:1.5px solid rgba(0,0,0,0.2);
                            text-align:center;
                            padding-top:8px;
                            box-sizing:border-box;
                          ">
                            <div style="font-size:7px;color:rgba(0,0,0,0.38);letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">ROWEO</div>
                            <div style="width:32px;height:1px;background:rgba(0,0,0,0.18);margin:3px auto;"></div>
                            <div style="font-size:8px;color:rgba(0,0,0,0.45);font-weight:700;font-family:Arial,sans-serif;">AUS</div>
                            <div style="width:32px;height:1px;background:rgba(0,0,0,0.18);margin:3px auto;"></div>
                            <div style="font-size:7px;color:rgba(0,0,0,0.28);font-family:Arial,sans-serif;">2026</div>
                          </div>
                        </td>

                        <!-- Stamp -->
                        <td valign="top" align="right" width="72" style="padding-bottom:24px;">
                          <table cellpadding="0" cellspacing="0" border="0" style="
                            width:64px;
                            background:white;
                            border:1px solid rgba(0,0,0,0.18);
                            box-shadow:0 1px 4px rgba(0,0,0,0.1);
                          ">
                            <tr>
                              <td style="padding:4px;">
                                <div style="
                                  background:linear-gradient(135deg,#1B2A4A 0%,#243660 100%);
                                  text-align:center;
                                  padding:10px 4px 8px;
                                ">
                                  <div style="font-size:20px;color:white;font-weight:800;font-family:Georgia,serif;line-height:1;">R</div>
                                  <div style="font-size:6px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;margin-top:4px;font-family:Arial,sans-serif;">ROWEO</div>
                                  <div style="font-size:6px;color:rgba(255,255,255,0.35);font-family:Arial,sans-serif;margin-top:2px;">AUSTRALIA</div>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Recipient name — centre of envelope -->
                      <tr>
                        <td colspan="3" align="center" style="padding:16px 0 20px;">
                          <p style="margin:0 0 10px;font-size:${nameFontSize};color:#2C2419;font-family:Georgia,serif;font-style:italic;letter-spacing:1px;line-height:1.3;">
                            ${companyName}
                          </p>
                          <div style="width:48px;height:1px;background:rgba(0,0,0,0.18);margin:0 auto 10px;"></div>
                          <p style="margin:0;font-size:9px;color:rgba(0,0,0,0.3);letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;">
                            Personal &amp; Confidential
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>

                <!-- Bottom V crease (back of envelope visible) -->
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;" height="72">
                    <table width="50%" cellpadding="0" cellspacing="0" border="0" style="float:left;display:inline-block;">
                      <tr><td style="
                        width:0;height:0;
                        border-right:260px solid transparent;
                        border-bottom:72px solid #D8D2C3;
                        line-height:0;font-size:0;display:block;
                      "></td></tr>
                    </table>
                    <table width="50%" cellpadding="0" cellspacing="0" border="0" style="float:right;display:inline-block;">
                      <tr><td style="
                        width:0;height:0;
                        border-left:260px solid transparent;
                        border-bottom:72px solid #D8D2C3;
                        line-height:0;font-size:0;display:block;
                      "></td></tr>
                    </table>
                  </td>
                </tr>

              </table>
            </a>
          </td>
        </tr>

        <!-- Personalised note -->
        <tr>
          <td align="center" style="padding:0 24px 28px;">
            <p style="margin:0;font-size:13px;color:#8a7a6a;font-style:italic;text-align:center;line-height:1.6;font-family:Georgia,serif;">
              This letter was prepared personally for ${companyName}. Please do not forward.
            </p>
          </td>
        </tr>

        <!-- Links -->
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <p style="margin:0;font-size:13px;font-family:Arial,sans-serif;">
              <a href="${openUrl}" style="color:#1B2A4A;text-decoration:none;font-weight:600;">Open Letter</a>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <a href="${demoUrl ?? appUrl + '/signup'}" style="color:#1B2A4A;text-decoration:none;font-weight:600;">Get Started</a>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <a href="mailto:hello@roweo.com.au" style="color:#1B2A4A;text-decoration:none;font-weight:600;">Contact Us</a>
            </p>
          </td>
        </tr>

        <!-- What's inside -->
        <tr>
          <td style="background:#ffffff;border-radius:6px;padding:20px 24px;border:1px solid rgba(0,0,0,0.08);">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1a1208;font-family:Arial,sans-serif;">What you'll see inside</p>
            <p style="margin:0;font-size:13px;color:#6B5E4E;line-height:1.65;font-family:Arial,sans-serif;">
              A letter from Roweo to <strong>${companyName}</strong> — showing the real development applications lodged in <strong>${suburbList}</strong> this month, and exactly how we put your business in front of those homeowners before anyone else does.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:24px 16px 0;">
            <p style="margin:0;font-size:11px;color:#a09080;line-height:1.8;text-align:center;font-family:Arial,sans-serif;">
              Roweo &nbsp;&middot;&nbsp; Sydney, NSW, Australia &nbsp;&middot;&nbsp; roweo.com.au<br/>
              You received this because ${companyName} is publicly listed as operating in ${suburbList}.<br/>
              <a href="${unsubscribeUrl}" style="color:#8a7a6a;text-decoration:underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`

  return { subject, html }
}
