import { BLOCK_TYPES, DEFAULT_EMAIL_THEME } from './defaultBlocks.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatText(content) {
  if (!content) return '';
  return String(content).replace(/\n/g, '<br/>');
}

export function compileEmailHtml(blocks = [], theme = DEFAULT_EMAIL_THEME, options = {}) {
  const mergedTheme = { ...DEFAULT_EMAIL_THEME, ...theme };
  const isRtl = mergedTheme.direction === 'rtl';
  const dir = isRtl ? 'rtl' : 'ltr';
  const textAlign = isRtl ? 'right' : 'left';
  const preheader = options.preheader || '';

  const blocksHtml = (blocks || []).map((block) => {
    switch (block.type) {
      case BLOCK_TYPES.HEADER: {
        const align = block.align || 'center';
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 16}px; margin-top: ${block.paddingTop || 16}px; background-color: ${block.backgroundColor || 'transparent'};">
            <tr>
              <td align="${align}" style="text-align: ${align};">
                ${block.logoUrl ? `
                  <a href="https://upklick.net" target="_blank" style="text-decoration: none; display: inline-block;">
                    <img src="${escapeHtml(block.logoUrl)}" alt="${escapeHtml(block.logoText || 'UpKlick')}" width="${block.logoWidth || 160}" style="max-width: ${block.logoWidth || 160}px; height: auto; display: block; border: 0;" />
                  </a>
                ` : `
                  <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: ${mergedTheme.primaryColor};">${escapeHtml(block.logoText || 'UpKlick')}</h1>
                `}
                ${block.showTagline && block.tagline ? `
                  <p style="margin: 6px 0 0; font-size: 12px; color: #94a3b8;">${escapeHtml(block.tagline)}</p>
                ` : ''}
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.HEADING: {
        const align = block.align || textAlign;
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 8}px; margin-top: ${block.paddingTop || 8}px;">
            <tr>
              <td align="${align}" style="text-align: ${align}; direction: ${dir};">
                <h2 style="margin: 0; font-size: ${block.fontSize || 24}px; font-weight: ${block.fontWeight || 'bold'}; color: ${block.color || '#ffffff'}; line-height: 1.35; font-family: ${mergedTheme.fontFamily};">
                  ${formatText(block.text || '')}
                </h2>
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.TEXT: {
        const align = block.align || textAlign;
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 12}px; margin-top: ${block.paddingTop || 8}px;">
            <tr>
              <td align="${align}" style="text-align: ${align}; direction: ${dir}; color: ${block.color || '#cbd5e1'}; font-size: ${block.fontSize || 15}px; line-height: ${block.lineHeight || 1.7}; font-family: ${mergedTheme.fontFamily};">
                ${formatText(block.content || '')}
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.BUTTON: {
        const align = block.align || 'center';
        const isFull = block.width === 'full';
        const btnBg = block.style === 'gradient'
          ? `background: linear-gradient(135deg, ${block.gradientStart || '#FF6B35'}, ${block.gradientEnd || '#6C35FF'});`
          : `background-color: ${block.backgroundColor || '#FF6B35'};`;

        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 16}px; margin-top: ${block.paddingTop || 16}px;">
            <tr>
              <td align="${align}" style="text-align: ${align};">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(block.url || 'https://upklick.net')}" style="height:48px;v-text-anchor:middle;width:${isFull ? '100%' : '260px'};" arcsize="18%" stroke="f" fillcolor="${block.backgroundColor || '#FF6B35'}">
                <w:anchorlock/>
                <center style="color:${block.textColor || '#ffffff'};font-family:${mergedTheme.fontFamily};font-size:${block.fontSize || 15}px;font-weight:${block.fontWeight || 'bold'};">${escapeHtml(block.text || 'فتح الرابط')}</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-- -->
                <a href="${escapeHtml(block.url || 'https://upklick.net')}" target="_blank" style="display: ${isFull ? 'block' : 'inline-block'}; padding: ${block.paddingY || 14}px ${block.paddingX || 32}px; ${btnBg} color: ${block.textColor || '#ffffff'} !important; text-decoration: none; font-weight: ${block.fontWeight || 'bold'}; font-size: ${block.fontSize || 15}px; border-radius: ${block.borderRadius || 12}px; text-align: center; box-shadow: 0 4px 16px rgba(255, 107, 53, 0.3); font-family: ${mergedTheme.fontFamily};">
                  ${escapeHtml(block.text || 'فتح الرابط')}
                </a>
                <!--<![endif]-->
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.IMAGE: {
        const align = block.align || 'center';
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 12}px; margin-top: ${block.paddingTop || 12}px;">
            <tr>
              <td align="${align}" style="text-align: ${align};">
                ${block.linkUrl ? `<a href="${escapeHtml(block.linkUrl)}" target="_blank" style="display: inline-block;">` : ''}
                <img src="${escapeHtml(block.imageUrl || '')}" alt="${escapeHtml(block.altText || '')}" style="width: ${block.width || 100}%; max-width: 100%; border-radius: ${block.borderRadius || 12}px; display: block; border: 0; outline: none;" />
                ${block.linkUrl ? `</a>` : ''}
                ${block.caption ? `
                  <p style="margin: 6px 0 0; font-size: 12px; color: #94a3b8; text-align: ${align};">${escapeHtml(block.caption)}</p>
                ` : ''}
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.CARD: {
        const align = block.align || textAlign;
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 12}px; margin-top: ${block.paddingTop || 12}px;">
            <tr>
              <td style="background-color: ${block.backgroundColor || 'rgba(255,107,53,0.08)'}; border: 1px solid ${block.borderColor || 'rgba(255,107,53,0.3)'}; border-radius: ${block.borderRadius || 14}px; padding: ${block.padding || 18}px; text-align: ${align}; direction: ${dir};">
                ${block.icon ? `<div style="font-size: 24px; margin-bottom: 8px;">${block.icon}</div>` : ''}
                <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: bold; color: ${block.titleColor || '#FF6B35'}; font-family: ${mergedTheme.fontFamily};">${escapeHtml(block.title || '')}</h3>
                <div style="font-size: 14px; line-height: 1.6; color: ${block.textColor || '#e2e8f0'}; font-family: ${mergedTheme.fontFamily};">${formatText(block.description || '')}</div>
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.COLUMNS: {
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 12}px; margin-top: ${block.paddingTop || 12}px;">
            <tr>
              <td width="48%" valign="top" style="background-color: ${block.cardBackground || 'rgba(255,255,255,0.03)'}; border: 1px solid ${block.borderColor || 'rgba(255,255,255,0.08)'}; border-radius: 12px; padding: 14px; text-align: ${textAlign}; direction: ${dir};">
                ${block.col1?.icon ? `<div style="font-size: 20px; margin-bottom: 6px;">${block.col1.icon}</div>` : ''}
                <strong style="display: block; font-size: 14.5px; color: ${block.titleColor || '#ffffff'}; margin-bottom: 4px; font-family: ${mergedTheme.fontFamily};">${escapeHtml(block.col1?.title || '')}</strong>
                <span style="font-size: 12.5px; line-height: 1.5; color: ${block.textColor || '#94a3b8'}; font-family: ${mergedTheme.fontFamily};">${formatText(block.col1?.description || '')}</span>
              </td>
              <td width="4%"></td>
              <td width="48%" valign="top" style="background-color: ${block.cardBackground || 'rgba(255,255,255,0.03)'}; border: 1px solid ${block.borderColor || 'rgba(255,255,255,0.08)'}; border-radius: 12px; padding: 14px; text-align: ${textAlign}; direction: ${dir};">
                ${block.col2?.icon ? `<div style="font-size: 20px; margin-bottom: 6px;">${block.col2.icon}</div>` : ''}
                <strong style="display: block; font-size: 14.5px; color: ${block.titleColor || '#ffffff'}; margin-bottom: 4px; font-family: ${mergedTheme.fontFamily};">${escapeHtml(block.col2?.title || '')}</strong>
                <span style="font-size: 12.5px; line-height: 1.5; color: ${block.textColor || '#94a3b8'}; font-family: ${mergedTheme.fontFamily};">${formatText(block.col2?.description || '')}</span>
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.COUPON: {
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 14}px; margin-top: ${block.paddingTop || 14}px;">
            <tr>
              <td align="center" style="background-color: ${block.backgroundColor || 'rgba(108,53,255,0.1)'}; border: 2px dashed ${block.borderColor || '#6C35FF'}; border-radius: 14px; padding: 18px 20px; text-align: center; direction: ${dir};">
                <div style="font-size: 12px; color: #a78bfa; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">كوبون الخصم الخاص بك</div>
                <div style="display: inline-block; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); padding: 8px 24px; border-radius: 8px; font-size: 22px; font-weight: 900; letter-spacing: 2px; color: ${block.codeColor || '#FF6B35'}; font-family: monospace; margin-bottom: 8px;">
                  ${escapeHtml(block.code || 'CODE')}
                </div>
                <div style="font-size: 14px; font-weight: bold; color: #ffffff; margin-bottom: 4px; font-family: ${mergedTheme.fontFamily};">${escapeHtml(block.discount || '')}</div>
                ${block.expiresText ? `<div style="font-size: 12px; color: #94a3b8;">${escapeHtml(block.expiresText)}</div>` : ''}
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.COUNTDOWN: {
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 12}px; margin-top: ${block.paddingTop || 12}px;">
            <tr>
              <td align="center" style="background-color: ${block.backgroundColor || 'rgba(239,68,68,0.1)'}; border: 1px solid ${block.borderColor || 'rgba(239,68,68,0.35)'}; border-radius: 12px; padding: 16px 20px; text-align: center; direction: ${dir};">
                <div style="font-size: 13.5px; font-weight: bold; color: ${block.titleColor || '#f87171'}; margin-bottom: 6px;">${escapeHtml(block.title || '')}</div>
                <div style="font-size: 26px; font-weight: 900; letter-spacing: 3px; color: ${block.digitsColor || '#ffffff'}; font-family: monospace; background: rgba(0,0,0,0.35); display: inline-block; padding: 6px 18px; border-radius: 8px; margin: 4px 0;">
                  ${escapeHtml(block.timeDisplay || '24 : 00 : 00')}
                </div>
                ${block.subtitle ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${escapeHtml(block.subtitle)}</div>` : ''}
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.VIDEO: {
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 12}px; margin-top: ${block.paddingTop || 12}px;">
            <tr>
              <td align="center" style="text-align: center;">
                <a href="${escapeHtml(block.videoUrl || 'https://youtube.com')}" target="_blank" style="display: block; position: relative; text-decoration: none;">
                  <img src="${escapeHtml(block.thumbnailUrl || '')}" alt="Video Preview" style="width: 100%; max-width: 100%; border-radius: ${block.borderRadius || 14}px; display: block; border: 0;" />
                  <div style="margin-top: 8px; font-size: 13px; font-weight: bold; color: #FF6B35;">▶ ${escapeHtml(block.title || 'اضغط هنا لمشاهدة الفيديو')}</div>
                </a>
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.TESTIMONIAL: {
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 12}px; margin-top: ${block.paddingTop || 12}px;">
            <tr>
              <td style="background-color: ${block.backgroundColor || 'rgba(255,255,255,0.03)'}; border: 1px solid ${block.borderColor || 'rgba(255,255,255,0.08)'}; border-radius: 14px; padding: 18px; text-align: ${textAlign}; direction: ${dir};">
                <div style="color: #f59e0b; font-size: 16px; margin-bottom: 8px;">⭐⭐⭐⭐⭐</div>
                <div style="font-size: 14px; font-style: italic; line-height: 1.6; color: ${block.textColor || '#e2e8f0'}; margin-bottom: 10px;">"${formatText(block.quote || '')}"</div>
                <div style="font-size: 13px; font-weight: bold; color: #ffffff;">${escapeHtml(block.authorName || '')}</div>
                ${block.authorRole ? `<div style="font-size: 11.5px; color: #94a3b8;">${escapeHtml(block.authorRole)}</div>` : ''}
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.PRICING: {
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 14}px; margin-top: ${block.paddingTop || 14}px;">
            <tr>
              <td align="center" style="background-color: ${block.backgroundColor || 'rgba(108,53,255,0.1)'}; border: 2px solid ${block.borderColor || '#6C35FF'}; border-radius: 16px; padding: 22px 20px; text-align: center; direction: ${dir};">
                ${block.badge ? `<div style="display: inline-block; background: #6C35FF; color: #fff; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 999px; margin-bottom: 8px;">${escapeHtml(block.badge)}</div>` : ''}
                <div style="font-size: 18px; font-weight: bold; color: #ffffff; margin-bottom: 4px;">${escapeHtml(block.planName || '')}</div>
                <div style="margin: 8px 0 14px 0;">
                  <span style="font-size: 32px; font-weight: 900; color: #FF6B35;">${escapeHtml(block.price || '$49')}</span>
                  <span style="font-size: 13px; color: #94a3b8;"> ${escapeHtml(block.period || '/ mo')}</span>
                </div>
                <div style="font-size: 13.5px; line-height: 1.8; color: #cbd5e1; text-align: ${textAlign}; margin-bottom: 18px; padding: 0 10px;">${formatText(block.features || '')}</div>
                <a href="${escapeHtml(block.buttonUrl || 'https://upklick.net')}" target="_blank" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #FF6B35, #6C35FF); color: #ffffff !important; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 10px;">
                  ${escapeHtml(block.buttonText || 'اشترك الآن')}
                </a>
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.HTML: {
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 10}px; margin-top: ${block.paddingTop || 10}px;">
            <tr>
              <td style="direction: ${dir}; text-align: ${textAlign};">
                ${block.htmlContent || ''}
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.DIVIDER: {
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 16}px; margin-top: ${block.paddingTop || 16}px;">
            <tr>
              <td align="center">
                <div style="width: ${block.width || 100}%; border-top: ${block.thickness || 1}px ${block.style || 'solid'} ${block.color || 'rgba(255,255,255,0.1)'}; height: 0;"></div>
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.SPACER: {
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td height="${block.height || 24}" style="height: ${block.height || 24}px; font-size: 0; line-height: 0;">&nbsp;</td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.SOCIAL: {
        const align = block.align || 'center';
        const platforms = block.platforms || [];
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 14}px; margin-top: ${block.paddingTop || 14}px;">
            <tr>
              <td align="${align}" style="text-align: ${align};">
                <table border="0" cellpadding="0" cellspacing="0" align="${align}">
                  <tr>
                    ${platforms.map((p) => `
                      <td style="padding: 0 8px;">
                        <a href="${escapeHtml(p.url || 'https://upklick.net')}" target="_blank" style="display: inline-block; width: 34px; height: 34px; line-height: 34px; text-align: center; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; color: #ffffff; text-decoration: none; font-size: 15px;">
                          ${p.icon || '🔗'}
                        </a>
                      </td>
                    `).join('')}
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `;
      }

      case BLOCK_TYPES.FOOTER: {
        const align = block.align || 'center';
        return `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${block.paddingBottom || 24}px; margin-top: ${block.paddingTop || 24}px;">
            <tr>
              <td align="${align}" style="text-align: ${align}; direction: ${dir}; font-size: 12px; color: ${block.textColor || '#64748b'}; font-family: ${mergedTheme.fontFamily}; line-height: 1.6;">
                <div>${escapeHtml(block.companyName || 'UpKlick')} · ${escapeHtml(block.address || 'جميع الحقوق محفوظة')}</div>
                <div style="margin-top: 8px;">
                  ${escapeHtml(block.unsubscribeText || 'لا ترغب في تلقي هذه الرسائل؟')}
                  <a href="{{unsubscribe_url}}" target="_blank" style="color: ${block.linkColor || '#94a3b8'}; text-decoration: underline; margin-inline-start: 4px;">
                    ${escapeHtml(block.unsubscribeLabel || 'إلغاء الاشتراك')}
                  </a>
                </div>
              </td>
            </tr>
          </table>
        `;
      }

      default:
        return '';
    }
  }).join('\n');

  return `<!-- upklick-custom-email-builder -->
<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${dir}" data-ghl-email-root="true">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>UpKlick Email</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${mergedTheme.bodyBackgroundColor}; font-family: ${mergedTheme.fontFamily}; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; border: none !important; }
      .email-inner { padding: 16px 14px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${mergedTheme.bodyBackgroundColor}; color: ${mergedTheme.textColor}; font-family: ${mergedTheme.fontFamily}; direction: ${dir}; text-align: ${textAlign};">
  <!-- Hidden Preheader -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; color: ${mergedTheme.bodyBackgroundColor}; opacity: 0;">
    ${escapeHtml(preheader)} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${mergedTheme.bodyBackgroundColor}; width: 100%;">
    <tr>
      <td align="center" style="padding: ${mergedTheme.bodyPaddingY}px ${mergedTheme.bodyPaddingX}px;">
        <!-- Container -->
        <table class="email-container" border="0" cellpadding="0" cellspacing="0" width="${mergedTheme.containerMaxWidth}" style="max-width: ${mergedTheme.containerMaxWidth}px; width: 100%; background-color: ${mergedTheme.containerBackgroundColor}; border: 1px solid ${mergedTheme.containerBorderColor}; border-radius: ${mergedTheme.containerBorderRadius}px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
          <tr>
            <td class="email-inner" style="padding: 24px 28px;">
              ${blocksHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
