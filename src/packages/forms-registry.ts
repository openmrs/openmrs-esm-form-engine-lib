import hts_v_1_0 from './hiv/forms/hts/1.0.json';
import hts_v_2_0 from './hiv/forms/hts/2.0.json';
import hiv_service_enrolment_v_1_0 from './hiv/forms/care-and-treatment/service-enrolment/1.0.json';
import covid_assessment_form_v_1_0 from './covid/forms/case-assessment-form/1.0.json';
import covid_lab_test_form_v_1_0 from './covid/forms/lab-test-form/1.0.json';
import covid_outcome_tracking_form_v_1_0 from './covid/forms/outcome-tracking-form/1.0.json';
import covid_vaccination_form_v_1_0 from './covid/forms/vaccination-form/1.0.json';
import clinical_visit_v_1_0 from './hiv/forms/care-and-treatment/clinical-visit/1.0.json';
import lab_results_v_1_0 from './hiv/forms/care-and-treatment/lab-results/1.0.json';
import covid_sample_collection_form_v_1_0 from './covid/forms/sample-collection-form/1.0.json';
import covid_lab_order_cancellation_form_v_1_0 from './covid/forms/lab-order-cancellation/1.0.json';
import covid_assessment_summary_v_1_0 from './covid/forms/assessment-summary/1.0.json';
import covid_lab_order_form_v_1_0 from './covid/forms/lab-order-form/1.0.json';
import covid_lab_result_form_v_1_0 from './covid/forms/lab-result-form/1.0.json';
import covid_outcome_form_v_1_0 from './covid/forms/outcome-form/1.0.json';
import covid_case_form_v_1_0 from './covid/forms/case-form/1.0.json';

export default {
  hiv: {
    hts: {
      '1.0': hts_v_1_0,
      '2.0': hts_v_2_0,
    },
    service_enrolment: {
      '1.0': hiv_service_enrolment_v_1_0,
    },
    clinical_visit: {
      '1.0': clinical_visit_v_1_0,
    },
    lab_results: {
      '1.0': lab_results_v_1_0,
    },
  },
  covid: {
    covid_assessment: {
      '1.0': covid_assessment_form_v_1_0,
    },
    covid_lab_test: {
      '1.0': covid_lab_test_form_v_1_0,
    },
    covid_outcome_tracking: {
      '1.0': covid_outcome_tracking_form_v_1_0,
    },
    covid_vaccination: {
      '1.0': covid_vaccination_form_v_1_0,
    },
    covid_sample_collection: {
      '1.0': covid_sample_collection_form_v_1_0,
    },
    covid_lab_order_cancellation: {
      '1.0': covid_lab_order_cancellation_form_v_1_0,
    },
    covid_assessment_summary: {
      '1.0': covid_assessment_summary_v_1_0,
    },
    covid_lab_order: {
      '1.0': covid_lab_order_form_v_1_0,
    },
    covid_lab_result: {
      '1.0': covid_lab_result_form_v_1_0,
    },
    covid_outcome: {
      '1.0': covid_outcome_form_v_1_0,
    },
    covid_case: {
      '1.0': covid_case_form_v_1_0,
    },
  },
};
