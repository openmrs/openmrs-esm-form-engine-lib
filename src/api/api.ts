import { openmrsFetch, openmrsObservableFetch } from '@openmrs/esm-framework';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { encounterRepresentation } from '../constants';
import { OpenmrsForm } from './types';
import { isUuid } from '../utils/boolean-utils';

export function saveEncounter(abortController: AbortController, payload, encounterUuid?: string) {
  const url = !!encounterUuid ? `/ws/rest/v1/encounter/${encounterUuid}?v=full` : `/ws/rest/v1/encounter?v=full`;
  return openmrsFetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: payload,
    signal: abortController.signal,
  });
}

export function getConcept(conceptUuid: string, v: string): Observable<any> {
  return openmrsObservableFetch(`/ws/rest/v1/concept/${conceptUuid}?v=${v}`).pipe(map(response => response['data']));
}

export function getLocationsByTag(tag: string): Observable<{ uuid: string; display: string }[]> {
  return openmrsObservableFetch(`/ws/rest/v1/location?tag=${tag}&v=custom:(uuid,display)`).pipe(
    map(({ data }) => data['results']),
  );
}

export function getPreviousEncounter(patientUuid: string, encounterType) {
  const query = `encounterType=${encounterType}&patient=${patientUuid}`;
  return openmrsFetch(`/ws/rest/v1/encounter?${query}&limit=1&v=${encounterRepresentation}`).then(({ data }) => {
    return data.results.length ? data.results[0] : null;
  });
}

export function fetchConceptNameByUuid(conceptUuid: string) {
  return openmrsFetch(`/ws/rest/v1/concept/${conceptUuid}/name?limit=1`).then(({ data }) => {
    if (data.results.length) {
      const concept = data.results[data.results.length - 1];
      return concept.display;
    }
  });
}

export function getLatestObs(patientUuid: string, conceptUuid: string, encounterTypeUuid?: string) {
  let params = `patient=${patientUuid}&code=${conceptUuid}${encounterTypeUuid ? `&encounter.type=${encounterTypeUuid}` : ''
    }`;
  // the latest obs
  params += '&_sort=-_lastUpdated&_count=1';
  return openmrsFetch(`/ws/fhir2/R4/Observation?${params}`).then(({ data }) => {
    return data.entry?.length ? data.entry[0].resource : null;
  });
}

/**
 * Fetches an OpenMRS form using either its name or UUID.
 * @param {string} nameOrUUID - The form's name or UUID.
 * @returns {Promise<OpenmrsForm | null>} - A Promise that resolves to the fetched OpenMRS form or null if not found.
 */
export async function fetchOpenMRSForm(nameOrUUID: string): Promise<OpenmrsForm | null> {
  if (!nameOrUUID) {
    return null;
  }

  const { url, isUUID } = isUuid(nameOrUUID)
    ? { url: `/ws/rest/v1/form/${nameOrUUID}?v=full`, isUUID: true }
    : { url: `/ws/rest/v1/form?q=${nameOrUUID}&v=full`, isUUID: false };

  const { data: openmrsFormResponse } = await openmrsFetch(url);
  if (isUUID) {
    return openmrsFormResponse;
  }
  return openmrsFormResponse.results?.length
    ? openmrsFormResponse.results[0]
    : new Error(`Form with ${nameOrUUID} was not found`);
}

/**
 * Fetches ClobData for a given OpenMRS form.
 * @param {OpenmrsForm} form - The OpenMRS form object.
 * @returns {Promise<any | null>} - A Promise that resolves to the fetched ClobData or null if not found.
 */
export async function fetchClobData(form: OpenmrsForm): Promise<any | null> {
  if (!form) {
    return null;
  }

  const jsonSchemaResource = form.resources.find(({ name }) => name === 'JSON schema');
  if (!jsonSchemaResource) {
    return null;
  }

  const clobDataUrl = `/ws/rest/v1/clobdata/${jsonSchemaResource.valueReference}`;
  const { data: clobDataResponse } = await openmrsFetch(clobDataUrl);

  return clobDataResponse;
}

export async function getMLRiskScore(...params): Promise<any | null> {
  const populationType = params[0];
  const htsFacilityEntryPoint = params[1];
  const testHistory = params[2];
  const gender = params[3];
  const hasDisability = params[4];
  const selfTest = params[5];
  const birthDate = params[6];
  const screenedTB = params[7];
  const facilityHTStrategy = params[8]
  const maritalStatus = params[9]
  const kpTypeFemale = params[10]
  const kpTypeMale = params[11]
  const ppType = params[12]
  const department = params[13]
  const lastTestDate = params[14]
  const prep = params[15]
  const sti = params[16]
  const sexuallyActive = params[17]
  const newPartner = params[18]
  const partnerHivStatus = params[19]
  const noSexPartners = params[20]
  const alcoholicSex = params[21]
  const moneySex = params[22]
  const condomBurst = params[23]
  const strangerSex = params[24]
  const knownPositive = params[25]
  const pregnant = params[26]
  const breastfeeding = params[27]
  const gbvViolence = params[28]
  const sharedNeedle = params[29]
  const needleStickInjuries = params[30]
  const traditionalProcedures = params[31]
  const mothersHivstatus = params[32]
  const clientReferred = params[33]
  const coupleDiscordant = params[34]
  const pep = params[35]
  const age = params[36]

  if (populationType == "" || htsFacilityEntryPoint == "" || testHistory == "" || gender == "" || screenedTB == "" || htsFacilityEntryPoint == "") {
    return;
  }

  let dateLastTested = Math.abs(lastTestDate.months())

  var predictionVariables = {
    Age: age,
    births: 0,
    pregnancies: 0,
    literacy: 0,
    poverty: 0,
    anc: 0,
    pnc: 0,
    sba: 0,
    hiv_prev: 0,
    hiv_count: 0,
    condom: 0,
    intercourse: 0,
    in_union: 0,
    circumcision: 0,
    partner_away: 0,
    partner_men: 0,
    partner_women: 0,
    sti: 0,
    fb: 0,
    PopulationTypeGP: 0,
    PopulationTypeKP: 0,
    PopulationTypePRIORITY: 0,
    KeyPopulationFSW: 0,
    KeyPopulationMSM: 0,
    KeyPopulationNR: 0,
    KeyPopulationOther: 0,
    KeyPopulationPWID: 0,
    PriorityPopulationAGYW: 0,
    PriorityPopulationFISHERMEN: 0,
    PriorityPopulationNR: 0,
    PriorityPopulationOTHER: 0,
    DepartmentEMERGENCY: 0,
    DepartmentIPD: 0,
    DepartmentOPD: 0,
    DepartmentPMTCT: 0,
    DepartmentVCT: 0,
    IsHealthWorkerNO: 0,
    IsHealthWorkerNR: 0,
    IsHealthWorkerYES: 0,
    SexuallyActiveNO: 0,
    SexuallyActiveNR: 0,
    SexuallyActiveYES: 0,
    NewPartnerNO: 0,
    NewPartnerNR: 0,
    NewPartnerYES: 0,
    PartnerHIVStatusNEGATIVE: 0,
    PartnerHIVStatusNR: 0,
    PartnerHIVStatusPOSITIVE: 0,
    PartnerHIVStatusUNKNOWN: 0,
    NumberOfPartnersMULTIPLE: 0,
    NumberOfPartnersNR: 0,
    NumberOfPartnersSINGLE: 0,
    AlcoholSexALWAYS: 0,
    AlcoholSexNEVER: 0,
    AlcoholSexNR: 0,
    AlcoholSexSOMETIMES: 0,
    MoneySexNO: 0,
    MoneySexNR: 0,
    MoneySexYES: 0,
    CondomBurstNO: 0,
    CondomBurstNR: 0,
    CondomBurstYES: 0,
    UnknownStatusPartnerNO: 0,
    UnknownStatusPartnerNR: 0,
    UnknownStatusPartnerYES: 0,
    KnownStatusPartnerNO: 0,
    KnownStatusPartnerNR: 0,
    KnownStatusPartnerYES: 0,
    PregnantNO: 0,
    PregnantNR: 0,
    PregnantYES: 0,
    BreastfeedingMotherNO: 0,
    BreastfeedingMotherNR: 0,
    BreastfeedingMotherYES: 0,
    ExperiencedGBVNO: 0,
    ExperiencedGBVYES: 0,
    CurrentlyOnPrepNO: 0,
    CurrentlyOnPrepNR: 0,
    CurrentlyOnPrepYES: 0,
    CurrentlyHasSTINO: 0,
    CurrentlyHasSTINR: 0,
    CurrentlyHasSTIYES: 0,
    SharedNeedleNO: 0,
    SharedNeedleNR: 0,
    SharedNeedleYES: 0,
    NeedleStickInjuriesNO: 0,
    NeedleStickInjuriesNR: 0,
    NeedleStickInjuriesYES: 0,
    TraditionalProceduresNO: 0,
    TraditionalProceduresNR: 0,
    TraditionalProceduresYES: 0,
    MothersStatusNEGATIVE: 0,
    MothersStatusNR: 0,
    MothersStatusPOSITIVE: 0,
    MothersStatusUNKNOWN: 0,
    ReferredForTestingNO: 0,
    ReferredForTestingYES: 0,
    GenderFEMALE: gender == 'female' ? 1 : 0,
    GenderMALE: gender == 'male' ? 1 : 0,
    MaritalStatusDIVORCED: 0,
    MaritalStatusMARRIED: 0,
    MaritalStatusMINOR: 0,
    MaritalStatusPOLYGAMOUS: 0,
    MaritalStatusSINGLE: 0,
    EverTestedForHivNO: 0,
    EverTestedForHivYES: 0,
    MonthsSinceLastTestLASTSIXMONTHS: 0,
    MonthsSinceLastTestMORETHANTWOYEARS: 0,
    MonthsSinceLastTestNR: 0,
    MonthsSinceLastTestONETOTWOYEARS: 0,
    MonthsSinceLastTestSEVENTOTWELVE: 0,
    ClientTestedAsCOUPLE: 0,
    ClientTestedAsINDIVIDUAL: 0,
    EntryPointIPD: 0,
    EntryPointOPD: 0,
    EntryPointOTHER: 0,
    EntryPointPEDIATRIC: 0,
    EntryPointPMTCT_ANC: 0,
    EntryPointPMTCT_MAT_PNC: 0,
    EntryPointTB: 0,
    EntryPointVCT: 0,
    EntryPointVMMC: 0,
    TestStrategyHB: 0,
    TestStrategyHP: 0,
    TestStrategyINDEX: 0,
    TestStrategyMO: 0,
    TestStrategyNP: 0,
    TestStrategyOTHER: 0,
    TestStrategySNS: 0,
    TestStrategyVI: 0,
    TestStrategyVS: 0,
    TbScreeningCONFIRMEDTB: 0,
    TbScreeningNOPRESUMEDTB: 0,
    TbScreeningPRESUMEDTB: 0,
    ClientSelfTestedNO: 0,
    ClientSelfTestedYES: 0,
    CoupleDiscordantNO: 0,
    CoupleDiscordantNR: 0,
    CoupleDiscordantYES: 0,
    SEXUALNO: 0,
    SEXUALYES: 0,
    SOCIALNO: 0,
    SOCIALYES: 0,
    NONENO: 0,
    NONEYES: 0,
    NEEDLE_SHARINGNO: 0,
    NEEDLE_SHARINGYES: 0,
    ReceivedPrEPNO: 0,
    ReceivedPrEPYES: 0,
    ReceivedPEPNO: 0,
    ReceivedPEPYES: 0,
    ReceivedTBNO: 0,
    ReceivedTBYES: 0,
    ReceivedSTINO: 0,
    ReceivedSTIYES: 0,
    GBVSexualNO: 0,
    GBVSexualYES: 0,
    GBVPhysicalNO: 0,
    GBVPhysicalYES: 0,
    GBVEmotionalNO: 0,
    GBVEmotionalYES: 0,
    dayofweekFRIDAY: 0,
    dayofweekMONDAY: 0,
    dayofweekSATURDAY: 0,
    dayofweekSUNDAY: 0,
    dayofweekTHURSDAY: 0,
    dayofweekTUESDAY: 0,
    dayofweekWEDNESDAY: 0
  };

  // convert marital status
  if (maritalStatus == '5555AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // married monogamous
    predictionVariables.MaritalStatusMARRIED = 1;
  } else if (maritalStatus == '159715AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // married polygamous
    predictionVariables.MaritalStatusPOLYGAMOUS = 1;
  } else if (maritalStatus == '1058AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {  // divorced
    predictionVariables.MaritalStatusDIVORCED = 1;
  } else if ((maritalStatus == '1059AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') || maritalStatus == '1057AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // widowed
    predictionVariables.MaritalStatusSINGLE = 1;
  }

  if (age < 15) {
    predictionVariables.MaritalStatusMINOR = 1;
  }

  //convert population type
  if (populationType == '164928AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.PopulationTypeGP = 1;
  } else if (populationType == '164929AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.PopulationTypeKP = 1;
  } else if (populationType == '138643AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.PopulationTypePRIORITY = 1;
  }

  //Key Population
  if (kpTypeFemale == '105AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || kpTypeMale == '105AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { //INJECT DRUGS
    predictionVariables.KeyPopulationPWID = 1;
  } else if (kpTypeFemale == '160578AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || kpTypeMale == '160578AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // MEN WITH MEN
    predictionVariables.KeyPopulationMSM = 1;
  } else if (kpTypeFemale == '160579AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || kpTypeMale == '160579AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // FEMALE SEX WORKER
    predictionVariables.KeyPopulationFSW = 1;
  } else if (kpTypeFemale == '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || kpTypeMale == '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || params[10] == '162277AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || params[11] == '162277AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || params[10] == '165100AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || params[11] == '165100AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // Other|PRISONER|TRANS
    predictionVariables.KeyPopulationOther = 1;
  } else { // Not relevant
    predictionVariables.KeyPopulationNR = 1;
  }

  //Priority Population
  if (ppType == '159674AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { //FISHER
    predictionVariables.PriorityPopulationFISHERMEN = 1;
  } else if (ppType == '160549AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { //ADOLESCENT
    predictionVariables.PriorityPopulationAGYW = 1;
  } else if (ppType == '165192AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || ppType == '162277AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || params[12] == '162198AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { //MILITARY|PRISONER|TRUCK
    predictionVariables.PriorityPopulationOTHER = 1;
  } else { // Not relevant
    predictionVariables.PriorityPopulationNR = 1;
  }

  // // convert ever tested for hiv status
  if (testHistory == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.EverTestedForHivYES = 1;
  } else if (testHistory == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.EverTestedForHivNO = 1;
  }

  // // converter for tested as i.e. individual, couple:
  // if (params[5] == '164957AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
  //   predictionVariables.ClientTestedAsIndividual = 1;
  // } else if (params[5] == '164958AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
  //   predictionVariables.ClientTestedAsCouple = 1;
  // }

  // // convert entry point
  if (htsFacilityEntryPoint == '159940AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // VCT
    predictionVariables.EntryPointVCT = 1;
  } else if (htsFacilityEntryPoint == '160542AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // OPD
    predictionVariables.EntryPointOPD = 1;
  } else if ((htsFacilityEntryPoint == '160456AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') || (htsFacilityEntryPoint == '1623AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')) {
    // Maternity
    predictionVariables.EntryPointPMTCT_MAT_PNC = 1;
  } else if (htsFacilityEntryPoint == '5485AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // IPD
    predictionVariables.EntryPointIPD = 1;
  } else if (htsFacilityEntryPoint == '162181AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // Paed
    predictionVariables.EntryPointPEDIATRIC = 1;
  } else if ((htsFacilityEntryPoint == '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') || (htsFacilityEntryPoint == '160552AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') || (htsFacilityEntryPoint == '162050AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') || (htsFacilityEntryPoint == '159938AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') || (htsFacilityEntryPoint == '159939AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') || (htsFacilityEntryPoint == '160546AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') || (htsFacilityEntryPoint == '160522AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') || (htsFacilityEntryPoint == '163096AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')) {
    // Other
    predictionVariables.EntryPointOTHER = 1;
  } else if (htsFacilityEntryPoint == '162223AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // vmmc
    predictionVariables.EntryPointVMMC = 1;
  } else if (htsFacilityEntryPoint == '160541AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // tb
    predictionVariables.EntryPointTB = 1;
  } else if (params[1] == '160538AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // ANC
    predictionVariables.EntryPointPMTCT_ANC = 1;
  }

  // convert department     
  if (department == '160542AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // OPD
    predictionVariables.DepartmentOPD = 1;
  } else if (department == '160456AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || department == '1623AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // Maternity
    predictionVariables.DepartmentPMTCT = 1;
  } else if (department == '5485AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // IPD
    predictionVariables.DepartmentIPD = 1;
  } else if (department == '160473AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // EMERGENCY
    predictionVariables.DepartmentEMERGENCY = 1;
  }

  // convert months since last test

  if (dateLastTested > 0) {
    if (dateLastTested <= 6) {
      predictionVariables.MonthsSinceLastTestLASTSIXMONTHS = 1;
    } else if (dateLastTested >= 24) {
      predictionVariables.MonthsSinceLastTestMORETHANTWOYEARS = 1;
    } else if (dateLastTested >= 7 && dateLastTested <= 12) {
      predictionVariables.MonthsSinceLastTestSEVENTOTWELVE = 1;
    } else if (dateLastTested >= 12 && dateLastTested <= 24) {
      predictionVariables.MonthsSinceLastTestONETOTWOYEARS = 1;
    }
  } else {
    predictionVariables.MonthsSinceLastTestNR = 1;
  }

  // convert testing strategy
  if (facilityHTStrategy == '159938AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // HB
    predictionVariables.TestStrategyHB = 1;
  } else if (facilityHTStrategy == '159939AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // Mobile
    predictionVariables.TestStrategyMO = 1;
  } else if (facilityHTStrategy == '164163AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // HP
    predictionVariables.TestStrategyHP = 1;
  } else if (facilityHTStrategy == '164953AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // NP
    predictionVariables.TestStrategyNP = 1;
  } else if (facilityHTStrategy == '164954AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // Integrated VCT sites
    predictionVariables.TestStrategyVI = 1;
  } else if (facilityHTStrategy == '164955AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // Stand Alone VCT center
    predictionVariables.TestStrategyVS = 1;
  } else if (facilityHTStrategy == '161557AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // INDEX
    predictionVariables.TestStrategyINDEX = 1;
  } else if (facilityHTStrategy == '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // OTHER
    predictionVariables.TestStrategyOTHER = 1;
  } else if (facilityHTStrategy == '166606AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') { // SNS
    predictionVariables.TestStrategySNS = 1;
  }

  // convert HIV self test
  if (selfTest == '5619AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.ClientSelfTestedNO = 1;
  } else if (selfTest == '164952AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.ClientSelfTestedYES = 1;
  }

  // convert TB screening
  if (screenedTB == '1660AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || screenedTB == '160737AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.TbScreeningNOPRESUMEDTB = 1;
  } else if (screenedTB == '142177AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || screenedTB == '1111AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.TbScreeningPRESUMEDTB = 1;
  } else if (screenedTB == 1496 || screenedTB == '1662AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.TbScreeningCONFIRMEDTB = 1;
  }

  // convert currently on PREP
  if (prep == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.CurrentlyOnPrepYES = 1;
  } else if (prep == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.CurrentlyOnPrepNO = 1;
  }

  // convert has STI
  if (sti == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.CurrentlyHasSTIYES = 1;
  } else if (sti == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.CurrentlyHasSTINO = 1;
  }

  // convert Sexually Active
  if (sexuallyActive == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.SexuallyActiveYES = 1;
  } else if (sexuallyActive == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.SexuallyActiveNO = 1;
  } else {
    predictionVariables.SexuallyActiveNR = 1;
  }

  // convert New Partner
  if (newPartner == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.NewPartnerYES = 1;
  } else if (newPartner == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.NewPartnerNO = 1;
  } else {
    predictionVariables.NewPartnerNR = 1;
  }

  // // convert Health Worker
  // if (isHealthWorker == 1065) {
  //   predictionVariables.IsHealthWorkerYES = 1;
  // } else if (isHealthWorker == 1066) {
  //   predictionVariables.IsHealthWorkerNO = 1;
  // } else {
  //   predictionVariables.IsHealthWorkerNR = 1;
  // }

  // Partner HIV Status       
  if (partnerHivStatus == '703AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.PartnerHIVStatusPOSITIVE = 1;
  } else if (partnerHivStatus == '664AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.PartnerHIVStatusNEGATIVE = 1;
  } else if (partnerHivStatus == '1067AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.PartnerHIVStatusUNKNOWN = 1;
  } else {
    predictionVariables.PartnerHIVStatusNR = 1;
  }

  // Number of Partners
  if (noSexPartners > 0) {
    if (noSexPartners > 1) {
      predictionVariables.NumberOfPartnersMULTIPLE = 1;
    } else if (noSexPartners == 1) {
      predictionVariables.NumberOfPartnersSINGLE = 1;
    }
  } else {
    predictionVariables.NumberOfPartnersNR = 1;
  }

  // Alcoholic Sex
  if (alcoholicSex == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.AlcoholSexNEVER = 1;
  } else if (alcoholicSex == '1385AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.AlcoholSexSOMETIMES = 1;
  } else if (alcoholicSex == '165027AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.AlcoholSexALWAYS = 1;
  } else {
    predictionVariables.AlcoholSexNR = 1;
  }

  // Money Sex
  if (moneySex == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.MoneySexYES = 1;
  } else if (moneySex == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.MoneySexNO = 1;
  } else {
    predictionVariables.MoneySexNR = 1;
  }

  //condom burst
  if (condomBurst == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.CondomBurstYES = 1;
  } else if (condomBurst == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.CondomBurstNO = 1;
  } else {
    predictionVariables.CondomBurstNR = 1;
  }

  // unknown status partner     
  if (strangerSex == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.UnknownStatusPartnerYES = 1;
  } else if (strangerSex == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.UnknownStatusPartnerNO = 1;
  } else {
    predictionVariables.UnknownStatusPartnerNR = 1;
  }

  //known status partner
  if (knownPositive == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.KnownStatusPartnerYES = 1;
  } else if (knownPositive == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.KnownStatusPartnerNO = 1;
  } else {
    predictionVariables.KnownStatusPartnerNR = 1;
  }

  //pregnant       
  if (pregnant == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.PregnantYES = 1;
  } else if (pregnant == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.PregnantNO = 1;
  } else {
    predictionVariables.PregnantNR = 1;
  }

  //breastfeeding 
  if (breastfeeding == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.BreastfeedingMotherYES = 1;
  } else if (breastfeeding == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.BreastfeedingMotherNO = 1;
  } else {
    predictionVariables.BreastfeedingMotherNR = 1;
  }

  // GBV experienced       
  if (gbvViolence == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.ExperiencedGBVYES = 1;
  } else if (gbvViolence == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.ExperiencedGBVNO = 1;
  }

  //shared needle
  if (sharedNeedle == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.SharedNeedleYES = 1;
  } else if (sharedNeedle == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.SharedNeedleNO = 1;
  } else {
    predictionVariables.SharedNeedleNR = 1;
  }

  //needle stick injuries
  if (needleStickInjuries == '153574AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.NeedleStickInjuriesYES = 1;
  } else if (needleStickInjuries == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.NeedleStickInjuriesNO = 1;
  } else {
    predictionVariables.NeedleStickInjuriesNR = 1;
  }

  //traditional procedures
  if (traditionalProcedures == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.TraditionalProceduresYES = 1;
  } else if (traditionalProcedures == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.TraditionalProceduresNO = 1;
  } else {
    predictionVariables.TraditionalProceduresNR = 1;
  }

  //continue from mother status
  if (mothersHivstatus == '703AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.MothersStatusPOSITIVE = 1;
  } else if (mothersHivstatus == '664AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.MothersStatusNEGATIVE = 1;
  } else if (mothersHivstatus == '1067AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.MothersStatusUNKNOWN = 1;
  } else {
    predictionVariables.MothersStatusNR = 1;
  }

  //referred for testing      
  if (clientReferred == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.ReferredForTestingYES = 1;
  } else if (clientReferred == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.ReferredForTestingNO = 1;
  }

  // Discordant Couple    
  if (coupleDiscordant == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.CoupleDiscordantYES = 1;
  } else if (coupleDiscordant == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.CoupleDiscordantNO = 1;
  } else {
    predictionVariables.CoupleDiscordantNR = 1;
  }

  // Relationship with Contact - Sexual
  // if (sexualContactChecked.length & gt;= 1) {
  //   predictionVariables.SEXUALYES = 1;
  // } else {
  //   predictionVariables.SEXUALNO = 1;
  // }

  // Relationship with Contact - Social
  // if (socialContactChecked.length & gt;= 1) {
  //   predictionVariables.SOCIALYES = 1;
  // } else {
  //   predictionVariables.SOCIALNO = 1;
  // }

  // Relationship with Contact - None  
  // if (noneContactChecked.length & gt;= 1) {
  //   predictionVariables.NONEYES = 1;
  // } else {
  //   predictionVariables.NONENO = 1;
  // }

  // Relationship with Contact Needle sharing
  // if (needleSharingContactChecked.length & gt;= 1) {
  //   predictionVariables.NEEDLE_SHARINGYES = 1;
  // } else {
  //   predictionVariables.NEEDLE_SHARINGNO = 1;
  // }

  // Received Services - prep, pep, tb, sti
  // received prep
  if (prep?.length > 1) {
    predictionVariables.ReceivedPrEPYES = 1;
  } else {
    predictionVariables.ReceivedPrEPNO = 1;
  }

  // received pep
  if (pep?.length > 1) {
    predictionVariables.ReceivedPEPYES = 1;
  } else {
    predictionVariables.ReceivedPEPNO = 1;
  }

  // received TB
  if (params[7] == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.ReceivedTBYES = 1;
  } else {
    predictionVariables.ReceivedTBNO = 1;
  }

  // received STI  
  if (sti.length > 1) {
    predictionVariables.ReceivedSTIYES = 1;
  } else {
    predictionVariables.ReceivedSTINO = 1;
  }

  // GBV Sexual
  if (gbvViolence == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.GBVSexualYES = 1;
  } else {
    predictionVariables.GBVSexualNO = 1;
  }

  // // GBV Physical       
  // if (GBVPhysicalChecked.length & gt;= 1) {
  //   predictionVariables.GBVPhysicalYES = 1;
  // } else {
  //   predictionVariables.GBVPhysicalNO = 1;
  // }

  // // GBV Emotional
  // if (GBVEmotionalChecked.length & gt;= 1) {
  //   predictionVariables.GBVEmotionalYES = 1;
  // } else {
  //   predictionVariables.GBVEmotionalNO = 1;
  // }

  // Day of week
  const currentDate = new Date();
  let dayOfWeek = currentDate.getDay();
  if (dayOfWeek == 0) { // Sunday
    predictionVariables.dayofweekSUNDAY = 1;
  } else if (dayOfWeek == 1) { // Monday
    predictionVariables.dayofweekMONDAY = 1;
  } else if (dayOfWeek == 2) { // Tuesday
    predictionVariables.dayofweekTUESDAY = 1;
  } else if (dayOfWeek == 3) { // Wednesday
    predictionVariables.dayofweekWEDNESDAY = 1;
  } else if (dayOfWeek == 4) { // Thursday
    predictionVariables.dayofweekTHURSDAY = 1;
  } else if (dayOfWeek == 5) { // Friday
    predictionVariables.dayofweekFRIDAY = 1;
  } else if (dayOfWeek == 6) { // Saturday
    predictionVariables.dayofweekSATURDAY = 1;
  }

  const mlFormattedDate = new Date().toISOString().slice(0, 10); //YYYY-MM-DD
  const modelConfigs = {
    modelId: 'hts_xgb_1211_jan_2023',
    encounterDate: mlFormattedDate,
    facilityId: '',
    debug: 'true',
  };

  var mlScoringRequestPayload = {
    modelConfigs: modelConfigs,
    variableValues: predictionVariables
  };

  const url = 'http://197.248.44.228:8600/openmrs/ws/rest/v1/keml/casefindingscore';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(mlScoringRequestPayload),
  });

  let result = await response.json();
  if (result?.result?.predictions) {
    const lowRiskThreshold = 0.002625179;
    const mediumRiskThreshold = 0.010638781;
    const highRiskThreshold = 0.028924102;
    if (result?.result?.predictions['probability(1)'] > highRiskThreshold) {
      return 'Client has a very high probability of a HIV positive test result. Testing is strongly recommended';
    }
    if (
      result?.result?.predictions['probability(1)'] < highRiskThreshold &&
      result.result.predictions['probability(1)'] > mediumRiskThreshold
    ) {
      return 'Client has a high probability of a HIV positive test result. Testing is strongly recommended';
    }
    if (result?.result?.predictions['probability(1)'] > lowRiskThreshold) {
      return 'Client has a medium probability of a HIV positive test result. Testing is recommended';
    }
    if (result?.result?.predictions['probability(1)'] <= lowRiskThreshold) {
      return 'Client has a low probability of a HIV positive test result. Testing may not be recommended';
    } else {
      return `No results found`;
    }
  } else {
    return `No results found`;
  }
}
