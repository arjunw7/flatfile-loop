const namespace = ['space:endo-recon']
import api from '@flatfile/api'
import { recordHook } from '@flatfile/plugin-record-hook'
import { exportWorkbookPlugin } from '@flatfile/plugin-export-workbook'
import { blueprint } from './blueprint'
import { ExcelExtractor } from "@flatfile/plugin-xlsx-extractor";
import { XMLExtractor } from "@flatfile/plugin-xml-extractor";
import { date } from '@flatfile/api/core/schemas'
const fs = require('fs');


const sumInsuredMapping = {
  "200000": 1,
  "250000": 2,
  "300000": 3,
  "500000": 4,
  "600000": 5,
}

function convertUTCtoIST(utcDate) {
  if (!utcDate) return null; // Handle missing dates
  try {
    const date = new Date(utcDate);
    return reformatDate(date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }));
  } catch (error) {
    console.error("Error converting date:", utcDate, error);
    return utcDate; // Return as-is if conversion fails
  }
}

function reformatDate(dateInput) {
  if (!dateInput) return null;

  try {
    let parsedDate;

    if (!isNaN(dateInput) && (typeof dateInput === 'number' || !isNaN(Number(dateInput)))) {
      parsedDate = new Date(parseInt(dateInput));
    }
    else if (dateInput.includes('T')) {
      parsedDate = new Date(dateInput);
    }
    else if (/[a-zA-Z]/.test(dateInput)) {
      const parts = dateInput.replace(/[-\s]/g, ' ').split(' ');
      if (parts[2] && parts[2].length === 2) {
        const year = parseInt(parts[2]);
        parts[2] = (year < 50 ? '20' : '19') + parts[2].padStart(2, '0');
      }
      parsedDate = new Date(parts.join(' '));
    }
    else {
      const parts = dateInput.split(/[-/]/);
      
      if (parts[0].length === 4) {
        parsedDate = new Date(dateInput);
      } else {
        if (parts[2].length === 2) {
          const year = parseInt(parts[2]);
          parts[2] = (year < 50 ? '20' : '19') + parts[2].padStart(2, '0');
        }
        const month = parts[1];
        parts[1] = parts[0];
        parts[0] = month;
        parsedDate = new Date(parts.join('/'));
      }
    }

    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date');
    }

    // Convert to IST
    const istOptions = { timeZone: 'Asia/Kolkata' };
    const istDate = new Date(parsedDate.toLocaleString('en-US', istOptions));
    
    // Format as DD/MM/YYYY
    const day = String(istDate.getDate()).padStart(2, '0');
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const year = istDate.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error reformatting date:", dateInput, error);
    return dateInput; // Return original input if parsing fails
  }
}

const formatMismatches = (mismatches) => {
  if (!mismatches || mismatches.length === 0) return '';

  return mismatches.map(mismatch => {
    return `${mismatch.field}: [Genome: "${mismatch.genome}", IC: "${mismatch.ic}"] `;
  }).join(', ');
};


export default function flatfileEventListener(listener) {
  listener.use(ExcelExtractor({ raw: true, rawNumbers: true }));
  listener.use(XMLExtractor());
  listener.use(exportWorkbookPlugin()));

  listener.on('**', (event) => {
    console.log('Event Received: ' + event.topic);
  })

  listener.namespace(namespace, (namespacedEvents) => {
    namespacedEvents.filter({ job: 'space:configure' }, (configure) => {
      configure.on(
        'job:ready',
        async ({ context: { spaceId, environmentId, jobId } }) => {
          try {
            await api.jobs.ack(jobId, {
              info: 'Creating Space',
              progress: 10,
            })

            await api.workbooks.create({
              spaceId,
              environmentId,
              ...blueprint(Object.keys(sumInsuredMapping)),
            })

            await api.jobs.complete(jobId, {
              outcome: {
                message: 'Space Created',
                acknowledge: true,
              },
            })
          } catch (error) {
            console.log('error', error);
            await api.jobs.fail(jobId, {
              outcome: {
                message:
                  'Space Creation Failed. See Event Logs',
                acknowledge: true,
              },
            })
          }
        }
      )
    })

    namespacedEvents.use(
      recordHook('hr_data', (record) => {
        const value = record.get('sum_insured')
        if (typeof value === 'string') {
          record.set('slab_id', sumInsuredMapping[value])
        }
        return record
      })
    )
    namespacedEvents.use(
      recordHook('insurer_data', (record) => {
        const value = record.get('sum_insured')
        if (typeof value === 'string') {
          record.set('slab_id', sumInsuredMapping[value])
        }
        return record
      })
    )
    namespacedEvents.use(
      recordHook('genome_active_roster', (record) => {
        const value = record.get('sum_insured')
        if (typeof value === 'string') {
          record.set('slab_id', sumInsuredMapping[value])
        }
        return record
      })
    )

    namespacedEvents.use(exportWorkbookPlugin())
  })

  listener.on(
    "job:ready",
    { job: "workbook:submitActionFg" },
    async (event) => {
      const { jobId, workbookId } = event.context;
      const { data: workbook } = await api.workbooks.get(workbookId);
      const { data: workbookSheets } = await api.sheets.list({ workbookId });
      let genomeData = [];
      let icData = [];
      let addSheet = null;
      let deleteSheet = null;
      let editSheet = null;
      
      for (const [_, element] of workbookSheets.entries()) {
        const { data: records } = await api.records.get(element.id);
        if(element?.slug === "genome_active_roster") {
          genomeData = records?.records.map((record) => ({
            user_id: record?.values?.user_id?.value,
            employee_id: record.values.employee_id?.value,
            name: record?.values?.name?.value,
            relationship: record?.values?.relationship_to_account_holder?.value,
            gender: record?.values?.gender?.value,
            dob: reformatDate(record?.values?.date_of_birth_dd_mmm_yyyy?.value),
            enrolment_due_date: reformatDate(record?.values?.enrolment_due_date_dd_mmm_yyyy?.value),
            coverage_start_date: reformatDate(record?.values?.coverage_start_date_dd_mmm_yyyy?.value),
            sum_insured: record?.values.sum_insured?.value,
            slab_id: record?.values?.slab_id?.value,
            mobile: record?.values?.mobile?.value,
            email: record?.values?.email_address?.value,
            ctc: record?.values?.ctc?.value,
          }));
          console.log('genomeData', JSON.stringify(genomeData[0]))
        }
        if(element?.slug === "insurer_data") {
          icData =  records?.records.map((record) => ({
            employee_id: record?.values?.employee_id?.value,
            name: record?.values?.name?.value,
            relationship: record?.values?.relationship_to_account_holder?.value,
            gender: record?.values?.gender?.value,
            dob: reformatDate(record?.values?.date_of_birth_dd_mmm_yyyy?.value),
            coverage_start_date: reformatDate(record?.values?.coverage_start_date_dd_mmm_yyyy?.value),
            sum_insured: record?.values?.sum_insured?.value,
            slab_id: record?.values?.slab_id?.value,
            mobile: record?.values?.mobile?.value,
            email: record?.values.email_address?.value,
          }));;
          console.log('icData', JSON.stringify(icData[0]))
        }
        if(element?.slug === "add_data"){
          addSheet = element;
        }
        if(element?.slug === "offboard_data"){
          deleteSheet = element;
          console.log(JSON.stringify(element))
        }
        if(element?.slug === "edit_data"){
          editSheet = element;
        }
      }
        const createKey = (record) => `${record.employee_id}_${record.name}`;

        // Maps for faster lookup
        const genomeMap = new Map(genomeData.map((record) => [createKey(record), record]));
        const icMap = new Map(icData.map((record) => [createKey(record), record]));

        // Variables to hold results
        const missingAtInsurer = [];
        const missingInGenome = [];
        const dataMismatch = [];

        // Check for records in genomeData but missing in icData
        for (const key of genomeMap.keys()) {
          if (!icMap.has(key)) {
            missingAtInsurer.push(genomeMap.get(key));
          }
        }

        // Check for records in icData but missing in genomeData
        for (const key of icMap.keys()) {
          if (!genomeMap.has(key)) {
            missingInGenome.push(icMap.get(key));
          }
        }

        // Check for mismatched records
        for (const key of genomeMap.keys()) {
          if (icMap.has(key)) {
            const genomeRecord = genomeMap.get(key);
            const icRecord = icMap.get(key);

            const mismatches = [];
            if (genomeRecord.relationship !== icRecord.relationship)
              mismatches.push({ field: "Relationship", genome: genomeRecord.relationship, ic: icRecord.relationship });
            if (genomeRecord.gender !== icRecord.gender)
              mismatches.push({ field: "Gender", genome: genomeRecord.gender, ic: icRecord.gender });
            if (genomeRecord.dob !== icRecord.dob)
              mismatches.push({ field: "DOB", genome: genomeRecord.dob, ic: icRecord.dob });
            if (genomeRecord.joining_date !== icRecord.joining_date)
              mismatches.push({ field: "Joining Date", genome: genomeRecord.coverage_start_date, ic: icRecord.coverage_start_date });
            if (genomeRecord.sum_insured !== icRecord.sum_insured)
              mismatches.push({ field: "Sum Insured", genome: genomeRecord.sum_insured, ic: icRecord.sum_insured });

            if (mismatches.length > 0) {
              dataMismatch.push({
                key,
                mismatches,
                genomeRecord
              });
            }
          }
      }
      console.log('mismatched :', JSON.stringify(dataMismatch[0]))

      if(missingAtInsurer?.length) {
        await api.jobs.create({
          type: "workbook",
          operation: "delete-records",
          trigger: "immediate",
          source: workbookId,
          config: {
            sheet: deleteSheet?.id,
            filter: "all",
          },
        });

        await api.records.insert(deleteSheet?.id, missingAtInsurer?.map((item) => ({
          user_id: { value: item?.user_id },
          relationship_to_account_holder: { value: item?.relationship },
          date_of_leaving_dd_mmm_yyyy: { value: null},
          policy_exception: { value: ''},
        })));
      }

      if(missingInGenome?.length) {
        await api.jobs.create({
          type: "workbook",
          operation: "delete-records",
          trigger: "immediate",
          source: workbookId,
          config: {
            sheet: addSheet?.id,
            filter: "all",
          },
        });
        
        await api.records.insert(addSheet?.id, missingInGenome?.map((item) => ({
          employee_id: { value: item?.employee_id },
          relationship_to_account_holder: { value: item?.relationship },
          name: { value: item?.name },
          coverage_start_date_dd_mmm_yyyy: { value: item?.coverage_start_date },
          enrolment_due_date_dd_mmm_yyyy: { value: item?.enrolment_due_date },
          slab_id: { value: item?.slab_id },
          mobile: { value: item?.mobile },
          email_address: { value: item?.email },
          date_of_leaving_dd_mmm_yyyy: { value: null},
          gender: { value: item?.gender },
          ctc: { value: item?.ctc },
          date_of_birth_dd_mmm_yyyy: { value: item?.dob },
        })));
      }

      if(dataMismatch?.length) {
        await api.jobs.create({
          type: "workbook",
          operation: "delete-records",
          trigger: "immediate",
          source: workbookId,
          config: {
            sheet: editSheet?.id,
            filter: "all",
          },
        });
        
        await api.records.insert(editSheet?.id, dataMismatch?.map((item) => ({
          user_id: { value: item?.genomeRecord?.user_id },
          name: { value: item?.genomeRecord?.name },
          relationship_to_account_holder: { value: item?.genomeRecord?.relationship },
          coverage_start_date_dd_mmm_yyyy: { value: item?.genomeRecord?.coverage_start_date },
          enrolment_due_date_dd_mmm_yyyy: { value: item?.genomeRecord?.enrolment_due_date },
          slab_id: { value: item?.genomeRecord?.slab_id },
          mobile: { value: item?.genomeRecord?.mobile },
          email_address: { value: item?.genomeRecord?.email },
          date_of_leaving_dd_mmm_yyyy: { value: null},
          gender: { value: item?.genomeRecord?.gender },
          ctc: { value: item?.genomeRecord?.ctc },
          date_of_birth_dd_mmm_yyyy: { value: item?.genomeRecord?.dob },
          mismatch: { value: formatMismatches(item?.mismatches) }
        })));
      }

      // Log results
      console.log("Missing at Insurer:", missingAtInsurer?.length, JSON.stringify(missingAtInsurer[0]));
      console.log("Missing in Genome:", missingInGenome?.length,JSON.stringify(missingInGenome[0]));
      console.log("Data Mismatches:", dataMismatch?.length, JSON.stringify(dataMismatch[0]));
  
      try {
        await api.jobs.ack(jobId, {
          info: "Data recon has started",
          progress: 10,
        });
  
        await api.jobs.complete(jobId, {
          outcome: {
            message: `Data recon completed.`,
          },
        });

        return;
      } catch (error) {
        console.error(error);
        await api.jobs.fail(jobId, {
          outcome: {
            message:
              "This job failed probably because it couldn't find the webhook.site URL.",
          },
        });
        return;
      }
    }
  );
}