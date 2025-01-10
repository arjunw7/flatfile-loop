export const blueprint = (sumInsuredList) => ({
  "name": "worksheet",
  "sheets": [
    {
      "name": "HR Data",
      "slug": "hr_data",
      "allowAdditionalFields": false,
      "fields": [
        {
          "key": "employee_id",
          "label": "Employee ID",
          "type": "string"
        },
        {
          "key": "name",
          "label": "Name",
          "type": "string"
        },
        {
          "key": "relationship_to_account_holder",
          "label": "Relationship to Account Holder",
          "type": "string"
        },
        {
          "key": "gender",
          "label": "Gender",
          "type": "string"
        },
        {
          "key": "date_of_birth_dd_mmm_yyyy",
          "label": "Date of Birth (DD/MMM/YYYY)",
          "type": "date"
        },
        {
          "key": "coverage_start_date_dd_mmm_yyyy",
          "label": "Coverage Start Date (DD/MMM/YYYY)",
          "type": "date"
        },
        {
          "key": "sum_insured",
          "label": "Sum Insured",
          "type": "string",
        },
        {
          "key": "mobile",
          "label": "Mobile",
          "type": "string"
        },
        {
          "key": "email_address",
          "label": "Email Address",
          "type": "string"
        },
        {
          "key": "ctc",
          "label": "CTC",
          "type": "string"
        }
      ]
    },
    {
      "name": "Genome Active Roster",
      "slug": "genome_active_roster",
      "allowAdditionalFields": false,
      "fields": [
        {
          "key": "is_active",
          "label": "Active",
          "type": "enum",
          "config": {
            "options": [
              {
                "value": "Yes",
                "label": "Yes"
              },
              {
                "value": "No",
                "label": "No",
              }
            ]
          }
        },
        {
          "key": "user_id",
          "label": "User ID",
          "type": "string"
        },
        {
          "key": "employee_id",
          "label": "Employee ID",
          "type": "string"
        },
        {
          "key": "name",
          "label": "Name",
          "type": "string"
        },
        {
          "key": "relationship_to_account_holder",
          "label": "Relationship to Account Holder",
          "type": "string"
        },
        {
          "key": "gender",
          "label": "Gender",
          "type": "string"
        },
        {
          "key": "date_of_birth_dd_mmm_yyyy",
          "label": "Date of Birth (DD/MMM/YYYY)",
          "type": "date"
        },
        {
          "key": "coverage_start_date_dd_mmm_yyyy",
          "label": "Coverage Start Date (DD/MMM/YYYY)",
          "type": "date"
        },
        {
          "key": "sum_insured",
          "label": "Sum Insured",
          "type": "string"
        },
        {
          "key": "slab_id",
          "label": "Slab ID",
          "type": "string"
        },
        {
          "key": "mobile",
          "label": "Mobile",
          "type": "string"
        },
        {
          "key": "email_address",
          "label": "Email Address",
          "type": "string"
        },
        {
          "key": "ctc",
          "label": "CTC",
          "type": "string"
        },
        {
          "key": "enrolment_due_date_dd_mmm_yyyy",
          "label": "Enrolment Due Date (DD/MMM/YYYY)",
          "type": "date"
        }
      ]
    },
    {
      "name": "Insurer Data",
      "slug": "insurer_data",
      "fields": [
        {
          "key": "employee_id",
          "label": "Employee ID",
          "type": "string"
        },
        {
          "key": "name",
          "label": "Name",
          "type": "string"
        },
        {
          "key": "relationship_to_account_holder",
          "label": "Relationship to Account Holder",
          "type": "string"
        },
        {
          "key": "gender",
          "label": "Gender",
          "type": "string"
        },
        {
          "key": "date_of_birth_dd_mmm_yyyy",
          "label": "Date of Birth (DD/MMM/YYYY)",
          "type": "date"
        },
        {
          "key": "coverage_start_date_dd_mmm_yyyy",
          "label": "Coverage Start Date (DD/MMM/YYYY)",
          "type": "date"
        },
        {
          "key": "sum_insured",
          "label": "Sum Insured",
          "type": "string"
        },
        {
          "key": "slab_id",
          "label": "Slab ID",
          "type": "string"
        },
      ]
    },
    {
      "name": "Add",
      "slug": "add_data",
      "fields": [
        {
          "key": "employee_id",
          "label": "Employee ID",
          "type": "string"
        },
        {
          "key": "relationship_to_account_holder",
          "label": "Relationship to Account Holder",
          "type": "string"
        },
        {
          "key": "name",
          "label": "Name",
          "type": "string"
        },
        {
          "key": "coverage_start_date_dd_mmm_yyyy",
          "label": "Coverage Start Date (DD/MMM/YYYY)",
          "type": "date"
        },
        {
          "key": "enrolment_due_date_dd_mmm_yyyy",
          "label": "Enrolment Due Date (DD/MMM/YYYY)",
          "type": "date"
        },
        {
          "key": "slab_id",
          "label": "Slab ID",
          "type": "string"
        },
        {
          "key": "mobile",
          "label": "Mobile",
          "type": "string"
        },
        {
          "key": "email_address",
          "label": "Email Address",
          "type": "string"
        },
        {
          "key": "date_of_birth_dd_mmm_yyyy",
          "label": "Date of Birth (DD/MMM/YYYY)",
          "type": "date"
        },
        {
          "key": "gender",
          "label": "Gender",
          "type": "string"
        },
        {
          "key": "ctc",
          "label": "CTC",
          "type": "string"
        },
      ]
    },
    {
      "name": "Edit",
      "slug": "edit_data",
      "fields": [
        {
          "key": "employee_id",
          "label": "Employee ID",
          "type": "string"
        },
        {
          "key": "relationship_to_account_holder",
          "label": "Relationship to Account Holder",
          "type": "string"
        },
        {
          "key": "name",
          "label": "Name",
          "type": "string"
        },
        {
          "key": "coverage_start_date_dd_mmm_yyyy",
          "label": "Coverage Start Date (DD/MMM/YYYY)",
          "type": "date"
        },
        {
          "key": "enrolment_due_date_dd_mmm_yyyy",
          "label": "Enrolment Due Date (DD/MMM/YYYY)",
          "type": "date"
        },
        {
          "key": "slab_id",
          "label": "Slab ID",
          "type": "string"
        },
        {
          "key": "mobile",
          "label": "Mobile",
          "type": "string"
        },
        {
          "key": "email_address",
          "label": "Email Address",
          "type": "string"
        },
        {
          "key": "date_of_birth_dd_mmm_yyyy",
          "label": "Date of Birth (DD/MMM/YYYY)",
          "type": "date"
        },
        {
          "key": "gender",
          "label": "Gender",
          "type": "string"
        },
        {
          "key": "ctc",
          "label": "CTC",
          "type": "string"
        },
        {
          "key": "mismatch",
          "label": "Mismatch",
          "type": "string"
        },
      ]
    },
    {
      "name": "Offboard",
      "slug": "offboard_data",
      "fields": [
        {
          "key": "user_id",
          "label": "User ID",
          "type": "string"
        },
        {
          "key": "employee_id",
          "label": "Employee ID",
          "type": "string"
        },
        {
          "key": "name",
          "label": "Name",
          "type": "string"
        },
        {
          "key": "relationship_to_account_holder",
          "label": "Relationship to Account Holder",
          "type": "string"
        },
        {
          "key": "date_of_leaving_dd_mmm_yyyy",
          "label": "Date of Leaving (DD/MMM/YYYY)",
          "type": "date"
        },
        {
          "key": "policy_exception",
          "label": "Policy Exception",
          "type": "string"
        },
        {
          "key": "required_confirmation",
          "label": "Requires Confirmation",
          "type": "boolean"
        },
      ]
    },
  ],
  "actions": [
    {
      "operation": "downloadWorkbook",
      "mode": "foreground",
      "label": "Download Validator Data",
      "description": "Downloads Excel Workbook of Data",
      "primary": true,
      constraints: [{ type: 'hasAllValid' }]
    },
    {
      operation: 'submitActionFg',
      mode: 'foreground',
      label: 'Initiate Recon',
      type: 'string',
      description: 'Submit this data to a webhook.',
      primary: true,
      constraints: [{ type: 'hasAllValid' }]
    },
  ]
})
