name: 🐛 Bug Report
description: File a bug report
title: "[Bug]: "
labels: ["bug", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!

  - type: dropdown
    id: component
    attributes:
      label: Which component is affected?
      options:
        - API Table
        - Qwik Runtime
        - Other
    validations:
      required: true

  - type: textarea
    id: bug-description
    attributes:
      label: Describe the bug
      description: A clear and concise description of what you expected to happen instead. If you intend to submit a PR for this issue, tell us in the description.
      placeholder: |
        I am doing ...
        What I expect is ...
        What actually happening is ...
    validations:
      required: true

  - type: input
    id: reproduction
    attributes:
      label: Reproduction URL
      description: Please provide a link via qwik.new or a link to a repo that can reproduce the problem you ran into.
      placeholder: https://qwik.new/...
    validations:
      required: true

  - type: textarea
    id: reproduction-steps
    attributes:
      label: Steps to reproduce
      description: Please provide any reproduction steps that may need to be described.
      placeholder: |
        1. Run `npm install`
        2. Run `npm run dev`
        3. Go to '...'
        4. Click on '...'
        5. See error
    validations:
      required: true

  - type: textarea
    id: system-info
    attributes:
      label: System Info
      description: Please run this command in your project directory and paste the results
      placeholder: |
        Output of npx envinfo --system --npmPackages '{vite,undici,typescript,@builder.io/*}' --binaries --browsers
      render: shell
    validations:
      required: true

  - type: textarea
    id: additional-context
    attributes:
      label: Additional Information
      description: Add any other context about the problem here
      placeholder: Any other relevant information or screenshots
