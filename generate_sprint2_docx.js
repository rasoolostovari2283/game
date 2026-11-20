const fs = require('fs');
const path = require('path');
const { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType, 
  BorderStyle, 
  ShadingType 
} = require('docx');

const FONT = 'Tahoma';

function p(textRuns, options = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: options.alignment || AlignmentType.RIGHT,
    spacing: options.spacing || { after: 120, line: 340 },
    children: Array.isArray(textRuns) ? textRuns : [textRuns]
  });
}

function r(text, options = {}) {
  return new TextRun({
    text: text,
    font: FONT,
    size: options.size || 22,
    bold: options.bold || false,
    color: options.color || '1f2937',
    rightToLeft: true
  });
}

function h1(text) {
  return p([r(text, { size: 28, bold: true, color: '0f2b46' })], {
    spacing: { before: 240, after: 140 }
  });
}

function h2(text) {
  return p([r(text, { size: 24, bold: true, color: '185a9d' })], {
    spacing: { before: 200, after: 100 }
  });
}

function bullet(text) {
  return p([
    r('• ', { bold: true, color: '00f2ff' }),
    r(text)
  ], { spacing: { after: 80, line: 320 } });
}

function cell(text, isHeader = false, widthPct = 25, align = AlignmentType.RIGHT) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: isHeader ? { fill: '0f2b46', type: ShadingType.CLEAR } : undefined,
    children: [p([r(text, { bold: isHeader, color: isHeader ? 'ffffff' : '1f2937' })], { alignment: align })]
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT, rightToLeft: true },
        paragraph: { bidirectional: true, alignment: AlignmentType.RIGHT }
      }
    }
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 }
      }
    },
    children: [
      p([r('سند ارزیابی فنی و نقشه راه اسپرینت دوم (Sprint 2 Roadmap)', { size: 32, bold: true, color: '0f2b46' })], {
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }),
      p([r('پروژه بازی‌سازی آرکید سایبرپانک: «Neon Highway»', { size: 24, bold: true, color: '185a9d' })], {
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 }
      }),
      p([r('سرپرست فنی: رسول استواری | مهلت قطعی: سه‌شنبه ۲۰ آبان ۱۴۰۳ (ساعت ۲۳:۵۹)', { size: 20, bold: true, color: 'b91c1c' })], {
        alignment: AlignmentType.CENTER,
        spacing: { after: 220 }
      }),

      h1('۱. نتایج ارزیابی کدهای دریافتی مرحله اول'),
      h2('احسان کاظمی (فیزیک و دسکتاپ):'),
      bullet('نقاط قوت: شتاب خطی مناسب، اینرسی گردش فرمان با Lerp، لغزش روی روغن و کلیدهای دوگانه WASD و جهت‌نما.'),
      bullet('موارد اصلاحی: وب‌بروزر C# قدیمی است و باید به WebView2 یا Electron ارتقا یابد؛ کلیدهای جدید (SHIFT, E, C, H) اضافه شوند و مرز جاده کلمپ شود.'),

      h2('مریم ناظم‌سادات (گرافیک و ذرات):'),
      bullet('نقاط قوت: استایل مدرن HUD با skewX، رندرینگ مخروط چراغ جلو و نئون زیر ماشین، و ذرات شعله دوفازی نیترو.'),
      bullet('موارد اصلاحی: رندرینگ برداری سنگین است و باید با کش کردن اسپرایت‌ها در بوم مجازی (Offscreen Canvas) بهینه شود؛ ذرات شوک‌ویو EMP و فلاش پلیس افزوده شوند.'),

      h2('هانیه کاویانی (هوش مصنوعی و صوت):'),
      bullet('نقاط قوت: تفکیک ۴ لاین، واکنش هوشمند به بوق، محاسبه سبقت میلی‌متری و ذخیره رکوردها در localStorage.'),
      bullet('موارد اصلاحی: باگ بحرانی تداخل و تصادف ماشین‌ها در همدیگر (Overlap) با الگوریتم دافعه الاستیک و فاصله ایمن ۲۴۰ پیکسلی حل شود؛ سکوئنسر سینث‌ویو و هوش محاصره پلیس افزوده شوند.'),

      h1('۲. مأموریت‌های اختصاصی اسپرینت دوم (مهلت ۱ هفته)'),
      bullet('احسان کاظمی: ارتقای لانچر ویندوز، اتصال رویداد کلیدهای کمکی، و تیونینگ چسبندگی باران و کلمپ جاده.'),
      bullet('مریم ناظم‌سادات: بهینه‌سازی کش اسپرایت‌ها جهت تضمین ۶۰ فریم، استایل‌دهی تاخومتر و دنده‌شمار، و ذرات EMP و استروب پلیس.'),
      bullet('هانیه کاویانی: پیاده‌سازی فیزیک ضدتداخل خودروها (Anti-Overlap)، هوش تعقیب پلیس (Flanking)، و تکمیل موسیقی سینث‌ویو ۱۲۴ BPM.'),

      h1('۳. جدول زمان‌بندی روزانه (۱۳ الی ۲۰ آبان ۱۴۰۳)'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              cell('روز و تاریخ', true, 20),
              cell('احسان کاظمی', true, 26),
              cell('مریم ناظم‌سادات', true, 27),
              cell('هانیه کاویانی', true, 27)
            ]
          }),
          new TableRow({
            children: [cell('روز ۱ (۱۳ آبان)'), cell('جلسه هماهنگی و بررسی معماری Electron'), cell('تحلیل اسپرایت‌ها و کشینگ بوم'), cell('تحلیل الگوریتم دافعه و رفع تداخل')]
          }),
          new TableRow({
            children: [cell('روز ۲ (۱۴ آبان)'), cell('پیاده‌سازی کلیدهای SHIFT, E, C, H'), cell('ساخت بوم‌های حافظه (Offscreen)'), cell('کدنویسی فاصله ایمن ۲۴۰ پیکسلی')]
          }),
          new TableRow({
            children: [cell('روز ۳ (۱۵ آبان)'), cell('تیونینگ اصطکاک باران و مرز جاده'), cell('طراحی ذرات شوک‌ویو EMP'), cell('پیاده‌سازی فرمول دافعه الاستیک')]
          }),
          new TableRow({
            children: [cell('روز ۴ (۱۶ آبان)'), cell('تست لانچر و یکپارچه‌سازی ورودی‌ها'), cell('طراحی استایل تاخومتر و دنده‌شمار'), cell('پیاده‌سازی محاصره پلیس (Flanking)')]
          }),
          new TableRow({
            children: [cell('روز ۵ (۱۷ آبان)'), cell('اتصال سنسور شتاب جانبی (G-Force)'), cell('نورهای استروب ۹ هرتز پلیس'), cell('راه‌اندازی سکوئنسر سینث‌ویو ۱۲۴ BPM')]
          }),
          new TableRow({
            children: [cell('روز ۶ (۱۸ آبان)'), cell('تست فیزیک و رفع ایرادات حرکتی'), cell('کنترل پایداری ۶۰ فریم در لپ‌تاپ'), cell('تست بالانس مأموریت‌های سایبری')]
          }),
          new TableRow({
            children: [cell('روز ۷ (۱۹ آبان)'), cell('تست استرس و ساخت بیلد نهایی'), cell('تطبیق نهایی افکت‌ها و شیدرهای نئون'), cell('تست رانندگی ممتد بدون تداخل')]
          }),
          new TableRow({
            children: [cell('موعد تحویل (۲۰ آبان)'), cell('تحویل نهایی کدهای اصلاح‌شده به رسول استواری تا ساعت ۲۳:۵۹ جهت تست تجمیعی نهایی', false, 80)]
          })
        ]
      })
    ]
  }]
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(path.join(__dirname, 'SPRINT2_ROADMAP.docx'), buffer);
  console.log('DOCX_OK');
});

