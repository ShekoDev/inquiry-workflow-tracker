const ar = {
  app: { name: 'PIQCS', fullName: 'نظام إدارة ومتابعة الاستفسارات وعروض الأسعار', copyright: 'جميع حقوق الملكية محفوظة لمحمود شهاب' },
  common: {
    save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', add: 'إضافة', create: 'إنشاء', search: 'بحث', filter: 'تصفية',
    actions: 'إجراءات', yes: 'نعم', no: 'لا', confirm: 'تأكيد', close: 'إغلاق', back: 'رجوع', next: 'التالي', loading: 'جارٍ التحميل...',
    noData: 'لا توجد بيانات', all: 'الكل', from: 'من', to: 'إلى', date: 'التاريخ', time: 'الوقت', by: 'بواسطة', status: 'الحالة',
    name: 'الاسم', nameAr: 'الاسم بالعربي', nameEn: 'الاسم بالإنجليزي', email: 'البريد الإلكتروني', phone: 'الهاتف', notes: 'ملاحظات',
    required: 'هذا الحقل مطلوب', saved: 'تم الحفظ بنجاح', deleted: 'تم الحذف', error: 'حدث خطأ', success: 'تمت العملية بنجاح',
    export: 'تصدير', excel: 'Excel', pdf: 'PDF', print: 'طباعة', total: 'الإجمالي', active: 'نشط', inactive: 'موقوف',
    view: 'عرض', details: 'التفاصيل', select: 'اختر...', none: 'لا يوجد', days: 'يوم', hours: 'ساعة', minutes: 'دقيقة',
    language: 'اللغة', theme: 'الثيم', darkMode: 'الوضع الداكن', lightMode: 'الوضع الفاتح', systemMode: 'حسب النظام',
    logout: 'تسجيل الخروج', profile: 'الملف الشخصي', reason: 'السبب', remark: 'ملاحظة', unknown: 'غير معروف',
    confirmDelete: 'هل أنت متأكد من الحذف؟ لا يمكن التراجع.', permissionDenied: 'ليس لديك صلاحية لهذا الإجراء',
    version: 'الإصدار', me: 'أنا', today: 'اليوم', thisWeek: 'هذا الأسبوع', thisMonth: 'هذا الشهر', currency: 'ر.س',
    optional: 'اختياري', apply: 'تطبيق', reset: 'إعادة ضبط', download: 'تنزيل', upload: 'رفع', file: 'ملف', size: 'الحجم',
    englishOnly: 'اكتب بالإنجليزية — الاسم ده هيظهر في كل الشاشات والتقارير'
  },
  nav: {
    dashboard: 'اللوحة الرئيسية', inquiries: 'الاستفسارات', newInquiry: 'استفسار جديد', approvals: 'طابور الاعتماد',
    extensions: 'طلبات التمديد', clients: 'العملاء', projects: 'المشاريع', users: 'المستخدمون', roles: 'الأدوار والصلاحيات',
    activityLog: 'سجل النشاط', settings: 'الإعدادات', reports: 'التقارير', admin: 'الإدارة', masterData: 'البيانات الأساسية',
    work: 'العمل', quotations: 'عروض الأسعار', team: 'المهندسون والمسوقون', tasks: 'المهام', issues: 'المشاكل', trash: 'سلة المحذوفات'
  },
  auth: {
    login: 'تسجيل الدخول', password: 'كلمة المرور', forgot: 'نسيت كلمة المرور؟', sendReset: 'إرسال رابط الاستعادة',
    resetSent: 'تم إرسال رابط الاستعادة إلى بريدك', invalid: 'البريد أو كلمة المرور غير صحيحة', inactive: 'هذا الحساب موقوف. تواصل مع مدير النظام.',
    changePassword: 'تغيير كلمة المرور', newPassword: 'كلمة المرور الجديدة', confirmPassword: 'تأكيد كلمة المرور',
    mustChange: 'يجب تغيير كلمة المرور قبل المتابعة', mismatch: 'كلمتا المرور غير متطابقتين', weak: 'كلمة المرور ضعيفة: 8 أحرف على الأقل وحرف كبير ورقم',
    welcome: 'مرحباً بك', signIn: 'دخول', tooMany: 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.',
    setupTitle: 'الإعداد الأولي — إنشاء المدير الأعلى', setupDesc: 'لا يوجد مستخدمون بعد. أنشئ حساب المدير الأعلى (Super Admin) لبدء النظام.',
    dbUnreachable: 'تعذّر الاتصال بقاعدة البيانات. تأكد من نشر قواعد الأمان ثم أعد تحميل الصفحة.', retry: 'إعادة المحاولة',
    setupDone: 'تم إنشاء حساب المدير الأعلى. سجّل الدخول الآن.'
  },
  dashboard: {
    title: 'اللوحة الرئيسية', total: 'إجمالي الاستفسارات', new: 'جديد', processing: 'قيد المعالجة', waitingInfo: 'انتظار معلومات',
    underReview: 'قيد الاعتماد', approved: 'معتمد', sentToClient: 'أُرسل للعميل', overdue: 'متأخر', won: 'ترسية', lost: 'خسارة',
    pendingByRep: 'الاستفسارات المعلّقة لكل مسوق', engineerWorkload: 'حمل العمل على المهندسين', dueToday: 'مستحق اليوم',
    active: 'نشط', myInquiries: 'استفساراتي', statusBreakdown: 'توزيع الحالات', recurringIssues: 'المشاكل المتكررة', recent: 'أحدث الاستفسارات',
    eod: 'تقرير نهاية اليوم', winRate: 'معدل التحويل', avgProcessing: 'متوسط زمن المعالجة', normal: 'طبيعي', high: 'مرتفع', overloaded: 'مثقل',
    quotations: 'عروض الأسعار الجارية', noQuotations: 'لا توجد عروض أسعار', awaitingPickup: 'ينتظر الاستلام',
    inProgressNow: 'شغّال عليه الآن', byCountry: 'التوزيع حسب الدولة', avgResponse: 'متوسط زمن الاستجابة'
  },
  inquiry: {
    title: 'الاستفسارات', one: 'استفسار', no: 'رقم الاستفسار', client: 'العميل', project: 'المشروع', salesperson: 'المسوق',
    engineer: 'المهندس المسند', priorityEngineer: 'مهندس الأولويات', scope: 'نطاق العمل', scopeAr: 'نطاق العمل (عربي)', scopeEn: 'نطاق العمل (إنجليزي)',
    scopeType: 'نوع العمل', received: 'تاريخ الاستلام', requiredDate: 'تاريخ التسليم المطلوب', priority: 'الأولوية', priorityReason: 'سبب الأولوية',
    deadline: 'الموعد النهائي', delay: 'التأخير', estimatedValue: 'القيمة التقديرية', create: 'تسجيل استفسار جديد', edit: 'تعديل الاستفسار',
    workflow: 'سير العمل', currentAction: 'الإجراء الحالي', changeStatus: 'تغيير الحالة', moveTo: 'الانتقال إلى',
    assign: 'إسناد لمهندس', setPriority: 'تحديد الأولوية', startProcessing: 'بدء المعالجة', requestInfo: 'طلب معلومات ناقصة',
    infoReceived: 'تم استلام المعلومات', missingInfo: 'المعلومات الناقصة', missingItem: 'بند ناقص', addItem: 'إضافة بند',
    remarks: 'الملاحظات', addRemark: 'إضافة ملاحظة', attachments: 'المرفقات', history: 'سجل الحركة', costing: 'المشاكل',
    quotations: 'عروض الأسعار', followUps: 'المتابعات', overview: 'البيانات', totalElapsed: 'الزمن الكلي', netWorking: 'زمن العمل الصافي',
    paused: 'وقت الإيقاف', overdue: 'متأخر', onTime: 'في الموعد', noInquiries: 'لا توجد استفسارات', mine: 'استفساراتي فقط',
    pendingQuote: 'لم يُسعَّر بعد', statusNote: 'ملاحظة الانتقال', noteRequired: 'الملاحظة إجبارية لهذه الحالة',
    requestExtension: 'طلب تمديد', extensionReason: 'سبب التمديد', newDeadline: 'الموعد الجديد', currentDeadline: 'الموعد الحالي',
    autoPriority: 'أولوية تلقائية', manualPriority: 'أولوية يدوية', outcome: 'النتيجة', lostReason: 'سبب الخسارة', competitorPrice: 'سعر المنافس',
    awardValue: 'قيمة الترسية', poNumber: 'رقم أمر الشراء', closedAt: 'تاريخ الإغلاق', nextFollowUp: 'المتابعة القادمة',
    created: 'تم تسجيل الاستفسار', transitionDone: 'تم تغيير الحالة', invalidTransition: 'هذا الانتقال غير مسموح',
    filterStatus: 'الحالة', filterPriority: 'الأولوية', filterEngineer: 'المهندس', filterSales: 'المسوق', searchPlaceholder: 'رقم الاستفسار / العميل / المشروع',
    deletedRecoverable: 'تم الحذف — تقدر ترجّعه من سلة المحذوفات خلال 30 يوم',
    deleteConfirm: 'حذف الاستفسار مع كل بياناته (عروض الأسعار، المهام، المشاكل، المتابعات، المرفقات، سجل الحركة)؟ هيتحفظ في سلة المحذوفات 30 يوم وتقدر ترجّعه.', assignedTo: 'مُسند إلى', unassigned: 'غير مُسند', slaHours: 'ساعات الـSLA',
    country: 'الدولة', filterCountry: 'الدولة', allCountries: 'كل الدول',
    tracking: 'تتبع الاستفسار', acknowledge: 'استلام وبدء العمل', acknowledged: 'تم الاستلام',
    acknowledgedBy: 'استلمه', acknowledgedAt: 'وقت الاستلام', notAcknowledged: 'لم يُستلم بعد',
    ackDone: 'تم تسجيل الاستلام وبدأ احتساب الوقت', ackHint: 'اضغط لتأكيد استلامك للاستفسار — من هذه اللحظة يبدأ احتساب وقت العمل',
    responseTime: 'زمن الاستجابة', waitingPickup: 'في انتظار الاستلام', workTime: 'وقت العمل', workRunning: 'الوقت يعمل الآن',
    remaining: 'المتبقي', slaUsed: 'المستهلك من المهلة', quotationNo: 'رقم عرض السعر', quotationStatus: 'حالة العرض',
    noQuotationYet: 'لا يوجد عرض بعد',
    manualNo: 'رقم الاستفسار (يدوي)', manualNoHint: 'أدخل الرقم كما تريده — الترقيم التلقائي معطّل من الإعدادات',
    autoNoHint: 'يُنشأ الرقم تلقائياً عند الحفظ', noRequired: 'رقم الاستفسار مطلوب', noTaken: 'هذا الرقم مستخدم في استفسار آخر',
    checkingNo: 'جارٍ التحقق من الرقم…', noFree: 'الرقم متاح',
    potentialDuplicates: 'عثرنا على استفسارات مشابهة',
    saveFilter: 'احفظ هذا الفلتر', filterName: 'اسم الفلتر'
  },
  status: {
    NEW: 'مستلم جديد', FILE_REVIEW: 'مراجعة الملفات', WAITING_INFO: 'انتظار معلومات', PRIORITY_ASSIGNMENT: 'تحديد الأولوية',
    ASSIGNED: 'مُسند', PROCESSING: 'قيد المعالجة', COSTING: 'جارٍ التسعير (السيستم الرئيسي)', QUOTATION_PREP: 'إعداد عرض السعر',
    UNDER_REVIEW: 'قيد اعتماد الإدارة', REVISION_REQUIRED: 'مطلوب تعديل', APPROVED: 'معتمد', SENT_TO_SALES: 'أُرسل للمسوق',
    SENT_TO_CLIENT: 'أُرسل للعميل', FOLLOW_UP: 'متابعة', CLIENT_REVISION: 'طلب تعديل من العميل', WON: 'ترسية', LOST: 'خسارة',
    NO_BID: 'اعتذار / No Bid', CANCELLED: 'ملغى من العميل', ON_HOLD: 'معلّق مؤقتاً'
  },
  qstatus: {
    DRAFT: 'مسودة', UNDER_REVIEW: 'قيد الاعتماد', REVISION_REQUIRED: 'مطلوب تعديل', APPROVED: 'معتمد', REJECTED: 'مرفوض',
    SENT_TO_SALES: 'أُرسل للمسوق', SENT_TO_CLIENT: 'أُرسل للعميل', SUPERSEDED: 'مستبدل بمراجعة أحدث'
  },
  priority: { CRITICAL: 'حرجة', HIGH: 'عالية', MEDIUM: 'متوسطة', LOW: 'منخفضة' },
  scopeType: { cutting: 'قص خرسانة', coring: 'كور', scanning: 'مسح (Scanning)', demolition: 'هدم', repair: 'ترميم', strengthening: 'تدعيم', monitoring: 'مونيتورنج', other: 'أخرى' },
  lostReason: { price: 'السعر', competitor: 'منافس', project_cancelled: 'إلغاء المشروع', late_response: 'تأخر ردنا', technical: 'سبب فني', in_house: 'نُفّذ داخلياً', other: 'أخرى' },
  channel: { email: 'إيميل', whatsapp: 'واتساب', portal: 'بوابة', hand: 'تسليم يدوي', other: 'أخرى', call: 'مكالمة', visit: 'زيارة' },
  cost: {
    title: 'تقدير التكلفة', labour: 'عمالة', equipment: 'معدات', material: 'مواد', subcontractor: 'مقاول باطن', transport: 'نقل',
    permits: 'تصاريح', other: 'أخرى', directCost: 'التكلفة المباشرة', overhead: 'مصاريف إدارية %', risk: 'مخاطر %', totalCost: 'التكلفة الكلية',
    quotationValue: 'سعر العرض', margin: 'الهامش', marginPct: 'نسبة الهامش', lowMargin: 'الهامش أقل من الحد الأدنى المسموح', noCosting: 'لم يتم إدخال تكلفة بعد',
    saveCosting: 'حفظ التكلفة', financialsHidden: 'بيانات التكلفة محجوبة عن دورك'
  },
  quotation: {
    title: 'عروض الأسعار', one: 'عرض سعر', no: 'رقم العرض', create: 'إنشاء عرض سعر', revision: 'مراجعة', items: 'البنود', item: 'بند',
    desc: 'الوصف', unit: 'الوحدة', qty: 'الكمية', rate: 'السعر', amount: 'القيمة',
    noRequired: 'رقم عرض السعر مطلوب', fromMainSystem: 'الرقم والقيمة بتتاخد من سيستم التسعير الرئيسي — PIQCS بيتابع بس',
    sameNoOnRevision: 'المراجعة بتاخد نفس رقم العرض', summary: 'ملخص العرض', issuedBy: 'أصدره', issuedAt: 'تاريخ الإصدار',
    reviewedBy: 'راجعه', sentFor: 'مرفوع إلى', approverHint: 'مدير النظام مضاف تلقائياً — تقدر تضيف مدير القسم كمان',
    noApprovers: 'لا يوجد أحد لديه صلاحية الاعتماد', defaultApprover: 'افتراضي', send: 'إرسال', submitted: 'تم الرفع للاعتماد',
    review: 'قرار الاعتماد', preparedBy: 'إعداد', approvedBy: 'اعتماد',
    subtotal: 'المجموع', vat: 'ضريبة القيمة المضافة', total: 'الإجمالي', validity: 'صلاحية العرض (يوم)', notes: 'ملاحظات العرض',
    submit: 'رفع للاعتماد', approve: 'اعتماد', reject: 'رفض', returnRevision: 'إرجاع للتعديل', sendToSales: 'إرسال للمسوق',
    sendToClient: 'إرسال للعميل', channel: 'قناة الإرسال', reviewRemark: 'ملاحظة الإدارة', newRevision: 'مراجعة جديدة', revisionReason: 'سبب المراجعة',
    noQuotations: 'لا توجد عروض أسعار لهذا الاستفسار', approvalQueue: 'طابور الاعتماد', nothingToApprove: 'لا توجد عروض تنتظر الاعتماد',
    mustLinkInquiry: 'لا يمكن إنشاء عرض سعر غير مرتبط باستفسار', approved: 'تم اعتماد العرض', returned: 'تم إرجاع العرض للتعديل',
    sent: 'تم الإرسال', addItem: 'إضافة بند', printQuotation: 'طباعة العرض', createdFromCost: 'إنشاء من التكلفة', current: 'الحالي'
  },
  followup: {
    title: 'المتابعات', add: 'تسجيل متابعة', channel: 'القناة', note: 'ما تم', result: 'النتيجة', nextAt: 'موعد المتابعة القادمة',
    closeWon: 'إغلاق كترسية', closeLost: 'إغلاق كخسارة', none: 'لا توجد متابعات بعد', seq: 'المتابعة رقم'
  },
  extension: {
    title: 'طلبات التمديد', mine: 'طلباتي', pending: 'تنتظر قراري', approve: 'موافقة', reject: 'رفض', approveWith: 'موافقة بموعد مختلف',
    decisionNote: 'ملاحظة القرار', requestedBy: 'مقدّم الطلب', requestedAt: 'تاريخ الطلب', status: { PENDING: 'معلّق', APPROVED: 'موافق', REJECTED: 'مرفوض' },
    none: 'لا توجد طلبات', submitted: 'تم تقديم طلب التمديد', decided: 'تم تسجيل القرار', extra: 'مدة الزيادة'
  },
  client: { title: 'العملاء', one: 'عميل', contact: 'مسؤول التواصل', city: 'المدينة', tier: 'التصنيف', add: 'إضافة عميل', edit: 'تعديل عميل', country: 'الدولة' },
  project: { title: 'المشاريع', one: 'مشروع', add: 'إضافة مشروع', edit: 'تعديل مشروع', client: 'العميل', country: 'الدولة' },
  country: { SA: 'السعودية', AE: 'الإمارات', all: 'كل الدول', one: 'الدولة' },
  trash: {
    title: 'سلة المحذوفات', hint: 'أي حاجة تتحذف بتتحفظ هنا {d} يوم وتقدر ترجّعها بضغطة',
    note: 'بعد {d} يوم البيانات بتتمسح نهائياً ومش هينفع ترجع. التنظيف بيحصل أول ما تفتح الصفحة دي.',
    item: 'العنصر', records: 'سجل', deletedBy: 'حذفه', expiresIn: 'باقي على الحذف النهائي',
    restore: 'استرجاع', restored: 'تم الاسترجاع بالكامل', none: 'السلة فاضية',
    restoreConfirm: 'استرجاع "{label}" وكل بياناته ({n} سجل)؟',
    purgeConfirm: 'حذف "{label}" نهائياً من السلة؟ لا يمكن التراجع.'
  },
  issue: {
    title: 'المشاكل', one: 'مشكلة', log: 'تسجيل مشكلة', logged: 'تم تسجيل المشكلة', none: 'لا توجد مشاكل مسجلة',
    type: 'نوع المشكلة', severityLabel: 'الخطورة', description: 'وصف المشكلة', responsible: 'المسؤول',
    responsibleHint: 'مين المشكلة عنده — للحصر لاحقاً', lostHours: 'الوقت الضائع (ساعات)', lostHoursHint: 'كام ساعة عمل اتأخرت بسبب المشكلة دي',
    lostTime: 'الوقت الضائع', resolve: 'حل المشكلة', resolution: 'كيف اتحلت', resolvedAt: 'تاريخ الحل',
    loggedBy: 'سجّلها', open: 'مفتوحة', total: 'الإجمالي',
    status: { OPEN: 'مفتوحة', RESOLVED: 'محلولة' },
    severity: { LOW: 'بسيطة', MEDIUM: 'متوسطة', HIGH: 'حرجة' },
    types: {
      missing_info: 'معلومات ناقصة', client_delay: 'تأخر العميل', unclear_drawings: 'رسومات غير واضحة',
      site_visit_needed: 'يحتاج زيارة موقع', internal_delay: 'تأخير داخلي', engineer_overload: 'ضغط على المهندس',
      approval_delay: 'تأخر الاعتماد', pricing_delay: 'تأخر التسعير', wrong_data: 'بيانات خاطئة',
      scope_change: 'تغيير في نطاق العمل', other: 'أخرى'
    }
  },
  task: {
    title: 'المهام', one: 'مهمة', hint: 'المدير يوزّع المهام، وكل شخص توصله رسالة بمهمته ويبدأ يشتغل عليها',
    assign: 'إسناد مهمة', assignOnInquiry: 'إسناد مهمة على هذا الاستفسار', send: 'إرسال المهمة', sent: 'تم إرسال المهمة ووصل إشعار للمستلم',
    taskTitle: 'عنوان المهمة', titlePlaceholder: 'مثال: حساب تكلفة أعمال القص', details: 'تفاصيل المهمة',
    assignee: 'المسؤول', assigneeHint: 'المهمة توصل كإشعار — فلازم يكون له حساب دخول',
    assignedBy: 'أسندها', assignedAt: 'وقت الإسناد', due: 'موعد التسليم', pickup: 'وقت الاستلام', completedAt: 'وقت الإنجاز',
    linkInquiry: 'مرتبطة باستفسار', resultNote: 'ماذا تم', cancelTask: 'إلغاء المهمة',
    start: 'بدء العمل', complete: 'إنهاء المهمة', reassign: 'نقل لشخص آخر',
    mine: 'مهامي', all: 'كل المهام', none: 'لا توجد مهام',
    myOpen: 'مهامي الجديدة', myRunning: 'شغّال عليها', teamOpen: 'مهام لم تُستلم', overdue: 'متأخرة',
    status: { OPEN: 'جديدة', IN_PROGRESS: 'قيد التنفيذ', DONE: 'منجزة', CANCELLED: 'ملغاة' }
  },
  team: {
    title: 'المهندسون والمسوقون', one: 'عضو فريق', add: 'إضافة اسم', edit: 'تعديل اسم', country: 'الدولة', type: 'الصفة',
    hint: 'أسماء تابعة للشركة بدون حساب دخول — تختار منها صاحب الاستفسار أو المشروع',
    none: 'لا توجد أسماء بعد — اضغط "إدخال الأسماء الجاهزة"',
    seed: 'إدخال الأسماء الجاهزة', seeded: 'تمت إضافة {n} اسم', seedSkipped: 'القائمة فيها أسماء بالفعل',
    types: { engineer: 'مهندس', salesperson: 'مسوق', both: 'مهندس ومسوق' }
  },
  user: {
    title: 'المستخدمون', one: 'مستخدم', add: 'إضافة مستخدم', edit: 'تعديل مستخدم', role: 'الدور', department: 'القسم', branch: 'الفرع',
    status: 'حالة الحساب', lastLogin: 'آخر دخول', deactivate: 'تعطيل', activate: 'تفعيل', softDelete: 'حذف ناعم', hardDelete: 'حذف نهائي',
    resetPassword: 'إعادة تعيين كلمة المرور', permissions: 'الصلاحيات الشخصية', tempPassword: 'كلمة مرور مؤقتة',
    created: 'تم إنشاء المستخدم. سيُطلب منه تغيير كلمة المرور عند أول دخول.', superAdmin: 'المدير الأعلى',
    cannotDeleteSuper: 'لا يمكن حذف أو تعطيل المدير الأعلى', reassignTo: 'إعادة إسناد الاستفسارات المفتوحة إلى',
    openItems: 'استفسارات مفتوحة مسندة لهذا المستخدم', hardDeleteWarn: 'الحذف النهائي يمسح الحساب تماماً. يجب اختيار مستخدم بديل للاستفسارات المفتوحة.',
    effective: 'الصلاحيات الفعلية', inherited: 'موروثة من الدور', granted: 'ممنوحة استثناءً', denied: 'ممنوعة استثناءً',
    overrideHint: 'اضغط على الصلاحية للتبديل بين: موروثة ← ممنوحة ← ممنوعة', deleted: 'تم حذف المستخدم', statusChanged: 'تم تغيير حالة الحساب',
    resetSent: 'تم إرسال رابط إعادة التعيين للمستخدم', showDeleted: 'إظهار المحذوفين'
  },
  role: {
    title: 'الأدوار والصلاحيات', one: 'دور', add: 'إضافة دور', edit: 'تعديل دور', matrix: 'مصفوفة الصلاحيات', system: 'دور نظام',
    permissionsCount: 'عدد الصلاحيات', cannotDeleteSystem: 'لا يمكن حذف أدوار النظام', matrixHint: 'الصفوف = الصلاحيات، الأعمدة = الأدوار. أي تعديل يُسجَّل في سجل النشاط.',
    users: 'المستخدمون بهذا الدور', saved: 'تم حفظ الصلاحيات',
    sync: 'تحديث الأدوار الافتراضية', syncHint: 'يضيف الأدوار والصلاحيات الجديدة اللي اتضافت للنظام من غير ما يلمس تعديلاتك',
    synced: 'تم التحديث — {c} دور جديد و{u} دور محدَّث', syncNothing: 'كل الأدوار محدَّثة بالفعل'
  },
  perm: {
    modules: {
      inquiries: 'الاستفسارات', tasks: 'المهام', issues: 'المشاكل', quotations: 'عروض الأسعار', extensions: 'طلبات التمديد', follow_ups: 'المتابعات',
      clients: 'العملاء', projects: 'المشاريع', team: 'المهندسون والمسوقون', users: 'المستخدمون', roles: 'الأدوار', activity_log: 'سجل النشاط', reports: 'التقارير',
      dashboards: 'اللوحات', settings: 'الإعدادات', admin: 'إدارة النظام'
    },
    actions: {
      view_own: 'عرض الخاصة بي', view_all: 'عرض الكل', view_personal: 'لوحتي', view_team: 'لوحة الفريق', view_company: 'لوحة الشركة',
      view_performance: 'لوحة الأداء', view: 'عرض', create: 'إنشاء', edit: 'تعديل', delete: 'حذف', assign: 'إسناد', set_priority: 'تحديد الأولوية',
      change_status: 'تغيير الحالة', submit_for_approval: 'رفع للاعتماد', approve: 'اعتماد', reject: 'رفض', send_to_sales: 'إرسال للمسوق',
      send_to_client: 'إرسال للعميل', create_revision: 'إنشاء مراجعة', request: 'تقديم طلب', close_won: 'إغلاق كترسية', close_lost: 'إغلاق كخسارة',
      deactivate: 'تعطيل', reset_password: 'إعادة تعيين كلمة المرور', assign_role: 'إسناد دور', manage_permissions: 'إدارة الصلاحيات',
      export: 'تصدير', purge: 'تفريغ الأرشيف', export_pdf: 'تصدير PDF', export_excel: 'تصدير Excel', view_financials: 'عرض البيانات المالية',
      edit_general: 'تعديل عام', edit_theme: 'تعديل الثيمات', edit_workflow: 'تعديل سير العمل', edit_sla: 'تعديل مدد SLA', broadcast_message: 'إرسال رسائل جماعية',
      resolve: 'حل المشكلة', complete: 'إتمام', choose_approver: 'اختيار المعتمِد'
    }
  },
  log: {
    title: 'سجل النشاط', user: 'المستخدم', action: 'الحركة', module: 'الوحدة', record: 'السجل', field: 'الحقل', oldValue: 'القيمة قبل',
    newValue: 'القيمة بعد', description: 'الوصف', device: 'الجهاز', deleteSelected: 'حذف المحدد', deleteRange: 'حذف نطاق', deleteReason: 'سبب الحذف',
    deletedCount: 'تم حذف {n} سجل', deletions: 'سجل عمليات الحذف', deletionsHint: 'يظهر للمدير الأعلى فقط ولا يمكن حذفه', adminOnly: 'هذه الشاشة للأدمن فقط',
    actions: {
      CREATE: 'إنشاء', UPDATE: 'تعديل', DELETE: 'حذف', VIEW: 'عرض', LOGIN: 'دخول', LOGOUT: 'خروج', LOGIN_FAILED: 'دخول فاشل', APPROVE: 'اعتماد',
      REJECT: 'رفض', EXPORT: 'تصدير', PERMISSION_CHANGE: 'تغيير صلاحية', STATUS_CHANGE: 'تغيير حالة', ASSIGN: 'إسناد'
    },
    selectAll: 'تحديد الكل', selected: 'محدد', count: 'عدد السجلات', deletedBy: 'حذفه', rangeFrom: 'من تاريخ', rangeTo: 'إلى تاريخ'
  },
  settings: {
    title: 'الإعدادات', general: 'عام', theme: 'الثيمات والألوان', sla: 'مدد الـSLA', workflow: 'سير العمل', company: 'بيانات الشركة',
    companyNameAr: 'اسم الشركة (عربي)', companyNameEn: 'اسم الشركة (إنجليزي)', logo: 'الشعار', defaultLanguage: 'اللغة الافتراضية',
    defaultTheme: 'الثيم الافتراضي', allowUserTheme: 'السماح للمستخدمين باختيار ثيم شخصي', currency: 'العملة', vat: 'نسبة الضريبة %',
    minMargin: 'الحد الأدنى للهامش %', workingHours: 'ساعات العمل', workStart: 'بداية الدوام', workEnd: 'نهاية الدوام', workDays: 'أيام العمل',
    holidays: 'العطلات الرسمية (تاريخ في كل سطر)', autoConfirm: 'اعتماد الأولوية التلقائية بعد (ساعات)', retention: 'مدة الاحتفاظ بسجل النشاط (شهور)',
    validity: 'صلاحية عرض السعر الافتراضية (يوم)', prefixes: 'بادئات الترقيم', inquiryPrefix: 'بادئة الاستفسار', quotationPrefix: 'بادئة عرض السعر',
    themes: 'الثيمات', createTheme: 'إنشاء ثيم مخصص', themeName: 'اسم الثيم', colors: 'الألوان', preview: 'معاينة', darkColors: 'ألوان الوضع الداكن',
    myTheme: 'ثيمي الشخصي', saved: 'تم حفظ الإعدادات',
    numbering: 'طريقة الترقيم', inquiryNumbering: 'ترقيم الاستفسارات', quotationNumbering: 'ترقيم عروض الأسعار',
    numberingAuto: 'تلقائي (النظام يولّد الرقم)', numberingManual: 'يدوي (أنا أكتب الرقم)',
    defaultCountry: 'الدولة الافتراضية', countries: 'الدول',
    maintenance: 'صيانة البيانات', cleanup: 'تنظيف البيانات المحذوفة',
    cleanupHint: 'حذف الاستفسارات اللي اتمسحت قبل كده نهائياً، ومعاها أي عروض أسعار أو مهام أو مشاكل أو طلبات تمديد فاضلة من غير استفسار.',
    cleanupConfirm: 'هيتم الحذف النهائي ولا يمكن التراجع. تمام؟',
    cleanupDone: 'تم حذف {n} سجل', cleanupNothing: 'مفيش بيانات محتاجة تنظيف',
    days: { 0: 'الأحد', 1: 'الاثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت' }
  },
  report: {
    title: 'التقارير', language: 'لغة التقرير', bilingual: 'ثنائي اللغة', generate: 'إنشاء التقرير', period: 'الفترة',
    eod: 'تقرير نهاية اليوم — المعلّق لكل مسوق', overdue: 'الاستفسارات المتأخرة', aging: 'أعمار الاستفسارات', engineerPerf: 'أداء المهندسين',
    salesPerf: 'أداء المسوقين', winRate: 'معدل التحويل', lostAnalysis: 'تحليل أسباب الخسارة', quotationsIssued: 'عروض الأسعار الصادرة',
    issues: 'سجل المشاكل', issuesByPerson: 'حصر المشاكل بالنوع والمسؤول', tasks: 'المهام الموزَّعة',
    durations: 'المدد المستهلكة لكل استفسار', waitingInfo: 'في انتظار معلومات', extensions: 'طلبات التمديد', workload: 'حمل العمل', userActivity: 'نشاط المستخدمين',
    generatedAt: 'تاريخ الإصدار', generatedBy: 'أصدره', rows: 'عدد الصفوف', assigned: 'مُسند', completed: 'منجز', onTime: 'في الموعد',
    delayed: 'متأخر', avgDays: 'متوسط الأيام', extensionsCount: 'طلبات التمديد', revisions: 'مراجعات', efficiency: 'الكفاءة',
    quoted: 'مسعّر', wonCount: 'ترسيات', lostCount: 'خسائر', bucket: 'الفئة', count: 'العدد'
  },
  notif: {
    title: 'الإشعارات', empty: 'لا توجد إشعارات', markAll: 'تعليم الكل كمقروء',
    today: 'اليوم', week: 'هذا الأسبوع', older: 'أقدم',
    broadcast: 'رسالة جماعية', broadcastFrom: 'من الإدارة',
    system: 'تنبيه نظام', userAlert: 'تنبيه',
    categories: 'الفئات', categoryToday: 'اليوم', categoryWeek: 'هذا الأسبوع', categoryUrgent: 'مهم جداً',
    markAsRead: 'علّم كمقروء', delete: 'حذف', delete_confirm: 'هل تريد حذف هذا الإشعار؟',
    broadcast_send: 'إرسال رسالة جماعية', broadcast_to: 'أرسل إلى', broadcast_all: 'جميع المستخدمين', broadcast_selected: 'مستخدمون محددون',
    broadcast_title: 'العنوان', broadcast_content: 'المحتوى', broadcast_recipients: 'المستقبلون', broadcast_sending: 'جاري الإرسال...',
    broadcast_success: 'تم إرسال الرسالة بنجاح', broadcast_error: 'فشل إرسال الرسالة',
    broadcast_analytics: 'تحليل الرسائل الجماعية', broadcast_view_analytics: 'عرض التحليل',
    recipients_total: 'إجمالي المستقبلين', recipients_read: 'قراؤا', recipients_unread: 'لم يقرؤا', recipients_deleted: 'محذوفة',
    status_read: 'مقروء', status_unread: 'لم يُقرأ', status_deleted: 'محذوف', read_at: 'قُرئ في', deleted_at: 'حُذف في'
  },
  validation: { emailInvalid: 'بريد إلكتروني غير صالح', numberInvalid: 'قيمة رقمية غير صالحة', dateInvalid: 'تاريخ غير صالح' }
};
export default ar;
export type Dict = typeof ar;
