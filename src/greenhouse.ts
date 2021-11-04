import * as async from 'async';
import * as jsdom from 'jsdom';

import {Builder, interpolate} from '@amagaki/amagaki';

import {Pod} from '@amagaki/amagaki';
import {decode} from 'html-entities';
import dompurify from 'dompurify';
import fetch from 'node-fetch';
import fs from 'fs';
import fsPath from 'path';

export interface GreenhousePluginOptions {
  boardToken: string;
}

export interface BindCollectionOptions {
  collectionPath: string;
}

export interface SaveEducationFileOptions {
  podPath: string;
}

interface GreenhouseEducationItem {
  id: number;
  text: string;
}

interface GreenhouseEducationResponse {
  items: GreenhouseEducationItem[];
  meta: {
    total_count: number;
    per_page: number;
  };
}

interface QuestionValue {
  value: number;
  label: string;
}

interface Question {
  required: boolean;
  private: boolean;
  label: string;
  name: string;
  type: string;
  values: {
    value: number;
    label: string;
  }[];
  description: string;
  answer_options: {
    id: number;
    label: string;
    free_form: boolean;
  }[];
  fields: Question[];
}

interface JobChild {
  child_ids: number[];
  id: number;
  name: string;
  parent_id: number;
}

interface GreenhouseJob {
  absolute_url: string;
  compliance: {
    description: string;
    type: string;
    questions: Question[];
  }[];
  data_compliance: {
    type: string;
    requires_consent: boolean;
    retention_period: number;
  }[];
  internal_job_id: number;
  location: {
    name: string;
  };
  metadata: {
    id: number;
    name: string;
    value_type: string;
    value: string;
  }[];
  id: number;
  updated_at: string;
  requisition_id: string;
  title: string;
  content: string;
  departments: JobChild[];
  offices: JobChild[];
  questions: Question[];
}

export interface GreenhouseJobsResponse {
  jobs: GreenhouseJob[];
  meta: {
    total: number;
  };
}

export class GreenhousePlugin {
  options: GreenhousePluginOptions;
  pod: Pod;
  DOMPurify: dompurify.DOMPurifyI;

  static CONCURRENT_REQUESTS = 20;
  static SCHOOL_PAGES = 30;

  static DEGREES_URL =
    'https://api.greenhouse.io/v1/boards/${boardToken}/education/degrees';
  static DISCIPLINES_URL =
    'https://api.greenhouse.io/v1/boards/${boardToken}/education/disciplines';
  static JOBS_URL =
    'https://api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true';
  static JOB_URL =
    'https://api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?questions=true';
  static SCHOOLS_URL =
    'https://api.greenhouse.io/v1/boards/${boardToken}/education/schools';

  constructor(pod: Pod, options: GreenhousePluginOptions) {
    this.pod = pod;
    this.options = options;
    this.DOMPurify = dompurify(new jsdom.JSDOM('').window);
  }

  static register(pod: Pod, options: GreenhousePluginOptions) {
    return new GreenhousePlugin(pod, options);
  }

  async getDegrees() {
    const url = interpolate(this.pod, GreenhousePlugin.DEGREES_URL, {
      boardToken: this.options.boardToken,
    });
    const response = await fetch(url);
    return ((await response.json()) as GreenhouseEducationResponse).items;
  }

  async getDisciplines() {
    const url = interpolate(this.pod, GreenhousePlugin.DISCIPLINES_URL, {
      boardToken: this.options.boardToken,
    });
    const response = await fetch(url);
    return ((await response.json()) as GreenhouseEducationResponse).items;
  }

  async getSchools() {
    let items: GreenhouseEducationItem[] = [];
    const pages = [...Array(GreenhousePlugin.SCHOOL_PAGES).keys()];
    let numTotal = 0;
    // Greenhouse has ~26 (fixed) pages of schools. Fetch them all.
    await async.eachLimit(
      pages,
      GreenhousePlugin.CONCURRENT_REQUESTS,
      async (page: number) => {
        const url = interpolate(this.pod, GreenhousePlugin.SCHOOLS_URL, {
          boardToken: this.options.boardToken,
        });
        const response = await fetch(`${url}?page=${page}`);
        const educationResponse = (await response.json()) as GreenhouseEducationResponse;
        items = items.concat(educationResponse.items);
        if (!numTotal) {
          numTotal = educationResponse.meta.total_count;
        }
      }
    );
    items = items.sort((a, b) => a.text.localeCompare(b.text));
    console.log(
      `Downloaded ${numTotal} schools from Greenhouse board ${this.options.boardToken}`
    );
    return items;
  }

  private cleanContent(content: string) {
    return this.DOMPurify.sanitize(decode(content), {
      FORBID_ATTR: ['style'],
    });
  }

  private cleanJob(job: GreenhouseJob) {
    job.content = this.cleanContent(job.content);
    if (job.compliance) {
      job.compliance.forEach(compliance => {
        compliance.description = this.cleanContent(compliance.description);
      });
    }
  }

  async getJobs() {
    const url = interpolate(this.pod, GreenhousePlugin.JOBS_URL, {
      boardToken: this.options.boardToken,
    });
    const response = await fetch(url);
    const data = (await response.json()) as GreenhouseJobsResponse;
    data.jobs.map(job => this.cleanJob(job));
    return data;
  }

  async getJob(jobId: number) {
    const url = interpolate(this.pod, GreenhousePlugin.JOB_URL, {
      boardToken: this.options.boardToken,
      jobId: jobId,
    });
    const response = await fetch(url);
    const job = (await response.json()) as GreenhouseJob;
    this.cleanJob(job);
    return job;
  }

  /** Saves Greenhouse education data to a file within the pod. */
  async saveEducationFile(options: SaveEducationFileOptions) {
    const education = {
      degrees: await this.getDegrees(),
      disciplines: await this.getDisciplines(),
      schools: await this.getSchools(),
    };
    await this.pod.writeFileAsync(
      options.podPath,
      this.pod.dumpYaml(education)
    );
  }

  /** Binds an Amagaki collection to Greenhouse jobs. Each job is saved as an individual YAML document. */
  async bindCollection(options: BindCollectionOptions) {
    const realPath = this.pod.getAbsoluteFilePath(options.collectionPath);
    // `ensureDirectoryExists` is actually `ensureDirectoryExistsForFile`.
    Builder.ensureDirectoryExists(fsPath.join(realPath, '_collection.yaml'));
    const existingFiles = fs.readdirSync(realPath).filter(path => {
      return !path.startsWith('_');
    });
    const newFiles: string[] = [];

    // Download all jobs.
    const resp = await this.getJobs();
    if (!resp.meta) {
      throw new Error(
        `Failed to download from Greenhouse board ${this.options.boardToken}`
      );
    }
    const jobResponses: any[] = [];
    console.log(
      `Downloading ${resp.meta.total} jobs from Greenhouse board ${this.options.boardToken}...`
    );
    await async.eachLimit(
      resp.jobs,
      GreenhousePlugin.CONCURRENT_REQUESTS,
      async (job: GreenhouseJob) => {
        newFiles.push(`${job.id}.yaml`);
        jobResponses.push(await this.getJob(job.id));
      }
    );

    // Delete existing files in the collection.
    const diff = existingFiles.filter(basename => !newFiles.includes(basename));
    for (const basename of diff) {
      const absPath = fsPath.join(realPath, basename);
      const podPath = fsPath.join(options.collectionPath, basename);
      fs.unlinkSync(absPath);
      console.log(`Deleted -> ${podPath}`);
    }

    for (const job of jobResponses) {
      const basename = `${job.id}.yaml`;
      const podPath = fsPath.join(options.collectionPath, basename);
      await this.pod.writeFileAsync(podPath, this.pod.dumpYaml(job));
    }
  }
}
