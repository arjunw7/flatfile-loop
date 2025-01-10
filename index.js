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

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email ? emailRegex.test(email) : false;
};

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
  listener.use(exportWorkbookPlugin({
    autoDownload: true
  }));

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
          if(sumInsuredMapping[value]) {
            record.set('slab_id', sumInsuredMapping[value])
          } else {
            record.addError('sum_insured', 'Invalid sum insured value')
            record.addError('slab_id', 'slab ID is mandatory')
          }
        }
    
        // Add email validation
        const email = record.get('email_address')
        if (email) {
          const isValidEmail = validateEmail(email)
          if (!isValidEmail) {
            record.addError('email_address', 'Invalid email address')
          }
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
          if(sumInsuredMapping[value]) {
            record.set('slab_id', sumInsuredMapping[value])
          } else {
            record.addError('sum_insured', 'Invalid sum insured value')
            record.addError('slab_id', 'slab ID is mandatory')
          }
        }
    
        // Add email validation
        const email = record.get('email_address')
        if (email) {
          const isValidEmail = validateEmail(email)
          if (!isValidEmail) {
            record.addError('email_address', 'Invalid email address')
          }
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
      let hrData = [];
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
        if(element?.slug === "hr_data") {
          hrData =  records?.records.map((record) => ({
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
            ctc: record?.values.ctc?.value,
          }));;
          console.log('hrData', JSON.stringify(hrData[0]))
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

      // Create maps for each dataset
      const genomeMap = new Map(genomeData.map((record) => [createKey(record), record]));
      const icMap = new Map(icData.map((record) => [createKey(record), record]));
      const hrMap = hrData.length > 0 ? new Map(hrData.map((record) => [createKey(record), record])) : null;

      // Variables to hold results
      const addData = [];
      const editData = [];
      const offboardSheet = [];
      const offboardSheet2 = [];
      const dataMismatch = [];

      // Reconciliation logic
      if (hrMap) {
        // Condition 1: Records in HR but not in Genome and IC
        for (const key of hrMap.keys()) {
          if (!genomeMap.has(key) && !icMap.has(key)) {
            addData.push(hrMap.get(key));
          }
        }

        // Condition 2: Records in HR and Genome but not in IC
        for (const key of hrMap.keys()) {
          if (genomeMap.has(key) && !icMap.has(key)) {
            editData.push(hrMap.get(key));
          }
        }

        // Condition 3: Records in Genome and IC but not in HR
        for (const key of genomeMap.keys()) {
          if (!hrMap.has(key) && icMap.has(key)) {
            offboardSheet.push(genomeMap.get(key));
          }
        }

        // Condition 4 and 5: Records in IC but not in HR and/or Genome
        for (const key of icMap.keys()) {
          if (!hrMap.has(key) && !genomeMap.has(key)) {
            offboardSheet2.push(icMap.get(key));
          }
        }

        // Condition 6: Data mismatches between HR, Genome, and IC
        for (const key of hrMap.keys()) {
          if (genomeMap.has(key) && icMap.has(key)) {
            const hrRecord = hrMap.get(key);
            const genomeRecord = genomeMap.get(key);
            const icRecord = icMap.get(key);

            const mismatches = [];
            if (hrRecord.relationship !== icRecord.relationship)
              mismatches.push({ field: "Relationship", hr: hrRecord.relationship, ic: icRecord.relationship });
            if (hrRecord.gender !== icRecord.gender)
              mismatches.push({ field: "Gender", hr: hrRecord.gender, ic: icRecord.gender });
            if (hrRecord.dob !== icRecord.dob)
              mismatches.push({ field: "DOB", hr: hrRecord.dob, ic: icRecord.dob });
            if (hrRecord.joining_date !== icRecord.joining_date)
              mismatches.push({ field: "Joining Date", hr: hrRecord.joining_date, ic: icRecord.joining_date });
            if (hrRecord.sum_insured !== icRecord.sum_insured)
              mismatches.push({ field: "Sum Insured", hr: hrRecord.sum_insured, ic: icRecord.sum_insured });

            if (mismatches.length > 0) {
              dataMismatch.push({ key, mismatches, ...hrRecord });
            }
          }
        }
      } else {
        // Reconciliation without HR data
        // Records in Genome but not in IC
        for (const key of genomeMap.keys()) {
          if (!icMap.has(key)) {
            offboardSheet.push(genomeMap.get(key));
          }
        }

        // Records in IC but not in Genome
        for (const key of icMap.keys()) {
          if (!genomeMap.has(key)) {
            offboardSheet2.push(icMap.get(key));
          }
        }

        // Data mismatches between Genome and IC
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
              mismatches.push({ field: "Joining Date", genome: genomeRecord.joining_date, ic: icRecord.joining_date });
            if (genomeRecord.sum_insured !== icRecord.sum_insured)
              mismatches.push({ field: "Sum Insured", genome: genomeRecord.sum_insured, ic: icRecord.sum_insured });

            if (mismatches.length > 0) {
              dataMismatch.push({ key, mismatches, ...genomeRecord });
            }
          }
        }
      }
  
      try {
        await api.jobs.ack(jobId, {
          info: "Data recon has started",
          progress: 10,
        });
  

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

        await api.jobs.ack(jobId, {
          info: "Data recon has started",
          progress: 20,
        });
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

        await api.jobs.ack(jobId, {
          info: "Data recon has started",
          progress: 30,
        });

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
        
        await api.jobs.ack(jobId, {
          info: "Data recon has started",
          progress: 40,
        });

        if(offboardSheet?.length || offboardSheet2?.length) {
          if(offboardSheet?.length) {
            await api.records.insert(deleteSheet?.id, offboardSheet?.map((item) => ({
              user_id: { value: item?.user_id },
              employee_id: { value: item?.employee_id },
              name: { value: item?.name },
              relationship_to_account_holder: { value: item?.relationship },
              date_of_leaving_dd_mmm_yyyy: { value: null},
              policy_exception: { value: ''},
              required_confirmation: { value: true },
            })));
          }
          if(offboardSheet2?.length) {
            await api.records.insert(deleteSheet?.id, offboardSheet2?.map((item) => ({
              user_id: { value: item?.user_id },
              employee_id: { value: item?.employee_id },
              name: { value: item?.name },
              relationship_to_account_holder: { value: item?.relationship },
              date_of_leaving_dd_mmm_yyyy: { value: null},
              policy_exception: { value: ''},
              required_confirmation: { value: false }
            })));
          }
        }

        await api.jobs.ack(jobId, {
          info: "Data recon has started",
          progress: 60,
        });

        if(addData?.length) {        
          await api.records.insert(addSheet?.id, addData?.map((item) => ({
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

        await api.jobs.ack(jobId, {
          info: "Data recon has started",
          progress: 80,
        });

        if(editData?.length || dataMismatch?.length) {
          if(editData?.length) {
            await api.records.insert(editSheet?.id, editData?.map((item) => ({
              employee_id: { value: item?.employee_id },
              name: { value: item?.name },
              relationship_to_account_holder: { value: item?.relationship },
              coverage_start_date_dd_mmm_yyyy: { value: item?.coverage_start_date },
              enrolment_due_date_dd_mmm_yyyy: { value: item?.enrolment_due_date },
              slab_id: { value: item?.slab_id },
              mobile: { value: item?.mobile },
              email_address: { value: item?.email },
              date_of_leaving_dd_mmm_yyyy: { value: null},
              gender: { value: item?.gender },
              ctc: { value: item?.ctc },
              date_of_birth_dd_mmm_yyyy: { value: item?.dob },
              mismatch: { value: item?.mismatches ? formatMismatches(item?.mismatches) : '' }
            })));
          }

          await api.jobs.ack(jobId, {
            info: "Data recon has started",
            progress: 90,
          });

          console.log('dataMismatch', JSON.stringify(dataMismatch))
          if(dataMismatch?.length) {
            console.log('dataMismatch', JSON.stringify(dataMismatch[0]))
              await api.records.insert(editSheet?.id, dataMismatch?.map((item) => ({
              employee_id: { value: item?.employee_id },
              name: { value: item?.name },
              relationship_to_account_holder: { value: item?.relationship },
              coverage_start_date_dd_mmm_yyyy: { value: item?.coverage_start_date },
              enrolment_due_date_dd_mmm_yyyy: { value: item?.enrolment_due_date },
              slab_id: { value: item?.slab_id },
              mobile: { value: item?.mobile },
              email_address: { value: item?.email },
              date_of_leaving_dd_mmm_yyyy: { value: null},
              gender: { value: item?.gender },
              ctc: { value: item?.ctc },
              date_of_birth_dd_mmm_yyyy: { value: item?.dob },
              mismatch: { value: item?.mismatches ? formatMismatches(item?.mismatches) : '' }
              })));
          }

          await api.jobs.ack(jobId, {
            info: "Data recon has started",
            progress: 100,
          });
        }


        // Log results
        console.log("Add Records:", addData?.length, JSON.stringify(addData[0]));
        console.log("Edit Genome:", editData?.length,JSON.stringify(editData[0]));
        console.log("Offboard Data:", (offboardSheet?.length + offboardSheet2?.length), JSON.stringify([...offboardSheet2, ...offboardSheet][0]));
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