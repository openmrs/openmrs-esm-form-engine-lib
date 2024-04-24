<div id="top"></div>

:wave:	*New to O3? Be sure to review the [OpenMRS 3 Frontend Developer Documentation](https://openmrs.github.io/openmrs-esm-core/#/). You may find the [Map of the Project](https://openmrs.github.io/openmrs-esm-core/#/main/map) especially helpful.* :teacher:


# OpenMRS Form Engine

[<img src="src/readme/images/HTS-form-preview.png" alt="Test Form Preview" >](https://ohri.atlassian.net/wiki/spaces/HOME/pages/120684546/OHRI+Forms)

The OpenMRS Form Engine is a React library that builds and renders OpenMRS form schemas. Schemas are defined based on the [AMPATH Forms Schema](https://gist.github.com/denniskigen/80e4cd0765cbeda0efba79c6e6675e49) and get built using the OpenMRS [form builder](https://github.com/openmrs/openmrs-esm-form-builder) within the O3 reference application. The form engine is a library that can be consumed by any frontend app that needs to render forms. It enables the rendering of forms in the following modes:

- **Enter Mode** - This is the default mode that allows the user to enter data into the form. The form is rendered in a read-write mode.
- **Edit Mode** - This mode allows the user to edit data that has already been entered into the form. The form is rendered in a read-write mode.
- **View Mode** - This mode allows the user to view data that has already been entered into the form. The form is rendered in a read-only mode.

The form engine also supports the following features:

- **Validation** - The form engine enables the validation of form data based on the form schema. Arbitraily complex validation rules can be defined within the schema and evaluated by the form engine.
- **Sub forms** - The form engine supports the rendering of sub forms within a form. This allows for the creation of complex forms that can be reused across multiple forms.
- **Conditional rendering** - The form engine supports the conditional rendering of form fields based on the values of other form fields. This allows for the creation of dynamic forms that can adapt to the user's input.
- **Data sources** - The form engine supports the use of data sources to populate form fields. This allows for the creation of forms that can be populated with data from external sources.
- **Expression helpers** - The form engine supports the use of expression helpers to evaluate expressions within the form schema. This allows for the creation of complex expressions that can be evaluated by the form engine.

This project was initially developed by the [UCSF-IGHS team](https://github.com/UCSF-IGHS) in 2022 and moved to the community in 2023. Work is ongoing to improve the form engine and make it more robust.

### Documentation

[Read the documentation](https://openmrs.atlassian.net/wiki/spaces/projects/pages/68747273/O3+Form+Docs).

## Getting Started

 *NB: The engine is a library and not an [O3 frontend module](https://o3-dev.docs.openmrs.org/#/getting_started/tour). That being said, it can be consumed by bundling it within an ESM or custom frontend app that incorporates it within a UI workflow.*

### Prerequisites

You must have git, node, npm, and yarn installed. The versions required are:

- The Node [Active LTS version](https://nodejs.org/en/about/releases/)
- The latest stable version of NPM
- The latest stable version of Yarn

### Installation

```bash
yarn add @openmrs/openmrs-form-engine-lib@latest
```

### Local Development

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

Whereas for the patient chart you would do something like:

```bash
yarn start --sources packages/esm-form-engine-app
```

You could also optionally proxy to a different backend where your forms are hosted by appending `backend` followed by the URL to the backend. For example:

```bash
yarn start --sources packages/esm-form-engine-app --backend https://link-to-my-backend.com
```

### Report an issue

https://github.com/openmrs/openmrs-form-engine-lib/issues

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

<!-- LICENSE -->
## License

Distributed under the MPLv2 with Healthcare Disclaimer License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#top">back to top</a>)</p>
