export const REGIONS = ['አዲስ አበባ', 'ድሬዳዋ', 'አማራ', 'ኦሮሚያ', 'ትግራይ', 'ሲዳማ', 'ሶማሌ', 'አፋር', 'ቤንሻንጉል ጉሙዝ', 'ጋምቤላ', 'ሐረሪ', 'ማዕከላዊ ኢትዮጵያ', 'ደቡብ ምዕራብ ኢትዮጵያ', 'ደቡብ ኢትዮጵያ'];
export const PAY = ['telebirr', 'CBE Birr', 'ንግድ ባንክ', 'አዋሽ ባንክ', 'ዳሽን ባንክ', 'አቢሲኒያ ባንክ', 'ሌላ'];
export const STEPS = [['placed', '📝', 'ታዘዘ'], ['payment_submitted', '💳', 'ክፍያ ተላከ'], ['paid', '✅', 'ተረጋገጠ'], ['preparing', '📦', 'እየተዘጋጀ'], ['shipped', '🚚', 'ተላከ'], ['delivered', '🤝', 'ደረሰ'], ['settled', '💰', 'ለሻጭ ተከፈለ']];
export const STATUS_X = { cancelled: 'ተሰርዟል', refund_pending: 'ተመላሽ በመጠባበቅ', refunded: 'ተመላሽ ተደርጓል', disputed: 'ክርክር ላይ' };
export const stepLabel = s => STATUS_X[s] || (STEPS.find(x => x[0] === s) || [0, 0, s])[2];
const ERR = {
  login_required: 'መጀመሪያ ይግቡ', not_registered: 'መጀመሪያ አካውንት ይክፈቱ', invalid: 'መረጃው ወይም የይለፍ ቃሉ ትክክል አይደለም', suspended: 'አካውንትዎ ታግዷል — አድሚኑን ያነጋግሩ',
  too_many_attempts: 'ብዙ ሙከራ — ትንሽ ቆይተው ይሞክሩ', slow_down: 'ትንሽ ቆይተው ይሞክሩ', invalid_email: 'ትክክለኛ ኢሜይል ያስገቡ', invalid_phone: 'ትክክለኛ የኢትዮጵያ ስልክ (09… ወይም 07…) ያስገቡ',
  weak_password: 'የይለፍ ቃል ቢያንስ 8 ቁምፊ መሆን አለበት', email_taken: 'ይህ ኢሜይል ቀድሞ ተመዝግቧል', phone_taken: 'ይህ ስልክ ቁጥር ቀድሞ ተመዝግቧል', already_registered: 'ቀድሞ ተመዝግበዋል',
  invalid_otp: 'ኮዱ ትክክል አይደለም', otp_expired: 'ኮዱ ጊዜው አልፏል — እንደገና ይጀምሩ', otp_not_ready: 'መጀመሪያ በ Telegram ስልክዎን ያረጋግጡ', request_not_found: 'ጥያቄው አልተገኘም — እንደገና ይጀምሩ', phone_not_verified: 'ስልክ ቁጥር አልተረጋገጠም',
  telegram_not_configured: 'የ Telegram Bot አልተዘጋጀም', network: 'ግንኙነት የለም፤ እንደገና ይሞክሩ', missing_fields: 'ሁሉንም አስፈላጊ መረጃ ያሟሉ', bad_fields: 'መረጃውን ያሟሉ (ስም፣ ዋጋ፣ ብዛት፣ ምድብ)', bad_image: 'ምስሉ ተቀባይነት የለውም',
  open_shop_first: 'መጀመሪያ ሱቅዎን ይክፈቱ', own_product: 'የራስዎን ዕቃ መግዛት አይቻልም', payout_required: 'የክፍያ መቀበያ መረጃ ያስፈልጋል', payment_proof_required: 'የክፍያ ዘዴ እና የማጣቀሻ ቁጥር ያስገቡ',
  payout_ref_required: 'የክፍያ ማጣቀሻ ቁጥር ያስገቡ', refund_ref_required: 'የተመላሽ ማጣቀሻ ቁጥር ያስገቡ', reason_required: 'ምክንያት ይጻፉ', open_worker_first: 'ለማመልከት መጀመሪያ የሠራተኛ ገጽ ይክፈቱ', open_employer_first: 'መጀመሪያ የአሰሪ ገጽ ይክፈቱ',
  already_applied: 'ቀድሞ አመልክተዋል', own_job: 'የራስዎን ሥራ ማመልከት አይቻልም', own_profile: 'ለራስዎ መላክ አይቻልም', message_required: 'መልዕክት ይጻፉ', admin_only: 'አድሚን ብቻ', not_found: 'አልተገኘም', too_many: 'ከተፈቀደው ብዛት አልፈዋል', not_yours: 'ይህ የእርስዎ አይደለም', admin_cannot: 'አድሚን ይህን ማድረግ አይችልም', missing_fields_page: 'ርዕስ ያስገቡ',
};
export function errText(e) {
  e = String(e || ''); if (e.startsWith('out_of_stock')) return 'በቂ ክምችት የለም፦ ' + e.split(':')[1]; if (e.startsWith('wrong_step')) return 'ይህ እርምጃ አሁን አይፈቀድም (ሁኔታው ተቀይሯል)፤ ገጹን ያድሱ';
  if (e.startsWith('no_delivery')) return 'ይህ ሱቅ ማድረስ አያደርግም፦ ' + e.split(':')[1]; if (e.startsWith('no_pickup')) return 'ይህ ሱቅ በአካል መውሰድ አይፈቅድም፦ ' + e.split(':')[1]; if (e.startsWith('required_missing')) return 'ያልተሞላ አስፈላጊ መስክ፦ ' + e.split(':').slice(1).join(':'); if (e.startsWith('unavailable')) return 'አልተገኘም፦ ' + e.split(':')[1];
  return ERR[e] || 'ስህተት፦ ' + e;
}
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://www.ethiodigitalmarket.pro.et').replace(/\/+$/, '');
