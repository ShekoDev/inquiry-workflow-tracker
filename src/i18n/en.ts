import type { Dict } from './ar';

const en: Dict = {
  app: { name: 'PIQCS', fullName: 'Inquiry & Quotation Control System', copyright: 'All rights reserved to Mahmoud Shehab' },
  common: {
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add', create: 'Create', search: 'Search', filter: 'Filter',
    actions: 'Actions', yes: 'Yes', no: 'No', confirm: 'Confirm', close: 'Close', back: 'Back', next: 'Next', loading: 'Loading...',
    noData: 'No data', all: 'All', from: 'From', to: 'To', date: 'Date', time: 'Time', by: 'By', status: 'Status',
    name: 'Name', nameAr: 'Name (Arabic)', nameEn: 'Name (English)', email: 'Email', phone: 'Phone', notes: 'Notes',
    required: 'This field is required', saved: 'Saved successfully', deleted: 'Deleted', error: 'An error occurred', success: 'Done successfully',
    export: 'Export', excel: 'Excel', pdf: 'PDF', print: 'Print', total: 'Total', active: 'Active', inactive: 'Inactive',
    view: 'View', details: 'Details', select: 'Select...', none: 'None', days: 'days', hours: 'hours', minutes: 'min',
    language: 'Language', theme: 'Theme', darkMode: 'Dark mode', lightMode: 'Light mode', systemMode: 'System',
    logout: 'Logout', profile: 'Profile', reason: 'Reason', remark: 'Remark', unknown: 'Unknown',
    confirmDelete: 'Are you sure you want to delete? This cannot be undone.', permissionDenied: 'You do not have permission for this action',
    version: 'Version', me: 'Me', today: 'Today', thisWeek: 'This week', thisMonth: 'This month', currency: 'SAR',
    optional: 'optional', apply: 'Apply', reset: 'Reset', download: 'Download', upload: 'Upload', file: 'File', size: 'Size',
    englishOnly: 'Type in English — this name appears on every screen and report'
  },
  nav: {
    dashboard: 'Dashboard', inquiries: 'Inquiries', newInquiry: 'New Inquiry', approvals: 'Approval Queue',
    extensions: 'Extension Requests', clients: 'Clients', projects: 'Projects', users: 'Users', roles: 'Roles & Permissions',
    activityLog: 'Activity Log', settings: 'Settings', reports: 'Reports', admin: 'Administration', masterData: 'Master Data',
    work: 'Work', quotations: 'Quotations', team: 'Engineers & sales', tasks: 'Tasks', issues: 'Issues', trash: 'Trash'
  },
  auth: {
    login: 'Sign in', password: 'Password', forgot: 'Forgot password?', sendReset: 'Send reset link',
    resetSent: 'A reset link was sent to your email', invalid: 'Invalid email or password', inactive: 'This account is inactive. Contact the administrator.',
    changePassword: 'Change password', newPassword: 'New password', confirmPassword: 'Confirm password',
    mustChange: 'You must change your password before continuing', mismatch: 'Passwords do not match', weak: 'Weak password: at least 8 chars, one uppercase and one digit',
    welcome: 'Welcome', signIn: 'Sign in', tooMany: 'Too many attempts. Please wait and try again.',
    setupTitle: 'Initial setup — create the Super Admin', setupDesc: 'No users exist yet. Create the Super Admin account to start the system.',
    dbUnreachable: 'Cannot reach the database. Make sure the security rules are deployed, then reload.', retry: 'Retry',
    setupDone: 'Super Admin created. Sign in now.'
  },
  dashboard: {
    title: 'Dashboard', total: 'Total inquiries', new: 'New', processing: 'Processing', waitingInfo: 'Waiting for info',
    underReview: 'Under review', approved: 'Approved', sentToClient: 'Sent to client', overdue: 'Overdue', won: 'Won', lost: 'Lost',
    pendingByRep: 'Pending inquiries per salesperson', engineerWorkload: 'Engineer workload', dueToday: 'Due today',
    active: 'Active', myInquiries: 'My inquiries', statusBreakdown: 'Status breakdown', recurringIssues: 'Recurring issues', recent: 'Recent inquiries',
    eod: 'End-of-day report', winRate: 'Win rate', avgProcessing: 'Avg. processing time', normal: 'Normal', high: 'High', overloaded: 'Overloaded',
    quotations: 'Live quotations', noQuotations: 'No quotations', awaitingPickup: 'Awaiting pickup',
    inProgressNow: 'Being worked on now', byCountry: 'Split by country', avgResponse: 'Avg. response time'
  },
  inquiry: {
    title: 'Inquiries', one: 'Inquiry', no: 'Inquiry No.', client: 'Client', project: 'Project', salesperson: 'Salesperson',
    engineer: 'Assigned engineer', priorityEngineer: 'Priority engineer', scope: 'Scope', scopeAr: 'Scope (Arabic)', scopeEn: 'Scope (English)',
    scopeType: 'Work type', received: 'Received', requiredDate: 'Required submission date', priority: 'Priority', priorityReason: 'Priority reason',
    deadline: 'Deadline', delay: 'Delay', estimatedValue: 'Estimated value', create: 'Register new inquiry', edit: 'Edit inquiry',
    workflow: 'Workflow', currentAction: 'Current action', changeStatus: 'Change status', moveTo: 'Move to',
    assign: 'Assign engineer', setPriority: 'Set priority', startProcessing: 'Start processing', requestInfo: 'Request missing info',
    infoReceived: 'Information received', missingInfo: 'Missing information', missingItem: 'Missing item', addItem: 'Add item',
    remarks: 'Remarks', addRemark: 'Add remark', attachments: 'Attachments', history: 'Activity', costing: 'Issues',
    quotations: 'Quotations', followUps: 'Follow-ups', overview: 'Overview', totalElapsed: 'Total elapsed', netWorking: 'Net working time',
    paused: 'Paused time', overdue: 'Overdue', onTime: 'On time', noInquiries: 'No inquiries', mine: 'Only mine',
    pendingQuote: 'Not yet quoted', statusNote: 'Transition note', noteRequired: 'A note is mandatory for this status',
    requestExtension: 'Request extension', extensionReason: 'Extension reason', newDeadline: 'New deadline', currentDeadline: 'Current deadline',
    autoPriority: 'Auto priority', manualPriority: 'Manual priority', outcome: 'Outcome', lostReason: 'Lost reason', competitorPrice: 'Competitor price',
    awardValue: 'Award value', poNumber: 'PO number', closedAt: 'Closed at', nextFollowUp: 'Next follow-up',
    created: 'Inquiry registered', transitionDone: 'Status changed', invalidTransition: 'This transition is not allowed',
    filterStatus: 'Status', filterPriority: 'Priority', filterEngineer: 'Engineer', filterSales: 'Salesperson', searchPlaceholder: 'Inquiry no. / client / project',
    deletedRecoverable: 'Deleted — you can restore it from Trash within 30 days',
    deleteConfirm: 'Delete this inquiry and everything attached to it (quotations, tasks, issues, follow-ups, attachments, history)? It is kept in Trash for 30 days and can be restored.', assignedTo: 'Assigned to', unassigned: 'Unassigned', slaHours: 'SLA hours',
    country: 'Country', filterCountry: 'Country', allCountries: 'All countries',
    tracking: 'Inquiry tracking', acknowledge: 'Acknowledge & start work', acknowledged: 'Acknowledged',
    acknowledgedBy: 'Picked up by', acknowledgedAt: 'Picked up at', notAcknowledged: 'Not picked up yet',
    ackDone: 'Acknowledged — the work clock is now running', ackHint: 'Confirm you received this inquiry — the work clock starts from this moment',
    responseTime: 'Response time', waitingPickup: 'Waiting to be picked up', workTime: 'Work time', workRunning: 'Clock running',
    remaining: 'Remaining', slaUsed: 'SLA consumed', quotationNo: 'Quotation no.', quotationStatus: 'Quotation status',
    noQuotationYet: 'No quotation yet',
    manualNo: 'Inquiry number (manual)', manualNoHint: 'Type the number you want — auto numbering is switched off in Settings',
    autoNoHint: 'The number is generated automatically on save', noRequired: 'Inquiry number is required', noTaken: 'This number is already used by another inquiry',
    checkingNo: 'Checking the number…', noFree: 'Number is available',
    potentialDuplicates: 'Potential duplicate inquiries found',
    saveFilter: 'Save this filter view', filterName: 'Filter name'
  },
  status: {
    NEW: 'New / Received', FILE_REVIEW: 'File Review', WAITING_INFO: 'Waiting for Information', PRIORITY_ASSIGNMENT: 'Priority Assignment',
    ASSIGNED: 'Assigned', PROCESSING: 'Processing', COSTING: 'Pricing in main system', QUOTATION_PREP: 'Quotation Preparation',
    UNDER_REVIEW: 'Under Management Review', REVISION_REQUIRED: 'Revision Required', APPROVED: 'Approved', SENT_TO_SALES: 'Sent to Salesperson',
    SENT_TO_CLIENT: 'Sent to Client', FOLLOW_UP: 'Follow-up', CLIENT_REVISION: 'Client Revision Requested', WON: 'Won', LOST: 'Lost',
    NO_BID: 'No Bid / Declined', CANCELLED: 'Cancelled by Client', ON_HOLD: 'On Hold'
  },
  qstatus: {
    DRAFT: 'Draft', UNDER_REVIEW: 'Under review', REVISION_REQUIRED: 'Revision required', APPROVED: 'Approved', REJECTED: 'Rejected',
    SENT_TO_SALES: 'Sent to salesperson', SENT_TO_CLIENT: 'Sent to client', SUPERSEDED: 'Superseded by newer revision'
  },
  priority: { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' },
  scopeType: { cutting: 'Concrete cutting', coring: 'Coring', scanning: 'Scanning', demolition: 'Demolition', repair: 'Repair', strengthening: 'Strengthening', monitoring: 'Monitoring', other: 'Other' },
  lostReason: { price: 'Price', competitor: 'Competitor', project_cancelled: 'Project cancelled', late_response: 'Late response', technical: 'Technical', in_house: 'Done in-house', other: 'Other' },
  channel: { email: 'Email', whatsapp: 'WhatsApp', portal: 'Portal', hand: 'Hand delivery', other: 'Other', call: 'Call', visit: 'Visit' },
  cost: {
    title: 'Cost estimate', labour: 'Labour', equipment: 'Equipment', material: 'Material', subcontractor: 'Subcontractor', transport: 'Transport',
    permits: 'Permits', other: 'Other', directCost: 'Direct cost', overhead: 'Overhead %', risk: 'Risk %', totalCost: 'Total cost',
    quotationValue: 'Quotation value', margin: 'Margin', marginPct: 'Margin %', lowMargin: 'Margin is below the minimum allowed', noCosting: 'No costing entered yet',
    saveCosting: 'Save costing', financialsHidden: 'Cost data is hidden for your role'
  },
  quotation: {
    title: 'Quotations', one: 'Quotation', no: 'Quotation No.', create: 'Create quotation', revision: 'Revision', items: 'Items', item: 'Item',
    desc: 'Description', unit: 'Unit', qty: 'Qty', rate: 'Rate', amount: 'Amount',
    noRequired: 'Quotation number is required', fromMainSystem: 'The number and value come from the main pricing system — PIQCS only tracks them',
    sameNoOnRevision: 'A revision keeps the same quotation number', summary: 'Quotation summary', issuedBy: 'Issued by', issuedAt: 'Issued at',
    reviewedBy: 'Reviewed by', sentFor: 'Sent to', approverHint: 'The System Admin is added automatically — you may add the Department Manager too',
    noApprovers: 'Nobody holds the approval permission', defaultApprover: 'default', send: 'Send', submitted: 'Submitted for approval',
    review: 'Approval decision', preparedBy: 'Prepared by', approvedBy: 'Approved by',
    subtotal: 'Subtotal', vat: 'VAT', total: 'Total', validity: 'Validity (days)', notes: 'Quotation notes',
    submit: 'Submit for approval', approve: 'Approve', reject: 'Reject', returnRevision: 'Return for revision', sendToSales: 'Send to salesperson',
    sendToClient: 'Send to client', channel: 'Channel', reviewRemark: 'Management remark', newRevision: 'New revision', revisionReason: 'Revision reason',
    noQuotations: 'No quotations for this inquiry', approvalQueue: 'Approval queue', nothingToApprove: 'Nothing waiting for approval',
    mustLinkInquiry: 'A quotation must be linked to an inquiry', approved: 'Quotation approved', returned: 'Quotation returned for revision',
    sent: 'Sent', addItem: 'Add item', printQuotation: 'Print quotation', createdFromCost: 'Create from costing', current: 'Current'
  },
  followup: {
    title: 'Follow-ups', add: 'Log follow-up', channel: 'Channel', note: 'What was done', result: 'Result', nextAt: 'Next follow-up date',
    closeWon: 'Close as WON', closeLost: 'Close as LOST', none: 'No follow-ups yet', seq: 'Follow-up #'
  },
  extension: {
    title: 'Extension requests', mine: 'My requests', pending: 'Awaiting my decision', approve: 'Approve', reject: 'Reject', approveWith: 'Approve with different date',
    decisionNote: 'Decision note', requestedBy: 'Requested by', requestedAt: 'Requested at', status: { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' },
    none: 'No requests', submitted: 'Extension request submitted', decided: 'Decision recorded', extra: 'Extra time'
  },
  client: { title: 'Clients', one: 'Client', contact: 'Contact person', city: 'City', tier: 'Tier', add: 'Add client', edit: 'Edit client', country: 'Country' },
  project: { title: 'Projects', one: 'Project', add: 'Add project', edit: 'Edit project', client: 'Client', country: 'Country' },
  country: { SA: 'Saudi Arabia', AE: 'United Arab Emirates', all: 'All countries', one: 'Country' },
  trash: {
    title: 'Trash', hint: 'Anything deleted is kept here for {d} days and can be restored in one click',
    note: 'After {d} days the data is removed for good and cannot be recovered. The sweep runs when this page opens.',
    item: 'Item', records: 'records', deletedBy: 'Deleted by', expiresIn: 'Expires in',
    restore: 'Restore', restored: 'Fully restored', none: 'Trash is empty',
    restoreConfirm: 'Restore "{label}" and all its data ({n} records)?',
    purgeConfirm: 'Permanently remove "{label}" from trash? This cannot be undone.'
  },
  issue: {
    title: 'Issues', one: 'Issue', log: 'Log an issue', logged: 'Issue logged', none: 'No issues logged',
    type: 'Issue type', severityLabel: 'Severity', description: 'What happened', responsible: 'Owner',
    responsibleHint: 'Who the problem sits with — used for the tally', lostHours: 'Time lost (hours)', lostHoursHint: 'How many working hours this problem cost',
    lostTime: 'Time lost', resolve: 'Resolve', resolution: 'How it was resolved', resolvedAt: 'Resolved at',
    loggedBy: 'Logged by', open: 'Open', total: 'Total',
    status: { OPEN: 'Open', RESOLVED: 'Resolved' },
    severity: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' },
    types: {
      missing_info: 'Missing information', client_delay: 'Client delay', unclear_drawings: 'Unclear drawings',
      site_visit_needed: 'Site visit needed', internal_delay: 'Internal delay', engineer_overload: 'Engineer overloaded',
      approval_delay: 'Approval delay', pricing_delay: 'Pricing delay', wrong_data: 'Wrong data',
      scope_change: 'Scope change', other: 'Other'
    }
  },
  task: {
    title: 'Tasks', one: 'Task', hint: 'The manager hands out tasks; each person gets a message and starts working on it',
    assign: 'Assign a task', assignOnInquiry: 'Assign a task on this inquiry', send: 'Send task', sent: 'Task sent — the assignee has been notified',
    taskTitle: 'Task title', titlePlaceholder: 'e.g. Price the concrete cutting works', details: 'Details',
    assignee: 'Assignee', assigneeHint: 'The task arrives as a notification, so the person needs a login account',
    assignedBy: 'Assigned by', assignedAt: 'Assigned at', due: 'Due', pickup: 'Time to pick up', completedAt: 'Completed at',
    linkInquiry: 'Linked inquiry', resultNote: 'What was done', cancelTask: 'Cancel task',
    start: 'Start work', complete: 'Complete', reassign: 'Reassign',
    mine: 'My tasks', all: 'All tasks', none: 'No tasks',
    myOpen: 'My new tasks', myRunning: 'In progress', teamOpen: 'Not picked up', overdue: 'Overdue',
    status: { OPEN: 'New', IN_PROGRESS: 'In progress', DONE: 'Done', CANCELLED: 'Cancelled' }
  },
  team: {
    title: 'Engineers & sales reps', one: 'Team member', add: 'Add name', edit: 'Edit name', country: 'Country', type: 'Role',
    hint: 'People in the company who have no login account — pick them as the owner of an inquiry or project',
    none: 'No names yet — press "Load default list"',
    seed: 'Load default list', seeded: '{n} names added', seedSkipped: 'The list already has names',
    types: { engineer: 'Engineer', salesperson: 'Sales rep', both: 'Engineer & sales rep' }
  },
  user: {
    title: 'Users', one: 'User', add: 'Add user', edit: 'Edit user', role: 'Role', department: 'Department', branch: 'Branch',
    status: 'Account status', lastLogin: 'Last login', deactivate: 'Deactivate', activate: 'Activate', softDelete: 'Soft delete', hardDelete: 'Hard delete',
    resetPassword: 'Reset password', permissions: 'Personal permissions', tempPassword: 'Temporary password',
    created: 'User created. They will be asked to change the password at first login.', superAdmin: 'Super Admin',
    cannotDeleteSuper: 'The Super Admin cannot be deleted or deactivated', reassignTo: 'Reassign open inquiries to',
    openItems: 'open inquiries assigned to this user', hardDeleteWarn: 'Hard delete removes the account completely. You must choose a replacement user for open inquiries.',
    effective: 'Effective permissions', inherited: 'Inherited from role', granted: 'Granted (override)', denied: 'Denied (override)',
    overrideHint: 'Click a permission to cycle: inherited → granted → denied', deleted: 'User deleted', statusChanged: 'Account status changed',
    resetSent: 'Reset link sent to the user', showDeleted: 'Show deleted'
  },
  role: {
    title: 'Roles & permissions', one: 'Role', add: 'Add role', edit: 'Edit role', matrix: 'Permission matrix', system: 'System role',
    sync: 'Sync default roles', syncHint: 'Adds roles and permissions the system has gained, without touching your own edits',
    synced: 'Synced — {c} created, {u} updated', syncNothing: 'All roles are already up to date',
    permissionsCount: 'Permissions', cannotDeleteSystem: 'System roles cannot be deleted', matrixHint: 'Rows = permissions, columns = roles. Every change is written to the activity log.',
    users: 'Users with this role', saved: 'Permissions saved'
  },
  perm: {
    modules: {
      inquiries: 'Inquiries', tasks: 'Tasks', issues: 'Issues', quotations: 'Quotations', extensions: 'Extensions', follow_ups: 'Follow-ups',
      clients: 'Clients', projects: 'Projects', team: 'Engineers & sales', users: 'Users', roles: 'Roles', activity_log: 'Activity log', reports: 'Reports',
      dashboards: 'Dashboards', settings: 'Settings', admin: 'System administration'
    },
    actions: {
      view_own: 'View own', view_all: 'View all', view_personal: 'Personal dashboard', view_team: 'Team dashboard', view_company: 'Company dashboard',
      view_performance: 'Performance dashboard', view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', assign: 'Assign', set_priority: 'Set priority',
      change_status: 'Change status', submit_for_approval: 'Submit for approval', approve: 'Approve', reject: 'Reject', send_to_sales: 'Send to salesperson',
      send_to_client: 'Send to client', create_revision: 'Create revision', request: 'Request', close_won: 'Close as won', close_lost: 'Close as lost',
      deactivate: 'Deactivate', reset_password: 'Reset password', assign_role: 'Assign role', manage_permissions: 'Manage permissions',
      export: 'Export', purge: 'Purge archive', export_pdf: 'Export PDF', export_excel: 'Export Excel', view_financials: 'View financials',
      edit_general: 'Edit general', edit_theme: 'Edit themes', edit_workflow: 'Edit workflow', edit_sla: 'Edit SLA', broadcast_message: 'Send broadcast messages',
      resolve: 'Resolve', complete: 'Complete', choose_approver: 'Choose approver'
    }
  },
  log: {
    title: 'Activity log', user: 'User', action: 'Action', module: 'Module', record: 'Record', field: 'Field', oldValue: 'Old value',
    newValue: 'New value', description: 'Description', device: 'Device', deleteSelected: 'Delete selected', deleteRange: 'Delete range', deleteReason: 'Deletion reason',
    deletedCount: '{n} entries deleted', deletions: 'Deletion history', deletionsHint: 'Visible to the Super Admin only and cannot be deleted', adminOnly: 'This screen is for admins only',
    actions: {
      CREATE: 'Create', UPDATE: 'Update', DELETE: 'Delete', VIEW: 'View', LOGIN: 'Login', LOGOUT: 'Logout', LOGIN_FAILED: 'Failed login', APPROVE: 'Approve',
      REJECT: 'Reject', EXPORT: 'Export', PERMISSION_CHANGE: 'Permission change', STATUS_CHANGE: 'Status change', ASSIGN: 'Assign'
    },
    selectAll: 'Select all', selected: 'selected', count: 'Entries', deletedBy: 'Deleted by', rangeFrom: 'From date', rangeTo: 'To date'
  },
  settings: {
    title: 'Settings', general: 'General', theme: 'Themes & colors', sla: 'SLA durations', workflow: 'Workflow', company: 'Company',
    companyNameAr: 'Company name (Arabic)', companyNameEn: 'Company name (English)', logo: 'Logo', defaultLanguage: 'Default language',
    defaultTheme: 'Default theme', allowUserTheme: 'Allow users to pick a personal theme', currency: 'Currency', vat: 'VAT %',
    minMargin: 'Minimum margin %', workingHours: 'Working hours', workStart: 'Start', workEnd: 'End', workDays: 'Work days',
    holidays: 'Public holidays (one date per line)', autoConfirm: 'Auto-confirm priority after (hours)', retention: 'Activity log retention (months)',
    validity: 'Default quotation validity (days)', prefixes: 'Numbering prefixes', inquiryPrefix: 'Inquiry prefix', quotationPrefix: 'Quotation prefix',
    themes: 'Themes', createTheme: 'Create custom theme', themeName: 'Theme name', colors: 'Colors', preview: 'Preview', darkColors: 'Dark-mode colors',
    myTheme: 'My theme', saved: 'Settings saved',
    numbering: 'Numbering', inquiryNumbering: 'Inquiry numbering', quotationNumbering: 'Quotation numbering',
    numberingAuto: 'Automatic (system generates it)', numberingManual: 'Manual (I type the number)',
    defaultCountry: 'Default country', countries: 'Countries',
    maintenance: 'Data maintenance', cleanup: 'Clean up deleted data',
    cleanupHint: 'Permanently removes inquiries deleted earlier, along with any quotations, tasks, issues or extension requests left without an inquiry.',
    cleanupConfirm: 'This deletes permanently and cannot be undone. Continue?',
    cleanupDone: '{n} records removed', cleanupNothing: 'Nothing to clean up',
    days: { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' }
  },
  report: {
    title: 'Reports', language: 'Report language', bilingual: 'Bilingual', generate: 'Generate', period: 'Period',
    eod: 'End-of-day — pending per salesperson', overdue: 'Overdue inquiries', aging: 'Inquiry aging', engineerPerf: 'Engineer performance',
    salesPerf: 'Salesperson performance', winRate: 'Win rate', lostAnalysis: 'Lost-reason analysis', quotationsIssued: 'Quotations issued',
    issues: 'Issue log', issuesByPerson: 'Issue tally by type & owner', tasks: 'Assigned tasks',
    durations: 'Time consumed per inquiry', waitingInfo: 'Waiting for information', extensions: 'Extension requests', workload: 'Workload', userActivity: 'User activity',
    generatedAt: 'Generated at', generatedBy: 'Generated by', rows: 'Rows', assigned: 'Assigned', completed: 'Completed', onTime: 'On time',
    delayed: 'Delayed', avgDays: 'Avg. days', extensionsCount: 'Extension requests', revisions: 'Revisions', efficiency: 'Efficiency',
    quoted: 'Quoted', wonCount: 'Won', lostCount: 'Lost', bucket: 'Bucket', count: 'Count'
  },
  notif: {
    title: 'Notifications', empty: 'No notifications', markAll: 'Mark all as read',
    today: 'Today', week: 'This Week', older: 'Older',
    broadcast: 'Broadcast Message', broadcastFrom: 'from Admin',
    system: 'System Alert', userAlert: 'Alert',
    categories: 'Categories', categoryToday: 'Today', categoryWeek: 'This Week', categoryUrgent: 'Very Important',
    markAsRead: 'Mark as read', delete: 'Delete', delete_confirm: 'Delete this notification?',
    broadcast_send: 'Send Broadcast', broadcast_to: 'Send to', broadcast_all: 'All users', broadcast_selected: 'Selected users',
    broadcast_title: 'Title', broadcast_content: 'Content', broadcast_recipients: 'Recipients', broadcast_sending: 'Sending...',
    broadcast_success: 'Message sent successfully', broadcast_error: 'Failed to send message',
    broadcast_analytics: 'Broadcast Analytics', broadcast_view_analytics: 'View analytics',
    recipients_total: 'Total recipients', recipients_read: 'Read', recipients_unread: 'Unread', recipients_deleted: 'Deleted',
    status_read: 'Read', status_unread: 'Unread', status_deleted: 'Deleted', read_at: 'Read at', deleted_at: 'Deleted at'
  },
  validation: { emailInvalid: 'Invalid email', numberInvalid: 'Invalid number', dateInvalid: 'Invalid date' }
};
export default en;
