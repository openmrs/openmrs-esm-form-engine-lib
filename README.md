<div id="top"></div>

:wave:	*New to O3? Be sure to review the [OpenMRS 3 Frontend Developer Documentation](https://o3-docs.openmrs.org/).* :teacher:


# OpenMRS Form Engine

<img src="readme/form-engine.jpeg" alt="https://raw.githubusercontent.com/openmrs/openmrs-form-engine-lib/main/readme/form-engine.jpeg" >

The OpenMRS Form Engine is a React library that builds and renders OpenMRS JSON form schemas. Schemas are defined based on the [AMPATH Forms Schema](https://gist.github.com/denniskigen/80e4cd0765cbeda0efba79c6e6675e49) and get built using the OpenMRS [Form Builder](https://github.com/openmrs/openmrs-esm-form-builder) within the O3 reference application. The form engine is a library that can be consumed by any frontend app that needs to render forms. It enables the rendering of forms in the following modes:

- **Enter Mode** - This is the default mode that allows the user to enter data into the form. The form is rendered in a read-write mode.
- **Edit Mode** - This mode allows the user to edit data that has already been entered into the form. The form is rendered in a read-write mode.
- **View Mode** - This mode allows the user to view data that has already been entered into the form. The form is rendered in a read-only mode.
- **Embedded View** - This mode is an condensed version of the `view mode` without the section headers and form actions. It can be used to display entered form data within a widget.

## Documentation

You can find the full documentation for the OpenMRS Form Engine in the [OpenMRS Wiki](https://openmrs.atlassian.net/wiki/spaces/projects/pages/68747273/O3+Form+Docs).

Some key features include:

- **Validation** - The form engine enables the validation of form data based on the form schema. Arbitraily complex validation rules can be defined within the schema and evaluated by the form engine.
- **Sub forms** - The form engine supports the rendering of sub forms within a form. This allows for the creation of complex forms that can be reused across multiple forms.
- **Conditional rendering** - The form engine supports the conditional rendering of form fields based on the values of other form fields. This allows for the creation of dynamic forms that can adapt to the user's input.
- **Data sources** - The form engine supports the use of data sources to populate form fields. This allows for the creation of forms that can be populated with data from external sources.
- **Expression helpers** - The form engine supports the use of expression helpers to evaluate expressions within the form schema. This allows for the creation of complex expressions that can be evaluated by the form engine.
- **Translations** - The form engine supports translations for various elements such as action items, notifications, validators, and questions within the forms. Translations for pages, sections, and question labels are retrieved from the backend.
- **Drug orders** - The form engine facilitates drug orders by enabling the launch of the drug order basket. This feature allows users to add drugs along with medication details contained in the template for the specified drug.
- **Lab orders** - The form engine supports lab orders created using observations (obs) by utilizing the testOrders type on a specific question.
- **Markdown/ Read only fields** - The form engine includes support for read-only fields embedded within forms. These fields are utilized to provide additional information or guide users without allowing input.

## Getting Started

 *NB: The engine is a library and not an [O3 frontend module](https://o3-dev.docs.openmrs.org/#/getting_started/tour). That being said, it can be consumed by bundling it within an ESM or custom frontend app that incorporates it within a UI workflow.*

### Prerequisites

- The Node [Active LTS version](https://nodejs.org/en/about/releases/)
- The latest stable version of Yarn (We use Yarn as our package manager)

### Installation

```bash
yarn add @openmrs/openmrs-form-engine-lib@latest
```

### Local Development

```bash
git clone git@github.com:openmrs/openmrs-form-engine-lib.git

# OR with HTTPS

git clone https://github.com/openmrs/openmrs-form-engine-lib.git
```

#### Install Dependencies

```bash
yarn
```

#### Build the library
```bash
yarn build
```

#### Link the library to the dependant frontend module

To test your changes locally, you need to link the library to the dependant frontend module. Presently, this library is used by the following modules:

- [openmrs-esm-form-builder](https://github.com/openmrs/openmrs-esm-form-builder)
- [openmrs-esm-patient-chart](https://github.com/openmrs/openmrs-esm-patient-chart)

To link the library to the dependant frontend module, run the following command from the root of the frontend module:

```bash
yarn link `path/to/openmrs-form-engine-lib`
```

For example, if you are working on the `openmrs-esm-form-builder` module, you would run the following command:

```bash
pwd | pbcopy # copy the path to form-engine-lib to the to the clipboard
cd `path/to/openmrs-esm-form-builder`
yarn link `pbpaste` # paste the path to the openmrs-form-engine-lib
```

After linking the library, run the relevant `start` command from the frontend module. For example, if you are working on the form builder module, you would run the following command:

```bash
yarn start
```

Whereas for the patient chart you would have to start the form engine app within the patient chart that consumes the form engine like so:

```bash
yarn start --sources packages/esm-form-engine-app
```

You could also optionally proxy to a different backend where your forms are hosted by appending `backend` followed by the URL to the backend. For example:

```bash
yarn start --sources packages/esm-form-engine-app --backend https://link-to-my-backend.com
```

### Production
To use the form engine as your default in your O3 instance, you will need to add this to your importmap.

```json
{
  "frontendModules": {
    ...
    "@openmrs/esm-form-engine-app": "next"
    ...
  }
}
```

**NB**: *If you are currently using the form entry app (@openmrs/esm-form-entry-app), you will need to remove it from your importmap or replace it with the form engine app (@openmrs/esm-form-engine-app).**

### Report an issue

https://github.com/openmrs/openmrs-form-engine-lib/issues

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

## License

Distributed under the MPLv2 with Healthcare Disclaimer License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#top">Back to top</a>)</p>
