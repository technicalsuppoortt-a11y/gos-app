export const BLOCK_TYPES = {
  HEADER: 'header',
  HEADING: 'heading',
  TEXT: 'text',
  BUTTON: 'button',
  IMAGE: 'image',
  CARD: 'card',
  COLUMNS: 'columns',
  COUPON: 'coupon',
  COUNTDOWN: 'countdown',
  VIDEO: 'video',
  TESTIMONIAL: 'testimonial',
  PRICING: 'pricing',
  HTML: 'html',
  DIVIDER: 'divider',
  SPACER: 'spacer',
  SOCIAL: 'social',
  FOOTER: 'footer'
};

export const AVAILABLE_BLOCKS_CATALOG = [
  {
    type: BLOCK_TYPES.HEADER,
    labelAr: 'رأس البريد / الشعار',
    labelEn: 'Logo Header',
    icon: 'Layout',
    category: 'structure',
    descriptionAr: 'شعار المنصة وشريط العنوان العلوي',
    descriptionEn: 'Platform logo & header title'
  },
  {
    type: BLOCK_TYPES.HEADING,
    labelAr: 'عنوان رئيسي',
    labelEn: 'Heading',
    icon: 'Heading',
    category: 'typography',
    descriptionAr: 'عنوان جذاب H1 / H2 بنمط مخصص',
    descriptionEn: 'Catchy title banner H1/H2'
  },
  {
    type: BLOCK_TYPES.TEXT,
    labelAr: 'فقرة نصية',
    labelEn: 'Text Paragraph',
    icon: 'Type',
    category: 'typography',
    descriptionAr: 'نص غني يدعم المتغيرات مثل {{name}}',
    descriptionEn: 'Rich body text with tokens'
  },
  {
    type: BLOCK_TYPES.BUTTON,
    labelAr: 'زر إجراء (CTA)',
    labelEn: 'Action Button',
    icon: 'MousePointerClick',
    category: 'action',
    descriptionAr: 'زر مميز للتوجيه لرابط مع تدرج لوني',
    descriptionEn: 'High-converting call to action'
  },
  {
    type: BLOCK_TYPES.IMAGE,
    labelAr: 'صورة / بانر',
    labelEn: 'Hero Image',
    icon: 'Image',
    category: 'media',
    descriptionAr: 'صورة ترويجية أو بانر مميز',
    descriptionEn: 'Promotional banner or graphic'
  },
  {
    type: BLOCK_TYPES.CARD,
    labelAr: 'صندوق إبراز / تنبيه',
    labelEn: 'Highlight Card',
    icon: 'Sparkles',
    category: 'marketing',
    descriptionAr: 'بطاقة مميزة لإبراز ميزة أو تنبيه هام',
    descriptionEn: 'Featured alert or highlight box'
  },
  {
    type: BLOCK_TYPES.COUNTDOWN,
    labelAr: 'عداد وتنبيه عاجل',
    labelEn: 'Urgency Countdown',
    icon: 'Clock',
    category: 'marketing',
    descriptionAr: 'شريط تنازلي يحفز المستلم على سرعة التحويل',
    descriptionEn: 'Urgency countdown bar'
  },
  {
    type: BLOCK_TYPES.COLUMNS,
    labelAr: 'عمودين متجاورين',
    labelEn: '2-Columns Grid',
    icon: 'Columns',
    category: 'structure',
    descriptionAr: 'ميزتان أو منتجان جنباً إلى جنب',
    descriptionEn: 'Side-by-side feature columns'
  },
  {
    type: BLOCK_TYPES.COUPON,
    labelAr: 'كوبون خصم',
    labelEn: 'Discount Coupon',
    icon: 'Tag',
    category: 'marketing',
    descriptionAr: 'رمز خصم ترويجي مع إطار مميز',
    descriptionEn: 'Promo coupon code with copy style'
  },
  {
    type: BLOCK_TYPES.TESTIMONIAL,
    labelAr: 'آراء وتقييم العملاء',
    labelEn: 'Testimonial Review',
    icon: 'Star',
    category: 'marketing',
    descriptionAr: 'بطاقة تقييم ⭐⭐⭐⭐⭐ مع اقتباس العميل',
    descriptionEn: 'Customer review and 5-star rating'
  },
  {
    type: BLOCK_TYPES.VIDEO,
    labelAr: 'معاينة فيديو',
    labelEn: 'Video Preview',
    icon: 'Video',
    category: 'media',
    descriptionAr: 'صورة مصغرة لفيديو مع زر تشغيل يفتح الرابط',
    descriptionEn: 'Video thumbnail with play overlay'
  },
  {
    type: BLOCK_TYPES.PRICING,
    labelAr: 'باقة أسعار',
    labelEn: 'Pricing Plan',
    icon: 'DollarSign',
    category: 'marketing',
    descriptionAr: 'عرض سعر مميز مع قائمة ميزات وزر شراء',
    descriptionEn: 'Featured plan price box with bullet features'
  },
  {
    type: BLOCK_TYPES.DIVIDER,
    labelAr: 'خط فاصل',
    labelEn: 'Divider',
    icon: 'Minus',
    category: 'structure',
    descriptionAr: 'فاصل أفقي أنيق بين الأقسام',
    descriptionEn: 'Subtle section separator'
  },
  {
    type: BLOCK_TYPES.SPACER,
    labelAr: 'مسافة عمودية',
    labelEn: 'Spacer',
    icon: 'MoveVertical',
    category: 'structure',
    descriptionAr: 'فراغ ومسافة للتحكم بالتباعد',
    descriptionEn: 'Vertical whitespace spacing'
  },
  {
    type: BLOCK_TYPES.SOCIAL,
    labelAr: 'أيقونات التواصل',
    labelEn: 'Social Links',
    icon: 'Share2',
    category: 'social',
    descriptionAr: 'روابط حسابات التواصل الاجتماعي',
    descriptionEn: 'Clickable social platform icons'
  },
  {
    type: BLOCK_TYPES.HTML,
    labelAr: 'كود مخصص (HTML)',
    labelEn: 'Custom HTML',
    icon: 'Code',
    category: 'advanced',
    descriptionAr: 'إدراج كود HTML أو عنصر مخصص',
    descriptionEn: 'Raw custom HTML embed'
  },
  {
    type: BLOCK_TYPES.FOOTER,
    labelAr: 'التذييل وإلغاء الاشتراك',
    labelEn: 'Footer & Unsubscribe',
    icon: 'Info',
    category: 'structure',
    descriptionAr: 'حقوق المنصة ورابط إلغاء الاشتراك',
    descriptionEn: 'Legal footer & unsubscribe link'
  }
];

export function createDefaultBlock(type) {
  const id = `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  switch (type) {
    case BLOCK_TYPES.HEADER:
      return {
        id,
        type,
        logoText: 'UpKlick',
        logoUrl: 'https://upklick.net/best_logo_dark.png',
        tagline: 'منصة النمو والأتمتة الذكية',
        align: 'center',
        logoWidth: 160,
        showTagline: false,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: 'transparent'
      };

    case BLOCK_TYPES.HEADING:
      return {
        id,
        type,
        text: '🎉 فرصة استثنائية لتطوير أعمالك اليوم',
        level: 'h2',
        color: '#ffffff',
        align: 'right',
        fontSize: 24,
        fontWeight: 'bold',
        paddingTop: 12,
        paddingBottom: 8
      };

    case BLOCK_TYPES.TEXT:
      return {
        id,
        type,
        content: 'مرحباً {{name}}،\n\nيسعدنا إعلامك بأحدث التحديثات والميزات الجديدة المصممة لمساعدتك على مضاعفة نتائجك بكل سهولة وسرعة.',
        color: '#cbd5e1',
        align: 'right',
        fontSize: 15,
        lineHeight: 1.7,
        paddingTop: 8,
        paddingBottom: 12
      };

    case BLOCK_TYPES.BUTTON:
      return {
        id,
        type,
        text: 'ابدأ الاستكشاف الآن ←',
        url: 'https://upklick.net/dashboard',
        style: 'gradient',
        backgroundColor: '#FF6B35',
        gradientStart: '#FF6B35',
        gradientEnd: '#6C35FF',
        textColor: '#ffffff',
        borderRadius: 12,
        width: 'auto',
        align: 'center',
        paddingX: 32,
        paddingY: 14,
        fontSize: 15,
        fontWeight: 'bold',
        paddingTop: 16,
        paddingBottom: 16
      };

    case BLOCK_TYPES.IMAGE:
      return {
        id,
        type,
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
        altText: 'UpKlick Feature Banner',
        linkUrl: 'https://upklick.net',
        borderRadius: 12,
        width: 100,
        align: 'center',
        caption: '',
        paddingTop: 12,
        paddingBottom: 12
      };

    case BLOCK_TYPES.CARD:
      return {
        id,
        type,
        icon: '⚡',
        title: 'ميزة الأسبوع الحصرية',
        description: 'استخدم الذكاء الاصطناعي لتوليد حملات تسويقية متكاملة خلال أقل من 60 ثانية مع استهداف فائق الدقة.',
        backgroundColor: 'rgba(255, 107, 53, 0.08)',
        borderColor: 'rgba(255, 107, 53, 0.3)',
        titleColor: '#FF6B35',
        textColor: '#e2e8f0',
        align: 'right',
        borderRadius: 14,
        padding: 18,
        paddingTop: 12,
        paddingBottom: 12
      };

    case BLOCK_TYPES.COUNTDOWN:
      return {
        id,
        type,
        title: '⏳ ينتهي العرض الخاص خلال:',
        timeDisplay: '24 : 00 : 00',
        subtitle: 'ساعات · دقائق · ثواني',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.35)',
        titleColor: '#f87171',
        digitsColor: '#ffffff',
        paddingTop: 12,
        paddingBottom: 12
      };

    case BLOCK_TYPES.VIDEO:
      return {
        id,
        type,
        thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
        videoUrl: 'https://youtube.com',
        title: 'شاهد الشرح التوضيحي السريع (3 دقائق)',
        borderRadius: 14,
        paddingTop: 12,
        paddingBottom: 12
      };

    case BLOCK_TYPES.TESTIMONIAL:
      return {
        id,
        type,
        quote: 'منصة UpKlick ساعدتنا في زيادة مبيعات متجرنا بنسبة 140% خلال أول شهر بفضل قنوات المبيعات والأتمتة الذكية.',
        authorName: 'سارة المنصوري',
        authorRole: 'مؤسسة متجر إلكتروني',
        rating: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        textColor: '#e2e8f0',
        paddingTop: 12,
        paddingBottom: 12
      };

    case BLOCK_TYPES.PRICING:
      return {
        id,
        type,
        planName: 'باقة النمو (Growth Plan)',
        price: '49$',
        period: '/ شهرياً',
        features: '✓ جميع أدوات التسويق والـ CRM\n✓ 1,500 كريدت ذكاء اصطناعي شهرياً\n✓ نطاقات ومواقع غير محدودة\n✓ دعم فني VIP مباشر',
        buttonText: 'اشترك في الباقة الآن ←',
        buttonUrl: 'https://upklick.net/pricing',
        backgroundColor: 'rgba(108, 53, 255, 0.1)',
        borderColor: '#6C35FF',
        badge: 'الأكثر طلباً ⭐',
        paddingTop: 14,
        paddingBottom: 14
      };

    case BLOCK_TYPES.COLUMNS:
      return {
        id,
        type,
        col1: {
          icon: '🚀',
          title: 'سرعة وكفاءة فائقة',
          description: 'تنفيذ المهام والأتمتة في ثوانٍ معدودة دون أي تعقيد تقني.'
        },
        col2: {
          icon: '🎯',
          title: 'استهداف ذكي',
          description: 'تواصل مع عملائك بناءً على سلوكهم واستهلاكهم الفعلي.'
        },
        cardBackground: 'rgba(255, 255, 255, 0.03)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        titleColor: '#ffffff',
        textColor: '#94a3b8',
        paddingTop: 12,
        paddingBottom: 12
      };

    case BLOCK_TYPES.COUPON:
      return {
        id,
        type,
        code: 'GROWTH50',
        discount: 'خصم 50% على جميع الباقات السنوية',
        expiresText: '⏳ ينتهي العرض خلال 48 ساعة فقط',
        backgroundColor: 'rgba(108, 53, 255, 0.1)',
        borderColor: '#6C35FF',
        codeColor: '#FF6B35',
        paddingTop: 14,
        paddingBottom: 14
      };

    case BLOCK_TYPES.HTML:
      return {
        id,
        type,
        htmlContent: '<div style="text-align: center; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.15); font-size: 13px; color: #94a3b8;">\n  ⚡ عنصر HTML مخصص\n</div>',
        paddingTop: 10,
        paddingBottom: 10
      };

    case BLOCK_TYPES.DIVIDER:
      return {
        id,
        type,
        style: 'solid',
        color: 'rgba(255, 255, 255, 0.1)',
        thickness: 1,
        width: 100,
        paddingTop: 16,
        paddingBottom: 16
      };

    case BLOCK_TYPES.SPACER:
      return {
        id,
        type,
        height: 24
      };

    case BLOCK_TYPES.SOCIAL:
      return {
        id,
        type,
        platforms: [
          { name: 'Telegram', url: 'https://t.me/upklick', icon: '✈️' },
          { name: 'Twitter', url: 'https://twitter.com/upklick', icon: '𝕏' },
          { name: 'Instagram', url: 'https://instagram.com/upklick', icon: '📷' },
          { name: 'YouTube', url: 'https://youtube.com/@upklick', icon: '▶️' }
        ],
        align: 'center',
        iconStyle: 'circle',
        paddingTop: 14,
        paddingBottom: 14
      };

    case BLOCK_TYPES.FOOTER:
      return {
        id,
        type,
        companyName: 'UpKlick Inc.',
        address: 'جميع الحقوق محفوظة © 2026 UpKlick',
        unsubscribeText: 'لا ترغب في تلقي هذه الرسائل؟',
        unsubscribeLabel: 'إلغاء الاشتراك من هنا',
        textColor: '#64748b',
        linkColor: '#94a3b8',
        align: 'center',
        paddingTop: 24,
        paddingBottom: 24
      };

    default:
      return {
        id,
        type: BLOCK_TYPES.TEXT,
        content: 'نص العنصر...',
        color: '#cbd5e1',
        align: 'right',
        fontSize: 15,
        lineHeight: 1.6,
        paddingTop: 8,
        paddingBottom: 8
      };
  }
}

export const DEFAULT_EMAIL_THEME = {
  direction: 'rtl',
  bodyBackgroundColor: '#090912',
  containerBackgroundColor: '#12121f',
  containerBorderColor: 'rgba(255, 255, 255, 0.08)',
  containerBorderRadius: 16,
  containerMaxWidth: 600,
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  primaryColor: '#FF6B35',
  textColor: '#e2e8f0',
  bodyPaddingY: 28,
  bodyPaddingX: 20
};
