export const providerDefaults = {
  "legal_name": "شركة خبراء الرحلات للسفر والسياحة (ذ م م )",
  "legal_name_en": "Trips Experts Company For Travel And Tourism",
  "national_address": "المملكة العربية السعودية - القصيم - المذنب - حي الخالدية - طريق الملك عبدالعزيز",
  "postal_code": "56522",
  "building_number": "7466",
  "additional_number": "4237",
  "commercial_registration": "1010459001",
  "tourism_license_type": "وكالة سفر وسياحية - تنظيم الرحلات السياحية",
  "tourism_license_number": "731-5234",
  "vat_number": "313037812100003",
  "iata_number": "71241656",
  "general_manager": "خالد عبدالله الحسين",
  "website": "https://tripsexperts.com",
  "social_handle": "tripsexperts",
  "phone": "920016182",
  "company_phone": "0592244551",
  "email": "info@tripsexperts.com",
  "authorized_signatory": "خالد عبدالله الحسين",
  "signatory_title": "المدير العام للشركة",
  "iban": "SA7680000151608010428024",
  "bank_name": "مصرف الراجحي",
  "dispute_city": "منطقة القصيم",
  "service_fee_policy": "عمولة ثابتة قدرها 10 ريالات سعودية لكل خدمة يتم تنفيذها، غير شاملة ضريبة القيمة المضافة التي تضاف وفق النسبة النظامية. لا تفرض خبراء الرحلات رسوم خدمات إضافية أخرى حاليًا؛ وقيمة الخدمة ورسوم المورد مستقلة عن العمولة.",
  "work_hours": "",
  "emergency_phone": "",
  "termination_notice_days": 30
};
export type ProviderProfile = typeof providerDefaults & {id:string;updated_at:string};
export const providerFields = [
  ["service_fee_policy", "رسوم الخدمات / الملحق التجاري"],
  ["work_hours", "أيام وساعات العمل"],
  ["emergency_phone", "رقم دعم الطوارئ"],
  ["bank_name", "المصرف"],
  [
    "legal_name",
    "الاسم النظامي بالعربية"
  ],
  [
    "legal_name_en",
    "الاسم النظامي بالإنجليزية"
  ],
  [
    "national_address",
    "العنوان"
  ],
  [
    "postal_code",
    "الرمز البريدي"
  ],
  [
    "building_number",
    "رقم المبنى"
  ],
  [
    "additional_number",
    "الرقم الفرعي"
  ],
  [
    "commercial_registration",
    "السجل التجاري"
  ],
  [
    "tourism_license_type",
    "نوع الترخيص السياحي"
  ],
  [
    "tourism_license_number",
    "رقم الترخيص السياحي"
  ],
  [
    "vat_number",
    "الرقم الضريبي"
  ],
  [
    "iata_number",
    "رقم الأياتا"
  ],
  [
    "general_manager",
    "المدير العام"
  ],
  [
    "website",
    "الموقع الإلكتروني"
  ],
  [
    "social_handle",
    "حسابات التواصل الاجتماعي"
  ],
  [
    "phone",
    "الرقم الموحد"
  ],
  [
    "company_phone",
    "رقم الشركة"
  ],
  [
    "email",
    "البريد الرسمي"
  ],
  [
    "authorized_signatory",
    "المفوض بالتوقيع"
  ],
  [
    "signatory_title",
    "صفة المفوض"
  ],
  [
    "iban",
    "الآيبان"
  ],
  [
    "dispute_city",
    "مدينة الاختصاص القضائي"
  ],
  [
    "termination_notice_days",
    "مهلة إشعار إنهاء العقد (بالأيام)"
  ]
] as const;
