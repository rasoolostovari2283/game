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
    size: options.size || 22, // 11pt
    bold: options.bold || false,
    color: options.color || '1f2937',
    rightToLeft: true,
    italics: options.italics || false
  });
}

function h1(text) {
  return p([r(text, { size: 28, bold: true, color: '0f2b46' })], {
    spacing: { before: 260, after: 140 }
  });
}

function h2(text) {
  return p([r(text, { size: 24, bold: true, color: '185a9d' })], {
    spacing: { before: 200, after: 100 }
  });
}

function h3(text) {
  return p([r(text, { size: 22, bold: true, color: '111827' })], {
    spacing: { before: 140, after: 80 }
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
      // Title
      p([r('سند جامع طراحی بازی (Game Design Document - GDD)', { size: 34, bold: true, color: '0f2b46' })], {
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }),
      p([r('پروژه اتومبیل‌رانی آرکید سایبرپانک: «Neon Highway»', { size: 26, bold: true, color: '185a9d' })], {
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 }
      }),
      p([r('پروژه درس مبانی بازی‌سازی (Game Design Fundamentals) — نگارش پایانی Release 2.5', { size: 20, bold: true, color: '4b5563' })], {
        alignment: AlignmentType.CENTER,
        spacing: { after: 220 }
      }),

      // Metadata Table
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              cell('مشخصات اثر: Arcade Highway Racer | موتور اختصاصی Canvas 2D | خروجی مستقل Windows Desktop x64', true, 100, AlignmentType.CENTER)
            ]
          }),
          new TableRow({
            children: [
              cell('تیم توسعه: رسول استواری (مدیر فنی و معمار سیستم) | احسان کاظمی (مهندس فیزیک و استقرار دسکتاپ) | مریم ناظم‌سادات (توسعه‌دهنده گرافیک و ذرات) | هانیه کاویانی (مهندس هوش مصنوعی، صوت و پیشرفت)', false, 100, AlignmentType.CENTER)
            ]
          })
        ]
      }),

      p([], { spacing: { after: 200 } }),

      // Section 1
      h1('۱. فلسفه طراحی و خلاصه اجرایی (High Concept & Vision)'),
      p([
        r('بازی '),
        r('Neon Highway', { bold: true }),
        r(' یک اثر اتومبیل‌رانی پرسرعت آرکید در اتمسفر نئونی-سایبرپانک آینده است. تمرکز پروژه بر خلق تجربه‌ای آدرنالین‌محور، بدون لگ، فوق‌العاده واکنش‌گرا و بهینه‌سازی‌شده برای دسکتاپ (۶۰ تا ۱۲۰ فریم) بدون وابستگی به فریم‌ورک‌های سنگین خارجی است. تمام اجزای گیم‌پلی، فیزیک شتاب، هوش مصنوعی ترافیک، جلوه‌های بصری ذرات و صدای رویه‌ای با کدنویسی خالص جاوااسکریپت و وب‌آدیو پیاده‌سازی شده‌اند.')
      ]),
      bullet('ستون ۱: سرعت خالص و کنترل دسکتاپ ۶۰ فریم با کیبورد و نرخ پاسخ‌دهی آنی بدون تاخیر.'),
      bullet('ستون ۲: مکانیک‌های نوآورانه سایبری (اتساع زمان Bullet-Time و پالس الکترومغناطیسی EMP برای کنترل ترافیک).'),
      bullet('ستون ۳: هاب تله‌متری کابین دسکتاپ مجهز به تاخومتر آنالوگ، دنده‌شمار، سنسور شتاب جانبی و رادار زنده GPS.'),
      bullet('ستون ۴: هوش مصنوعی ترافیک پویا با فیزیک دافعه و رفع کامل باگ تداخل وسایل نقلیه (Anti-Overlap).'),
      bullet('ستون ۵: سنتز صوتی زنده با Web Audio API در سبک Retro Synthwave بدون استفاده از فایل‌های صوتی سنگین خارجی.'),

      // Section 2
      h1('۲. حلقه اصلی گیم‌پلی و تجربه بازیکن (Core Gameplay Loop)'),
      p([
        r('چرخه گیم‌پلی بازی شامل ۵ گام پیوسته است: ۱) انتخاب خودرو، تنظیمات جوی و بررسی مأموریت‌ها در گاراژ؛ ۲) ورود به اتوبان و شتاب‌گیری تا سرعت‌های فراتر از ۲۰۰ کیلومتر؛ ۳) لایی‌کشی میلی‌متری (Near-Miss) و جاخالی دادن از موانع؛ ۴) مدیریت توان سایبری و فعال‌سازی اسلوموشن یا شلیک پالس EMP در لحظات بحرانی؛ ۵) کسب سکه و امتیاز، تکمیل چالش‌ها، ارتقای ۵ شاخص فنی در گاراژ و بازگشت با قدرت بیشتر.')
      ]),

      // Section 3
      h1('۳. حالات بازی و مراحل خط داستانی (Game Modes & Career Stages)'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              cell('حالت مسابقه', true, 25),
              cell('کد فنی', true, 18),
              cell('توصیف مکانیک و چالش‌ها', true, 42),
              cell('ضریب امتیاز', true, 15)
            ]
          }),
          new TableRow({
            children: [
              cell('یک‌طرفه (One-Way)'),
              cell('one_way'),
              cell('اتوبان ۴ لاینه مستقیم با ترافیک هم‌جهت؛ مناسب ثبت رکوردهای مسافتی و کمبوهای طولانی.'),
              cell('x1.0', false, 15, AlignmentType.CENTER)
            ]
          }),
          new TableRow({
            children: [
              cell('دوطرفه (Two-Way)'),
              cell('two_way'),
              cell('دو لاین مخالف با ترافیک روبه‌رو؛ ریسک تصادف شدید شاخ‌به‌شاخ همراه با پاداش امتیازی بالا.'),
              cell('x2.5', false, 15, AlignmentType.CENTER)
            ]
          }),
          new TableRow({
            children: [
              cell('بمب سرعت (Speed Bomb)'),
              cell('speed_bomb'),
              cell('بمب ساعتی روی شاسی خودرو با افت سرعت به زیر ۷۵ کیلومتر فعال شده و تایمر ۱۰ ثانیه‌ای آغاز می‌شود.'),
              cell('x1.8', false, 15, AlignmentType.CENTER)
            ]
          })
        ]
      }),

      p([], { spacing: { after: 140 } }),
      h2('مراحل داستانی پیشروی (Career Stages):'),
      bullet('مرحله ۱ — نئون توکیو: مسافت ۱۵۰۰ متر | آب‌وهوای شب صاف | سطح خطر پلیس صفر | جایزه ۵۰۰ سکه.'),
      bullet('مرحله ۲ — طوفان ساحلی: مسافت ۲۲۰۰ متر | آب‌وهوای بارانی شدید و لغزنده | سطح خطر پلیس ۱ | جایزه ۸۰۰ سکه.'),
      bullet('مرحله ۳ — تعقیب کوهستان: مسافت ۳۰۰۰ متر | آب‌وهوای غروب آفتاب | سطح خطر پلیس ۳ (تعقیب سنگین) | جایزه ۱۲۰۰ سکه.'),
      bullet('مرحله ۴ — هسته نهایی سایبر: مسافت ۴۰۰۰ متر | آب‌وهوای شب طوفانی | سطح خطر پلیس ۴ (محاصره کامل) | جایزه ۲۵۰۰ سکه.'),

      // Section 4
      h1('۴. مکانیک‌های نوآورانه سایبری (Innovative Cyber Mechanics)'),
      h2('۴.۱. مکانیک اول: اسلوموشن واکنشی ماتریسی (Cyber Bullet-Time Time Dilation)'),
      p([
        r('با نگه داشتن کلید '),
        r('[SHIFT]', { bold: true }),
        r(' یا لمس نشانگر اسلوموشن، مقیاس زمان بازی (timeScale) از ۱.۰ به ۰.۳۵ کاهش یافته و دنیای بازی به آرامی کند می‌شود. در این حالت فرمان‌پذیری خودروی بازیکن با ضریب ویژه ۰.۷۲ حفظ می‌شود تا بازیکن واکنش‌های سریع ماتریسی را به اجرا بگذارد. مصرف انرژی ۱۸ واحد در ثانیه بوده و هاله نئونی آبی شعاعی به همراه رد سایبری خودرو (Ghost Trails) ترسیم می‌گردد.')
      ]),
      h2('۴.۲. مکانیک دوم: هک سایبری مسیر و پالس الکترومغناطیسی (Cyber EMP & Route Hack)'),
      p([
        r('با فشردن کلید '),
        r('[E]', { bold: true }),
        r('، پالس انرژی به ارزش ۲۸ واحد شلیک می‌شود. اگر هدف خودروی ترافیک شهری باشد، کنترل خودکار آن هک شده و برای ۳.۵ ثانیه به بیرونی‌ترین لاین‌ها رانده می‌شود تا مسیر باز شود (+۱۸۰ امتیاز). اگر هدف خودروی پلیس باشد، موج صاعقه‌ای EMP موتور پلیس را برای ۴.۵ ثانیه قفل و سرعت آن را به ۲۲ کیلومتر کاهش می‌دهد (+۳۵۰ امتیاز).')
      ]),

      // Section 5
      h1('۵. فیزیک خودرو و کلیدهای کنترل دسکتاپ (Physics & Desktop Controls)'),
      p([
        r('فیزیک بازی مبتنی بر شتاب خطی متناسب با مشخصات ارتقا یافته، مقاومت آیرودینامیک هوا، ترمز هیدرولیک با افکت دود تایر، و درون‌یابی خطی (Lerp) با ضریب ۱۶ برای نرمی گردش فرمان است:')
      ]),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              cell('عملکرد', true, 25),
              cell('کلید اصلی', true, 20),
              cell('کلید کمکی', true, 20),
              cell('شرح عملکرد', true, 35)
            ]
          }),
          new TableRow({
            children: [cell('گاز / شتاب'), cell('W'), cell('Arrow Up'), cell('شتاب‌گیری خطی تا حداکثر سرعت')]
          }),
          new TableRow({
            children: [cell('ترمز / کاهش سرعت'), cell('S'), cell('Arrow Down'), cell('ترمز شدید همراه با دود لاستیک و رد ترمز')]
          }),
          new TableRow({
            children: [cell('گردش به چپ / راست'), cell('A / D'), cell('Left / Right'), cell('گردش نرم عرضی در لاین‌ها با شیب بدنه')]
          }),
          new TableRow({
            children: [cell('نیتروژن مایع'), cell('SPACE'), cell('—'), cell('شتاب ناگهانی با فوران شعله نئونی')]
          }),
          new TableRow({
            children: [cell('اسلوموشن ماتریسی'), cell('SHIFT'), cell('—'), cell('اتساع ۶۵ درصدی زمان با مصرف انرژی')]
          }),
          new TableRow({
            children: [cell('هک مسیر / EMP'), cell('E'), cell('—'), cell('پرتاب پالس الکترومغناطیسی')]
          }),
          new TableRow({
            children: [cell('تغییر زاویه دوربین'), cell('C'), cell('—'), cell('نمای ۲ بعدی، ۳ بعدی و اول‌شخص داشبورد')]
          }),
          new TableRow({
            children: [cell('بوق زدن'), cell('H'), cell('—'), cell('هشدار به خودروها و باز کردن مسیر')]
          }),
          new TableRow({
            children: [cell('توقف بازی (Pause)'), cell('ESC'), cell('P'), cell('توقف راند و نمایش منوی تنظیمات')]
          })
        ]
      }),

      p([], { spacing: { after: 140 } }),

      // Section 6
      h1('۶. معماری داشبورد دسکتاپ و هاب تله‌متری (Cockpit Telemetry Hub)'),
      bullet('پنل چپ — مرکز تله‌متری: تاخومتر آنالوگ و بار دور موتور (۰ تا ۸۵۰۰ RPM با محدوده قرمز ۷۵۰۰+)، نشانگر دنده فعال گیربکس (GEAR 1 تا 7 متناسب با سرعت)، و نشانگر سبز وضعیت سیستم (SYS OK).'),
      bullet('پنل راست — رادار ناوبری تاکتیکی: اسکنر ۲۰۰۰ پیکسلی مسیر پیش‌رو، ردیابی بلادرنگ خودروی بازیکن، ترافیک، پلیس و سکه‌ها، سنسور شتاب گریز از مرکز (G-Force Meter) و ردیاب زنده ماموریت فعال.'),
      bullet('هاب میانی: سرعت‌سنج دیجیتال KM/H، نوار مصرف نیتروژن، نوار انرژی سایبری (Cyber Energy) و نشانگرهای کیبورد.'),

      // Section 7
      h1('۷. هوش مصنوعی ترافیک و فیزیک ضدتداخل (Traffic AI & Anti-Overlap)'),
      bullet('تنوع وسایل نقلیه: سدان شهری (۷۰ km/h)، شاسی‌بلند SUV (۶۵ km/h)، کامیون سنگین (۵۰ km/h)، کوپه اسپرت (۹۰ km/h) و رهگیر پلیس (۱۱۵ km/h).'),
      bullet('فیزیک ضدتداخل (Anti-Overlap Pass): اسکن فاصله طولی خودروها در هر لاین، تطبیق سرعت با خودروی جلویی در فاصله زیر ۲۴۰ پیکسل و اعمال دافعه الاستیک دوطرفه در صورت نزدیک شدن عرضی و طولی.'),
      bullet('هوش تعقیب پلیس (Flanking AI): در Heat Level بالای ۲، دو پلیس با تاکتیک محاصره جناحین از چپ و راست وارد شده و راه فرار را سد می‌کنند.'),

      // Section 8
      h1('۸. ناوگان خودروها، گاراژ و تیونینگ (Fleet Catalog & Tuning)'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              cell('نام خودرو', true, 25),
              cell('کلاس بدنه', true, 20),
              cell('قیمت (سکه)', true, 18),
              cell('سرعت پایه', true, 17),
              cell('شتاب / هندلینگ / ترمز', true, 20)
            ]
          }),
          new TableRow({
            children: [cell('Cyber Hatch'), cell('هاچ‌بک شهری'), cell('رایگان'), cell('140 km/h'), cell('5.5 / 6.5 / 6.0')]
          }),
          new TableRow({
            children: [cell('Muscle GT 69'), cell('ماسل کلاسیک'), cell('800'), cell('165 km/h'), cell('7.2 / 5.8 / 6.5')]
          }),
          new TableRow({
            children: [cell('Tokyo RX-Drift'), cell('تیونینگ ژاپنی'), cell('1,800'), cell('190 km/h'), cell('8.0 / 8.5 / 7.8')]
          }),
          new TableRow({
            children: [cell('Interceptor V8'), cell('رهگیر پلیس'), cell('3,200'), cell('215 km/h'), cell('8.8 / 8.0 / 8.5')]
          }),
          new TableRow({
            children: [cell('Hyper Cyber 2077'), cell('سوپراسپرت آینده'), cell('5,500'), cell('250 km/h'), cell('9.8 / 9.5 / 9.2')]
          })
        ]
      }),
      p([r('امکانات ارتقا: ۵ سطح ارتقا برای ۵ شاخص فنی (+۸ km/h سرعت در هر سطح) + ۸ رنگ بدنه نئونی متالیک + ۶ رنگ نئون زیر شاسی.')], { spacing: { before: 80, after: 120 } }),

      // Section 9
      h1('۹. سیستم شرایط جوی و اتمسفر بصری (Weather & Atmospheric System)'),
      bullet('شب نئونی (Cyber Night): آسمان صاف، بازتاب نوری چراغ‌ها و آسمان‌خراش‌ها، چسبندگی حداکثری تایرها.'),
      bullet('هوای بارانی (Heavy Rain): بارش ۱۵۰ قطره باران مایل، ترشح آب از چرخ‌ها، چاله‌های آب روی آسفالت و کاهش ۱۰ درصدی اصطکاک جاده.'),
      bullet('غروب آفتاب (Neon Sunset): پالت گرم بنفش و نارنجی با افق نئونی و کنتراست ملایم‌تر.'),

      // Section 10
      h1('۱۰. موتور سنتز صوتی رویه‌ای (Web Audio Synthesizer Engine)'),
      bullet('موسیقی متن سینث‌ویو ۱۲۴ BPM در گام ر مینور (D minor) با سکوئنسر ۱۶ استپی کیک‌درام ساب‌بیس، اسنیر نویز ۹۰۰ هرتز، بیس‌لاین غلتان و لید ملودی پنتاگونیک.'),
      bullet('شبیه‌ساز دور موتور با نوسان‌ساز دندانه‌اره‌ای متغیر بین ۴۵ تا ۲۸۰ هرتز همگام با دنده‌ها و پیچ گاز.'),
      bullet('افکت‌های ویژه هک دیجیتال، پالس الکترومغناطیسی EMP و سوئیچ اسلوموشن به صورت کاملاً کدنویسی‌شده.'),

      // Section 11
      h1('۱۱. اقتصاد بازی، ماموریت‌ها و ثبت رکوردها (Economy & Missions)'),
      bullet('۸ ماموریت شاخص با پاداش‌های ۳۰۰ تا ۶۰۰ سکه شامل لایی‌کشی برق‌آسا، دیوانگی سرعت، خلاف جهت مرگبار، هکر سایبری و واکنش ماتریسی.'),
      bullet('سیستم سبقت‌های میلی‌متری (Near Miss) با فاصله کمتر از ۲۰ پیکسل و ضرایب کمبو تا سقف ۵ برابر.'),
      bullet('ذخیره‌سازی دائمی رکوردها، سکه‌ها و ارتقاها در حافظه مرورگر و دسکتاپ (localStorage).'),

      // Section 12
      h1('۱۲. معماری فنی، بهینه‌سازی ۶۰ فریم و استقرار (Technical Stack & Packaging)'),
      bullet('بهینه‌سازی نرخ فریم: پیش‌رندرینگ و کروماکی اسپرایت‌ها به ۱۶۰x۳۲۰ پیکسل، حذف فیلترهای سنگین در رندر زنده، کش پترن آسفالت و مستقل‌سازی فیزیک با دلتا تایم دقیق performance.now().'),
      bullet('بسته‌بندی ویندوز دسکتاپ: بیلد نیتیو ۶۴ بیتی مستقل با Electron Packager مستقر در dist/NeonHighway-win32-x64/.'),
      bullet('فایل فشرده آماده تحویل: پکیج کامل ۱۶۶ مگابایتی در مسیر C:\\Users\\Rasool\\Desktop\\بازی\\NeonHighway_Windows.zip.'),

      // Section 13
      h1('۱۳. ماتریکس وظایف و مشارکت اعضای تیم (Team Roles & Contributions)'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              cell('ردیف', true, 10, AlignmentType.CENTER),
              cell('نام و نام خانوادگی', true, 25),
              cell('سمت تخصصی', true, 30),
              cell('حوزه تمرکز و ماژول‌های توسعه داده شده', true, 35)
            ]
          }),
          new TableRow({
            children: [
              cell('۱', false, 10, AlignmentType.CENTER),
              cell('رسول استواری'),
              cell('مدیر فنی و معمار سیستم (Lead Engine Architect)'),
              cell('معماری گیم‌لوپ، مدیریت وضعیت‌ها، مکانیک‌های سایبری اسلوموشن و هک EMP، یکپارچه‌سازی و تست (game.js, index.html)')
            ]
          }),
          new TableRow({
            children: [
              cell('۲', false, 10, AlignmentType.CENTER),
              cell('احسان کاظمی'),
              cell('مهندس فیزیک و استقرار دسکتاپ (Physics & Desktop Engineer)'),
              cell('فیزیک خودرو، شتاب و ترمز، کنترل‌های دسکتاپ، الگوریتم جداسازی ترافیک، بسته‌بندی Electron و لانچر C# (Launcher.cs, package.json)')
            ]
          }),
          new TableRow({
            children: [
              cell('۳', false, 10, AlignmentType.CENTER),
              cell('مریم ناظم‌سادات'),
              cell('توسعه‌دهنده گرافیک و سیستم ذرات (Graphics, Shaders & VFX)'),
              cell('شبیه‌سازی ذرات باران، چاله‌ها، دود تایرها، رندرینگ نئون، افکت‌های کروماتیک و استایل شیشه‌ای (particles.js, cars.js, style.css)')
            ]
          }),
          new TableRow({
            children: [
              cell('۴', false, 10, AlignmentType.CENTER),
              cell('هانیه کاویانی'),
              cell('مهندس هوش مصنوعی، صوت و گیمیفیکیشن (AI, Audio & Gameplay Engineer)'),
              cell('هوش مصنوعی ترافیک، تعقیب محاصره‌ای پلیس، سنتز صوتی سینث‌ویو و افکت‌ها، سیستم ماموریت‌ها و گاراژ (traffic.js, audio.js, missions.js)')
            ]
          })
        ]
      }),

      p([], { spacing: { after: 140 } }),

      // Section 14
      h1('۱۴. نتیجه‌گیری و افق‌های توسعه آتی (Conclusion & Future Roadmap)'),
      p([
        r('پروژه Neon Highway اثبات کرد که با تسلط بر ساختارهای شیءگرا، پردازش بلادرنگ Canvas و سنتز صوتی وب‌آدیو، می‌توان بدون نیاز به موتورهای حجیم تجاری یک بازی کامپیوتری مدرن، سریع، خلاقانه و بی‌نهایت روان برای پلتفرم ویندوز دسکتاپ تولید کرد.')
      ]),
      bullet('افق ۱: پشتیبانی کامل از گیم‌پد و دسته‌های بازی با فیدبک هپتیک (Gamepad API).'),
      bullet('افق ۲: بخش آنلاین و مقایسه رکوردهای جهانی بر بستر وب‌سوکت (Global Leaderboards).'),
      bullet('افق ۳: باس‌فایت‌های مکانیزه در انتهای مراحل ۴ با خودروهای سنگین هوایی و زرهی.')
    ]
  }]
});

Packer.toBuffer(doc).then((buffer) => {
  const outputPath = path.join(__dirname, 'GDD_Neon_Highway.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Successfully generated master GDD at: ${outputPath}`);
}).catch(err => {
  console.error("Error generating docx:", err);
  process.exit(1);
});
