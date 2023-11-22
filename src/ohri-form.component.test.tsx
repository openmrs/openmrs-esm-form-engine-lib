import { render, fireEvent, screen, cleanup, act, waitFor } from '@testing-library/react';
import { when } from "jest-when";
import * as api from "../src/api/api";
import React from "react";
import OHRIForm from "./ohri-form.component";
import hts_poc_1_1 from "../__mocks__/packages/hiv/forms/hts_poc/1.1.json";
import bmi_form from "../__mocks__/forms/ohri-forms/bmi-test-form.json";
import bsa_form from "../__mocks__/forms/ohri-forms/bsa-test-form.json";
import edd_form from "../__mocks__/forms/ohri-forms/edd-test-form.json";
import filter_answer_options_form from "../__mocks__/forms/ohri-forms/filter-answer-options-test-form.json";
import test_enrolment_form from "../__mocks__/forms/ohri-forms/test-enrolment-form.json";
import next_visit_form from "../__mocks__/forms/ohri-forms/next-visit-test-form.json";
import months_on_art_form from "../__mocks__/forms/ohri-forms/months-on-art-form.json";
import age_validation_form from "../__mocks__/forms/ohri-forms/age-validation-form.json";
import viral_load_status_form from "../__mocks__/forms/ohri-forms/viral-load-status-form.json";
import reference_by_mapping_form from "../__mocks__/forms/ohri-forms/reference-by-mapping-form.json";
import external_data_source_form from "../__mocks__/forms/ohri-forms/external_data_source_form.json";
import mock_concepts from "../__mocks__/concepts.mock.json";
import { mockPatient } from "../__mocks__/patient.mock";
import { mockSessionDataResponse } from "../__mocks__/session.mock";
import demoHtsOpenmrsForm from "../__mocks__/forms/omrs-forms/demo_hts-form.json";
import demoHtsOhriForm from "../__mocks__/forms/ohri-forms/demo_hts-form.json";

import {
  assertFormHasAllFields,
  findMultiSelectInput,
  findNumberInput,
  findRadioGroupMember,
  findSelectInput,
  findTextOrDateInput,
} from "./utils/test-utils";
import { mockVisit } from "../__mocks__/visit.mock";

//////////////////////////////////////////
////// Base setup
//////////////////////////////////////////
const mockUrl = `/ws/rest/v1/encounter?v=full`;
const patientUUID = "8673ee4f-e2ab-4077-ba55-4980f408773e";
const visit = mockVisit;
const mockOpenmrsFetch = jest.fn();
const formsResourcePath = when((url: string) =>
  url.includes("/ws/rest/v1/form/")
);
const clobdataResourcePath = when((url: string) =>
  url.includes("/ws/rest/v1/clobdata/")
);
global.ResizeObserver = require("resize-observer-polyfill");
when(mockOpenmrsFetch)
  .calledWith(formsResourcePath)
  .mockReturnValue({ data: demoHtsOpenmrsForm });
when(mockOpenmrsFetch)
  .calledWith(clobdataResourcePath)
  .mockReturnValue({ data: demoHtsOhriForm });

  const locale = window.i18next.language == 'en'? 'en-GB' : window.i18next.language;

//////////////////////////////////////////
////// Mocks
//////////////////////////////////////////
jest.mock("@openmrs/esm-framework", () => {
  const originalModule = jest.requireActual("@openmrs/esm-framework");

  return {
    ...originalModule,
    createErrorHandler: jest.fn(),
    showNotification: jest.fn(),
    showToast: jest.fn(),
    getAsyncLifecycle: jest.fn(),
    usePatient: jest.fn().mockImplementation(() => ({ patient: mockPatient })),
    registerExtension: jest.fn(),
    useSession: jest
      .fn()
      .mockImplementation(() => mockSessionDataResponse.data),
    openmrsFetch: jest
      .fn()
      .mockImplementation((args) => mockOpenmrsFetch(args)),
  };
});

jest.mock("../src/api/api", () => {
  const originalModule = jest.requireActual("../src/api/api");

  return {
    ...originalModule,
    getPreviousEncounter: jest
      .fn()
      .mockImplementation(() => Promise.resolve(null)),
    fetchConceptNameByUuid: jest
      .fn()
      .mockImplementation(() => Promise.resolve(null)),
    getConcept: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getLatestObs: jest
      .fn()
      .mockImplementation(() => Promise.resolve({ valueNumeric: 60 })),
      saveEncounter: jest.fn(),
  };
});

describe("OHRI Forms:", () => {
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it("Should render by the form json without dying", async () => {
    await act(async () => renderForm(null, hts_poc_1_1));
    await assertFormHasAllFields(screen, [
      { fieldName: "When was the HIV test conducted?", fieldType: "date" },
    ]);
  });

  it("Should render by the form UUID without dying", async () => {
    await act(async () =>
      renderForm("955ab92f-f93e-4dc0-9c68-b7b2346def55", null)
    );
    await assertFormHasAllFields(screen, [
      { fieldName: "When was the HIV test conducted?", fieldType: "date" },
      { fieldName: "Community service delivery point", fieldType: "select" },
      { fieldName: "TB screening", fieldType: "combobox" },
    ]);
  });

  it("Should demonstrate behaviour driven by form intents", async () => {
    // HTS_INTENT_A
    await act(async () =>
      renderForm("955ab92f-f93e-4dc0-9c68-b7b2346def55", null, "HTS_INTENT_A")
    );
    await assertFormHasAllFields(screen, [
      { fieldName: "When was the HIV test conducted?", fieldType: "date" },
      { fieldName: "TB screening", fieldType: "combobox" },
    ]);
    try {
      await findSelectInput(screen, "Community service delivery point");
      fail(
        "Field with title 'Community service delivery point' should not be found"
      );
    } catch (err) {
      expect(
        err.message.includes(
          'Unable to find role="button" and name "Community service delivery point"'
        )
      ).toBeTruthy();
    }

    // cleanup
    cleanup();

    // HTS_INTENT_B
    await act(async () =>
      renderForm("955ab92f-f93e-4dc0-9c68-b7b2346def55", null, "HTS_INTENT_B")
    );
    await assertFormHasAllFields(screen, [
      { fieldName: "When was the HIV test conducted?", fieldType: "date" },
      { fieldName: "Community service delivery point", fieldType: "select" },
    ]);
    try {
      await findMultiSelectInput(screen, "TB screening");
      fail("Field with title 'TB screening' should not be found");
    } catch (err) {
      expect(
        err.message.includes(
          'Unable to find role="combobox" and name "TB screening"'
        )
      ).toBeTruthy();
    }
  });
  // Form submission
  describe("Form submission", () => {
    it('Should validate form submission', async () => {
      // Mock the form submission function to simulate success
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');

      // Render the form
      await act(async () => renderForm(null, test_enrolment_form));
      const enrolmentDateField = await findTextOrDateInput(screen, 'Enrolment Date');
      const uniqueIdField = await findTextOrDateInput(screen, 'Unique ID');
      const motherEnrolledField = await findRadioGroupMember(screen, 'Mother enrolled in PMTCT program');
      const generalPopulationField = await findRadioGroupMember(screen, 'General population');

      // Simulate user interaction
      fireEvent.blur(enrolmentDateField, { target: { value: '2023-09-09T00:00:00.000Z' } });
      fireEvent.blur(uniqueIdField, { target: { value: 'U0-001109' } });
      fireEvent.click(motherEnrolledField);
      fireEvent.click(generalPopulationField);

      // Simulate a successful form submission
      await act(async () => {
        fireEvent.submit(screen.getByText(/save/i));
      });

      // Add assertions for a successful submission
      expect(saveEncounterMock).toBeCalledTimes(1);
      expect(saveEncounterMock).toHaveBeenCalledWith(expect.any(AbortController), expect.any(Object), undefined);
      expect(saveEncounterMock).toHaveReturned();
    });

    it('Should validate transient fields', async () => {
      // Mock the form submission function to simulate success
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');

      // Render the form
      await act(async () => renderForm(null, test_enrolment_form));
      const enrolmentDateField = await findTextOrDateInput(screen, 'Enrolment Date');
      const uniqueIdField = await findTextOrDateInput(screen, 'Unique ID');
      const motherEnrolledField = await findRadioGroupMember(screen, 'Mother enrolled in PMTCT program');
      const generalPopulationField = await findRadioGroupMember(screen, 'General population');

      // Simulate user interaction
      fireEvent.blur(enrolmentDateField, { target: { value: '2023-09-09T00:00:00.000Z' } });
      fireEvent.blur(uniqueIdField, { target: { value: 'U0-001109' } });
      fireEvent.click(motherEnrolledField);
      fireEvent.click(generalPopulationField);

      // Assert that Transient Field has a value
      expect(enrolmentDateField.value).toBe("09/09/2023")

      // Simulate a successful form submission
      await act(async () => {
        fireEvent.submit(screen.getByText(/save/i));
      });

      // Add assertions for transient field behaviour
      const [abortController, encounter, encounterUuid] = saveEncounterMock.mock.calls[0];
      expect(encounter.obs.length).toEqual(3);
      expect(encounter.obs.find(obs => obs.formFieldPath === "ohri-forms-hivEnrolmentDate")).toBeUndefined();

    });

  });


  describe("Filter Answer Options", () => {
    it("should filter dropdown options based on value in count input field", async () => {
      //setup
      await act(async () => renderForm(null, filter_answer_options_form));
      const recommendationDropdown = await findSelectInput(
        screen,
        "Testing Recommendations"
      );
      const testCountField = await findNumberInput(
        screen,
        "How many times have you tested in the past?"
      );
      // open dropdown
      fireEvent.click(recommendationDropdown);
      expect(
        screen.queryByRole("option", { name: /Perfect testing/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("option", { name: /Minimal testing/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("option", { name: /Un-decisive/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("option", { name: /Not ideal/i })
      ).toBeInTheDocument();
      // close dropdown
      fireEvent.click(recommendationDropdown);
      // provide a value greater than 5
      fireEvent.blur(testCountField, { target: { value: "6" } });
      // re-open dropdown
      fireEvent.click(recommendationDropdown);
      // verify
      expect(testCountField.value).toBe("6");
      expect(
        screen.queryByRole("option", { name: /Perfect testing/i })
      ).toBeNull();
      expect(
        screen.queryByRole("option", { name: /Minimal testing/i })
      ).toBeNull();
      expect(
        screen.queryByRole("option", { name: /Un-decisive/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("option", { name: /Not ideal/i })
      ).toBeInTheDocument();
    });
  });

  describe("Calcuated values", () => {
    afterEach(() => {
      cleanup();
    });

    it("Should evaluate BMI", async () => {
      // setup
      await act(async () => renderForm(null, bmi_form));

      // const bmiField = (await screen.findByRole('textbox', { name: 'BMI' })) as HTMLInputElement;
      const bmiField = await findTextOrDateInput(screen, "BMI");
      const heightField = await findNumberInput(screen, "Height");
      const weightField = await findNumberInput(screen, "Weight");
      await act(async () => expect(heightField.value).toBe(""));
      await act(async () => expect(weightField.value).toBe(""));
      await act(async () => expect(bmiField.value).toBe(""));

      // replay
      fireEvent.blur(heightField, { target: { value: 150 } });
      fireEvent.blur(weightField, { target: { value: 50 } });

      // verify
      await act(async () => expect(heightField.value).toBe("150"));
      await act(async () => expect(weightField.value).toBe("50"));
      await act(async () => expect(bmiField.value).toBe("22.2"));
    });

    it("Should evaluate BSA", async () => {
      // setup
      await act(async () => renderForm(null, bsa_form));

      const bsaField = await findTextOrDateInput(screen, "BSA");
      const heightField = await findNumberInput(screen, "Height");
      const weightField = await findNumberInput(screen, "Weight");
      await act(async () => expect(heightField.value).toBe(""));
      await act(async () => expect(weightField.value).toBe(""));
      await act(async () => expect(bsaField.value).toBe(""));

      // replay
      fireEvent.blur(heightField, { target: { value: 190.5 } });
      fireEvent.blur(weightField, { target: { value: 95 } });

      // verify
      await act(async () => expect(heightField.value).toBe("190.5"));
      await act(async () => expect(weightField.value).toBe("95"));
      await act(async () => expect(bsaField.value).toBe("2.24"));
    });

    it("Should evaluate EDD", async () => {
      // setup
      await act(async () => renderForm(null, edd_form));
      const eddField = await findTextOrDateInput(screen, "EDD");
      const lmpField = await findTextOrDateInput(screen, "LMP");

      await act(async () => expect(eddField.value).toBe(""));
      await act(async () => expect(lmpField.value).toBe(""));

      // replay
      fireEvent.change(lmpField, { target: { value: "2022-07-06" } });

      // verify
      await act(async () =>
        expect(lmpField.value).toBe(
          new Date("2022-07-06").toLocaleDateString(locale)
        )
      );
      await act(async () =>
        expect(eddField.value).toBe(
          new Date("2023-04-12").toLocaleDateString(locale)
        )
      );
    });

    it("Should evaluate months on ART", async () => {
      // setup
      await act(async () => renderForm(null, months_on_art_form));
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2022, 9, 1));
      let artStartDateField = (await screen.findByRole("textbox", {
        name: /Antiretroviral treatment start date/,
      })) as HTMLInputElement;
      let monthsOnARTField = (await screen.findByRole("spinbutton", {
        name: /Months on ART/,
      })) as HTMLInputElement;
      let assumeTodayToBe = "7/11/2022";

      await act(async () => expect(artStartDateField.value).toBe(""));
      await act(async () => expect(assumeTodayToBe).toBe("7/11/2022"));
      await act(async () => expect(monthsOnARTField.value).toBe(""));

      // replay
      fireEvent.blur(artStartDateField, { target: { value: "05/02/2022" } });

      // verify
      await act(async () =>
        expect(artStartDateField.value).toBe(
          new Date("2022-02-05T00:00:00.000+0000").toLocaleDateString(locale)
        )
      );
      await act(async () => expect(assumeTodayToBe).toBe("7/11/2022"));
      await act(async () => expect(monthsOnARTField.value).toBe("7"));
    });

    it("Should evaluate viral load status", async () => {
      // setup
      await act(async () => renderForm(null, viral_load_status_form));
      let viralLoadCountField = (await screen.findByRole("spinbutton", {
        name: /Viral Load Count/,
      })) as HTMLInputElement;
      let viralLoadStatusField = (await screen.findByRole("group", {
        name: /Viral Load Status/,
      })) as HTMLInputElement;
      let suppressedField = (await screen.findByRole("radio", {
        name: /Suppressed/,
      })) as HTMLInputElement;
      let unsuppressedField = (await screen.findByRole("radio", {
        name: /Unsuppressed/,
      })) as HTMLInputElement;

      await act(async () => expect(viralLoadCountField.value).toBe(""));
      await act(async () => expect(viralLoadStatusField.value).toBe(undefined));

      // replay
      fireEvent.blur(viralLoadCountField, { target: { value: 30 } });

      // verify
      await act(async () => expect(viralLoadCountField.value).toBe("30"));
      await act(async () => expect(suppressedField).toBeChecked());
      await act(async () => expect(unsuppressedField).not.toBeChecked());
    });

    it("Should only show question when age is under 5", async () => {
      // setup
      await act(async () => renderForm(null, age_validation_form));
      let enrollmentDate = (await screen.findByRole("textbox", {
        name: /enrollmentDate/,
      })) as HTMLInputElement;

      await act(async () => expect(enrollmentDate.value).toBe(""));
      fireEvent.blur(enrollmentDate, {
        target: { value: "1975-07-06T00:00:00.000Z" },
      });

      let mrn = (await screen.findByRole("textbox", {
        name: /MRN/,
      })) as HTMLInputElement;
      await act(async () => expect(mrn.value).toBe(""));

      // verify
      await act(async () =>
        expect(enrollmentDate.value).toBe(
          new Date("1975-07-06T00:00:00.000Z").toLocaleDateString(locale)
        )
      );
      await act(async () => expect(mrn.value).toBe(""));
      await act(async () => expect(mrn).toBeVisible());
    });

    it("Should load initial value from external arbitrary data source", async () => {
      // setup
      await act(async () => renderForm(null, external_data_source_form));
      const bodyWeightField = await findNumberInput(screen, "Body Weight");

      // verify
      await act(async () => expect(bodyWeightField.value).toBe("60"));
    });

    // FIXME: This test passes locally but fails in the CI environment
    xit("Should evaluate next visit date", async () => {
      // setup
      await act(async () => renderForm(null, next_visit_form));
      let followupDateField = (await screen.findByRole("textbox", {
        name: /Followup Date/,
      })) as HTMLInputElement;
      let arvDispensedInDaysField = (await screen.findByRole("spinbutton", {
        name: /ARV dispensed in days/,
      })) as HTMLInputElement;
      let nextVisitDateField = (await screen.findByRole("textbox", {
        name: /Next visit date/,
      })) as HTMLInputElement;

      await act(async () => expect(followupDateField.value).toBe(""));
      await act(async () => expect(arvDispensedInDaysField.value).toBe(""));
      await act(async () => expect(nextVisitDateField.value).toBe(""));

      // replay
      fireEvent.blur(followupDateField, {
        target: { value: "2022-07-06T00:00:00.000Z" },
      });
      fireEvent.blur(arvDispensedInDaysField, { target: { value: 120 } });

      // verify
      await act(async () => expect(followupDateField.value).toBe(""));
      await act(async () => expect(arvDispensedInDaysField.value).toBe("120"));
      await act(async () => expect(nextVisitDateField.value).toBe("11/3/2022"));
    });
  });

  describe("Concept references", () => {
    const conceptResourcePath = when((url: string) =>
      url.includes(
        "/ws/rest/v1/concept?references=PIH:Occurrence of trauma,PIH:Yes,PIH:No,PIH:COUGH"
      )
    );

    when(mockOpenmrsFetch)
      .calledWith(conceptResourcePath)
      .mockReturnValue({ data: mock_concepts });

    it("should add default labels based on concept display and substitute mapping references with uuids", async () => {
      await act(async () => renderForm(null, reference_by_mapping_form));

      const yes = (await screen.findAllByRole("radio", {
        name: "Yes",
      })) as Array<HTMLInputElement>;
      const no = (await screen.findAllByRole("radio", {
        name: "No",
      })) as Array<HTMLInputElement>;
      await assertFormHasAllFields(screen, [
        { fieldName: "Cough", fieldType: "radio" },
        { fieldName: "Occurrence of trauma", fieldType: "radio" },
      ]);
      await act(async () =>
        expect(no[0].value).toBe("3cd6f86c-26fe-102b-80cb-0017a47871b2")
      );
      await act(async () =>
        expect(no[1].value).toBe("3cd6f86c-26fe-102b-80cb-0017a47871b2")
      );
      await act(async () =>
        expect(yes[0].value).toBe("3cd6f600-26fe-102b-80cb-0017a47871b2")
      );
      await act(async () =>
        expect(yes[1].value).toBe("3cd6f600-26fe-102b-80cb-0017a47871b2")
      );
    });
  });

  function renderForm(formUUID, formJson, intent?: string) {
    return act(() => {
      render(
        <OHRIForm
          formJson={formJson as any}
          formUUID={formUUID}
          patientUUID={patientUUID}
          formSessionIntent={intent}
          visit={visit}
        />
      );
    });
  }
});
