/**
 * Bayside Dysphagia Diagnostics - CRM backend
 * Deploy: Extensions > Apps Script > Deploy > New deployment > Web app
 *   - Execute as: Me
 *   - Who has access: Anyone with the link
 * Then copy the /exec URL into the front end's API_URL constant.
 */

const SHEET_ID = '1ljl8EU80Er_IdOuIE7_uWWZeaqmE7BQcrO9kuT5I6w0'; // same Sheet as production — v2 opens it explicitly by ID since this is a standalone script

// Opening the spreadsheet by ID has real overhead, and a single request
// (e.g. fetching "all" data) previously opened it separately for every one
// of the 6 sheets it reads. Caching it here means it's opened once per
// script execution, no matter how many sheet reads/writes happen within it.
let _cachedSpreadsheet_ = null;
function getSpreadsheet_() {
  if (!_cachedSpreadsheet_) {
    _cachedSpreadsheet_ = SpreadsheetApp.openById(SHEET_ID);
  }
  return _cachedSpreadsheet_;
}
const ACCOUNTS_SHEET = 'Accounts';
const CONTACTS_SHEET = 'Contacts';
const CONNECTIONS_SHEET = 'Connections';
const NOTES_SHEET = 'Notes';
const BILLING_SHEET = 'Billing';

const ACCOUNTS_HEADERS = [
  'AccountId', 'AccountName', 'Status', 'Address', 'Website', 'Phone',
  'ReferralSource', 'DateAdded', 'DateConverted', 'NextFollowUp', 'Latitude', 'Longitude', 'Region', 'SimplePracticeUrl', 'Rating', 'CMSRating', 'BedCount',
  'ChainAffiliation', 'HighRiskPrograms', 'RehabProvider',
  'RecentOwnershipChange', 'SpecialFocusStatus', 'AbuseFlag', 'StaffingHoursPerResidentDay', 'FinesHistory', 'CaseMixIndex',
  'RelationshipStage', 'NextAction', 'LastContactDate', 'LastContactType', 'LastContactResult',
  'ClinicalNeed', 'VolumeOpportunity', 'RehabActivity', 'AccessRelationship', 'FeesTrigger',
  'CurrentInstrumentalAssessment', 'DysphagiaPainPoint', 'ReferralPotential', 'EstimatedFeesVolume',
  'VisitCadence', 'DistanceFromNorwell', 'DistanceFromCapeHouse', 'DistanceFromCapeCodHospital'
];
const CONTACTS_HEADERS = [
  'ContactId', 'AccountId', 'ContactName', 'Role', 'Phone', 'Email', 'PreferredContact', 'RoleCategory'
];
const ACTIVITIES_SHEET = 'Activities';
const ACTIVITIES_HEADERS = [
  'ActivityId', 'AccountId', 'Timestamp', 'ActivityType', 'ActivityResult', 'NextAction', 'NextActionDue', 'Details'
];
const REFERRAL_ACTIVITY_SHEET = 'Referral Activity';
const REFERRAL_ACTIVITY_HEADERS = [
  'ReferralActivityId', 'AccountId', 'ReferralDate', 'RecordedBy'
];
const RELATIONSHIP_STAGES = [
  'Target', 'Contacted', 'Connected', 'Referral Discussion', 'Active Referrer', 'Not a fit'
];
const CONTACT_ROLE_CATEGORIES = [
  'Clinical Champion', 'SLP', 'Director of Rehab', 'Rehab Director', 'Administrator', 'DON',
  'Medical Director', 'Admissions', 'Case Management', 'Regional/Central Decision Maker',
  'Referral Coordinator', 'Other'
];
const DECISION_MAKER_ROLE_CATEGORIES = ['Administrator', 'DON', 'Regional/Central Decision Maker'];
const ACTIVITY_TYPES = ['Call', 'Voicemail', 'Visit', 'Email', 'Text', 'Meeting', 'Referral', 'Other'];
const ACTIVITY_RESULTS = [
  'No answer', 'Voicemail', 'Receptionist', 'Spoke with SLP', 'Spoke with Director of Rehab',
  'Spoke with Administrator', 'Interested', 'Wants information', 'Referral opportunity',
  'Follow-up requested', 'Not interested', 'Wrong contact', 'Other'
];
// --- Phase 2: FEES Business Development fields ---
const NEED_LEVELS = ['Unknown', 'Low', 'Medium', 'High', 'Very High'];
const VOLUME_LEVELS = ['Low', 'Medium', 'High', 'Very High'];
const ACCESS_LEVELS = ['None', 'Cold', 'Contacted', 'Connected', 'Champion'];
const INSTRUMENTAL_ASSESSMENT_OPTIONS = [
  'No instrumental assessment', 'MBS', 'FEES in-house', 'External FEES provider',
  'Hospital referral', 'Unknown', 'Other'
];
const DYSPHAGIA_PAIN_POINTS = [
  'Transport burden', 'Scheduling delay', 'Hospital dependence', 'Limited SLP resources',
  'No local FEES provider', 'Medically fragile to transport', 'Cost', 'Current process works well',
  'Unknown', 'Other'
];
const ESTIMATED_VOLUME_OPTIONS = ['0-1 FEES/month', '1-2 FEES/month', '3-5 FEES/month', '5+/month', 'Unknown'];
// --- Phase 3: Field Operations ---
const VISIT_CADENCE_OPTIONS = ['No cadence', 'Weekly', 'Every 2 weeks', 'Every 4 weeks', 'Every 6 weeks', 'Every 8 weeks', 'Quarterly', 'As needed'];
const CADENCE_DAYS = {
  'Weekly': 7, 'Every 2 weeks': 14, 'Every 4 weeks': 28, 'Every 6 weeks': 42,
  'Every 8 weeks': 56, 'Quarterly': 90
  // 'No cadence' and 'As needed' have no fixed interval, so they're intentionally excluded.
};

// Real driving distances, fetched once via Google's Distance Matrix API and
// stored on the account -- not recomputed on every page view. IMPORTANT:
// this key must have the Distance Matrix API enabled AND must NOT be
// restricted to browser HTTP referrers, since this runs server-side from
// Apps Script (a referrer-restricted key -- like the one used client-side
// for the map -- will fail here). Billing must be enabled on the Google
// Cloud project for this API; cost is small (~$5 per 1000 elements as of
// this writing), and each account only needs one one-time lookup.
const GOOGLE_MAPS_SERVER_API_KEY = 'PASTE_YOUR_SERVER_SIDE_KEY_HERE';
const DISTANCE_ORIGINS = [
  { field: 'DistanceFromNorwell', address: '35 Riverside Drive, Norwell, MA 02061' },
  { field: 'DistanceFromCapeHouse', address: '31 Bramble Lane, Dennis, MA 02638' },
  { field: 'DistanceFromCapeCodHospital', address: '27 Park Street, Hyannis, MA 02601' }
];

// One Distance Matrix call per account, requesting all 3 origins against
// the account's single destination address at once (cheaper and simpler
// than 3 separate calls). Returns an array of miles in DISTANCE_ORIGINS
// order, with null for any leg the API couldn't compute a route for.
function fetchDrivingDistancesMiles_(destinationAddress) {
  const origins = DISTANCE_ORIGINS.map(o => o.address).join('|');
  const url = 'https://maps.googleapis.com/maps/api/distancematrix/json' +
    '?origins=' + encodeURIComponent(origins) +
    '&destinations=' + encodeURIComponent(destinationAddress) +
    '&units=imperial' +
    '&key=' + GOOGLE_MAPS_SERVER_API_KEY;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const data = JSON.parse(response.getContentText());
  if (data.status !== 'OK') throw new Error('Distance Matrix API error: ' + data.status + (data.error_message ? ' - ' + data.error_message : ''));
  // One row per origin, since we only sent one destination -- each row has
  // exactly one element.
  return data.rows.map(row => {
    const el = row.elements[0];
    return el.status === 'OK' ? Math.round((el.distance.value / 1609.34) * 10) / 10 : null;
  });
}

// Fetches and stores all 3 driving distances for one account. Safe to call
// with a blank address (does nothing). Logs and continues rather than
// throwing, so a distance-fetch failure never blocks an account save.
function updateDistancesForAccount_(accountId, address) {
  if (!address) return;
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  const rowIndex = findRowIndex_(ACCOUNTS_SHEET, 'AccountId', accountId);
  if (rowIndex === -1) return;
  try {
    const miles = fetchDrivingDistancesMiles_(address);
    DISTANCE_ORIGINS.forEach((origin, i) => {
      if (miles[i] !== null) {
        const col = ACCOUNTS_HEADERS.indexOf(origin.field) + 1;
        if (col !== 0) sheet.getRange(rowIndex, col).setValue(miles[i]);
      }
    });
  } catch (err) {
    Logger.log('Distance fetch failed for account ' + accountId + ': ' + err.message);
  }
}

/**
 * ONE-TIME: computes and stores real driving distances for every existing
 * account that has an address but is missing at least one distance value.
 * Safe to re-run -- only fills in what's currently blank.
 */
function backfillAllDrivingDistances() {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const idCol = ACCOUNTS_HEADERS.indexOf('AccountId') + 1;
  const addressCol = ACCOUNTS_HEADERS.indexOf('Address') + 1;
  const norwellCol = ACCOUNTS_HEADERS.indexOf('DistanceFromNorwell') + 1;
  const capeHouseCol = ACCOUNTS_HEADERS.indexOf('DistanceFromCapeHouse') + 1;
  const hospitalCol = ACCOUNTS_HEADERS.indexOf('DistanceFromCapeCodHospital') + 1;

  const values = sheet.getRange(2, 1, lastRow - 1, ACCOUNTS_HEADERS.length).getValues();
  let updated = 0;
  let skipped = 0;

  values.forEach((row, i) => {
    const address = row[addressCol - 1];
    const hasAllDistances = row[norwellCol - 1] && row[capeHouseCol - 1] && row[hospitalCol - 1];
    if (!address || hasAllDistances) {
      skipped++;
      return;
    }
    updateDistancesForAccount_(row[idCol - 1], address);
    updated++;
  });

  Logger.log('Fetched driving distances for ' + updated + ' account(s). Skipped ' + skipped + ' (already had all 3, or no address).');
}

/**
 * One-time: imports 9 Southeast MA (Taunton/Raynham/Middleborough/Easton
 * area) skilled nursing/rehab prospects, researched from a mix of Google
 * business listings and the official CMS dataset. Bed counts and CMS
 * ratings below are independently verified against the official CMS
 * Provider Info dataset -- not taken at face value from any single source.
 * No named individual contacts are included here; none could be
 * independently verified, so none were added rather than risking
 * fabricated names/emails going into outreach.
 */
function importSoutheastProspects() {
  // [Name, Address, Phone, Beds, ChainAffiliation, CMS overall/health/staffing/qm,
  //  ClinicalNeed, VolumeOpportunity, RehabActivity, ReferralPotential,
  //  HighRiskPrograms, FeesTrigger, NextAction]
  const newProspects = [
    ['Southeast Rehabilitation & Skilled Care Center', '184 Lincoln St, North Easton, MA 02356', '(508) 238-7053',
      '171', 'Athena Health Care Systems', ['1', '1', '1', '1'],
      'High', 'Very High', 'High', 'High',
      '', '171-bed skilled nursing/rehab facility, part of Athena Health Care Systems -- large facility, though CMS overall rating is currently low (1/5), worth understanding why before or during outreach.',
      'Call facility and ask for the Director of Rehabilitation.'],
    ['Life Care Center of Raynham', '546 S St E, Raynham, MA 02767', '(508) 821-5700',
      '154', 'Life Care Centers of America', ['4', '4', '3', '4'],
      'High', 'Very High', 'Very High', 'High',
      'VitalStim swallowing therapy', '154-bed facility, in-house rehab team, and explicitly advertises VitalStim therapy for swallowing disorders on their own site -- an unusually direct dysphagia-relevant signal.',
      'Call facility and ask for the Director of Rehabilitation.'],
    ['Oakhill HealthCare', '76 North St, Middleborough, MA 02346', '(508) 947-4775',
      '123', 'Next Step Healthcare', ['2', '2', '2', '2'],
      'High', 'High', 'High', 'High',
      '', '123-bed skilled nursing/rehab facility with an active post-acute operation.',
      'Call facility and identify the current Director of Rehabilitation and SLP.'],
    ['Nemasket Rehabilitation and Healthcare Center', '314 Marion Rd, Middleborough, MA 02346', '(508) 947-8632',
      '102', 'Atlas Healthcare', ['3', '4', '1', '3'],
      'High', 'High', 'High', 'High',
      'Respiratory care', '102-bed facility offering rehab, skilled nursing, and respiratory care, with a comprehensive discharge program.',
      'Call facility and identify the current Director of Rehabilitation.'],
    ['Wedgemere HealthCare', '146 Dean St, Taunton, MA 02780', '(508) 823-0767',
      '94', 'Next Step Healthcare', ['1', '1', '1', '2'],
      'High', 'High', 'High', 'High',
      '', '94-bed skilled nursing/rehab facility with active post-acute operations; CMS ratings are currently low across the board, worth understanding going in.',
      'Call facility and identify the current Director of Rehabilitation.'],
    ['RegalCare at Taunton', '68 Dean St, Taunton, MA 02780', '(508) 824-1467',
      '100', 'RegalCare', ['1', '1', '2', '2'],
      'High', 'High', 'High', 'High',
      'Stroke, TBI, orthopedic rehab, speech therapy', '100-bed facility publicly advertising short-term rehab, speech therapy, and stroke/TBI/orthopedic rehabilitation -- a directly relevant clinical program mix.',
      'Call the Director of Rehabilitation / Speech Therapy department.'],
    ['Hannah B.G. Shaw Home', '299 Wareham St, Middleborough, MA 02346', '(508) 947-0332',
      '107', '', ['4', '3', '5', '4'],
      'Medium', 'High', 'High', 'High',
      'Speech therapy', '107-bed independent/non-profit facility with an established short-term rehab and speech therapy program, and strong CMS ratings across the board -- a good relationship-building target even without an urgent quality-gap angle.',
      'Call the rehab department and identify the SLP / Director of Rehab.'],
    ['Marian Manor of Taunton', '33 Summer St, Taunton, MA 02780', '(508) 822-4885',
      '116', 'Diocesan Health Facilities', ['2', '3', '4', '1'],
      'High', 'Medium', 'High', 'High',
      '', '116-bed skilled nursing/rehab facility, part of Diocesan Health Facilities -- the same chain as Sacred Heart and Our Lady\'s Haven in your South Coast accounts, a possible chain-relationship angle.',
      'Contact Admissions/Marketing and ask who manages speech therapy and instrumental swallow assessment referrals.'],
    ['The Residence at Great Woods', '190 Mansfield Ave, Norton, MA 02766', '(508) 285-3355',
      '', '', null,
      'Unknown', '', 'Unknown', 'Medium',
      'Memory care', 'Assisted living / memory care community, co-located with a nursing home -- a secondary referral target rather than a primary SNF target; worth confirming whether residents are referred externally for instrumental swallow evaluations.',
      'Identify clinical/wellness leadership and ask whether residents are referred externally for swallow evaluations.']
  ];

  const now = new Date().toISOString();
  newProspects.forEach(p => {
    const [name, address, phone, beds, chain, cms, clinicalNeed, volumeOpp, rehabActivity, referralPotential, programs, trigger, nextAction] = p;
    const cmsRating = cms ? `Overall: ${cms[0]}/5 (Health: ${cms[1]}, Staffing: ${cms[2]}, Quality: ${cms[3]})` : '';
    appendRow_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS, {
      AccountId: Utilities.getUuid(),
      AccountName: name,
      Status: 'Prospect',
      Address: address,
      Website: '',
      Phone: phone,
      ReferralSource: 'Web research',
      DateAdded: now,
      DateConverted: '',
      NextFollowUp: '',
      Latitude: '',
      Longitude: '',
      Region: 'Southeast',
      SimplePracticeUrl: '',
      Rating: '',
      CMSRating: cmsRating,
      BedCount: beds,
      ChainAffiliation: chain,
      HighRiskPrograms: programs,
      RehabProvider: '',
      RelationshipStage: 'Target',
      NextAction: nextAction,
      ClinicalNeed: clinicalNeed,
      VolumeOpportunity: volumeOpp,
      RehabActivity: rehabActivity,
      AccessRelationship: 'None',
      FeesTrigger: trigger,
      ReferralPotential: referralPotential,
      CurrentInstrumentalAssessment: 'Unknown',
      DysphagiaPainPoint: 'Unknown',
      EstimatedFeesVolume: 'Unknown',
      VisitCadence: 'No cadence'
    });
  });

  Logger.log('Imported ' + newProspects.length + ' new Southeast prospects. Run backfillAllDrivingDistances afterward to get coordinates + distances for these (they were added without lat/lng).');
}

/**
 * One-time: imports 11 South Central MA (Norwood/Canton/Needham/Stoughton/
 * Dedham/Walpole/Wrentham area) primary SNF/rehab prospects, plus 10
 * secondary assisted-living/memory-care/CCRC referral targets. All bed
 * counts, CMS ratings, chain affiliations, staffing, fines, and abuse
 * flags below are independently verified against the official CMS
 * Provider Info dataset by exact CCN match (not taken at face value).
 * No named individual contacts are included -- role-level contacts only,
 * per the same reasoning as the Southeast import. Two facilities from the
 * original research were excluded: "Highgate Manor Center for Health &
 * Rehabilitation" (Dedham) does not appear in current CMS data under that
 * name and could not be verified, so it's skipped; "Hebrew Rehabilitation
 * Center - NewBridge" is included below under its correct, verified
 * current CMS name, "NewBridge on the Charles Skilled Nursing Facility."
 */
function importSouthCentralProspects() {
  // Primary SNF/rehab targets.
  // [Name, Address, Phone, Beds, Chain, CMS[overall,health,staffing,qm],
  //  StaffingHours, NumFines, FinesTotal$, AbuseFlag(Y/N), CaseMixIndex,
  //  ClinicalNeed, VolumeOpportunity, RehabActivity, ReferralPotential,
  //  HighRiskPrograms, FeesTrigger, NextAction]
  const primaryTargets = [
    ['The Ellis Nursing and Rehabilitation Center', '135 Ellis Ave, Norwood, MA 02062', '(781) 762-6880',
      '191', '', ['5', '4', '3', '5'], '3.85', '1', '57158', 'N', '1.40',
      'High', 'Very High', 'Very High', 'Very High',
      '', '191-bed skilled nursing/rehab facility -- your largest South Central target -- with in-house PT/OT/SLP available 7 days a week and a strong short-stay rehab focus. CMS overall rating is a genuinely strong 5/5.',
      'Call facility and ask for the Director of Rehabilitation.'],
    ['Hellenic Nursing & Rehabilitation Center', '601 Sherman St, Canton, MA 02021', '(781) 828-7450',
      '154', '', ['3', '4', '1', '3'], '', '0', '0', 'N', '',
      'High', 'High', 'Very High', 'Very High',
      'Swallowing disorders (per facility rehab page)', "154-bed facility whose own rehabilitation page specifically lists swallowing disorders under speech-language therapy -- a directly relevant clinical signal, though this doesn't by itself indicate whether they currently use FEES or have a gap.",
      'Call facility and ask for the Director of Rehabilitation / SLP.'],
    ['Briarwood Rehabilitation & Healthcare Center', '150 Lincoln St, Needham, MA 02492', '(781) 449-4040',
      '120', 'Marquis Health Services', ['4', '4', '3', '4'], '3.99', '1', '8788', 'N', '1.63',
      'High', 'High', 'Very High', 'Very High',
      'Cardiac and pulmonary rehab', '120-bed facility with specialized cardiac and pulmonary rehab programs -- both patient populations with disproportionately high dysphagia rates. Strong CMS rating (4/5).',
      'Call facility and ask for the Director of Rehabilitation.'],
    ['Copley at Stoughton Nursing Care Center', '380 Sumner St, Stoughton, MA 02072', '(781) 341-2300',
      '123', '', ['5', '3', '5', '5'], '4.27', '0', '0', 'N', '1.29',
      'High', 'High', 'Very High', 'Very High',
      '', '123-bed facility with a genuinely excellent CMS profile (5/5 overall, 5/5 staffing) and active short-term post-acute rehab.',
      'Call facility and ask for the Director of Rehabilitation.'],
    ['Charlwell House Health & Rehabilitation Center', '305 Walpole St, Norwood, MA 02062', '(781) 762-7700',
      '124', 'Best Care Services', ['1', '2', '4', '1'], '3.36', '0', '0', 'N', '1.37',
      'High', 'Medium', 'High', 'High',
      '', '124-bed facility with in-house PT/OT/speech therapy; CMS overall rating is currently low (1/5), worth understanding why before or during outreach.',
      'Call facility and ask for the Director of Rehabilitation.'],
    ['Skilled Nursing Facility at North Hill', '865 Central Ave, Needham, MA 02492', '(781) 444-9910',
      '72', '', ['2', '3', '1', '4'], '', '1', '16153', 'N', '',
      'Medium', 'Medium', 'Medium', 'High',
      '', 'Skilled nursing component of the North Hill CCRC/retirement community -- short-term/subacute rehab plus long-term nursing, with CCRC-wide referral-network potential.',
      'Call facility and ask for the Director of Rehabilitation.'],
    ['Premier Healthcare at Harrington House', '160 Main St, Walpole, MA 02081', '(508) 660-3080',
      '90', 'Stellar Health Group', ['2', '2', '2', '2'], '3.80', '1', '43891', 'N', '1.42',
      'Medium', 'Medium', 'High', 'High',
      'Respiratory care', '90-bed facility offering daily PT/OT/speech/respiratory therapy on a dedicated short-term rehab wing. May appear under older names (Walpole Healthcare / Aspire Rehab) in some public listings -- current official CMS name is Premier Healthcare at Harrington House.',
      'Call facility and ask for the Director of Rehabilitation.'],
    ['NewBridge on the Charles Skilled Nursing Facility', '5000 Great Meadow Rd, Dedham, MA 02026', '(781) 234-9500',
      '48', '', ['5', '5', '4', '5'], '4.56', '0', '0', 'N', '1.36',
      'Medium', 'Medium', 'High', 'High',
      '', "Skilled nursing facility on Hebrew SeniorLife's NewBridge on the Charles campus -- a large, well-resourced senior-care campus with a genuinely excellent 5/5 CMS overall rating. Smaller bed count (48) than most others in this region, but a strong clinical environment.",
      'Call facility and ask for rehabilitation leadership / SLP leadership.'],
    ['Victoria Haven Nursing Facility', '137 Nichols St, Norwood, MA 02062', '(781) 762-0858',
      '31', 'Rehabilitation Associates', ['2', '1', '5', '5'], '4.58', '1', '40641', 'N', '1.26',
      'Medium', 'Low', 'Medium', 'Medium',
      '', 'Small (31-bed), family-run post-surgical/short-term rehab facility with notably high staffing hours per resident (4.58) despite its size.',
      'Call facility and ask for the Administrator / Director of Rehabilitation.'],
    ['The Center at Blue Hills', '1044 Park St, Stoughton, MA 02072', '(781) 344-7300',
      '92', '', ['3', '2', '2', '5'], '3.37', '1', '8422', 'Y', '1.22',
      'Medium', 'Medium', 'Medium', 'Medium',
      '', "IMPORTANT: current CMS data includes a confirmed abuse/neglect flag and below-average health-inspection and staffing scores. This is a business-development research flag, not a clinical conclusion -- verify current leadership and status before prioritizing outreach.",
      'Verify current status and leadership before prioritizing outreach.'],
    ['Serenity Hill Nursing Center', '655 Dedham St, Wrentham, MA 02093', '(508) 384-3400',
      '44', '', ['1', '1', '2', '1'], '4.04', '0', '0', 'N', '1.19',
      'Low', 'Low', 'Medium', 'Medium',
      '', 'Small (44-bed) Medicare/Medicaid-certified facility; CMS overall rating is currently low (1/5).',
      'Call facility and ask for the Administrator.']
  ];

  // Secondary AL / memory-care / CCRC referral targets -- not scored like
  // SNFs. No CMS data exists for these (not in the SNF-only dataset), so
  // no CMSRating/BedCount is set; unit counts are noted in HighRiskPrograms
  // instead since there's no dedicated field for them.
  const secondaryTargets = [
    ['New Pond Village', '180 Main St, Walpole, MA 02081', '(508) 660-1555', '64 units (49 traditional, 15 memory care)'],
    ['Benchmark Senior Living on Clapboardtree', '40 Clapboardtree St, Norwood, MA 02062', '(781) 561-9315', '90 units (69 traditional, 21 memory care)'],
    ['Sunrise of Norwood', '86 Saunders Rd, Norwood, MA 02062', '(781) 762-1333', '72 units (45 traditional, 27 memory care)'],
    ['Traditions of Dedham', '735 Washington St, Dedham, MA 02026', '(781) 251-9330', '95 units (81 traditional, 14 memory care)'],
    ['Charter Senior Living of Dedham', '391 Common St, Dedham, MA 02026', '(781) 407-7711', '113 units (88 traditional, 25 memory care)'],
    ['Avita of Needham', '880 Greendale Ave, Needham, MA 02492', '(781) 444-2266', '62 units (all memory care)'],
    ['Brightview Canton', '125 Turnpike St, Canton, MA 02021', '(781) 298-3407', '65 units (40 traditional, 25 memory care)'],
    ['Brookmeadow at Cobb Corner', '21 Central St, Stoughton, MA 02072', '(781) 344-0310', '91 units (67 traditional, 24 memory care)'],
    ['Village at Willow Crossings', '25 Cobb St, Mansfield, MA 02048', '(508) 261-1333', '104 units (86 traditional, 18 memory care)'],
    ['Fox Hill Village', '10 Longwood Dr, Westwood, MA 02090', '(781) 399-7000', 'CCRC/independent living -- residents needing inpatient rehab are referred out to short-term rehab facilities in the area, per their own site. Referral-network relationship, not a direct SNF target.']
  ];

  const now = new Date().toISOString();

  primaryTargets.forEach(p => {
    const [name, address, phone, beds, chain, cms, staffHours, numFines, finesTotal, abuse, cmi,
      clinicalNeed, volumeOpp, rehabActivity, referralPotential, programs, trigger, nextAction] = p;
    const cmsRating = `Overall: ${cms[0]}/5 (Health: ${cms[1]}, Staffing: ${cms[2]}, Quality: ${cms[3]})`;
    const finesText = numFines === '0' ? 'None' : (numFines + ' fine(s), $' + Number(finesTotal).toLocaleString() + ' total');
    appendRow_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS, {
      AccountId: Utilities.getUuid(),
      AccountName: name,
      Status: 'Prospect',
      Address: address,
      Website: '',
      Phone: phone,
      ReferralSource: 'Web research',
      DateAdded: now,
      DateConverted: '',
      NextFollowUp: '',
      Latitude: '',
      Longitude: '',
      Region: 'South Central',
      SimplePracticeUrl: '',
      Rating: '',
      CMSRating: cmsRating,
      BedCount: beds,
      ChainAffiliation: chain,
      HighRiskPrograms: programs,
      RehabProvider: '',
      RecentOwnershipChange: 'No',
      SpecialFocusStatus: '',
      AbuseFlag: abuse === 'Y' ? 'Yes' : 'No',
      StaffingHoursPerResidentDay: staffHours ? staffHours + ' hrs/resident/day' : '',
      FinesHistory: finesText,
      CaseMixIndex: cmi,
      RelationshipStage: 'Target',
      NextAction: nextAction,
      ClinicalNeed: clinicalNeed,
      VolumeOpportunity: volumeOpp,
      RehabActivity: rehabActivity,
      AccessRelationship: 'None',
      FeesTrigger: trigger,
      ReferralPotential: referralPotential,
      CurrentInstrumentalAssessment: 'Unknown',
      DysphagiaPainPoint: 'Unknown',
      EstimatedFeesVolume: 'Unknown',
      VisitCadence: 'No cadence'
    });
  });

  secondaryTargets.forEach(s => {
    const [name, address, phone, unitsNote] = s;
    appendRow_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS, {
      AccountId: Utilities.getUuid(),
      AccountName: name,
      Status: 'Prospect',
      Address: address,
      Website: '',
      Phone: phone,
      ReferralSource: 'Web research',
      DateAdded: now,
      DateConverted: '',
      NextFollowUp: '',
      Latitude: '',
      Longitude: '',
      Region: 'South Central',
      SimplePracticeUrl: '',
      Rating: '',
      CMSRating: '',
      BedCount: '',
      ChainAffiliation: '',
      HighRiskPrograms: unitsNote,
      RehabProvider: '',
      RelationshipStage: 'Target',
      NextAction: 'Identify clinical/wellness leadership and ask whether residents are referred externally for swallow evaluations.',
      ClinicalNeed: 'Unknown',
      VolumeOpportunity: '',
      RehabActivity: 'Unknown',
      AccessRelationship: 'None',
      FeesTrigger: 'Secondary referral-network target (assisted living / memory care / CCRC) -- not scored the same as a primary SNF prospect.',
      ReferralPotential: 'Medium',
      CurrentInstrumentalAssessment: 'Unknown',
      DysphagiaPainPoint: 'Unknown',
      EstimatedFeesVolume: 'Unknown',
      VisitCadence: 'No cadence'
    });
  });

  Logger.log('Imported ' + primaryTargets.length + ' primary + ' + secondaryTargets.length + ' secondary South Central prospects (' + (primaryTargets.length + secondaryTargets.length) + ' total). Run backfillAllDrivingDistances afterward.');
}

/**
 * ONE-TIME: Cape Cod gap audit. Checked the live sheet first (via direct
 * read, not assumption) -- none of the "renamed facility" scenarios in the
 * source research actually apply, since Eagle Pond, Wingate at Brewster,
 * Pleasant Bay, and Seashore Point don't exist anywhere in this CRM under
 * any name. So this is a pure addition of 6 genuinely new, CCN-verified
 * Cape Cod facilities -- it does not touch any of your 14 existing Cape
 * Cod accounts, their contacts, notes, or activity history. Rosewood
 * Manor's two contacts were independently verified via two separate
 * official sources (the facility's own site and its management company's
 * site) and are included as confirmed; every other facility uses
 * role-level next-action guidance only, per the same reasoning as the
 * Southeast and South Central imports.
 */
function auditAndAddCapeCodGaps() {
  // [Name, Address, Phone, Beds, Chain, CMS[overall,health,staffing,qm],
  //  StaffingHours, NumFines, FinesTotal$, PaymentDenials, CaseMixIndex,
  //  ClinicalNeed, VolumeOpportunity, RehabActivity, ReferralPotential,
  //  HighRiskPrograms, FeesTrigger, NextAction]
  const newAccounts = [
    ['JML Care Center', '184 Ter Heun Dr, Falmouth, MA 02540', '(508) 457-4621',
      '132', '', ['1', '3', '1', '1'], '2.92', '0', '0', '0', '1.45',
      'Medium', 'Medium', 'Medium', 'Medium',
      '', '132-bed skilled nursing facility affiliated with Cape Cod Healthcare. CMS overall rating is currently low (1/5), worth understanding why going in.',
      'Call facility and ask for the Director of Rehabilitation.'],
    ['Royal Nursing Center', '359 Jones Rd, Falmouth, MA 02540', '(774) 349-0220',
      '121', 'Royal Health Group', ['3', '3', '3', '4'], '3.13', '1', '8278', '0', '1.38',
      'Medium', 'Medium', 'Medium', 'Medium',
      '', 'Royal Health Group network account -- a separate facility from your existing Royal Cape Cod / Royal Health Cotuit / Royal Megansett accounts, not a duplicate. Worth knowing: your existing Royal Cape Cod notes mention the Royal properties chain-wide were being sold as of a 7/24/2026 note, sale expected complete 8/31/2026 -- worth checking current ownership status before outreach, given that may affect this account too.',
      'Call facility and ask for the Director of Rehabilitation. Coordinate outreach strategy across Royal accounts given shared ownership.'],
    ['Cape Cod Post Acute Care', '383 South Orleans Rd, Brewster, MA 02631', '(508) 240-3500',
      '135', 'Marquis Health Services', ['1', '1', '2', '3'], '3.35', '1', '298483', '1', '1.54',
      'Medium', 'High', 'Medium', 'Medium',
      '', 'IMPORTANT: current CMS data shows a substantial fine ($298,483) and a payment denial on record -- a genuinely weak regulatory profile, recorded here as business-development context, not as proof of dysphagia. May appear under older names in some directories (Pleasant Bay Nursing & Rehabilitation, AdviniaCare Pleasant Bay) -- current official CMS name is Cape Cod Post Acute Care.',
      'Verify current administrator and leadership before prioritizing outreach.'],
    ['AdviniaCare at Provincetown', '100 Alden St, Provincetown, MA 02657', '(508) 487-7090',
      '41', 'AdviniaCare', ['1', '1', '2', '3'], '3.71', '1', '11782', '0', '1.60',
      'Medium', 'Low', 'Medium', 'Medium',
      '', 'Smaller (41-bed) facility -- scored on its own clinical merits, not inflated for bed volume. Legal entity name is Seashore Pointe Rehab Center LLC; older directories may list this facility as Seashore Point.',
      'Call facility and ask for the Director of Rehabilitation.'],
    ['Our Island Home', '9 East Creek Rd, Nantucket, MA 02554', '(508) 228-0462',
      '45', '', ['5', '4', '5', '4'], '3.97', '0', '0', '0', '1.14',
      'Medium', 'Low', 'Medium', 'Medium',
      '', 'Municipal (Town of Nantucket-owned) skilled nursing facility with a genuinely excellent CMS profile (5/5 overall, 5/5 staffing). Note: Nantucket is geographically distinct from mainland Cape Cod -- factor real travel logistics (ferry/flight) into any visit planning.',
      'Call facility and ask for the Director of Nursing.']
  ];

  const now = new Date().toISOString();
  const accountIdByName = {};

  newAccounts.forEach(p => {
    const [name, address, phone, beds, chain, cms, staffHours, numFines, finesTotal, paymentDenials, cmi,
      clinicalNeed, volumeOpp, rehabActivity, referralPotential, programs, trigger, nextAction] = p;
    const cmsRating = `Overall: ${cms[0]}/5 (Health: ${cms[1]}, Staffing: ${cms[2]}, Quality: ${cms[3]})`;
    let finesText = numFines === '0' ? 'None' : (numFines + ' fine(s), $' + Number(finesTotal).toLocaleString() + ' total');
    if (paymentDenials !== '0') finesText += ' + ' + paymentDenials + ' payment denial(s)';
    const accountId = Utilities.getUuid();
    accountIdByName[name] = accountId;
    appendRow_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS, {
      AccountId: accountId,
      AccountName: name,
      Status: 'Prospect',
      Address: address,
      Website: '',
      Phone: phone,
      ReferralSource: 'Web research',
      DateAdded: now,
      DateConverted: '',
      NextFollowUp: '',
      Latitude: '',
      Longitude: '',
      Region: 'Cape Cod',
      SimplePracticeUrl: '',
      Rating: '',
      CMSRating: cmsRating,
      BedCount: beds,
      ChainAffiliation: chain,
      HighRiskPrograms: programs,
      RehabProvider: '',
      RecentOwnershipChange: 'No',
      SpecialFocusStatus: '',
      AbuseFlag: 'No',
      StaffingHoursPerResidentDay: staffHours ? staffHours + ' hrs/resident/day' : '',
      FinesHistory: finesText,
      CaseMixIndex: cmi,
      RelationshipStage: 'Target',
      NextAction: nextAction,
      ClinicalNeed: clinicalNeed,
      VolumeOpportunity: volumeOpp,
      RehabActivity: rehabActivity,
      AccessRelationship: 'None',
      FeesTrigger: trigger,
      ReferralPotential: referralPotential,
      CurrentInstrumentalAssessment: 'Unknown',
      DysphagiaPainPoint: 'Unknown',
      EstimatedFeesVolume: 'Unknown',
      VisitCadence: 'No cadence'
    });
  });

  // Rosewood Manor -- private-pay rest home / memory care, NOT a Medicare-
  // certified SNF, so no CMS data applies. Added separately with its two
  // independently-verified contacts.
  const rosewoodId = Utilities.getUuid();
  appendRow_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS, {
    AccountId: rosewoodId,
    AccountName: 'Rosewood Manor',
    Status: 'Prospect',
    Address: '671 Main St, Harwich, MA 02645',
    Website: '',
    Phone: '(508) 432-0135',
    ReferralSource: 'Web research',
    DateAdded: now,
    DateConverted: '',
    NextFollowUp: '',
    Latitude: '',
    Longitude: '',
    Region: 'Cape Cod',
    SimplePracticeUrl: '',
    Rating: '',
    CMSRating: '',
    BedCount: '',
    ChainAffiliation: '',
    HighRiskPrograms: 'Private-pay rest home / memory care, ~33 residents. NOT a Medicare/Medicaid-certified SNF -- do not score on the same bed-volume formula as a 100+ bed facility.',
    RehabProvider: '',
    RelationshipStage: 'Target',
    NextAction: 'Call Brenna Van Tassel (Administrator) or Jennifer Carroll (Director of Admissions) and ask about SLP/dysphagia/outside therapy referral relationships.',
    ClinicalNeed: 'Unknown',
    VolumeOpportunity: 'Low',
    RehabActivity: 'Unknown',
    AccessRelationship: 'None',
    FeesTrigger: 'Small private-pay rest home/memory-care setting -- worth understanding whether any SLP or outside therapy referral relationship already exists.',
    ReferralPotential: 'Medium',
    CurrentInstrumentalAssessment: 'Unknown',
    DysphagiaPainPoint: 'Unknown',
    EstimatedFeesVolume: 'Unknown',
    VisitCadence: 'No cadence'
  });

  // Two independently-verified contacts (confirmed via both Rosewood
  // Manor's own site and its management company's site).
  createContact_({ AccountId: rosewoodId, ContactName: 'Brenna Van Tassel, RN', Role: 'Administrator', Email: 'BVantassel@ncaltc.com', PreferredContact: 'Email' });
  createContact_({ AccountId: rosewoodId, ContactName: 'Jennifer Carroll', Role: 'Director of Admissions / Business Office Manager', PreferredContact: 'Phone' });

  Logger.log('Cape Cod audit complete. Added ' + (newAccounts.length + 1) + ' new accounts (' + newAccounts.length + ' SNF + 1 rest home) and 2 verified contacts. No existing Cape Cod accounts were modified -- Eagle Pond, Wingate at Brewster, Pleasant Bay, and Seashore Point were confirmed absent from the CRM and were not added, per the closed-facility rule. Run backfillAllDrivingDistances afterward.');
}

/**
 * ONE-TIME: clears the generic, boilerplate Next Action text ("Call
 * facility and ask for the Director of Rehabilitation," etc.) that the
 * region-import scripts set on every newly-added account, but only for
 * accounts that have genuinely never been contacted (LastContactDate is
 * blank). Accounts with a real LastContactDate keep their Next Action,
 * since that reflects an actual logged activity, not import boilerplate.
 * Safe to re-run -- only clears accounts that still match this pattern.
 */
function clearGenericNextActionForUncontactedAccounts() {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const lastContactCol = ACCOUNTS_HEADERS.indexOf('LastContactDate') + 1;
  const nextActionCol = ACCOUNTS_HEADERS.indexOf('NextAction') + 1;
  const values = sheet.getRange(2, 1, lastRow - 1, ACCOUNTS_HEADERS.length).getValues();
  let cleared = 0;

  values.forEach((row, i) => {
    const lastContact = row[lastContactCol - 1];
    const nextAction = row[nextActionCol - 1];
    if (!lastContact && nextAction) {
      sheet.getRange(2 + i, nextActionCol).setValue('');
      cleared++;
    }
  });

  Logger.log('Cleared Next Action on ' + cleared + ' never-contacted account(s).');
}

/**
 * ONE-TIME: fixes accounts whose Last Contact fields don't reflect their
 * real activity history -- specifically, the accounts whose only activity
 * came from the legacy Notes migration, which wrote directly into the
 * Activities sheet and never updated the account's Last Contact fields
 * (only createActivity_, used when logging through the app, does that).
 * For every account, finds its single most recent activity (by
 * timestamp, across ALL activities including migrated ones) and sets
 * LastContactDate/LastContactType/LastContactResult to match. Does not
 * touch NextAction/NextFollowUp. Safe to re-run -- for accounts already
 * correct, it just reconfirms the same values.
 */
function backfillLastContactFromActivities() {
  const accountsSheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!accountsSheet) throw new Error('Accounts sheet not found');
  const activities = readSheet_(ACTIVITIES_SHEET, ACTIVITIES_HEADERS);

  const mostRecentByAccount = {};
  activities.forEach(act => {
    const existing = mostRecentByAccount[act.AccountId];
    if (!existing || new Date(act.Timestamp) > new Date(existing.Timestamp)) {
      mostRecentByAccount[act.AccountId] = act;
    }
  });

  const lastRow = accountsSheet.getLastRow();
  if (lastRow < 2) return;

  const idCol = ACCOUNTS_HEADERS.indexOf('AccountId') + 1;
  const lastContactDateCol = ACCOUNTS_HEADERS.indexOf('LastContactDate') + 1;
  const lastContactTypeCol = ACCOUNTS_HEADERS.indexOf('LastContactType') + 1;
  const lastContactResultCol = ACCOUNTS_HEADERS.indexOf('LastContactResult') + 1;
  const values = accountsSheet.getRange(2, 1, lastRow - 1, ACCOUNTS_HEADERS.length).getValues();
  let updated = 0;

  values.forEach((row, i) => {
    const mostRecent = mostRecentByAccount[row[idCol - 1]];
    if (mostRecent) {
      const rowNum = 2 + i;
      accountsSheet.getRange(rowNum, lastContactDateCol).setValue(mostRecent.Timestamp);
      accountsSheet.getRange(rowNum, lastContactTypeCol).setValue(mostRecent.ActivityType || '');
      accountsSheet.getRange(rowNum, lastContactResultCol).setValue(mostRecent.ActivityResult || '');
      updated++;
    }
  });

  Logger.log('Backfilled Last Contact fields for ' + updated + ' account(s) based on their most recent activity.');
}

// Keyword -> RoleCategory mapping used by the backfill below. Checked in
// order, first match wins. Kept as its own function so both Contacts and
// Connections can share the exact same logic.
function inferRoleCategory_(roleText) {
  const r = (roleText || '').toLowerCase();
  if (!r) return null;
  if (r.indexOf('clinical champion') !== -1) return 'Clinical Champion';
  if (r.indexOf('slp') !== -1 || r.indexOf('speech') !== -1) return 'SLP';
  if (r.indexOf('rehab director') !== -1 || r.indexOf('director of rehab') !== -1) return 'Rehab Director';
  if (r.indexOf('medical director') !== -1) return 'Medical Director';
  if (r.indexOf('don') !== -1 || r.indexOf('director of nursing') !== -1) return 'DON';
  if (r.indexOf('administrator') !== -1) return 'Administrator';
  if (r.indexOf('admission') !== -1) return 'Admissions';
  if (r.indexOf('case manag') !== -1) return 'Case Management';
  if (r.indexOf('discharge') !== -1 || r.indexOf('referral coordinator') !== -1) return 'Referral Coordinator';
  return null; // no unambiguous match -- leave blank rather than guess
}

/**
 * ONE-TIME: backfills the structured RoleCategory field (which drives the
 * account header's Primary Clinical Contact / Decision Maker) from each
 * contact's existing free-text Role, wherever the mapping is unambiguous.
 * Only touches rows where RoleCategory is currently blank -- never
 * overwrites a category you've already set by hand. Runs across both
 * Contacts and Connections, since the header draws from both. Safe to
 * re-run.
 */
function backfillRoleCategoryFromRoleText() {
  let updated = 0;
  let skippedAlreadySet = 0;
  let skippedNoMatch = 0;

  [CONTACTS_SHEET, CONNECTIONS_SHEET].forEach(sheetName => {
    const headers = sheetName === CONTACTS_SHEET ? CONTACTS_HEADERS : CONNECTIONS_HEADERS;
    const sheet = getSpreadsheet_().getSheetByName(sheetName);
    if (!sheet) return;
    const roleCol = headers.indexOf('Role') + 1;
    const roleCategoryCol = headers.indexOf('RoleCategory') + 1;
    if (roleCategoryCol === 0) return; // Connections sheet has no RoleCategory column -- skip gracefully
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    values.forEach((row, i) => {
      const existingCategory = row[roleCategoryCol - 1];
      if (existingCategory) {
        skippedAlreadySet++;
        return;
      }
      const inferred = inferRoleCategory_(row[roleCol - 1]);
      if (!inferred) {
        skippedNoMatch++;
        return;
      }
      sheet.getRange(2 + i, roleCategoryCol).setValue(inferred);
      updated++;
    });
  });

  Logger.log('Backfilled RoleCategory on ' + updated + ' contact(s). Skipped ' + skippedAlreadySet + ' (already had a category set) and ' + skippedNoMatch + ' (no unambiguous match from their Role text).');
}

/**
 * ONE-TIME: simplifies legacy RelationshipStage values to the current CRM stages.
 * Mapping:
 *   Target -> Target
 *   Researched -> Target
 *   Contacted -> Contacted
 *   Connected -> Connected
 *   Clinical Champion -> Connected
 *   Referral Discussion -> Referral Discussion
 *   First FEES -> Active Referrer
 *   Active Referrer -> Active Referrer
 *   Dormant -> Not a fit
 *   Not a Fit -> Not a fit
 * Also handles the older ALL CAPS versions. Safe to re-run.
 */
function migrateRelationshipStages() {
  const stageMap = {
    'TARGET': 'Target', 'RESEARCHED': 'Target', 'CONTACTED': 'Contacted',
    'CONNECTED': 'Connected', 'CLINICAL CHAMPION': 'Connected',
    'REFERRAL DISCUSSION': 'Referral Discussion', 'FIRST FEES': 'Active Referrer',
    'ACTIVE REFERRER': 'Active Referrer', 'DORMANT': 'Not a fit', 'NOT A FIT': 'Not a fit'
  };
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const stageCol = ACCOUNTS_HEADERS.indexOf('RelationshipStage') + 1;
  const range = sheet.getRange(2, stageCol, lastRow - 1, 1);
  const values = range.getValues();
  let updated = 0;

  values.forEach(row => {
    const current = String(row[0] || '').trim();
    if (!current) return;
    const replacement = stageMap[current.toUpperCase()];
    if (replacement && replacement !== current) {
      row[0] = replacement;
      updated++;
    }
  });

  if (updated > 0) range.setValues(values);
  Logger.log('Simplified RelationshipStage on ' + updated + ' account(s).');
}

/**
 * ONE-TIME: enriches Cape Cod and South Shore accounts with researched
 * values for ClinicalNeed, VolumeOpportunity, RehabActivity,
 * AccessRelationship, FeesTrigger, CurrentInstrumentalAssessment,
 * DysphagiaPainPoint, ReferralPotential, EstimatedFeesVolume, and
 * VisitCadence -- sourced from an uploaded research file and
 * independently spot-checked against several facilities' own websites
 * before import (confirmed accurate on every claim checked).
 *
 * ONLY fills in fields that are currently blank -- never overwrites
 * anything already on file. ClinicalNeed/VolumeOpportunity/RehabActivity/
 * ReferralPotential are business judgment calls the research file derived
 * from real signals (bed count, verified clinical programs) -- review and
 * adjust freely, they are starting points, not verified facts.
 * AccessRelationship was derived from your own existing CRM activity
 * history, not external research. Everything without a confident,
 * dropdown-matching source was left blank rather than guessed.
 */
function enrichCapeCodSouthShoreFields() {
  const ENRICHMENT_DATA = [
  { AccountId: 'e9b846be-0b1c-4ecd-9e93-7ee502f33c62', AccountName: 'Liberty Commons', values: ['High', 'High', 'High', 'Connected', 'In-house speech therapy addresses swallowing; short-term rehab after stroke/cardiac events. Verify current instrumental assessment/FEES workflow.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '6ab06d01-5816-4dba-97a8-ddaebe91e4bb', AccountName: 'Maplewood at Mayflower Place', values: ['High', 'Medium', 'High', 'Contacted', 'Skilled nursing explicitly advertises dysphagia/swallowing therapy and speech therapy 6 days/week.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: 'a9ccf97d-213f-4996-9928-85c3335813ca', AccountName: 'Maplewood at Brewster', values: ['Unknown', 'Low', 'Unknown', '', 'Senior living community; current public page does not establish an on-site SNF or dysphagia program. Treat as secondary referral target.', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '987b137f-3823-4b06-a834-2af7be9d8012', AccountName: 'The Terraces Orleans', values: ['Medium', 'Low', 'Medium', '', 'Private-pay skilled nursing; current public sources confirm speech therapy and skilled nursing, but no dysphagia-specific or instrumental-assessment service identified.', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '407a4462-6a42-4a35-95e1-bc2cf3f9306d', AccountName: 'Royal Health Cotuit', values: ['High', 'High', 'Very High', 'Connected', 'Royal rehab program explicitly includes dysphagia, speech/swallowing evaluation, and VitalStim; short-term rehab and stroke recovery also offered.', 'Unknown', 'Unknown', 'Very High', 'Unknown', ''] },
  { AccountId: 'adb84404-36ec-4e43-9184-d4ce5bca82d3', AccountName: 'Royal Cape Cod', values: ['Medium', 'Medium', 'High', '', 'Royal Cape Cod offers short-term rehab with speech therapy and post-surgical/orthopedic rehabilitation. Dysphagia-specific service not verified for this site.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '8fb3d1cf-aecb-4681-89d4-e31e7e0b5fa6', AccountName: 'Royal Megansett Nursing Home', values: ['High', 'Medium', 'High', '', 'Royal rehab program explicitly includes dysphagia, swallowing evaluation, and VitalStim; short-term rehab/memory-care rehabilitation also supported.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '8d024e5a-a086-44bb-9ed4-d6804d878f7f', AccountName: 'Cape Heritage Rehabilitation & Health Care Center', values: ['High', 'High', 'High', '', 'Short-term rehab with speech therapy; site explicitly advertises dysphagia management, nutritional management and enteral feeding.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '26a0b8cf-159a-4653-97eb-fd7965328ccd', AccountName: 'Windsor Skilled Nursing-Rehab', values: ['High', 'High', 'Very High', '', 'On-site PT/OT/speech 7 days/week; explicitly offers VitalStim for dysphagia and stroke/neurological/complex-care programs.', 'Unknown', 'Unknown', 'Very High', 'Unknown', ''] },
  { AccountId: '32dc6827-3584-4919-9eda-431041d4926f', AccountName: 'Bourne Manor Extended Care', values: ['Medium', 'High', 'Very High', '', 'Post-acute/short-term rehab with on-site PT/OT/speech 7 days/week; no dysphagia-specific service verified in current source.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: 'da7a6f0f-4ebf-4af1-8be6-ba705a46f9e1', AccountName: 'Thirwood Place', values: ['Unknown', 'Low', 'Unknown', '', 'Senior-living/assisted-care community; not a conventional SNF target. Use as secondary referral source.', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: 'b690f385-0416-478b-a78a-b10de30f906d', AccountName: 'The Pavilion Rehabilitation and Nursing Center', values: ['High', 'Medium', 'Very High', 'Contacted', 'Stroke-recovery program explicitly includes swallowing evaluation and dysphagia management; rehab is interdisciplinary.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '36a64267-b249-424c-965d-e119840ae2cd', AccountName: 'RegalCare at Harwich', values: ['Medium', 'High', 'High', 'Contacted', 'Current sources confirm short-term rehabilitation and speech therapy; no site-specific dysphagia/instrumental-assessment evidence found.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: 'b69d89d0-3d04-4721-8b56-da798a48d976', AccountName: 'Cape Regency Rehabilitation & Health Care Center', values: ['High', 'High', 'High', 'Connected', 'Short-term/post-hospital rehab with speech therapy and explicit dysphagia management; medically complex and enteral-feeding capabilities.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: 'db6c77dc-faad-4068-a375-dcc91316b9a1', AccountName: 'Hancock Park Rehabilitation & Nursing Center', values: ['High', 'High', 'High', '', 'Current survey evidence documents dysphagia-related meal supervision/care-plan issues; speech therapy present. This is a clinical signal, not proof of unmet FEES need.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: 'e4b3b01e-501c-48c1-b5d6-b00fff3e9015', AccountName: 'South Cove Manor at Quincy Point Rehabilitation Center', values: ['High', 'High', 'High', '', 'Current rehab page explicitly lists speech therapy focused on swallowing and dysphagia evaluation/treatment.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '96eaf60c-d41c-4d13-afc0-ecd5b1985574', AccountName: 'Alliance Health at Marina Bay', values: ['High', 'Very High', 'Very High', '', '167-bed rehab facility with in-house speech therapy; stroke/post-acute/enteral feeding programs and on-site modified barium swallow.', 'MBS', 'Unknown', 'Very High', 'Unknown', ''] },
  { AccountId: '2f629695-1c10-40a1-a637-3f1b6dfcfeef', AccountName: 'Dwyer Home at Fairing Way', values: ['High', 'Low', 'High', '', 'Current public survey narrative documents a resident with dysphagia, aspiration pneumonia risk and SLP assessment; facility also provides short-term rehab.', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '10a5226e-0fed-4dd4-b963-f11a9ee1a731', AccountName: 'CareOne at Weymouth', values: ['Medium', 'High', 'Very High', '', 'High-acuity SNF with subacute rehab, stroke recovery and pulmonary rehabilitation; current CareOne stroke program includes dysphagia therapy generally, but site-specific FEES/MBS workflow not verified.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: 'bbc31535-0375-46b4-9706-92e6996e1bab', AccountName: 'Pope Rehabilitation & Skilled Nursing Center', values: ['Unknown', 'Low', 'Medium', '', 'Current public evidence reviewed did not provide enough site-specific dysphagia/SLP detail to classify conservatively above Unknown.', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '1b0d6095-e6ea-4b67-bf1e-7182c0791b68', AccountName: 'Royal Health Braintree', values: ['High', 'Very High', 'Very High', '', 'Royal rehab program explicitly includes dysphagia, swallowing evaluation and VitalStim; short-term rehab/stroke recovery also offered.', 'Unknown', 'Unknown', 'Very High', 'Unknown', ''] },
  { AccountId: '872d8379-aa7e-4211-8499-971e370e7cc7', AccountName: 'Alliance Health at Braintree', values: ['High', 'High', 'Very High', '', '101-bed rehab with in-house speech therapy, stroke recovery, enteral feeding and on-site modified barium swallow.', 'MBS', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '3b76e77c-2bc4-451a-b481-100a8e239f39', AccountName: 'John Scott House Rehabilitation & Nursing Center', values: ['High', 'High', 'High', '', '2025 survey documented failure to implement safe-swallowing interventions for a resident with oropharyngeal dysphagia; speech therapy and short-term rehab are present.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '16769f77-3ba0-47b9-8fec-e261a413624f', AccountName: 'Braintree Manor HealthCare', values: ['Unknown', 'Very High', 'Medium', '', 'Large SNF, but current public evidence reviewed did not provide sufficiently reliable site-specific dysphagia/SLP information. Do not infer clinical need from size alone.', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: 'a5b9bd53-c54a-4c62-8965-c4754b2abbbf', AccountName: 'Life Care Center of Plymouth', values: ['High', 'Very High', 'Very High', '', 'In-house speech therapy explicitly treats swallowing problems; current site also advertises VitalStim for swallowing disorders and inpatient rehab.', 'Unknown', 'Unknown', 'Very High', 'Unknown', ''] },
  { AccountId: 'c457fe94-a2a2-4f1e-9f4d-d442ebf8ec6f', AccountName: 'Newfield House Convalescent Home', values: ['Unknown', 'High', 'Medium', '', '100-bed Level III nursing home; rehab is provided by an outside agency. Current source does not establish dysphagia/FEES/MBS specifics.', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: 'ae81e338-569a-4698-99bf-ecbaadfefc72', AccountName: 'Bay Path Rehabilitation & Nursing Center', values: ['Medium', 'High', 'Very High', '', '120-bed medically complex SNF with short-term rehab; current BaneCare page lists SLP and on-site modified barium swallow.', 'MBS', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '9527899d-81e8-4e93-ac35-9fa45a3ad9eb', AccountName: 'Life Care Center of the South Shore', values: ['High', 'High', 'Very High', '', 'Inpatient rehab with in-house therapy; public clinical directory documents dysphagia therapy and cognitive-linguistic therapy.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '5728b032-9720-4e8c-b8c1-78d61066415f', AccountName: 'Cardigan Nursing Home', values: ['Unknown', 'Low', 'Unknown', '', 'Current public evidence reviewed did not provide enough reliable site-specific dysphagia/SLP detail to classify conservatively.', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '948065de-80de-4141-bccc-61cff6a9ec63', AccountName: 'Harbor House Rehabilitation & Nursing Center', values: ['High', 'High', 'High', '', '142-bed short-stay rehab with SLP; BaneCare explicitly lists modified barium swallow, enteral feeding and SLP among clinical services.', 'MBS', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '273cdcc2-4157-4bc5-ba89-71bfca751927', AccountName: 'Queen Anne Nursing Home', values: ['Medium', 'High', 'Very High', '', '106-bed family-owned SNF with in-house PT/OT/speech 7 days/week; current site specifically discusses SLP addressing swallowing difficulties.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '38aea218-b7af-47a7-9d89-0394b19bea8e', AccountName: 'Webster Park Rehabilitation & Healthcare Center', values: ['Medium', 'High', 'Very High', '', '110-bed post-acute facility with PT/OT/speech up to 7 days/week, stroke recovery and pulmonary programs; no dysphagia-specific service verified in current sources reviewed.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: 'afa9664e-8101-4221-b4d8-da4dee89c3c5', AccountName: 'South Shore Rehabilitation & Skilled Care Center', values: ['High', 'Medium', 'High', '', 'Short-term/post-hospital rehab with PT/OT/speech and explicit dysphagia management; G-tube/PEG and nutritional management also listed.', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '07ba1b41-afba-47b1-9c9e-3c273c8abefe', AccountName: 'Wingate at Silver Lake', values: ['Medium', 'Very High', 'Very High', '', '164-bed skilled nursing campus with specialized short-term rehab/post-acute care and speech therapy; current therapy data shows speech therapy utilization.', 'Unknown', 'Unknown', 'Very High', 'Unknown', ''] },
  ];

  const fieldNames = ['ClinicalNeed', 'VolumeOpportunity', 'RehabActivity', 'AccessRelationship',
    'FeesTrigger', 'CurrentInstrumentalAssessment', 'DysphagiaPainPoint',
    'ReferralPotential', 'EstimatedFeesVolume', 'VisitCadence'];
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');

  let accountsUpdated = 0;
  let fieldsFilled = 0;
  let notFound = [];

  ENRICHMENT_DATA.forEach(rec => {
    const rowIndex = findRowIndex_(ACCOUNTS_SHEET, 'AccountId', rec.AccountId);
    if (rowIndex === -1) {
      notFound.push(rec.AccountName);
      return;
    }
    let touchedThisAccount = false;
    fieldNames.forEach((fieldName, i) => {
      const newValue = rec.values[i];
      if (!newValue) return; // nothing proposed for this field -- skip
      const col = ACCOUNTS_HEADERS.indexOf(fieldName) + 1;
      if (col === 0) return;
      const currentValue = sheet.getRange(rowIndex, col).getValue();
      if (currentValue === '' || currentValue === null || currentValue === undefined) {
        sheet.getRange(rowIndex, col).setValue(newValue);
        fieldsFilled++;
        touchedThisAccount = true;
      }
    });
    if (touchedThisAccount) accountsUpdated++;
  });

  Logger.log('Enriched ' + accountsUpdated + ' account(s) across ' + fieldsFilled + ' previously-blank field(s). ' +
    (notFound.length ? 'Could not find: ' + notFound.join(', ') : 'All accounts matched successfully.'));
}

/**
 * ONE-TIME: enriches South Coast accounts with researched values for
 * ClinicalNeed, RehabActivity, AccessRelationship, FeesTrigger,
 * CurrentInstrumentalAssessment, DysphagiaPainPoint, ReferralPotential,
 * EstimatedFeesVolume, and VisitCadence -- sourced from an uploaded
 * research file, spot-checked against facility websites before import
 * (VitalStim claim for The Oaks confirmed via lcca.com). VolumeOpportunity
 * was not researched in this pass (left blank for every account).
 *
 * ONLY fills in fields that are currently blank -- never overwrites
 * anything already on file. ClinicalNeed/RehabActivity/ReferralPotential
 * are business judgment calls derived from real signals -- review and
 * adjust freely. CMS-survey-citing claims (a few DysphagiaPainPoint/
 * FeesTrigger entries reference specific inspection findings) could not
 * be independently re-verified via general web search -- treat those
 * specifically as lower-confidence context, not confirmed fact.
 */
function enrichSouthCoastFields() {
  const ENRICHMENT_DATA = [
  { AccountId: '978e0dc3-8b96-4baf-be38-efbfc7b3a040', AccountName: 'The Oaks', values: ['High', '', 'High', '', 'Explicit swallowing-disorder/VitalStim program; discovery call should ask how they currently handle instrumental assessment', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: 'cc0c60c7-498f-4b97-807e-219a57af76e0', AccountName: 'CareOne at New Bedford', values: ['Medium', '', 'High', '', 'Short-term rehab + SLP; ask when instrumental swallowing assessment is needed', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '0e9700ea-564d-4b40-ac13-625cc9177f4e', AccountName: 'Sacred Heart Skilled Nursing & Rehabilitative Care', values: ['Medium', '', 'High', '', 'Rehab + medically complex/Alzheimer population; dysphagia process needs discovery', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '0160545d-f0bc-4177-be49-84a1d7dd7d37', AccountName: 'New Bedford Jewish Convalescent Home', values: ['Medium', '', 'High', '', 'Short-term rehab + speech therapy; instrumental assessment process unknown', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: 'afc749f2-689d-4031-b078-d399da97cd83', AccountName: 'Hathaway Manor Extended Care', values: ['Medium', '', 'High', '', 'Speech therapy 7 days/week + post-hospital rehab; ask about FEES/MBS workflow', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: 'dbaec8fe-b39d-49a3-9f4d-cabbd4442727', AccountName: 'Clifton Rehabilitation & Nursing Center', values: ['High', '', 'High', '', 'Explicit swallowing difficulties + speech therapy; strong FEES discovery target', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '9c0d28cb-c7a6-4cad-8e1c-e3b2c1195a0e', AccountName: 'Mill Brook Rehabilitation & Healthcare Center', values: ['Medium', '', 'High', '', 'Post-acute rehab target; dysphagia/instrumental workflow needs discovery', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '0d837621-b380-4332-95ee-f8b6a7e9838a', AccountName: 'Kimwell Nursing and Rehabilitation', values: ['Medium', '', 'High', '', 'In-house SLP + short-term rehab; ask who handles instrumental swallow studies', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '490dad68-c8e5-4f8f-ab11-cebbf279ea0e', AccountName: 'The Grove at Carvalho', values: ['Unknown', '', 'Unknown', '', 'Need clinical-program discovery before assigning a specific FEES trigger', 'Unknown', 'Unknown', '', 'Unknown', ''] },
  { AccountId: 'b8ca89a9-90c4-4bad-b183-03800effdb43', AccountName: 'Sarah S. Brayton Nursing Center', values: ['Medium', '', 'High', '', 'In-house SLP + rehab; instrumental assessment workflow needs discovery', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '570a6239-5d3c-40d6-a4d9-3d3c8fc7d98f', AccountName: 'Somerset Ridge Center', values: ['Medium', '', 'High', '', 'In-house SLP + post-acute rehab; ask about current instrumental assessment access', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '3507416f-8a9d-49d4-bc9a-c51200c466d4', AccountName: 'Fall River HealthCare', values: ['Medium', '', 'Medium', '', 'Speech pathology + rehab; current FEES/MBS process needs discovery', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '39a57f2e-3ea1-4fb1-9f54-c9cab8256908', AccountName: 'Royal of Fairhaven Nursing Center', values: ['High', '', 'High', '', 'Documented dysphagia/silent aspiration + modified texture/SLP recommendations; high-priority discovery target', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  { AccountId: '74c6ff46-068a-4466-9a1c-761e81b358ed', AccountName: 'Our Lady\'s Haven Skilled Nursing & Rehabilitative Care', values: ['Medium', '', 'High', '', 'Rehab + medically complex/palliative population; instrumental swallow process needs discovery', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '774c933c-b670-447a-89e1-b8547ab000ce', AccountName: 'Alden Court Nursing Care', values: ['Medium', '', 'High', '', 'Large post-acute unit + 7-day rehab; ask about current SLP/instrumental workflow', 'Unknown', 'Unknown', 'Medium', 'Unknown', ''] },
  { AccountId: '6c4fa8ac-3e9b-4b65-92f7-2777bb3505a6', AccountName: 'Brandon Woods of Dartmouth', values: ['High', '', 'High', '', '2026 survey documents dysphagia with choking after incorrect diet texture; strong clinical discovery target', 'Unknown', 'Unknown', 'High', 'Unknown', ''] },
  ];

  const fieldNames = ['ClinicalNeed', 'VolumeOpportunity', 'RehabActivity', 'AccessRelationship',
    'FeesTrigger', 'CurrentInstrumentalAssessment', 'DysphagiaPainPoint',
    'ReferralPotential', 'EstimatedFeesVolume', 'VisitCadence'];
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');

  let accountsUpdated = 0;
  let fieldsFilled = 0;
  let notFound = [];

  ENRICHMENT_DATA.forEach(rec => {
    const rowIndex = findRowIndex_(ACCOUNTS_SHEET, 'AccountId', rec.AccountId);
    if (rowIndex === -1) {
      notFound.push(rec.AccountName);
      return;
    }
    let touchedThisAccount = false;
    fieldNames.forEach((fieldName, i) => {
      const newValue = rec.values[i];
      if (!newValue) return;
      const col = ACCOUNTS_HEADERS.indexOf(fieldName) + 1;
      if (col === 0) return;
      const currentValue = sheet.getRange(rowIndex, col).getValue();
      if (currentValue === '' || currentValue === null || currentValue === undefined) {
        sheet.getRange(rowIndex, col).setValue(newValue);
        fieldsFilled++;
        touchedThisAccount = true;
      }
    });
    if (touchedThisAccount) accountsUpdated++;
  });

  Logger.log('Enriched ' + accountsUpdated + ' South Coast account(s) across ' + fieldsFilled + ' previously-blank field(s). ' +
    (notFound.length ? 'Could not find: ' + notFound.join(', ') : 'All accounts matched successfully.'));
}

const CONNECTIONS_HEADERS = [
  'ConnectionId', 'AccountId', 'ContactName', 'Role', 'Phone', 'Email', 'PreferredContact', 'Relationship'
];
const NOTES_HEADERS = [
  'NoteId', 'AccountId', 'Timestamp', 'NoteText'
];
const BILLING_HEADERS = [
  'AccountId', 'RateSchedule', 'PaymentTerms', 'BillingNotes'
];

// ---------- Google Sign-In ----------
// Paste the OAuth Client ID from Google Cloud Console (Credentials -> OAuth
// client ID). Must match the same value used in index.html.
const GOOGLE_CLIENT_ID = "611665595000-9c7domumik2gogfrevom2c26nt357upf.apps.googleusercontent.com";
// Only these Google account emails are allowed to sign in (lowercase).
const ALLOWED_GOOGLE_EMAILS = ["info@baysidefees.com"];

// ---------- Session management ----------
// After Google Sign-In verifies an identity, we issue our own session token
// so the API itself requires auth on EVERY request, not just at login. The
// web app URL is publicly reachable by design (Apps Script requirement), so
// without this, anyone who found the URL in the page source could read/write
// data without ever touching the sign-in screen.
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSessions_() {
  const raw = PropertiesService.getScriptProperties().getProperty('sessions');
  return raw ? JSON.parse(raw) : {};
}

function saveSessions_(sessions) {
  PropertiesService.getScriptProperties().setProperty('sessions', JSON.stringify(sessions));
}

function cleanExpiredSessions_(sessions) {
  const now = Date.now();
  Object.keys(sessions).forEach(t => {
    if (!sessions[t] || sessions[t].expires < now) delete sessions[t];
  });
  return sessions;
}

function createSession_(email) {
  const token = Utilities.getUuid();
  const sessions = cleanExpiredSessions_(getSessions_());
  sessions[token] = { email: email, expires: Date.now() + SESSION_DURATION_MS };
  saveSessions_(sessions);
  return token;
}

function isValidSession_(token) {
  if (!token) return false;
  const sessions = getSessions_();
  const session = sessions[token];
  return !!(session && session.expires >= Date.now());
}

function deleteSession_(token) {
  if (!token) return { loggedOut: true };
  const sessions = getSessions_();
  delete sessions[token];
  saveSessions_(sessions);
  return { loggedOut: true };
}

/** Run this once manually from the Apps Script editor to create tabs + headers. */
function setup() {
  const ss = getSpreadsheet_();
  ensureSheet_(ss, ACCOUNTS_SHEET, ACCOUNTS_HEADERS);
  ensureSheet_(ss, CONTACTS_SHEET, CONTACTS_HEADERS);
  ensureSheet_(ss, CONNECTIONS_SHEET, CONNECTIONS_HEADERS);
  ensureSheet_(ss, NOTES_SHEET, NOTES_HEADERS);
  ensureSheet_(ss, BILLING_SHEET, BILLING_HEADERS);
  ensureSheet_(ss, ACTIVITIES_SHEET, ACTIVITIES_HEADERS);
  ensureSheet_(ss, REFERRAL_ACTIVITY_SHEET, REFERRAL_ACTIVITY_HEADERS);
}

// ---------- One-time data cleanup ----------
// Run this manually (once) from the function dropdown above to retroactively
// apply the same phone-formatting and email-normalization rules the app now
// applies as you type, to whatever's already saved in the Sheet. Safe to
// re-run any time - already-clean values are simply left as-is.

function normalizeEmail_(raw) {
  return String(raw || '').trim().toLowerCase();
}

function formatPhone_(raw) {
  if (!raw) return '';
  const str = String(raw);
  if (/[a-zA-Z]/.test(str)) return str; // leave "ext. 204" etc. alone
  const digits = str.replace(/[^\d]/g, '');
  if (digits.length === 0) return '';
  if (digits.length > 11) return str; // longer than a US number - leave as-is

  let core = digits;
  let prefix = '';
  if (digits.length === 11 && digits[0] === '1') {
    prefix = '+1 ';
    core = digits.slice(1);
  }
  const len = core.length;
  if (len < 4) return prefix + core;
  if (len < 7) return prefix + '(' + core.slice(0, 3) + ') ' + core.slice(3);
  return prefix + '(' + core.slice(0, 3) + ') ' + core.slice(3, 6) + '-' + core.slice(6, 10);
}

function cleanUpExistingPhoneAndEmailData() {
  const ss = getSpreadsheet_();

  function cleanSheet(sheetName, headers, phoneField, emailField) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { sheet: sheetName, updated: 0 };
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { sheet: sheetName, updated: 0 };

    const range = sheet.getRange(2, 1, lastRow - 1, headers.length);
    const values = range.getValues();
    const phoneCol = phoneField ? headers.indexOf(phoneField) : -1;
    const emailCol = emailField ? headers.indexOf(emailField) : -1;
    let updated = 0;

    values.forEach(row => {
      if (phoneCol !== -1) {
        const cleaned = formatPhone_(row[phoneCol]);
        if (cleaned !== row[phoneCol]) {
          row[phoneCol] = cleaned;
          updated++;
        }
      }
      if (emailCol !== -1) {
        const cleaned = normalizeEmail_(row[emailCol]);
        if (cleaned !== row[emailCol]) {
          row[emailCol] = cleaned;
          updated++;
        }
      }
    });

    range.setValues(values);
    return { sheet: sheetName, updated: updated };
  }

  const results = [
    cleanSheet(ACCOUNTS_SHEET, ACCOUNTS_HEADERS, 'Phone', null),
    cleanSheet(CONTACTS_SHEET, CONTACTS_HEADERS, 'Phone', 'Email'),
    cleanSheet(CONNECTIONS_SHEET, CONNECTIONS_HEADERS, 'Phone', 'Email')
  ];

  results.forEach(r => Logger.log(r.sheet + ': ' + r.updated + ' cell(s) updated'));
  return results;
}

/**
 * One-time: sets Region = "Cape Cod" on every existing account that doesn't
 * already have a Region set - since all accounts up to now have been Cape
 * Cod. Run this once from the function dropdown after adding the Region
 * field. Safe to re-run; only touches blank Region cells.
 */
function backfillCapeCodRegion() {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, 1, lastRow - 1, ACCOUNTS_HEADERS.length);
  const values = range.getValues();
  const regionCol = ACCOUNTS_HEADERS.indexOf('Region');
  let updated = 0;

  values.forEach(row => {
    if (!row[regionCol]) {
      row[regionCol] = 'Cape Cod';
      updated++;
    }
  });

  range.setValues(values);
  Logger.log('Region backfilled on ' + updated + ' account(s).');
}

/**
 * One-time: explicitly sets the "Region" column header label, regardless of
 * whatever state the sheet is currently in. Safe to run any number of times.
 */
function fixRegionHeaderLabel() {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) return;
  const regionColIndex = ACCOUNTS_HEADERS.indexOf('Region') + 1; // 1-indexed
  sheet.getRange(1, regionColIndex).setValue('Region');
  sheet.getRange(1, regionColIndex).setFontWeight('bold');
  Logger.log('Region header label set at column ' + regionColIndex);
}

/**
 * One-time: backfills Google review ratings onto your 18 existing accounts
 * (matched by AccountId, so it's exact), and imports 20 new South Shore
 * skilled nursing/rehab prospects researched from Google's business
 * listings - with coordinates pre-filled so the map view doesn't need to
 * geocode them on first load. Safe to run once; re-running would create
 * duplicate new-account rows, so don't run this twice.
 */
function importSouthShoreProspectsAndBackfillRatings() {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');

  // ---- Part 1: backfill ratings on existing accounts, matched by AccountId ----
  const ratingsByAccountId = {
    'e9b846be-0b1c-4ecd-9e93-7ee502f33c62': '4.2 (39 reviews)',   // Liberty Commons
    '6ab06d01-5816-4dba-97a8-ddaebe91e4bb': '4.5 (31 reviews)',   // Maplewood at Mayflower Place
    'a9ccf97d-213f-4996-9928-85c3335813ca': '4.8 (41 reviews)',   // Maplewood at Brewster
    '987b137f-3823-4b06-a834-2af7be9d8012': '4.2 (5 reviews)',    // The Terraces Orleans
    '407a4462-6a42-4a35-95e1-bc2cf3f9306d': '3.5 (41 reviews)',   // Royal Health Cotuit
    'adb84404-36ec-4e43-9184-d4ce5bca82d3': '4.5 (106 reviews)',  // Royal Cape Cod
    '8fb3d1cf-aecb-4681-89d4-e31e7e0b5fa6': '4.5 (60 reviews)',   // Royal Megansett Nursing Home
    '8d024e5a-a086-44bb-9ed4-d6804d878f7f': '2.7 (43 reviews)',   // Cape Heritage Rehabilitation & Health Care Center
    '26a0b8cf-159a-4653-97eb-fd7965328ccd': '3.5 (31 reviews)',   // Windsor Skilled Nursing-Rehab
    '32dc6827-3584-4919-9eda-431041d4926f': '2.9 (26 reviews)',   // Bourne Manor Extended Care
    'da7a6f0f-4ebf-4af1-8be6-ba705a46f9e1': '4.6 (11 reviews)',   // Thirwood Place
    'b690f385-0416-478b-a78a-b10de30f906d': '3.7 (31 reviews)',   // The Pavilion Rehabilitation and Nursing Center
    '36a64267-b249-424c-965d-e119840ae2cd': '2.7 (29 reviews)',   // RegalCare at Harwich
    'b69d89d0-3d04-4721-8b56-da798a48d976': '3.3 (53 reviews)',   // Cape Regency Rehabilitation & Health Care Center
    'f029b5c5-13b5-40e7-8f63-182150039c58': '3.9 (50 reviews)',   // Royal Norwell Nursing and Rehabilitation - TEST
    '39aaba16-dcb0-41a6-a2cf-47a0fcc1bccc': '3.6 (54 reviews)',   // Plymouth Rehabilitation & Health Care Center - TEST
    '7281be56-8b47-46ba-b3ce-5f41ab87588e': '4.8 (38 reviews)',   // The Village at Duxbury - TEST
    '036907ba-718a-4910-8b2d-98cccd4ebad3': '3.9 (27 reviews)'    // Linden Ponds Senior Living Community - TEST
  };

  const lastRow = sheet.getLastRow();
  const ratingCol = ACCOUNTS_HEADERS.indexOf('Rating') + 1;
  const idCol = ACCOUNTS_HEADERS.indexOf('AccountId') + 1;
  let backfilled = 0;

  if (lastRow >= 2) {
    const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      const accountId = ids[i][0];
      if (ratingsByAccountId[accountId]) {
        sheet.getRange(2 + i, ratingCol).setValue(ratingsByAccountId[accountId]);
        backfilled++;
      }
    }
  }

  // ---- Part 2: import new South Shore prospects ----
  // [Name, Address, Phone, Rating, Latitude, Longitude]
  const newProspects = [
    ['Hancock Park Rehabilitation & Nursing Center', '164 Parkingway, Quincy, MA 02169', '(617) 773-4222', '4.6 (86 reviews)', 42.245174, -71.0028383],
    ['South Cove Manor at Quincy Point Rehabilitation Center', '288 Washington St, Quincy, MA 02169', '(617) 423-0590', '4.5 (20 reviews)', 42.2498693, -70.9902539],
    ['Alliance Health at Marina Bay', '2 Seaport Dr, Quincy, MA 02171', '(617) 769-5100', '3.6 (129 reviews)', 42.2929925, -71.0300851],
    ['Dwyer Home at Fairing Way', '25 Stonehaven Dr, South Weymouth, MA 02190', '(781) 660-5000', '4.4 (20 reviews)', 42.1590202, -70.9482574],
    ['CareOne at Weymouth', '64 Performance Dr, Weymouth, MA 02189', '(781) 340-9800', '3.1 (153 reviews)', 42.1965729, -70.9423417],
    ['Pope Rehabilitation & Skilled Nursing Center', '140 Webb St, Weymouth, MA 02188', '(781) 335-4352', '3.2 (5 reviews)', 42.22286, -70.9622578],
    ['Royal Health Braintree', '95 Commercial St, Braintree, MA 02184', '(781) 848-0596', '4.3 (102 reviews)', 42.2211712, -70.9711117],
    ['Alliance Health at Braintree', '175 Grove St, Braintree, MA 02184', '(781) 848-2050', '4.7 (13 reviews)', 42.1912629, -70.9926399],
    ['John Scott House Rehabilitation & Nursing Center', '233 Middle St, Braintree, MA 02184', '(781) 843-1860', '3.9 (93 reviews)', 42.2174041, -70.9923243],
    ['Braintree Manor HealthCare', '1102 Washington St, Braintree, MA 02184', '(781) 848-3100', '1.8 (27 reviews)', 42.1987818, -71.0064101],
    ['Life Care Center of Plymouth', '94 Obery St, Plymouth, MA 02360', '(508) 747-9800', '4.4 (177 reviews)', 41.937227, -70.655063],
    ['Newfield House Convalescent Home', '19 Newfield St, Plymouth, MA 02360', '(508) 746-2999', '5.0 (10 reviews)', 41.9510809, -70.6690253],
    ['Bay Path Rehabilitation & Nursing Center', '308 Kingstown Way, Duxbury, MA 02332', '(781) 585-5561', '4.3 (150 reviews)', 42.030494, -70.7399389],
    ['Life Care Center of the South Shore', '309 Driftway, Scituate, MA 02066', '(781) 545-1370', '4.5 (146 reviews)', 42.1766739, -70.743327],
    ['Cardigan Nursing Home', '59 Country Way, Scituate, MA 02066', '(781) 545-9477', '4.6 (11 reviews)', 42.1808321, -70.7486108],
    ['Harbor House Rehabilitation & Nursing Center', '11 Condito Rd, Hingham, MA 02043', '(781) 749-4774', '3.7 (97 reviews)', 42.2527773, -70.9077413],
    ['Queen Anne Nursing Home', '50 Recreation Park Dr, Hingham, MA 02043', '(781) 749-4982', '3.8 (26 reviews)', 42.1764308, -70.9041976],
    ['Webster Park Rehabilitation & Healthcare Center', '56 Webster St, Rockland, MA 02370', '(781) 871-0555', '4.4 (303 reviews)', 42.1324897, -70.9140383],
    ['South Shore Rehabilitation & Skilled Care Center', '115 North Ave, Rockland, MA 02370', '(781) 878-3308', '2.7 (47 reviews)', 42.1350286, -70.9222193],
    ['Wingate at Silver Lake', '17 Chipman Way, Kingston, MA 02364', '(781) 585-4100', '3.4 (51 reviews)', 42.0127914, -70.7904991]
  ];

  const now = new Date().toISOString();
  newProspects.forEach(p => {
    appendRow_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS, {
      AccountId: Utilities.getUuid(),
      AccountName: p[0],
      Status: 'Prospect',
      Address: p[1],
      Website: '',
      Phone: p[2],
      ReferralSource: 'Web research',
      DateAdded: now,
      DateConverted: '',
      NextFollowUp: '',
      Latitude: p[4],
      Longitude: p[5],
      Region: 'South Shore',
      SimplePracticeUrl: '',
      Rating: p[3]
    });
  });

  Logger.log('Backfilled ratings on ' + backfilled + ' existing account(s). Imported ' + newProspects.length + ' new South Shore prospects.');
}

/**
 * One-time: adds Website URLs to the 20 South Shore prospects imported by
 * importSouthShoreProspectsAndBackfillRatings(), matched by exact AccountName.
 * Run this AFTER that function. Safe to re-run; only overwrites matched rows.
 */
function addWebsitesToSouthShoreProspects() {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');

  const websitesByName = {
    'Hancock Park Rehabilitation & Nursing Center': 'https://www.banecare.com/Hancock-Park-skilled-nursing-home-rehabilitation',
    'South Cove Manor at Quincy Point Rehabilitation Center': 'https://www.southcovemanor.org/',
    'Alliance Health at Marina Bay': 'https://alliancehhs.org/marina-bay/',
    'Dwyer Home at Fairing Way': 'https://www.fairingway.org/dwyer',
    'CareOne at Weymouth': 'https://ma.care-one.com/locations/careone-at-weymouth/',
    'Pope Rehabilitation & Skilled Nursing Center': 'https://www.rehabassociates.com/pope',
    'Royal Health Braintree': 'https://braintree.royalhealthgroup.com/',
    'Alliance Health at Braintree': 'https://alliancehhs.org/braintree/',
    'John Scott House Rehabilitation & Nursing Center': 'https://www.banecare.com/john-scott-house-skilled-nursing-home-rehabilitation/',
    'Braintree Manor HealthCare': 'https://www.braintreemanorhc.com/',
    'Life Care Center of Plymouth': 'https://lcca.com/locations/ma/plymouth/',
    'Newfield House Convalescent Home': 'https://newfieldhouse.com/',
    'Bay Path Rehabilitation & Nursing Center': 'https://www.banecare.com/bay-path-skilled-nursing-home-rehabilitation/',
    'Life Care Center of the South Shore': 'https://lcca.com/locations/ma/south-shore/',
    'Cardigan Nursing Home': 'https://www.cardigannursing.com/',
    'Harbor House Rehabilitation & Nursing Center': 'https://www.banecare.com/harbor-house-skilled-nursing-home-rehabilitation/',
    'Queen Anne Nursing Home': 'https://queenannenh.com/',
    'Webster Park Rehabilitation & Healthcare Center': 'https://websterparkhealthcare.com/',
    'South Shore Rehabilitation & Skilled Care Center': 'https://southshorerehabcare.com/',
    'Wingate at Silver Lake': 'https://wingateliving.com' // parent brand site - couldn't confirm the specific facility page
  };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const nameCol = ACCOUNTS_HEADERS.indexOf('AccountName') + 1;
  const websiteCol = ACCOUNTS_HEADERS.indexOf('Website') + 1;
  const names = sheet.getRange(2, nameCol, lastRow - 1, 1).getValues();
  let updated = 0;

  for (let i = 0; i < names.length; i++) {
    const name = names[i][0];
    if (websitesByName[name]) {
      sheet.getRange(2 + i, websiteCol).setValue(websitesByName[name]);
      updated++;
    }
  }

  Logger.log('Website backfilled on ' + updated + ' account(s).');
}

/**
 * One-time: imports 16 South Coast (New Bedford / Fall River / Dartmouth /
 * Fairhaven / Somerset) skilled nursing/rehab prospects researched from
 * Google's business listings, with coordinates pre-filled so the map view
 * doesn't need to geocode them on first load. Run this once.
 */
function importSouthCoastProspects() {
  // [Name, Address, Phone, Rating, Latitude, Longitude]
  const newProspects = [
    ['The Oaks', '4525 Acushnet Ave, New Bedford, MA 02745', '(508) 998-7807', '4.7 (182 reviews)', 41.740685, -70.9476033],
    ['CareOne at New Bedford', '221 Fitzgerald Dr, New Bedford, MA 02745', '(508) 996-4600', '4.2 (95 reviews)', 41.6992634, -70.930139],
    ['Sacred Heart Skilled Nursing & Rehabilitative Care', '359 Summer St, New Bedford, MA 02740', '(508) 996-6751', '3.7 (18 reviews)', 41.6480636, -70.9343566],
    ['New Bedford Jewish Convalescent Home', '200 Hawthorn St, New Bedford, MA 02740', '(508) 997-9314', '3.4 (5 reviews)', 41.6283895, -70.9393254],
    ['Hathaway Manor Extended Care', '863 Hathaway Rd, New Bedford, MA 02740', '(508) 996-6763', '2.2 (30 reviews)', 41.6513367, -70.967078],
    ['Clifton Rehabilitation & Nursing Center', '500 Wilbur Ave, Somerset, MA 02725', '(508) 675-7589', '4.9 (548 reviews)', 41.7209469, -71.1680093],
    ['Mill Brook Rehabilitation & Healthcare Center', '100 Amity St, Fall River, MA 02721', '(508) 675-2500', '4.5 (50 reviews)', 41.6737975, -71.1693812],
    ['Kimwell Nursing and Rehabilitation', '495 New Boston Rd, Fall River, MA 02720', '(508) 679-0106', '4.0 (111 reviews)', 41.7092644, -71.1365607],
    ['The Grove at Carvalho', '273 Oak Grove Ave, Fall River, MA 02723', '(508) 679-4866', '4.0 (27 reviews)', 41.7017067, -71.1328114],
    ['Sarah S. Brayton Nursing Center', '4901 N Main St, Fall River, MA 02720', '(508) 675-1001', '3.8 (103 reviews)', 41.7589209, -71.1135896],
    ['Somerset Ridge Center', '455 Brayton Ave, Somerset, MA 02726', '(508) 679-2240', '3.8 (91 reviews)', 41.7295063, -71.1617481],
    ['Fall River HealthCare', '1748 Highland Ave, Fall River, MA 02720', '(508) 730-1070', '2.2 (53 reviews)', 41.7277393, -71.1357258],
    ['Royal of Fairhaven Nursing Center', '184 Main St, Fairhaven, MA 02719', '(508) 997-3193', '3.5 (37 reviews)', 41.6460512, -70.9086998],
    ["Our Lady's Haven Skilled Nursing & Rehabilitative Care", '71 Center St, Fairhaven, MA 02719', '(508) 999-4561', '3.7 (7 reviews)', 41.6358702, -70.9002507],
    ['Alden Court Nursing Care', '389 Alden Rd, Fairhaven, MA 02719', '(508) 991-8600', '', 41.6652745, -70.9031457],
    ['Brandon Woods of Dartmouth', '567 Dartmouth St, Dartmouth, MA 02748', '(508) 997-7787', '4.8 (4 reviews)', 41.6109215, -70.939768]
  ];

  const now = new Date().toISOString();
  newProspects.forEach(p => {
    appendRow_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS, {
      AccountId: Utilities.getUuid(),
      AccountName: p[0],
      Status: 'Prospect',
      Address: p[1],
      Website: '',
      Phone: p[2],
      ReferralSource: 'Web research',
      DateAdded: now,
      DateConverted: '',
      NextFollowUp: '',
      Latitude: p[4],
      Longitude: p[5],
      Region: 'South Coast',
      SimplePracticeUrl: '',
      Rating: p[3]
    });
  });

  Logger.log('Imported ' + newProspects.length + ' new South Coast prospects.');
}

/**
 * One-time: adds CMS Overall Star Rating and licensed bed count for the
 * facilities researched so far. Matched by exact AccountName. More can be
 * added to this map later as research continues. Safe to re-run.
 */
function addCmsRatingAndBedCount() {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');

  const dataByName = {
    'Liberty Commons': { cms: '5', beds: '132' },
    'Maplewood at Mayflower Place': { cms: '5 (self-reported by facility, not independently verified)', beds: '72' }
    // Maplewood at Brewster intentionally omitted - no skilled nursing
    // component, so there's no CMS nursing home rating to record.
  };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const nameCol = ACCOUNTS_HEADERS.indexOf('AccountName') + 1;
  const cmsCol = ACCOUNTS_HEADERS.indexOf('CMSRating') + 1;
  const bedCol = ACCOUNTS_HEADERS.indexOf('BedCount') + 1;
  const names = sheet.getRange(2, nameCol, lastRow - 1, 1).getValues();
  let updated = 0;

  for (let i = 0; i < names.length; i++) {
    const entry = dataByName[names[i][0]];
    if (entry) {
      sheet.getRange(2 + i, cmsCol).setValue(entry.cms);
      sheet.getRange(2 + i, bedCol).setValue(entry.beds);
      updated++;
    }
  }

  Logger.log('CMS rating / bed count backfilled on ' + updated + ' account(s).');
}

/**
 * One-time: backfills licensed bed count for all remaining Cape Cod and
 * South Shore accounts researched. Matched by exact AccountName. Safe to
 * re-run. Note: some accounts (private-pay facilities, CCRCs whose skilled
 * nursing is provided by a separate co-located facility) intentionally have
 * no bed count here - see comments below.
 */
function addRemainingBedCounts() {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');

  const bedsByName = {
    // Cape Cod
    'The Terraces Orleans': '33', // private pay, not Medicare/Medicaid certified
    'Royal Health Cotuit': '120',
    'Royal Cape Cod': '99',
    'Royal Megansett Nursing Home': '90',
    'Cape Heritage Rehabilitation & Health Care Center': '123',
    'Windsor Skilled Nursing-Rehab': '120',
    'Bourne Manor Extended Care': '142',
    'Thirwood Place': '69', // independent/assisted living, not a licensed SNF
    'The Pavilion Rehabilitation and Nursing Center': '82',
    'RegalCare at Harwich': '135',
    'Cape Regency Rehabilitation & Health Care Center': '120',
    // Maplewood at Brewster intentionally omitted - assisted living/memory
    // care only, no skilled nursing beds.

    // South Shore TEST accounts
    'Royal Norwell Nursing and Rehabilitation - TEST': '86',
    'Plymouth Rehabilitation & Health Care Center - TEST': '186',
    'Linden Ponds Senior Living Community - TEST': '132',
    // The Village at Duxbury - TEST intentionally omitted - it's a CCRC
    // (144 independent-living units + 30 garden homes) whose skilled
    // nursing care is provided next door at Bay Path, not on its own beds.

    // South Shore new prospects
    'Hancock Park Rehabilitation & Nursing Center': '142',
    'South Cove Manor at Quincy Point Rehabilitation Center': '141',
    'Alliance Health at Marina Bay': '167',
    'Dwyer Home at Fairing Way': '50',
    'CareOne at Weymouth': '154',
    'Pope Rehabilitation & Skilled Nursing Center': '49',
    'Royal Health Braintree': '204',
    'Alliance Health at Braintree': '101',
    'John Scott House Rehabilitation & Nursing Center': '138',
    'Braintree Manor HealthCare': '177',
    'Life Care Center of Plymouth': '150',
    'Newfield House Convalescent Home': '100', // private pay, not Medicare/Medicaid certified
    'Bay Path Rehabilitation & Nursing Center': '120',
    'Life Care Center of the South Shore': '117',
    'Cardigan Nursing Home': '65',
    'Harbor House Rehabilitation & Nursing Center': '142',
    'Queen Anne Nursing Home': '106',
    'Webster Park Rehabilitation & Healthcare Center': '110',
    'South Shore Rehabilitation & Skilled Care Center': '96',
    'Wingate at Silver Lake': '164'
  };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const nameCol = ACCOUNTS_HEADERS.indexOf('AccountName') + 1;
  const bedCol = ACCOUNTS_HEADERS.indexOf('BedCount') + 1;
  const names = sheet.getRange(2, nameCol, lastRow - 1, 1).getValues();
  let updated = 0;

  for (let i = 0; i < names.length; i++) {
    const beds = bedsByName[names[i][0]];
    if (beds) {
      sheet.getRange(2 + i, bedCol).setValue(beds);
      updated++;
    }
  }

  Logger.log('Bed count backfilled on ' + updated + ' account(s).');
}

/**
 * One-time: backfills chain/ownership affiliation (comprehensive) and
 * known high-dysphagia-risk clinical programs (partial - some facilities
 * don't publish this and are left blank rather than guessed) for all
 * accounts researched. Also captures RehabProvider where it surfaced
 * incidentally in CMS ownership records. Matched by exact AccountName.
 * Safe to re-run.
 */
function addChainAffiliationAndPrograms() {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');

  // [ChainAffiliation, HighRiskPrograms, RehabProvider]
  const dataByName = {
    'Liberty Commons': ['Independent', '', ''],
    'Maplewood at Mayflower Place': ['Independent', 'Memory care', ''],
    'The Terraces Orleans': ['Integritus Healthcare', '', ''],
    'Royal Health Cotuit': ['Royal Health Group', 'Memory care, cardiac care', ''],
    'Royal Cape Cod': ['Royal Health Group', 'Memory care, cardiac care', ''],
    'Royal Megansett Nursing Home': ['Royal Health Group', 'Memory care, cardiac care', ''],
    'Cape Heritage Rehabilitation & Health Care Center': ['Athena Health Care Systems', '', ''],
    'Windsor Skilled Nursing-Rehab': ['Integritus Healthcare', 'Cardiopulmonary rehab (COPD, CHF)', ''],
    'Bourne Manor Extended Care': ['Integritus Healthcare', 'Memory care', ''],
    'The Pavilion Rehabilitation and Nursing Center': ['Landmark Health Solutions', 'Memory care, cardiac rehab', ''],
    'RegalCare at Harwich': ['RegalCare (formerly Wingate Healthcare)', 'Memory care (dedicated state-certified unit)', ''],
    'Cape Regency Rehabilitation & Health Care Center': ['Athena Health Care Systems', '', ''],

    'Royal Norwell Nursing and Rehabilitation - TEST': ['Royal Health Group', 'Memory care, cardiac care', ''],
    'Plymouth Rehabilitation & Health Care Center - TEST': ['Independent (Plymouth MA SNF LLC)', '', ''],
    'Linden Ponds Senior Living Community - TEST': ['Erickson Senior Living', '', ''],
    'The Village at Duxbury - TEST': ['Welch Senior Living', '', ''],

    'Hancock Park Rehabilitation & Nursing Center': ['Bane Care Management', '', ''],
    'South Cove Manor at Quincy Point Rehabilitation Center': ['Independent (non-profit)', '', 'Symbria Rehab (managerial control since Jan 2025)'],
    'Alliance Health at Marina Bay': ['Alliance Health', '', ''],
    'Royal Health Braintree': ['Royal Health Group', 'Memory care, cardiac care', ''],
    'Alliance Health at Braintree': ['Alliance Health', '', ''],
    'John Scott House Rehabilitation & Nursing Center': ['Bane Care Management', '', ''],
    'Braintree Manor HealthCare': ['Next Step Healthcare', '', ''],
    'Life Care Center of Plymouth': ['Life Care Centers of America', '', ''],
    'Bay Path Rehabilitation & Nursing Center': ['Bane Care Management', 'Post-stroke recovery, wound healing, swallowing/communication disorders', ''],
    'Life Care Center of the South Shore': ['Life Care Centers of America', '', ''],
    'Harbor House Rehabilitation & Nursing Center': ['Bane Care Management', '', ''],
    'Wingate at Silver Lake': ['Wingate Healthcare', '', '']
    // Dwyer Home at Fairing Way, CareOne at Weymouth, Pope Rehabilitation,
    // Newfield House, Cardigan Nursing Home, Queen Anne Nursing Home,
    // Webster Park, South Shore Rehabilitation & Skilled Care Center:
    // chain/program data not yet confirmed - left out rather than guessed.
    // CareOne at Weymouth is very likely part of the CareOne chain by name,
    // but not independently confirmed here.
  };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const nameCol = ACCOUNTS_HEADERS.indexOf('AccountName') + 1;
  const chainCol = ACCOUNTS_HEADERS.indexOf('ChainAffiliation') + 1;
  const programsCol = ACCOUNTS_HEADERS.indexOf('HighRiskPrograms') + 1;
  const rehabCol = ACCOUNTS_HEADERS.indexOf('RehabProvider') + 1;
  const names = sheet.getRange(2, nameCol, lastRow - 1, 1).getValues();
  let updated = 0;

  for (let i = 0; i < names.length; i++) {
    const entry = dataByName[names[i][0]];
    if (entry) {
      if (entry[0]) sheet.getRange(2 + i, chainCol).setValue(entry[0]);
      if (entry[1]) sheet.getRange(2 + i, programsCol).setValue(entry[1]);
      if (entry[2]) sheet.getRange(2 + i, rehabCol).setValue(entry[2]);
      updated++;
    }
  }

  Logger.log('Chain/programs backfilled on ' + updated + ' account(s).');
}

/**
 * One-time: backfills CMS Overall Star Rating from the official CMS
 * "Nursing Home" provider dataset (a specific August 2026 snapshot supplied
 * directly by the user, matched by exact facility name + verified bed
 * count against each MA nursing home in that file) -- a single consistent,
 * authoritative source, unlike third-party aggregator sites which often
 * show conflicting numbers for the same facility. Matched by AccountName.
 * Also confirms bed count where it wasn't already set. Safe to re-run.
 */
function addCmsRatingsFromOfficialData() {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');

  // [Overall, HealthInspection, Staffing, QualityMeasures, Beds]
  const cmsByName = {
    'Liberty Commons': ['3', '2', '5', '4', '132'],
    'Maplewood at Mayflower Place': ['3', '3', '4', '2', '72'],
    'Royal Health Cotuit': ['2', '2', '2', '2', '120'],
    'Royal Cape Cod': ['3', '3', '2', '3', '99'],
    'Royal Megansett Nursing Home': ['4', '4', '2', '3', '90'],
    'Cape Heritage Rehabilitation & Health Care Center': ['2', '2', '2', '3', '123'],
    'Windsor Skilled Nursing-Rehab': ['2', '3', '4', '1', '120'],
    'Bourne Manor Extended Care': ['1', '1', '3', '1', '142'],
    'The Pavilion Rehabilitation and Nursing Center': ['5', '5', '3', '5', '82'],
    'RegalCare at Harwich': ['3', '3', '4', '3', '135'],
    'Cape Regency Rehabilitation & Health Care Center': ['1', '1', '2', '2', '120'],
    'Royal Norwell Nursing and Rehabilitation - TEST': ['3', '3', '3', '4', '86'],
    'Plymouth Rehabilitation & Health Care Center - TEST': ['2', '2', '2', '2', '186'],
    'Linden Ponds Senior Living Community - TEST': ['4', '3', '4', '5', '132'],
    'Hancock Park Rehabilitation & Nursing Center': ['3', '3', '3', '4', '142'],
    'South Cove Manor at Quincy Point Rehabilitation Center': ['5', '5', '4', '5', '141'],
    'Alliance Health at Marina Bay': ['3', '3', '4', '4', '167'],
    'Dwyer Home at Fairing Way': ['5', '5', '4', '5', '50'],
    'CareOne at Weymouth': ['2', '2', '2', '4', '154'],
    'Pope Rehabilitation & Skilled Nursing Center': ['2', '2', '4', '3', '49'],
    'Royal Health Braintree': ['2', '2', '4', '4', '204'],
    'Alliance Health at Braintree': ['5', '5', '4', '4', '101'],
    'John Scott House Rehabilitation & Nursing Center': ['5', '4', '4', '5', '138'],
    'Braintree Manor HealthCare': ['2', '2', '4', '3', '177'], // CMS lists this facility as "Affinity Healthcare" -- matched by exact bed count (177)
    'Life Care Center of Plymouth': ['5', '5', '4', '5', '150'],
    'Bay Path Rehabilitation & Nursing Center': ['5', '5', '4', '4', '120'],
    'Life Care Center of the South Shore': ['5', '4', '4', '5', '117'],
    'Cardigan Nursing Home': ['4', '3', '2', '5', '65'],
    'Harbor House Rehabilitation & Nursing Center': ['4', '4', '4', '4', '142'],
    'Queen Anne Nursing Home': ['5', '5', '4', '4', '106'],
    'Webster Park Rehabilitation & Healthcare Center': ['5', '4', '3', '5', '110'],
    'South Shore Rehabilitation & Skilled Care Center': ['1', '1', '3', '4', '96'], // CMS lists this facility as "Southshore Health Care Center" -- matched by exact bed count (96)
    'Wingate at Silver Lake': ['3', '3', '3', '2', '164']
    // Maplewood at Brewster, The Terraces Orleans, Thirwood Place, The
    // Village at Duxbury - TEST, Newfield House Convalescent Home:
    // confirmed to have NO CMS rating -- not a licensed skilled nursing
    // facility, or private-pay and never Medicare/Medicaid certified.
  };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const nameCol = ACCOUNTS_HEADERS.indexOf('AccountName') + 1;
  const cmsCol = ACCOUNTS_HEADERS.indexOf('CMSRating') + 1;
  const bedCol = ACCOUNTS_HEADERS.indexOf('BedCount') + 1;
  const names = sheet.getRange(2, nameCol, lastRow - 1, 1).getValues();
  let updated = 0;

  for (let i = 0; i < names.length; i++) {
    const entry = cmsByName[names[i][0]];
    if (entry) {
      const summary = 'Overall: ' + entry[0] + '/5 (Health: ' + entry[1] + ', Staffing: ' + entry[2] + ', Quality: ' + entry[3] + ')';
      sheet.getRange(2 + i, cmsCol).setValue(summary);
      sheet.getRange(2 + i, bedCol).setValue(entry[4]);
      updated++;
    }
  }

  Logger.log('CMS ratings backfilled on ' + updated + ' account(s) from official CMS data.');
}

/**
 * One-time: backfills additional targeting signals from the same official
 * CMS dataset -- recent ownership change (a strong "actively re-evaluating
 * vendors" signal), Special Focus Facility status, abuse history flag,
 * staffing hours per resident/day, fines/penalties history, and case-mix
 * index (patient acuity, a rough proxy for dysphagia-relevant need).
 * Matched by AccountName. Safe to re-run.
 */
function addCmsTargetingSignals() {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');

  // [OwnershipChangeY/N, SpecialFocusStatus, AbuseY/N, StaffingHours, NumFines, FinesTotal$, CaseMixIndex]
  const dataByName = {
    'Liberty Commons': ['N', '', 'N', '4.68', '0', '0', '1.31'],
    'Maplewood at Mayflower Place': ['N', '', 'N', '4.08', '0', '0', '1.24'],
    'Royal Health Cotuit': ['N', '', 'N', '3.32', '1', '7901', '1.55'],
    'Royal Cape Cod': ['N', '', 'N', '3.28', '1', '9004', '1.45'],
    'Royal Megansett Nursing Home': ['N', '', 'N', '3.92', '0', '0', '1.54'],
    'Cape Heritage Rehabilitation & Health Care Center': ['N', '', 'N', '3.10', '0', '0', '1.41'],
    'Windsor Skilled Nursing-Rehab': ['N', '', 'N', '3.91', '1', '12386', '1.45'],
    'Bourne Manor Extended Care': ['N', '', 'N', '3.89', '1', '48575', '1.46'],
    'The Pavilion Rehabilitation and Nursing Center': ['N', '', 'N', '4.22', '0', '0', '1.71'],
    'RegalCare at Harwich': ['N', '', 'N', '3.28', '0', '0', '1.33'],
    'Cape Regency Rehabilitation & Health Care Center': ['N', '', 'N', '3.35', '0', '0', '1.39'],
    'Royal Norwell Nursing and Rehabilitation - TEST': ['N', '', 'N', '3.68', '2', '114868', '1.47'],
    'Plymouth Rehabilitation & Health Care Center - TEST': ['N', '', 'N', '3.12', '1', '141373', '1.52'],
    'Linden Ponds Senior Living Community - TEST': ['N', '', 'N', '5.15', '1', '12735', '1.32'],
    'Hancock Park Rehabilitation & Nursing Center': ['N', '', 'N', '3.75', '0', '0', '1.37'],
    'South Cove Manor at Quincy Point Rehabilitation Center': ['N', '', 'N', '3.63', '0', '0', '1.28'],
    'Alliance Health at Marina Bay': ['N', '', 'N', '3.99', '0', '0', '1.38'],
    'Dwyer Home at Fairing Way': ['N', '', 'N', '4.59', '0', '0', '1.51'],
    'CareOne at Weymouth': ['N', '', 'N', '3.44', '0', '0', '1.43'],
    'Pope Rehabilitation & Skilled Nursing Center': ['N', '', 'N', '4.14', '0', '0', '1.14'],
    'Royal Health Braintree': ['N', '', 'N', '3.59', '0', '0', '1.36'],
    'Alliance Health at Braintree': ['N', '', 'N', '4.25', '0', '0', '1.35'],
    'John Scott House Rehabilitation & Nursing Center': ['N', '', 'N', '3.65', '0', '0', '1.36'],
    'Braintree Manor HealthCare': ['N', '', 'N', '5.21', '2', '27648', '1.26'],
    'Life Care Center of Plymouth': ['N', '', 'N', '4.07', '0', '0', '1.46'],
    'Bay Path Rehabilitation & Nursing Center': ['N', '', 'N', '3.73', '0', '0', '1.33'],
    'Life Care Center of the South Shore': ['N', '', 'N', '3.97', '0', '0', '1.44'],
    'Cardigan Nursing Home': ['N', '', 'N', '3.29', '0', '0', '1.28'],
    'Harbor House Rehabilitation & Nursing Center': ['N', '', 'N', '3.54', '0', '0', '1.32'],
    'Queen Anne Nursing Home': ['N', '', 'N', '3.99', '0', '0', '1.34'],
    'Webster Park Rehabilitation & Healthcare Center': ['N', '', 'N', '5.12', '0', '0', '1.59'],
    'South Shore Rehabilitation & Skilled Care Center': ['N', '', 'N', '3.29', '1', '26395', '1.38'],
    'Wingate at Silver Lake': ['N', '', 'N', '3.30', '0', '0', '1.19']
    // Same 6 accounts with no CMS data at all (see addCmsRatingsFromOfficialData
    // comments) are intentionally excluded here too.
  };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const nameCol = ACCOUNTS_HEADERS.indexOf('AccountName') + 1;
  const ownerCol = ACCOUNTS_HEADERS.indexOf('RecentOwnershipChange') + 1;
  const sffCol = ACCOUNTS_HEADERS.indexOf('SpecialFocusStatus') + 1;
  const abuseCol = ACCOUNTS_HEADERS.indexOf('AbuseFlag') + 1;
  const staffCol = ACCOUNTS_HEADERS.indexOf('StaffingHoursPerResidentDay') + 1;
  const finesCol = ACCOUNTS_HEADERS.indexOf('FinesHistory') + 1;
  const cmiCol = ACCOUNTS_HEADERS.indexOf('CaseMixIndex') + 1;
  const names = sheet.getRange(2, nameCol, lastRow - 1, 1).getValues();
  let updated = 0;

  for (let i = 0; i < names.length; i++) {
    const entry = dataByName[names[i][0]];
    if (entry) {
      const row = 2 + i;
      sheet.getRange(row, ownerCol).setValue(entry[0] === 'Y' ? 'Yes' : 'No');
      sheet.getRange(row, sffCol).setValue(entry[1]);
      sheet.getRange(row, abuseCol).setValue(entry[2] === 'Y' ? 'Yes' : 'No');
      sheet.getRange(row, staffCol).setValue(entry[3] + ' hrs/resident/day');
      const finesText = entry[4] === '0' ? 'None' : (entry[4] + ' fine(s), $' + Number(entry[5]).toLocaleString() + ' total');
      sheet.getRange(row, finesCol).setValue(finesText);
      sheet.getRange(row, cmiCol).setValue(entry[6]);
      updated++;
    }
  }

  Logger.log('CMS targeting signals backfilled on ' + updated + ' account(s).');
}

/**
 * One-time: backfills all facility-level data (bed count, chain, CMS
 * rating, ownership change, special focus, abuse flag, staffing hours,
 * fines history, case-mix index) for the 16 South Coast prospects, from
 * the same official CMS dataset used for South Shore. Matched by exact
 * AccountName. Safe to re-run.
 */
function addSouthCoastFacilityData() {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');

  // [beds, chain, overall, health, staffingRating, qm, ownerChangeY/N, sff, abuseY/N, staffingHours, numFines, finesTotal$, cmi]
  const dataByName = {
    'The Oaks': ['122', 'Life Care Centers Of America', '4', '4', '3', '4', 'N', '', 'N', '3.66', '0', '0', '1.48'],
    'CareOne at New Bedford': ['154', 'CareOne', '3', '3', '4', '3', 'N', '', 'N', '3.60', '0', '0', '1.32'],
    'Sacred Heart Skilled Nursing & Rehabilitative Care': ['217', 'Diocesan Health Facilities', '5', '4', '5', '3', 'N', '', 'N', '3.86', '0', '0', '1.24'],
    'New Bedford Jewish Convalescent Home': ['80', 'Vantage Care', '1', '2', '1', '3', 'N', '', 'N', '2.45', '1', '9318', '1.53'],
    'Hathaway Manor Extended Care': ['142', 'Integritus Healthcare', '2', '2', '3', '3', 'N', '', 'N', '3.67', '3', '34887', '1.53'],
    'Clifton Rehabilitation & Nursing Center': ['142', 'Michael Feist', '4', '4', '4', '4', 'N', '', 'N', '4.29', '0', '0', '1.64'],
    'Mill Brook Rehabilitation & Healthcare Center': ['152', 'Marquis Health Services', '4', '3', '2', '5', 'N', '', 'N', '3.27', '0', '0', '1.65'],
    'Kimwell Nursing and Rehabilitation': ['124', 'Best Care Services', '1', '2', '2', '1', 'N', '', 'N', '3.58', '1', '8278', '1.44'],
    'The Grove at Carvalho': ['112', '', '1', '1', '1', '2', 'N', '', 'N', '3.42', '7', '39082', '1.32'],
    'Sarah S. Brayton Nursing Center': ['183', 'Best Care Services', '2', '2', '4', '2', 'N', '', 'N', '3.43', '1', '151920', '1.30'],
    'Somerset Ridge Center': ['135', 'Best Care Services', '4', '4', '2', '2', 'N', '', 'N', '3.58', '1', '214420', '1.41'],
    'Fall River HealthCare': ['176', 'Next Step Healthcare', '1', '1', '2', '2', 'N', '', 'N', '3.42', '4', '385062', '1.44'],
    'Royal of Fairhaven Nursing Center': ['107', 'Royal Health Group', '2', '3', '1', '2', 'N', '', 'N', '', '1', '8648', ''],
    "Our Lady's Haven Skilled Nursing & Rehabilitative Care": ['117', 'Diocesan Health Facilities', '5', '4', '5', '3', 'N', '', 'N', '3.76', '0', '0', '1.20'],
    'Alden Court Nursing Care': ['142', '', '4', '4', '3', '3', 'N', '', 'N', '4.24', '0', '0', '1.47'],
    'Brandon Woods of Dartmouth': ['118', 'Elder Services', '2', '2', '3', '2', 'N', '', 'N', '3.86', '3', '31190', '1.32']
  };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const nameCol = ACCOUNTS_HEADERS.indexOf('AccountName') + 1;
  const bedCol = ACCOUNTS_HEADERS.indexOf('BedCount') + 1;
  const chainCol = ACCOUNTS_HEADERS.indexOf('ChainAffiliation') + 1;
  const cmsCol = ACCOUNTS_HEADERS.indexOf('CMSRating') + 1;
  const ownerCol = ACCOUNTS_HEADERS.indexOf('RecentOwnershipChange') + 1;
  const sffCol = ACCOUNTS_HEADERS.indexOf('SpecialFocusStatus') + 1;
  const abuseCol = ACCOUNTS_HEADERS.indexOf('AbuseFlag') + 1;
  const staffCol = ACCOUNTS_HEADERS.indexOf('StaffingHoursPerResidentDay') + 1;
  const finesCol = ACCOUNTS_HEADERS.indexOf('FinesHistory') + 1;
  const cmiCol = ACCOUNTS_HEADERS.indexOf('CaseMixIndex') + 1;
  const names = sheet.getRange(2, nameCol, lastRow - 1, 1).getValues();
  let updated = 0;

  for (let i = 0; i < names.length; i++) {
    const entry = dataByName[names[i][0]];
    if (entry) {
      const row = 2 + i;
      sheet.getRange(row, bedCol).setValue(entry[0]);
      if (entry[1]) sheet.getRange(row, chainCol).setValue(entry[1]);
      const summary = 'Overall: ' + entry[2] + '/5 (Health: ' + entry[3] + ', Staffing: ' + entry[4] + ', Quality: ' + entry[5] + ')';
      sheet.getRange(row, cmsCol).setValue(summary);
      sheet.getRange(row, ownerCol).setValue(entry[6] === 'Y' ? 'Yes' : 'No');
      sheet.getRange(row, sffCol).setValue(entry[7]);
      sheet.getRange(row, abuseCol).setValue(entry[8] === 'Y' ? 'Yes' : 'No');
      if (entry[9]) sheet.getRange(row, staffCol).setValue(entry[9] + ' hrs/resident/day');
      const finesText = entry[10] === '0' ? 'None' : (entry[10] + ' fine(s), $' + Number(entry[11]).toLocaleString() + ' total');
      sheet.getRange(row, finesCol).setValue(finesText);
      if (entry[12]) sheet.getRange(row, cmiCol).setValue(entry[12]);
      updated++;
    }
  }

  Logger.log('South Coast facility data backfilled on ' + updated + ' account(s).');
}

/**
 * One-time: adds researched Administrator/Executive Director contacts for
 * accounts that don't already have one on file. Only adds full-name,
 * reasonably-confident results from web research -- skips accounts that
 * already have an Administrator or Executive Director contact, so this is
 * safe to re-run without creating duplicates.
 */
function addResearchedAdministrators() {
  const contactsSheet = getSpreadsheet_().getSheetByName(CONTACTS_SHEET);
  if (!contactsSheet) throw new Error('Contacts sheet not found');

  // [AccountId, ContactName, Role]
  const newAdmins = [
    ['8d024e5a-a086-44bb-9ed4-d6804d878f7f', 'Dutch Hayward', 'Administrator'], // Cape Heritage Rehabilitation & Health Care Center
    ['da7a6f0f-4ebf-4af1-8be6-ba705a46f9e1', 'Ken Smith', 'Executive Director'], // Thirwood Place
    ['a9ccf97d-213f-4996-9928-85c3335813ca', 'Theresa Mason', 'Executive Director'] // Maplewood at Brewster
  ];

  // Find accounts that already have an Administrator/Executive Director
  // contact on file, so we never create a duplicate.
  const lastRow = contactsSheet.getLastRow();
  const existingAdminAccountIds = new Set();
  if (lastRow >= 2) {
    const rows = contactsSheet.getRange(2, 1, lastRow - 1, CONTACTS_HEADERS.length).getValues();
    const accountIdCol = CONTACTS_HEADERS.indexOf('AccountId');
    const roleCol = CONTACTS_HEADERS.indexOf('Role');
    rows.forEach(row => {
      const role = String(row[roleCol] || '').toLowerCase();
      if (role.indexOf('administrator') !== -1 || role.indexOf('executive director') !== -1) {
        existingAdminAccountIds.add(row[accountIdCol]);
      }
    });
  }

  let added = 0;
  newAdmins.forEach(([accountId, name, role]) => {
    if (existingAdminAccountIds.has(accountId)) return; // already have one — skip
    appendRow_(CONTACTS_SHEET, CONTACTS_HEADERS, {
      ContactId: Utilities.getUuid(),
      AccountId: accountId,
      ContactName: name,
      Role: role,
      Phone: '',
      Email: '',
      PreferredContact: ''
    });
    added++;
  });

  Logger.log('Added ' + added + ' researched administrator/director contact(s). Skipped ' +
    (newAdmins.length - added) + ' account(s) that already had one on file.');
}

/**
 * ONE-TIME REPAIR: the Accounts sheet's header row drifted out of sync with
 * the actual data over many incremental edits (three header cells went
 * blank, and several labels ended up pointing at the wrong column). This
 * rebuilds the whole sheet from scratch using the TRUE column positions
 * (decoded by directly cross-referencing multiple existing rows), so every
 * value lands under its correct, current header. Does not fabricate or
 * guess any data -- it only relocates what's already there. Run this once,
 * then the sheet and Code.gs will be back in sync.
 */
function repairAccountsSheetAlignment() {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  if (!sheet) throw new Error('Accounts sheet not found');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('No data rows found -- nothing to repair.');
    return;
  }

  // The sheet currently has 20 physical columns. Their TRUE meaning (decoded
  // from the actual data, 0-indexed into each row array) is:
  const OLD_COL = {
    AccountId: 0, AccountName: 1, Status: 2, Address: 3, Website: 4, Phone: 5,
    ReferralSource: 6, DateAdded: 7, DateConverted: 8, NextFollowUp: 9,
    Latitude: 10, Longitude: 11, Region: 12, SimplePracticeUrl: 13,
    Rating: 14, CMSRating: 15, BedCount: 16
    // columns 17 and 18 (0-indexed) are blank artifacts; column 19 is a
    // duplicate of BedCount -- all three are dropped in the rebuild.
  };

  const oldValues = sheet.getRange(2, 1, lastRow - 1, 20).getValues();

  const rebuilt = oldValues.map(row => {
    const get = (key) => (OLD_COL[key] !== undefined ? row[OLD_COL[key]] : '');
    return ACCOUNTS_HEADERS.map(header => {
      // ChainAffiliation / HighRiskPrograms / RehabProvider never existed
      // in the old layout at all -- they come out blank here, ready for
      // addChainAffiliationAndPrograms() to fill in afterward.
      if (header === 'ChainAffiliation' || header === 'HighRiskPrograms' || header === 'RehabProvider') {
        return '';
      }
      return get(header);
    });
  });

  // Clear everything and rewrite cleanly: header row + all repaired data.
  sheet.clear();
  sheet.getRange(1, 1, 1, ACCOUNTS_HEADERS.length).setValues([ACCOUNTS_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, ACCOUNTS_HEADERS.length).setFontWeight('bold');
  sheet.getRange(2, 1, rebuilt.length, ACCOUNTS_HEADERS.length).setValues(rebuilt);

  Logger.log('Repaired ' + rebuilt.length + ' account row(s). Sheet now matches Code.gs exactly. ' +
    'Run addChainAffiliationAndPrograms() again afterward to refill those 3 new columns.');
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  const existingLastCol = sheet.getLastColumn();
  const existingHeaders = existingLastCol > 0
    ? sheet.getRange(1, 1, 1, existingLastCol).getValues()[0]
    : [];

  if (existingHeaders.filter(Boolean).length === 0) {
    // Brand new / empty sheet - write the full header row.
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    return;
  }

  // Existing sheet with data - append any headers not already present as
  // NEW columns at the end. Never inserts/reorders columns, so existing
  // data is never shifted or misaligned.
  const missing = headers.filter(h => existingHeaders.indexOf(h) === -1);
  if (missing.length > 0) {
    const startCol = existingLastCol + 1;
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
    sheet.getRange(1, startCol, 1, missing.length).setFontWeight('bold');
  }
}

function doGet(e) {
  const started = Date.now();
  const timings = {};

  // ---- Session validation ----
  let t = Date.now();
  if (!isValidSession_(e.parameter.token)) {
    timings.sessionValidation = Date.now() - t;
    return jsonOut_({
      error: 'Unauthorized - please sign in again',
      _debug: {
        totalMs: Date.now() - started,
        timings: timings
      }
    });
  }
  timings.sessionValidation = Date.now() - t;

  const action = (e.parameter.action || 'all');

  // ---- Main CRM load ----
  if (action === 'all') {
    t = Date.now();
    const accounts = readSheet_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS);
    timings.accounts = Date.now() - t;

    t = Date.now();
    const contacts = readSheet_(CONTACTS_SHEET, CONTACTS_HEADERS);
    timings.contacts = Date.now() - t;

    t = Date.now();
    const connections = readSheet_(CONNECTIONS_SHEET, CONNECTIONS_HEADERS);
    timings.connections = Date.now() - t;

    t = Date.now();
    const notes = readSheet_(NOTES_SHEET, NOTES_HEADERS);
    timings.notes = Date.now() - t;

    t = Date.now();
    const billing = readSheet_(BILLING_SHEET, BILLING_HEADERS);
    timings.billing = Date.now() - t;

    t = Date.now();
    const activities = readSheet_(ACTIVITIES_SHEET, ACTIVITIES_HEADERS);
    timings.activities = Date.now() - t;

    t = Date.now();
    const referralActivity = readSheet_(REFERRAL_ACTIVITY_SHEET, REFERRAL_ACTIVITY_HEADERS);
    timings.referralActivity = Date.now() - t;

    const result = {
      accounts: accounts,
      contacts: contacts,
      connections: connections,
      notes: notes,
      billing: billing,
      activities: activities,
      referralActivity: referralActivity
    };

    // Measure JSON serialization separately.
    t = Date.now();
    const json = JSON.stringify(result);
    timings.jsonSerialization = Date.now() - t;

    timings.totalBeforeResponse = Date.now() - started;

    // Temporary diagnostic response.
    return ContentService
      .createTextOutput(JSON.stringify({
        ...result,
        _debug: {
          totalMs: Date.now() - started,
          timings: timings,
          rowCounts: {
            accounts: accounts.length,
            contacts: contacts.length,
            connections: connections.length,
            notes: notes.length,
            billing: billing.length,
            activities: activities.length,
            referralActivity: referralActivity.length
          },
          jsonBytes: json.length
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ---- Lightweight single-account refresh ----
  if (action === 'accountBundle') {
    const accountId = e.parameter.accountId;

    t = Date.now();
    const account = readSheet_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS)
      .find(a => a.AccountId === accountId);
    timings.account = Date.now() - t;

    t = Date.now();
    const contacts = readSheet_(CONTACTS_SHEET, CONTACTS_HEADERS)
      .filter(c => c.AccountId === accountId);
    timings.contacts = Date.now() - t;

    t = Date.now();
    const connections = readSheet_(CONNECTIONS_SHEET, CONNECTIONS_HEADERS)
      .filter(c => c.AccountId === accountId);
    timings.connections = Date.now() - t;

    t = Date.now();
    const activities = readSheet_(ACTIVITIES_SHEET, ACTIVITIES_HEADERS)
      .filter(a => a.AccountId === accountId);
    timings.activities = Date.now() - t;

    t = Date.now();
    const referralActivity = readSheet_(REFERRAL_ACTIVITY_SHEET, REFERRAL_ACTIVITY_HEADERS)
      .filter(r => r.AccountId === accountId);
    timings.referralActivity = Date.now() - t;

    return jsonOut_({
      account: account || null,
      contacts: contacts,
      connections: connections,
      activities: activities,
      referralActivity: referralActivity,
      _debug: {
        totalMs: Date.now() - started,
        timings: timings
      }
    });
  }

  return jsonOut_({ error: 'Unknown action' });
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const action = body.action;

  // Logging in is the one action allowed without an existing session - every
  // other action requires a valid, unexpired session token.
  if (action !== 'verifyGoogleLogin' && action !== 'logout' && !isValidSession_(body.token)) {
    return jsonOut_({ success: false, error: 'Unauthorized - please sign in again' });
  }

  let result;

  try {
    switch (action) {
      case 'createAccount':
        result = createAccount_(body.data);
        break;
      case 'updateAccount':
        result = updateAccount_(body.data);
        break;
      case 'createActivity':
        result = createActivity_(body.data);
        break;
      case 'createReferralActivity':
        result = createReferralActivity_(body.data);
        break;
      case 'updateActivity':
        result = updateActivity_(body.data);
        break;
      case 'deleteActivity':
        result = deleteActivity_(body.activityId);
        break;
      case 'getActivities':
        result = getActivitiesForAccount_(body.accountId);
        break;
      case 'convertAccount':
        result = convertAccount_(body.accountId, body.simplePracticeUrl);
        break;
      case 'createContact':
        result = createContact_(body.data);
        break;
      case 'updateContact':
        result = updateContact_(body.data);
        break;
      case 'deleteContact':
        result = deleteRow_(CONTACTS_SHEET, 'ContactId', body.contactId);
        break;
      case 'createConnection':
        result = createConnection_(body.data);
        break;
      case 'updateConnection':
        result = updateConnection_(body.data);
        break;
      case 'deleteConnection':
        result = deleteRow_(CONNECTIONS_SHEET, 'ConnectionId', body.connectionId);
        break;
      case 'addNote':
        result = addNote_(body.accountId, body.noteText);
        break;
      case 'updateNote':
        result = updateNote_(body.data);
        break;
      case 'deleteNote':
        result = deleteRow_(NOTES_SHEET, 'NoteId', body.noteId);
        break;
      case 'deleteAccount':
        result = deleteRow_(ACCOUNTS_SHEET, 'AccountId', body.accountId);
        break;
      case 'getAccountEmails':
        result = getCachedEmailsForAddresses_(body.emails, body.maxThreads || 3);
        break;
      case 'getSuggestedContacts':
        result = getSuggestedContactsForDomains_(body.domains, body.existingEmails, body.existingNames, 30);
        break;
      case 'getAccountMeetings':
        result = getAccountMeetingsByAccountId_(body.accountId, 15);
        break;
      case 'getTopUpcomingMeetings':
        result = getTopUpcomingMeetings_(3);
        break;
      case 'verifyGoogleLogin':
        result = verifyGoogleLogin_(body.idToken);
        break;
      case 'logout':
        result = deleteSession_(body.token);
        break;
      default:
        return jsonOut_({ error: 'Unknown action: ' + action });
    }
    return jsonOut_({ success: true, result: result });
  } catch (err) {
    return jsonOut_({ success: false, error: err.message });
  }
}

// ---------- helpers ----------

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Sheets auto-converts plain "YYYY-MM-DD" text into a real date-typed cell,
// so it comes back from getValues() as a JS Date, not the original string.
// Normalize it back to a clean date-only string for date-only fields; other
// Date-typed fields (timestamps) just get a standard ISO string.
const DATE_ONLY_FIELDS = new Set(['NextFollowUp', 'ReferralDate']);

function normalizeCellValue_(header, value) {
  if (value instanceof Date) {
    if (DATE_ONLY_FIELDS.has(header)) {
      const tz = getSpreadsheet_().getSpreadsheetTimeZone();
      return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
    }
    return value.toISOString();
  }
  return value;
}

function readSheet_(sheetName, headers) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values
    .filter(row => row.join('') !== '')
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = normalizeCellValue_(h, row[i]));
      return obj;
    });
}

function appendRow_(sheetName, headers, dataObj) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const row = headers.map(h => dataObj[h] !== undefined ? dataObj[h] : '');
  sheet.appendRow(row);
}

// Batches an update into ONE read + ONE write instead of one Sheets API
// call per changed field. Previously, updating an account could mean 30-40
// individual .setValue() calls (AccountForm submits the whole form, and
// ACCOUNTS_HEADERS alone has ~40 columns) -- each one a separate
// round-trip, and each one a moment where a concurrent execution could
// collide with this one over the same row. Reading the row once, merging
// in only the fields that changed, and writing it back in a single
// setValues() call is both meaningfully faster and safer under load.
function updateRow_(sheetName, headers, rowIndex, data) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const range = sheet.getRange(rowIndex, 1, 1, headers.length);
  const currentRow = range.getValues()[0];
  const newRow = headers.map((h, i) => data[h] !== undefined ? data[h] : currentRow[i]);
  range.setValues([newRow]);
}

function findRowIndex_(sheetName, idColumn, idValue) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idCol = headers.indexOf(idColumn);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(idValue)) return i + 2; // 1-indexed + header row
  }
  return -1;
}

function deleteRow_(sheetName, idColumn, idValue) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const rowIndex = findRowIndex_(sheetName, idColumn, idValue);
  if (rowIndex === -1) throw new Error('Row not found');
  sheet.deleteRow(rowIndex);
  return { deleted: idValue };
}

function newId_() {
  return Utilities.getUuid();
}

// ---------- accounts ----------

function createAccount_(data) {
  const id = newId_();
  const now = new Date().toISOString();
  appendRow_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS, {
    AccountId: id,
    AccountName: data.AccountName || '',
    Status: data.Status || 'Prospect',
    Region: data.Region || 'Cape Cod',
    SimplePracticeUrl: data.SimplePracticeUrl || '',
    Rating: data.Rating || '',
    CMSRating: data.CMSRating || '',
    BedCount: data.BedCount || '',
    ChainAffiliation: data.ChainAffiliation || '',
    HighRiskPrograms: data.HighRiskPrograms || '',
    RehabProvider: data.RehabProvider || '',
    RecentOwnershipChange: data.RecentOwnershipChange || '',
    SpecialFocusStatus: data.SpecialFocusStatus || '',
    AbuseFlag: data.AbuseFlag || '',
    StaffingHoursPerResidentDay: data.StaffingHoursPerResidentDay || '',
    FinesHistory: data.FinesHistory || '',
    CaseMixIndex: data.CaseMixIndex || '',
    Address: data.Address || '',
    Website: data.Website || '',
    Phone: data.Phone || '',
    ReferralSource: data.ReferralSource || '',
    DateAdded: now,
    DateConverted: '',
    NextFollowUp: data.NextFollowUp || '',
    Latitude: data.Latitude || '',
    Longitude: data.Longitude || '',
    RelationshipStage: data.RelationshipStage || 'Target',
    NextAction: data.NextAction || '',
    LastContactDate: '',
    LastContactType: '',
    LastContactResult: '',
    ClinicalNeed: data.ClinicalNeed || 'Unknown',
    VolumeOpportunity: data.VolumeOpportunity || '',
    RehabActivity: data.RehabActivity || 'Unknown',
    AccessRelationship: data.AccessRelationship || 'None',
    FeesTrigger: data.FeesTrigger || '',
    CurrentInstrumentalAssessment: data.CurrentInstrumentalAssessment || 'Unknown',
    DysphagiaPainPoint: data.DysphagiaPainPoint || 'Unknown',
    ReferralPotential: data.ReferralPotential || '',
    EstimatedFeesVolume: data.EstimatedFeesVolume || 'Unknown',
    VisitCadence: data.VisitCadence || 'No cadence',
    DistanceFromNorwell: '',
    DistanceFromCapeHouse: '',
    DistanceFromCapeCodHospital: ''
  });
  if (data.Address) updateDistancesForAccount_(id, data.Address);
  return { AccountId: id };
}

function updateAccount_(data) {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  const rowIndex = findRowIndex_(ACCOUNTS_SHEET, 'AccountId', data.AccountId);
  if (rowIndex === -1) throw new Error('Account not found');

  // Active Referrer is the CRM's objective customer stage. Keep Status in
  // sync automatically so users never need a separate conversion action.
  // Set DateConverted the first time the account reaches this stage.
  if (data.RelationshipStage === 'Active Referrer') {
    data.Status = 'Customer';
    const convertedCol = ACCOUNTS_HEADERS.indexOf('DateConverted');
    const existingConverted = convertedCol !== -1
      ? sheet.getRange(rowIndex, convertedCol + 1).getValue()
      : '';
    if (!existingConverted && !data.DateConverted) data.DateConverted = new Date().toISOString();
  }

  const addressCol = ACCOUNTS_HEADERS.indexOf('Address');
  const previousAddress = addressCol !== -1 ? sheet.getRange(rowIndex, addressCol + 1).getValue() : null;
  updateRow_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS, rowIndex, data);
  // Only re-fetch driving distances when the address has actually changed --
  // AccountForm submits the full form on every save (including Address even
  // when untouched), so checking for presence alone triggered a live,
  // several-second Google Maps API call on every single account edit.
  if (data.Address && data.Address !== previousAddress) {
    updateDistancesForAccount_(data.AccountId, data.Address);
  }
  return { AccountId: data.AccountId };
}

// Logs an activity AND updates the account's Last Contact / Next Action
// fields in one call, so "Activity -> Result -> Next Action -> Due Date"
// is a single save rather than two separate steps.
function createActivity_(data) {
  const id = newId_();
  const now = new Date().toISOString();
  appendRow_(ACTIVITIES_SHEET, ACTIVITIES_HEADERS, {
    ActivityId: id,
    AccountId: data.AccountId,
    Timestamp: now,
    ActivityType: data.ActivityType || '',
    ActivityResult: data.ActivityResult || '',
    Details: data.Details || '',
    NextAction: data.NextAction || '',
    NextActionDue: data.NextActionDue || ''
  });

  const rowIndex = findRowIndex_(ACCOUNTS_SHEET, 'AccountId', data.AccountId);
  if (rowIndex !== -1) {
    const updates = {
      LastContactDate: now,
      LastContactType: data.ActivityType || '',
      LastContactResult: data.ActivityResult || ''
    };
    if (data.NextAction) updates.NextAction = data.NextAction;
    if (data.NextActionDue) updates.NextFollowUp = data.NextActionDue; // reuses the existing follow-up date field
    // Logging any real activity (call, email, voicemail, etc.) means the
    // account has genuinely been contacted -- auto-advance it out of the
    // early, pre-contact stages. Never downgrades or overrides an account
    // that's already further along (or marked Dormant/Not a Fit).
    const stageCol = ACCOUNTS_HEADERS.indexOf('RelationshipStage');
    const currentStage = stageCol !== -1
      ? getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET).getRange(rowIndex, stageCol + 1).getValue()
      : '';
    if (!currentStage || currentStage === 'Target' || currentStage === 'Researched') {
      updates.RelationshipStage = 'Contacted';
    }
    updateRow_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS, rowIndex, updates);
  }
  return { ActivityId: id };
}

function createReferralActivity_(data) {
  if (!data || !data.AccountId) throw new Error('AccountId is required');
  if (!data.ReferralDate) throw new Error('ReferralDate is required');

  // Create the lightweight Referral Activity tab on first use so existing
  // deployments do not require a separate manual setup step.
  ensureSheet_(getSpreadsheet_(), REFERRAL_ACTIVITY_SHEET, REFERRAL_ACTIVITY_HEADERS);

  // This sheet intentionally stores only the business event. Do not add
  // patient names, DOBs, diagnoses, insurance data, notes, or other PHI here.
  const id = newId_();
  appendRow_(REFERRAL_ACTIVITY_SHEET, REFERRAL_ACTIVITY_HEADERS, {
    ReferralActivityId: id,
    AccountId: data.AccountId,
    ReferralDate: data.ReferralDate,
    RecordedBy: String(data.RecordedBy || '').trim()
  });

  // Receiving a referral is objective evidence that this facility is now an
  // active referrer/customer. Advance it automatically, but never store any
  // patient information in the CRM.
  const rowIndex = findRowIndex_(ACCOUNTS_SHEET, 'AccountId', data.AccountId);
  if (rowIndex !== -1) {
    updateRow_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS, rowIndex, {
      RelationshipStage: 'Active Referrer',
      Status: 'Customer'
    });
  }

  return { ReferralActivityId: id };
}

function getReferralActivityForAccount_(accountId) {
  return readSheet_(REFERRAL_ACTIVITY_SHEET, REFERRAL_ACTIVITY_HEADERS)
    .filter(r => r.AccountId === accountId)
    .sort((a, b) => String(b.ReferralDate || '').localeCompare(String(a.ReferralDate || '')));
}

function getActivitiesForAccount_(accountId) {
  const all = readSheet_(ACTIVITIES_SHEET, ACTIVITIES_HEADERS);
  return all.filter(a => a.AccountId === accountId)
    .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
}

function updateActivity_(data) {
  const rowIndex = findRowIndex_(ACTIVITIES_SHEET, 'ActivityId', data.ActivityId);
  if (rowIndex === -1) throw new Error('Activity not found');
  updateRow_(ACTIVITIES_SHEET, ACTIVITIES_HEADERS, rowIndex, data);
  return { ActivityId: data.ActivityId };
}

function deleteActivity_(activityId) {
  const sheet = getSpreadsheet_().getSheetByName(ACTIVITIES_SHEET);
  const rowIndex = findRowIndex_(ACTIVITIES_SHEET, 'ActivityId', activityId);
  if (rowIndex === -1) return { deleted: false };
  sheet.deleteRow(rowIndex);
  return { deleted: true };
}

/**
 * ONE-TIME: Notes and Activities were two separate, overlapping ways to log
 * "what happened" with an account. This merges them into one system --
 * Activities -- by copying every existing Note into a new Activity row
 * (ActivityType: "Other", the note's own text going into the new Details
 * field, original timestamp preserved), so nothing in your history is lost
 * when the standalone Notes card is removed from the UI. The original
 * Notes sheet is left completely untouched as an archive -- this only ADDS
 * rows to Activities, never deletes anything. Safe to re-run only if it
 * hasn't been run before; running it twice would duplicate every note as
 * an activity, so this checks for and skips accounts that already have a
 * migrated entry with a matching original timestamp.
 */
function migrateNotesToActivities() {
  const notes = readSheet_(NOTES_SHEET, NOTES_HEADERS);
  if (notes.length === 0) {
    Logger.log('No notes found to migrate.');
    return;
  }

  const existingActivities = readSheet_(ACTIVITIES_SHEET, ACTIVITIES_HEADERS);
  const alreadyMigrated = new Set(
    existingActivities
      .filter(a => a.ActivityType === 'Other' && a.Details)
      .map(a => a.AccountId + '|' + a.Timestamp)
  );

  let migrated = 0;
  let skipped = 0;
  notes.forEach(n => {
    const key = n.AccountId + '|' + n.Timestamp;
    if (alreadyMigrated.has(key)) {
      skipped++;
      return;
    }
    appendRow_(ACTIVITIES_SHEET, ACTIVITIES_HEADERS, {
      ActivityId: newId_(),
      AccountId: n.AccountId,
      Timestamp: n.Timestamp,
      ActivityType: 'Other',
      ActivityResult: '',
      Details: n.NoteText || '',
      NextAction: '',
      NextActionDue: ''
    });
    migrated++;
  });

  Logger.log('Migrated ' + migrated + ' note(s) into Activities. Skipped ' + skipped + ' already-migrated note(s). Original Notes sheet left untouched.');
}

/**
 * ONE-TIME REPAIR: ACTIVITIES_HEADERS originally had "Details" positioned
 * in the middle of the array (between ActivityResult and NextAction), but
 * the physical Activities sheet had already been extended with Details
 * appended at the END (columns are set by setup()'s append-missing-only
 * logic, which never reorders). That mismatch meant every activity write
 * -- including the note migration -- landed values in the wrong physical
 * columns. ACTIVITIES_HEADERS has now been corrected to match the sheet's
 * real column order. This function repairs the rows written under the old
 * mismatched order: for each row where the "NextAction" column actually
 * contains migrated note text (recognizable as ActivityType "Other" with
 * blank ActivityResult and a blank Details column), it moves that text
 * into the correct Details column and clears the wrongly-populated one.
 * Safe to re-run -- it only touches rows still showing the broken pattern.
 */
function repairActivityColumnMismatch() {
  const sheet = getSpreadsheet_().getSheetByName(ACTIVITIES_SHEET);
  if (!sheet) {
    Logger.log('Activities sheet not found -- nothing to repair.');
    return;
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('No activity rows found -- nothing to repair.');
    return;
  }

  const nextActionCol = ACTIVITIES_HEADERS.indexOf('NextAction') + 1;
  const detailsCol = ACTIVITIES_HEADERS.indexOf('Details') + 1;
  const typeCol = ACTIVITIES_HEADERS.indexOf('ActivityType') + 1;
  const resultCol = ACTIVITIES_HEADERS.indexOf('ActivityResult') + 1;

  const values = sheet.getRange(2, 1, lastRow - 1, ACTIVITIES_HEADERS.length).getValues();
  let repaired = 0;

  values.forEach((row, i) => {
    const type = row[typeCol - 1];
    const result = row[resultCol - 1];
    const nextActionValue = row[nextActionCol - 1];
    const detailsValue = row[detailsCol - 1];
    // The broken-write pattern: migrated notes are always ActivityType
    // "Other" with a blank ActivityResult, and the old bug put their text
    // in the NextAction column while leaving Details blank.
    if (type === 'Other' && !result && nextActionValue && !detailsValue) {
      const rowNum = 2 + i;
      sheet.getRange(rowNum, detailsCol).setValue(nextActionValue);
      sheet.getRange(rowNum, nextActionCol).setValue('');
      repaired++;
    }
  });

  Logger.log('Repaired ' + repaired + ' activity row(s) with mismatched columns.');
}

function convertAccount_(accountId, simplePracticeUrl) {
  const sheet = getSpreadsheet_().getSheetByName(ACCOUNTS_SHEET);
  const rowIndex = findRowIndex_(ACCOUNTS_SHEET, 'AccountId', accountId);
  if (rowIndex === -1) throw new Error('Account not found');
  const statusCol = ACCOUNTS_HEADERS.indexOf('Status') + 1;
  const dateConvertedCol = ACCOUNTS_HEADERS.indexOf('DateConverted') + 1;
  sheet.getRange(rowIndex, statusCol).setValue('Customer');
  sheet.getRange(rowIndex, dateConvertedCol).setValue(new Date().toISOString());
  if (simplePracticeUrl) {
    const urlCol = ACCOUNTS_HEADERS.indexOf('SimplePracticeUrl') + 1;
    sheet.getRange(rowIndex, urlCol).setValue(simplePracticeUrl);
  }
  return { AccountId: accountId, Status: 'Customer' };
}

// ---------- contacts ----------

function createContact_(data) {
  const id = newId_();
  appendRow_(CONTACTS_SHEET, CONTACTS_HEADERS, {
    ContactId: id,
    AccountId: data.AccountId,
    ContactName: data.ContactName || '',
    Role: data.Role || '',
    Phone: data.Phone || '',
    Email: data.Email || '',
    PreferredContact: data.PreferredContact || ''
  });
  return { ContactId: id };
}

function updateContact_(data) {
  const rowIndex = findRowIndex_(CONTACTS_SHEET, 'ContactId', data.ContactId);
  if (rowIndex === -1) throw new Error('Contact not found');
  updateRow_(CONTACTS_SHEET, CONTACTS_HEADERS, rowIndex, data);
  return { ContactId: data.ContactId };
}

// ---------- connections ----------

function createConnection_(data) {
  const id = newId_();
  appendRow_(CONNECTIONS_SHEET, CONNECTIONS_HEADERS, {
    ConnectionId: id,
    AccountId: data.AccountId,
    ContactName: data.ContactName || '',
    Role: data.Role || '',
    Phone: data.Phone || '',
    Email: data.Email || '',
    PreferredContact: data.PreferredContact || '',
    Relationship: data.Relationship || ''
  });
  return { ConnectionId: id };
}

function updateConnection_(data) {
  const rowIndex = findRowIndex_(CONNECTIONS_SHEET, 'ConnectionId', data.ConnectionId);
  if (rowIndex === -1) throw new Error('Connection not found');
  updateRow_(CONNECTIONS_SHEET, CONNECTIONS_HEADERS, rowIndex, data);
  return { ConnectionId: data.ConnectionId };
}

// ---------- notes ----------

function addNote_(accountId, noteText) {
  const id = newId_();
  appendRow_(NOTES_SHEET, NOTES_HEADERS, {
    NoteId: id,
    AccountId: accountId,
    Timestamp: new Date().toISOString(),
    NoteText: noteText
  });
  return { NoteId: id };
}

function updateNote_(data) {
  const sheet = getSpreadsheet_().getSheetByName(NOTES_SHEET);
  const rowIndex = findRowIndex_(NOTES_SHEET, 'NoteId', data.NoteId);
  if (rowIndex === -1) throw new Error('Note not found');
  const textCol = NOTES_HEADERS.indexOf('NoteText') + 1;
  sheet.getRange(rowIndex, textCol).setValue(data.NoteText || '');
  return { NoteId: data.NoteId };
}

// ---------- Google Sign-In verification ----------

// Verifies a Google ID token server-side (real signature + expiry check via
// Google's own tokeninfo endpoint - not just trusting whatever the browser
// sends), confirms it was issued for THIS app, and checks the signed-in
// email against the allowlist above.
function verifyGoogleLogin_(idToken) {
  if (!idToken) throw new Error('Missing sign-in token');

  const response = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );
  if (response.getResponseCode() !== 200) {
    throw new Error('Could not verify sign-in - please try again');
  }

  const payload = JSON.parse(response.getContentText());

  if (payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Sign-in token was not issued for this app');
  }
  if (payload.email_verified !== 'true' && payload.email_verified !== true) {
    throw new Error('Google account email is not verified');
  }

  const email = String(payload.email || '').toLowerCase();
  const allowed = ALLOWED_GOOGLE_EMAILS.map(e => e.toLowerCase());
  if (allowed.indexOf(email) === -1) {
    throw new Error('That Google account is not authorized for this app');
  }

  const sessionToken = createSession_(email);
  return { email: email, name: payload.name || '', authorized: true, sessionToken: sessionToken };
}

// ---------- Gmail integration ----------

// Read-only: searches Gmail for threads to/from any of the given email
// addresses (an account's Contacts + Connections emails) and returns a
// lightweight summary of each. Never sends, modifies, or deletes anything.
const EMAIL_CACHE_SECONDS = 300; // 5 minutes — matches the calendar cache

// Cached wrapper around getEmailsForAddresses_ so auto-loading emails on
// every account-page visit doesn't trigger a fresh Gmail search each time.
// Keyed by a hash of the (sorted, deduped) email list + thread cap, since
// the address list itself can be long.
function getCachedEmailsForAddresses_(emails, maxThreads) {
  const cleanEmails = (emails || [])
    .map(e => String(e || '').trim().toLowerCase())
    .filter(e => e && e.indexOf('@') !== -1);
  const uniqueEmails = Array.from(new Set(cleanEmails)).sort();
  if (uniqueEmails.length === 0) return [];

  const keySource = uniqueEmails.join(',') + '|' + (maxThreads || 15);
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, keySource)
    .map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
  const cacheKey = 'emails_' + digest;

  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (err) {
      // fall through and recompute if the cached value is somehow corrupt
    }
  }

  const fresh = getEmailsForAddresses_(uniqueEmails, maxThreads);
  try {
    cache.put(cacheKey, JSON.stringify(fresh), EMAIL_CACHE_SECONDS);
  } catch (err) {
    // Cache put can fail if the payload is too large (100KB/key limit) -
    // harmless to skip caching in that edge case, just recomputes next time.
  }
  return fresh;
}

function getEmailsForAddresses_(emails, maxThreads) {
  const cleanEmails = (emails || [])
    .map(e => String(e || '').trim())
    .filter(e => e && e.indexOf('@') !== -1);

  if (cleanEmails.length === 0) return [];

  // Dedupe.
  const uniqueEmails = Array.from(new Set(cleanEmails.map(e => e.toLowerCase())));
  const query = uniqueEmails.map(e => `(from:${e} OR to:${e})`).join(' OR ');

  const threads = GmailApp.search(query, 0, maxThreads || 15);

  return threads.map(thread => {
    const messages = thread.getMessages();
    const last = messages[messages.length - 1];
    let snippet = '';
    try {
      snippet = last.getPlainBody().replace(/\s+/g, ' ').trim().slice(0, 160);
    } catch (err) {
      snippet = '';
    }
    return {
      threadId: thread.getId(),
      subject: thread.getFirstMessageSubject() || '(no subject)',
      snippet: snippet,
      from: last.getFrom(),
      date: last.getDate().toISOString(),
      messageCount: messages.length,
      url: 'https://mail.google.com/mail/u/0/?authuser=' + encodeURIComponent(ALLOWED_GOOGLE_EMAILS[0]) + '#all/' + thread.getId()
    };
  });
}

// Scans Gmail threads involving the given domain(s) and pulls out every
// distinct email address at that domain - from From/To/Cc headers - that
// ISN'T already in existingEmails (i.e. not already a saved Contact or
// Connection on this account). Returns best-effort display names too, so
// suggestions show a real name where Gmail has one.
function getSuggestedContactsForDomains_(domains, existingEmails, existingNames, maxThreads) {
  const cleanDomains = Array.from(new Set(
    (domains || []).map(d => String(d || '').toLowerCase().trim()).filter(Boolean)
  ));
  if (cleanDomains.length === 0) return [];

  const existing = new Set((existingEmails || []).map(e => String(e || '').toLowerCase().trim()));
  // Also dedupe by name - a contact saved without an email (e.g. captured
  // by phone only) would otherwise still show up as a "new" suggestion.
  const existingNamesSet = new Set(
    (existingNames || []).map(n => String(n || '').toLowerCase().trim()).filter(Boolean)
  );

  const query = cleanDomains.map(d => `(from:@${d} OR to:@${d})`).join(' OR ');
  const threads = GmailApp.search(query, 0, maxThreads || 30);

  function extractAddresses(headerValue) {
    const results = [];
    if (!headerValue) return results;
    headerValue.split(',').forEach(part => {
      part = part.trim();
      const m = part.match(/^(.*?)<(.+?)>$/);
      if (m) {
        results.push({ name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim().toLowerCase() });
      } else if (part.indexOf('@') !== -1) {
        results.push({ name: '', email: part.toLowerCase() });
      }
    });
    return results;
  }

  const found = {}; // email -> { email, name, count }

  threads.forEach(thread => {
    let messages;
    try {
      messages = thread.getMessages();
    } catch (err) {
      messages = [];
    }
    messages.forEach(msg => {
      let fromHeader = '', toHeader = '', ccHeader = '';
      try { fromHeader = msg.getFrom(); } catch (err) {}
      try { toHeader = msg.getTo(); } catch (err) {}
      try { ccHeader = msg.getCc(); } catch (err) {}

      const addrs = [].concat(
        extractAddresses(fromHeader),
        extractAddresses(toHeader),
        extractAddresses(ccHeader)
      );

      addrs.forEach(({ name, email }) => {
        if (cleanDomains.indexOf(getEmailDomain_(email)) === -1) return;
        if (existing.has(email)) return;
        if (name && existingNamesSet.has(name.toLowerCase().trim())) return;
        if (!found[email]) found[email] = { email: email, name: '', count: 0 };
        if (name && !found[email].name) found[email].name = name;
        found[email].count++;
      });
    });
  });

  return Object.keys(found)
    .map(e => found[e])
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// ---------- Calendar integration ----------

function getEmailDomain_(email) {
  const parts = String(email || '').toLowerCase().split('@');
  return parts.length === 2 ? parts[1].trim() : '';
}

// Scans the default calendar ONCE (next 60 days) and cross-references it
// against every account's contact/connection domains in a single pass. The
// result is cached for a few minutes so that opening several account pages,
// or the main page's summary, doesn't each trigger a fresh full calendar
// scan - they all read from the same cached pass instead.
const CALENDAR_CACHE_KEY = 'calendarMatches_v1';
const CALENDAR_CACHE_SECONDS = 300; // 5 minutes

function computeAllCalendarMatches_(maxEvents) {
  const accounts = readSheet_(ACCOUNTS_SHEET, ACCOUNTS_HEADERS);
  const contacts = readSheet_(CONTACTS_SHEET, CONTACTS_HEADERS);
  const connections = readSheet_(CONNECTIONS_SHEET, CONNECTIONS_HEADERS);

  const accountById = {};
  accounts.forEach(a => { accountById[a.AccountId] = a; });

  // domain -> account (first account found wins if a domain is somehow
  // shared across accounts, which shouldn't normally happen)
  const domainToAccount = {};
  function registerEmail(email, accountId) {
    const domain = getEmailDomain_(email);
    const acct = accountById[accountId];
    if (domain && acct && !domainToAccount[domain]) {
      domainToAccount[domain] = acct;
    }
  }
  contacts.forEach(c => registerEmail(c.Email, c.AccountId));
  connections.forEach(c => registerEmail(c.Email, c.AccountId));

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(now, windowEnd);
  const calendarId = calendar.getId();

  const matches = [];
  for (let i = 0; i < events.length && matches.length < (maxEvents || 50); i++) {
    const event = events[i];
    let guestEmails = [];
    try {
      guestEmails = event.getGuestList(true).map(g => g.getEmail());
    } catch (err) {
      guestEmails = [];
    }

    let matchedAccount = null;
    let matchedGuest = null;
    for (let j = 0; j < guestEmails.length; j++) {
      const domain = getEmailDomain_(guestEmails[j]);
      if (domainToAccount[domain]) {
        matchedAccount = domainToAccount[domain];
        matchedGuest = guestEmails[j];
        break;
      }
    }
    if (!matchedAccount) continue;

    let eventUrl = '';
    try {
      eventUrl = 'https://calendar.google.com/calendar/r/eventedit/' +
        Utilities.base64EncodeWebSafe(event.getId() + ' ' + calendarId).replace(/=+$/, '');
    } catch (err) {
      const d = event.getStartTime();
      eventUrl = 'https://calendar.google.com/calendar/r/day/' + d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
    }

    matches.push({
      eventId: event.getId(),
      accountId: matchedAccount.AccountId,
      accountName: matchedAccount.AccountName,
      title: event.getTitle() || '(no title)',
      start: event.getStartTime().toISOString(),
      end: event.getEndTime().toISOString(),
      allDay: event.isAllDayEvent(),
      location: event.getLocation() || '',
      matchedGuest: matchedGuest,
      url: eventUrl
    });
  }

  matches.sort((a, b) => new Date(a.start) - new Date(b.start));
  return matches;
}

function getCachedCalendarMatches_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CALENDAR_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (err) {
      // fall through and recompute if the cached value is somehow corrupt
    }
  }
  const fresh = computeAllCalendarMatches_(50);
  try {
    cache.put(CALENDAR_CACHE_KEY, JSON.stringify(fresh), CALENDAR_CACHE_SECONDS);
  } catch (err) {
    // Cache put can fail if the payload is too large (100KB/key limit) -
    // harmless to skip caching in that edge case, just recomputes next time.
  }
  return fresh;
}

// Per-account meetings - now just filters the shared cached scan instead of
// hitting the calendar API itself, so this is cheap enough to auto-load.
function getAccountMeetingsByAccountId_(accountId, maxEvents) {
  const all = getCachedCalendarMatches_();
  return all.filter(m => m.accountId === accountId).slice(0, maxEvents || 15);
}

// Main-page summary - same shared cache, just reshaped slightly and capped
// to the top few soonest across all accounts.
function getTopUpcomingMeetings_(maxEvents) {
  const all = getCachedCalendarMatches_();
  return all.slice(0, maxEvents || 3).map(m => ({
    accountId: m.accountId,
    accountName: m.accountName,
    title: m.title,
    date: m.start,
    matchedGuest: m.matchedGuest,
    url: m.url
  }));
}